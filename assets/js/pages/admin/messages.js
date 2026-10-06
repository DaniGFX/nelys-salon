// Seamless 0ms Cache Preload
const MESSAGES_CACHE_KEY = 'nelys_admin_messages_cache';

/**
 * Admin Messages Page Controller
 * Nely's Salon Management System
 * Directly connected to backend REST API (/api/messages, /api/dashboard/stats)
 */

// ================= GLOBAL STATE =================
let conversationsData = [];
let currentConversationId = null;
let currentFilter = 'all';
let searchQuery = '';
let attachedFile = null;
let totalUnreadCount = 0;

// Real-time synchronization state
let adminPollTimer = null;
let adminEventSource = null;
let lastRenderedAdminHash = '';

// Typing Indicator State
let activeTypingCustomerIds = [];
let adminTypingThrottleTimer = null;
let adminTypingDismissTimer = null;

// Push Notification & Audio Alerts State
let audioCtx = null;
let originalPageTitle = document.title;
let titleFlashTimer = null;
let lastSeenAdminMessageId = 0;

function unlockAudioContextOnUserGesture() {
  const unlock = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (_) { }
    document.removeEventListener('click', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
}

function playMessageNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Tone 1: 1046.5 Hz (C6)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 1318.5 Hz (E6) - 0.12s delayed harmonic
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.09, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (_) { }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => { });
  }
}

function showBrowserNotification(title, body, onClickAction = null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!document.hidden && window.document.hasFocus()) return;

  try {
    const notif = new Notification(title, {
      body: body || 'You have received a new message.',
      icon: '../assets/images/logo.jfif',
      badge: '../assets/images/logo.jfif',
      tag: 'nelys-admin-msg',
      renotify: true
    });

    notif.onclick = function () {
      window.focus();
      this.close();
      if (typeof onClickAction === 'function') {
        onClickAction();
      }
    };
  } catch (e) {
    console.warn('Browser notification error:', e);
  }
}

function startTabTitleFlash(senderName) {
  stopTabTitleFlash();
  let flash = false;
  titleFlashTimer = setInterval(() => {
    document.title = flash ? `[New Message from ${senderName}!]` : originalPageTitle;
    flash = !flash;
  }, 1000);
}

function stopTabTitleFlash() {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
    document.title = originalPageTitle;
  }
}

function initMessages() {
  unlockAudioContextOnUserGesture();
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserId = urlParams.get('user_id');
  if (targetUserId) {
    currentConversationId = String(targetUserId);
  }

  hydrateMessagesFromCache();
  checkAdminAuth();
  setupEventListeners();
  fetchConversationsData();
  fetchSidebarStats();
  initAdminSSE();
  startAdminRealtimePolling();
}

function startAdminRealtimePolling() {
  stopAdminRealtimePolling();
  // Near-instant real-time polling: 1000ms (1s) when active, 4s when hidden
  const interval = document.hidden ? 4000 : 1000;
  adminPollTimer = setInterval(() => {
    fetchConversationsData(true);
    fetchSidebarStats();
  }, interval);
}

function stopAdminRealtimePolling() {
  if (adminPollTimer) {
    clearInterval(adminPollTimer);
    adminPollTimer = null;
  }
}

function initAdminSSE() {
  const token = localStorage.getItem('nelys_token') || sessionStorage.getItem('nelys_token');
  if (!token || !window.EventSource) return;

  if (adminEventSource) {
    try { adminEventSource.close(); } catch (_) { }
    adminEventSource = null;
  }

  try {
    const sseUrl = `../api/messages/stream?token=${encodeURIComponent(token)}`;
    adminEventSource = new EventSource(sseUrl);

    adminEventSource.addEventListener('update', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && (Array.isArray(payload.conversations) || payload.unread_total !== undefined)) {
          // Zero-delay instantaneous render directly from SSE event payload
          applyAdminConversationsPayload(payload, true);
          fetchSidebarStats();
        }
      } catch (e) {
        console.warn('Admin SSE update parse error:', e);
      }
    });

    adminEventSource.addEventListener('typing', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && Array.isArray(payload.typing_user_ids)) {
          handleAdminTypingUpdate(payload.typing_user_ids);
        }
      } catch (e) {
        console.warn('Admin SSE typing parse error:', e);
      }
    });

    adminEventSource.onerror = () => {
      // EventSource auto-reconnects natively
    };
  } catch (err) {
    console.warn('Admin SSE connection error, fallback polling active:', err);
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    stopTabTitleFlash();
    fetchConversationsData(true);
    fetchSidebarStats();
  }
  startAdminRealtimePolling();
});

window.addEventListener('focus', () => {
  stopTabTitleFlash();
  fetchConversationsData(true);
  fetchSidebarStats();
  startAdminRealtimePolling();
});

function hydrateMessagesFromCache() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('user_id');

    const cached = window.__PRELOADED_MESSAGES__ || JSON.parse(localStorage.getItem(MESSAGES_CACHE_KEY) || 'null');
    if (cached) {
      if (Array.isArray(cached.conversations)) {
        conversationsData = cached.conversations;
      } else if (Array.isArray(cached)) {
        conversationsData = cached;
      }
      if (cached.unread_total !== undefined) {
        totalUnreadCount = cached.unread_total;
      } else {
        totalUnreadCount = conversationsData.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      }

      if (targetUserId && conversationsData.some(c => String(c.id) === String(targetUserId))) {
        currentConversationId = String(targetUserId);
      } else if (conversationsData.length > 0 && !currentConversationId) {
        currentConversationId = conversationsData[0].id;
      }

      updateUnreadBadges();
      renderConversationsList();
      renderActiveConversation();
    }
  } catch (e) {
    console.warn('Error pre-hydrating messages cache:', e);
  }
}

function checkAdminAuth() {
  const token = localStorage.getItem('nelys_token');
  const userJson = localStorage.getItem('nelys_user');

  if (!token) {
    window.location.href = '../login.html';
    return;
  }

  let displayName = 'Admin';
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      let rawName = user.full_name || user.name || (user.email ? user.email.split('@')[0] : 'Admin');
      rawName = rawName.replace(/atelier\s*/gi, '').trim();
      if (rawName && rawName.toLowerCase() !== 'admin') {
        displayName = rawName;
      }
    } catch (e) {
      console.warn('Error reading admin user:', e);
    }
  }

  const mobileBadge = document.querySelector('header .bg-\\[\\#541A1A\\]');
  if (mobileBadge) {
    const parts = displayName.split(' ').filter(Boolean);
    const initials = parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (displayName.substring(0, 2)).toUpperCase();
    mobileBadge.textContent = initials || 'AD';
  }
}

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ================= FETCH DATA FROM BACKEND =================
async function fetchConversationsData(silent = false) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user_id');
    const userParam = urlUserId ? `&user_id=${encodeURIComponent(urlUserId)}` : '';

    const res = await fetch(`../api/messages?admin_view=1&search=${encodeURIComponent(searchQuery)}&filter=${encodeURIComponent(currentFilter)}${userParam}&_t=${Date.now()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('Admin session unauthenticated or expired.');
      window.location.href = '../login.html';
      return;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch messages`);
    }

    const json = await res.json();
    if (json && json.data) {
      let newConversations = [];
      if (Array.isArray(json.data.conversations)) {
        newConversations = json.data.conversations;
      } else if (Array.isArray(json.data)) {
        newConversations = json.data;
      }

      // If a specific customer user_id was requested in URL but has 0 messages and wasn't in conversations
      if (urlUserId && !newConversations.some(c => String(c.id) === String(urlUserId))) {
        try {
          const custRes = await fetch(`../api/customers/${urlUserId}`, {
            headers: getAuthHeaders(),
            cache: 'no-store'
          });
          if (custRes.ok) {
            const custJson = await custRes.json();
            const cust = custJson.data || custJson;
            if (cust) {
              const nameParts = (cust.full_name || cust.name || 'Customer').split(' ');
              const avatar = nameParts.length > 1
                ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
                : (cust.full_name || cust.name || 'C').substring(0, 2).toUpperCase();

              newConversations.unshift({
                id: String(urlUserId),
                userId: parseInt(urlUserId, 10),
                name: cust.full_name || cust.name || `Customer #${urlUserId}`,
                avatar: avatar,
                phone: cust.phone || '0917 123 4567',
                email: cust.email || '',
                location: cust.home_address || cust.city || 'Lagro, Quezon City',
                memberSince: cust.created_at ? `Member since ${new Date(cust.created_at).getFullYear()}` : 'Member',
                status: 'online',
                isUnread: false,
                unreadCount: 0,
                isMuted: false,
                hasAppointment: false,
                lastTime: 'No activity',
                lastTimestamp: new Date().toISOString(),
                upcomingAppointment: null,
                history: {
                  totalVisits: cust.total_visits || 0,
                  totalSpent: '₱' + (cust.total_spent || '0'),
                  lastVisit: 'Member record verified',
                  notes: cust.notes || 'No notes available.'
                },
                messages: []
              });
            }
          }
        } catch (e) {
          console.warn('Could not fetch customer profile shell:', e);
        }
      }

      applyAdminConversationsPayload(json.data, silent, newConversations);
    }
  } catch (err) {
    console.error('Error fetching conversations from backend:', err);
    if (conversationsData.length === 0) {
      renderConversationsList();
      renderActiveConversation();
    }
  }
}

// ================= ZERO-LATENCY SYNCHRONOUS CONVERSATIONS RENDERER =================
function applyAdminConversationsPayload(data, silent = false, customConversations = null) {
  if (!data) return;

  let newConversations = customConversations || [];
  if (!customConversations) {
    if (Array.isArray(data.conversations)) {
      newConversations = data.conversations;
    } else if (Array.isArray(data)) {
      newConversations = data;
    }
  }

  // Calculate composite signature to detect any new incoming/outgoing chats or unread changes
  const newHash = JSON.stringify({
    search: searchQuery,
    filter: currentFilter,
    currentId: String(currentConversationId || ''),
    convs: newConversations.map(c => ({
      id: String(c.id),
      unread: c.unreadCount,
      lastTime: c.lastTime,
      msgsCount: (c.messages || []).length,
      lastMsgId: (c.messages && c.messages.length) ? c.messages[c.messages.length - 1].id : null,
      lastMsgText: (c.messages && c.messages.length) ? c.messages[c.messages.length - 1].text : '',
      status: c.status
    }))
  });

  // If silent polling and data hasn't changed at all, avoid touching the DOM
  if (silent && newHash === lastRenderedAdminHash && conversationsData.length > 0) {
    return;
  }

  const prevActiveConv = conversationsData.find(c => String(c.id) === String(currentConversationId));
  const prevMsgCount = prevActiveConv && prevActiveConv.messages ? prevActiveConv.messages.length : 0;
  const isInitialRender = (lastRenderedAdminHash === '' || conversationsData.length === 0);

  // Check for newly arrived customer messages across all conversations
  if (lastSeenAdminMessageId > 0) {
    let latestNewMsg = null;
    let matchedConv = null;

    newConversations.forEach(c => {
      (c.messages || []).forEach(m => {
        if (m.sender === 'customer' && m.id > lastSeenAdminMessageId) {
          if (!latestNewMsg || m.id > latestNewMsg.id) {
            latestNewMsg = m;
            matchedConv = c;
          }
        }
      });
    });

    if (latestNewMsg && matchedConv) {
      playMessageNotificationSound();
      const senderName = matchedConv.name || 'Customer';
      showBrowserNotification(senderName, latestNewMsg.text || 'Sent an attachment', () => selectConversation(matchedConv.id));
      if (document.hidden) {
        startTabTitleFlash(senderName);
      } else if (String(currentConversationId) !== String(matchedConv.id)) {
        showToast(`New message from ${senderName}: "${latestNewMsg.text || 'Sent an attachment'}"`, 'info');
      }
    }
  }

  // Update max seen customer message ID
  newConversations.forEach(c => {
    (c.messages || []).forEach(m => {
      if (m.id > lastSeenAdminMessageId) {
        lastSeenAdminMessageId = m.id;
      }
    });
  });

  // Preserve prepended older messages for any conversation currently active
  newConversations.forEach(nc => {
    const existing = conversationsData.find(c => String(c.id) === String(nc.id));
    if (existing && existing.messages && existing.messages.length > (nc.messages || []).length) {
      const newIds = new Set((nc.messages || []).map(m => m.id));
      const prepended = existing.messages.filter(m => !newIds.has(m.id));
      nc.messages = [...prepended, ...(nc.messages || [])];
      nc.has_more = existing.has_more;
      nc.oldest_id = existing.oldest_id;
    }
  });

  lastRenderedAdminHash = newHash;
  conversationsData = newConversations;

  if (data.unread_total !== undefined) {
    totalUnreadCount = data.unread_total;
  } else {
    totalUnreadCount = conversationsData.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }

  // Save to cache for instant 0ms pre-hydration
  try {
    localStorage.setItem(MESSAGES_CACHE_KEY, JSON.stringify({
      conversations: conversationsData,
      unread_total: totalUnreadCount
    }));
  } catch (e) { }

  // Update unread badge in column header & sidebar
  updateUnreadBadges();

  const urlParams = new URLSearchParams(window.location.search);
  const urlUserId = urlParams.get('user_id');

  // Prioritize URL user_id if present, else active conversation, else first conversation
  if (urlUserId && conversationsData.some(c => String(c.id) === String(urlUserId))) {
    currentConversationId = String(urlUserId);
  } else if (conversationsData.length > 0) {
    if (!currentConversationId || !conversationsData.some(c => String(c.id) === String(currentConversationId))) {
      currentConversationId = conversationsData[0].id;
    }
  } else {
    currentConversationId = null;
  }

  renderConversationsList();
  renderActiveConversation();

  const newActiveConv = conversationsData.find(c => String(c.id) === String(currentConversationId));
  const newMsgCount = newActiveConv && newActiveConv.messages ? newActiveConv.messages.length : 0;

  // Instantaneous 0ms scroll to bottom on new message or initial load
  if (newMsgCount > prevMsgCount || isInitialRender) {
    const stream = document.getElementById('messagesStream');
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
    }
  }
}

// Fetch sidebar badge counts
async function fetchSidebarStats() {
  try {
    const res = await fetch(`../api/dashboard/stats?_t=${Date.now()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        const d = json.data;
        const bAppt = document.getElementById('sidebarAppointmentsBadge');
        const bNotif = document.getElementById('sidebarNotificationsBadge');
        const bMsg = document.getElementById('sidebarMessagesBadge');
        const apptCount = parseInt(d.new_appointments ?? d.pending_appointments ?? d.badges?.appointments ?? 0, 10);
        const notifCount = parseInt(d.unread_notifications ?? d.badges?.notifications ?? 0, 10);
        const msgCount = parseInt(d.unread_messages ?? d.badges?.messages ?? 0, 10);

        if (bAppt) {
          if (apptCount > 0) {
            bAppt.textContent = apptCount;
            bAppt.classList.remove('hidden');
            bAppt.style.display = '';
          } else {
            bAppt.textContent = '0';
            bAppt.classList.add('hidden');
            bAppt.style.display = 'none';
          }
        }
        if (bNotif) {
          if (notifCount > 0) {
            bNotif.textContent = notifCount;
            bNotif.classList.remove('hidden');
            bNotif.style.display = '';
          } else {
            bNotif.textContent = '0';
            bNotif.classList.add('hidden');
            bNotif.style.display = 'none';
          }
        }
        if (bMsg) {
          if (msgCount > 0) {
            bMsg.textContent = msgCount;
            bMsg.classList.remove('hidden');
            bMsg.style.display = '';
          } else {
            bMsg.textContent = '0';
            bMsg.classList.add('hidden');
            bMsg.style.display = 'none';
          }
        }
      }
    }
  } catch (err) {
    // Non-critical, ignore
  }
}

function updateUnreadBadges() {
  const totalUnreadBadge = document.getElementById('totalUnreadBadge');
  if (totalUnreadBadge) {
    totalUnreadBadge.textContent = `${totalUnreadCount} Unread`;
  }

  const sidebarMsgBadge = document.getElementById('sidebarMessagesBadge');
  if (sidebarMsgBadge) {
    if (totalUnreadCount > 0) {
      sidebarMsgBadge.textContent = totalUnreadCount;
      sidebarMsgBadge.classList.remove('hidden');
      sidebarMsgBadge.style.display = '';
    } else {
      sidebarMsgBadge.textContent = '0';
      sidebarMsgBadge.classList.add('hidden');
      sidebarMsgBadge.style.display = 'none';
    }
  }
}

function handleAdminTypingUpdate(typingUserIds) {
  activeTypingCustomerIds = (typingUserIds || []).map(Number);

  if (adminTypingDismissTimer) {
    clearTimeout(adminTypingDismissTimer);
    adminTypingDismissTimer = null;
  }

  // Update center chat stream if viewing an active typing customer
  updateActiveChatTypingBubble();

  // Update left column conversation preview
  renderConversationsList();

  // Safety auto-clear after 4s
  if (activeTypingCustomerIds.length > 0) {
    adminTypingDismissTimer = setTimeout(() => {
      activeTypingCustomerIds = [];
      updateActiveChatTypingBubble();
      renderConversationsList();
    }, 4000);
  }
}

function updateActiveChatTypingBubble() {
  const stream = document.getElementById('messagesStream');
  if (!stream) return;

  const conv = conversationsData.find(c => String(c.id) === String(currentConversationId) || String(c.userId) === String(currentConversationId));
  const isCurrentTyping = conv && (
    activeTypingCustomerIds.includes(Number(conv.id)) ||
    activeTypingCustomerIds.includes(Number(conv.userId))
  );

  const existing = document.getElementById('customerTypingIndicator');

  if (isCurrentTyping) {
    if (!existing) {
      const bubbleEl = document.createElement('div');
      bubbleEl.id = 'customerTypingIndicator';
      bubbleEl.className = 'flex items-start gap-2.5 mb-3.5';
      bubbleEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#541A1A] to-[#810B38] text-[#F1E2D1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#DCC3AA] mt-1 shadow-xs">
          ${escapeHtml(conv.avatar || 'C')}
        </div>
        <div class="max-w-[78%] sm:max-w-[70%]">
          <div class="text-[11px] font-bold text-[#541A1A] mb-1 pl-1">${escapeHtml(conv.name || 'Customer')}</div>
          <div class="bg-white border border-[#DCC3AA]/70 text-[#2b1d1d] px-4 py-2.5 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite; animation-delay: -0.3s;"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite; animation-delay: -0.15s;"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite;"></span>
            <span class="text-xs text-[#735e5e] font-medium ml-1.5">typing...</span>
          </div>
        </div>
      `;
      stream.appendChild(bubbleEl);
      stream.scrollTop = stream.scrollHeight;
    }
  } else {
    if (existing) {
      existing.remove();
    }
  }
}

function emitAdminTyping(isTyping) {
  const token = localStorage.getItem('nelys_token') || sessionStorage.getItem('nelys_token');
  if (!token || !currentConversationId) return;

  const conv = conversationsData.find(c => String(c.id) === String(currentConversationId) || String(c.userId) === String(currentConversationId));
  const targetId = conv ? (conv.userId || conv.id) : currentConversationId;

  fetch('../api/messages/typing', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      user_id: targetId,
      is_typing: isTyping
    })
  }).catch(() => { });
}

function handleAdminTypingInput() {
  if (!currentConversationId) return;
  if (adminTypingThrottleTimer) return;
  emitAdminTyping(true);
  adminTypingThrottleTimer = setTimeout(() => {
    adminTypingThrottleTimer = null;
  }, 600);
}

// Setup Event Listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchConversations');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderConversationsList();
    });
  }

  // Filter Buttons
  const filterBtns = document.querySelectorAll('.filter-tab-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-[#810B38]', 'text-white', 'shadow-xs');
        b.classList.add('bg-white', 'text-[#735e5e]', 'hover:bg-[#FAF6F0]');
      });
      btn.classList.add('bg-[#810B38]', 'text-white', 'shadow-xs');
      btn.classList.remove('bg-white', 'text-[#735e5e]', 'hover:bg-[#FAF6F0]');

      currentFilter = btn.dataset.filter;
      renderConversationsList();
    });
  });

  // Message Form Submit
  const messageForm = document.getElementById('messageForm');
  if (messageForm) {
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  // Textarea Enter key (Shift+Enter for newline) and typing listeners
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.addEventListener('focus', () => {
      requestNotificationPermission();
    }, { once: true });
    messageInput.addEventListener('input', handleAdminTypingInput);
    messageInput.addEventListener('blur', () => {
      if (!messageInput.value.trim()) {
        emitAdminTyping(false);
      }
    });
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // File Attachment input
  const fileInput = document.getElementById('fileAttachmentInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelected);
  }

  // Handle Window Resize to keep layouts consistent across breakpoints
  window.addEventListener('resize', () => {
    const convCol = document.getElementById('conversationsColumn');
    const chatCol = document.getElementById('chatColumn');
    if (!convCol || !chatCol) return;

    if (window.innerWidth >= 1024) {
      convCol.classList.remove('hidden');
      chatCol.classList.remove('hidden');
      chatCol.classList.add('flex');
    }
  });
}

// Render Conversation List (Left Column)
function renderConversationsList() {
  const container = document.getElementById('conversationsList');
  if (!container) return;

  const filtered = conversationsData.filter(conv => {
    // Search match
    const nameStr = (conv.name || 'Customer').toLowerCase();
    const matchesSearch = !searchQuery || nameStr.includes(searchQuery) ||
      (Array.isArray(conv.messages) && conv.messages.some(m => (m.text || '').toLowerCase().includes(searchQuery)));

    // Filter match
    if (!matchesSearch) return false;
    if (currentFilter === 'unread') return !!conv.isUnread;
    if (currentFilter === 'appointments') return !!conv.hasAppointment;
    return true;
  });

  if (filtered.length === 0) {
    const isFiltered = !!searchQuery || currentFilter !== 'all';
    container.innerHTML = `
      <div class="p-8 text-center text-[#735e5e] space-y-2">
        <div class="w-12 h-12 rounded-full bg-[#FAF6F0] border border-[#DCC3AA]/50 flex items-center justify-center mx-auto mb-2 text-[#810B38]">
          <i class="fa-solid fa-comments text-lg"></i>
        </div>
        <p class="text-sm font-bold text-[#541A1A]">${isFiltered ? 'No messages found' : 'No messages yet'}</p>
        <p class="text-xs text-[#735e5e] max-w-xs mx-auto leading-relaxed">
          ${isFiltered ? 'Try another search query or switch back to the All filter.' : 'Conversations appear here once a customer sends a message or you start a chat.'}
        </p>
        ${!isFiltered ? `
          <div class="pt-2">
            <button 
              type="button" 
              onclick="openStartChatModal()" 
              class="px-3.5 py-1.5 rounded-xl bg-[#810B38] hover:bg-[#62082b] text-white text-xs font-semibold shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-plus text-[10px]"></i>
              <span>Start a Chat</span>
            </button>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(conv => {
    const isActive = String(conv.id) === String(currentConversationId);
    const lastMsg = Array.isArray(conv.messages) && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
    const previewText = lastMsg
      ? (lastMsg.sender === 'admin' ? `You: ${lastMsg.text}` : lastMsg.text)
      : 'No messages yet';
    const isTyping = activeTypingCustomerIds.includes(Number(conv.id)) || activeTypingCustomerIds.includes(Number(conv.userId));

    return `
      <div 
        onclick="selectConversation('${conv.id}')"
        class="px-4 py-3.5 border-b border-[#DCC3AA]/30 cursor-pointer transition-all flex items-start gap-3 relative ${isActive
        ? 'bg-[#FAF6F0] border-l-4 border-l-[#810B38]'
        : 'hover:bg-white/80 bg-white/40'
      }">
        <!-- Avatar -->
        <div class="relative shrink-0">
          <div class="w-11 h-11 rounded-full bg-gradient-to-br from-[#541A1A] to-[#810B38] text-[#F1E2D1] font-bold text-sm flex items-center justify-center border border-[#DCC3AA] shadow-sm">
            ${escapeHtml(conv.avatar || 'C')}
          </div>
          ${conv.status === 'online'
        ? '<span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>'
        : ''
      }
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <h4 class="text-sm font-bold text-[#541A1A] truncate flex items-center gap-1.5">
              <span>${escapeHtml(conv.name || 'Customer')}</span>
              ${conv.isMuted ? '<i class="fa-solid fa-bell-slash text-[10px] text-[#735e5e]/60" title="Muted"></i>' : ''}
            </h4>
            <span class="text-[11px] font-semibold text-[#735e5e]/70 shrink-0">${escapeHtml(conv.lastTime || '')}</span>
          </div>

          <p class="text-xs truncate ${conv.isUnread ? 'font-bold text-[#2b1d1d]' : 'text-[#735e5e]'}">
            ${isTyping
        ? `<span class="text-[#810B38] font-bold italic flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#810B38] animate-ping"></span>Typing...</span>`
        : escapeHtml(previewText)
      }
          </p>
        </div>

        <!-- Unread Badge / Dot -->
        ${conv.isUnread
        ? `<span class="shrink-0 self-center w-2.5 h-2.5 rounded-full bg-[#810B38] shadow-sm" title="Unread Message"></span>`
        : ''
      }
      </div>
    `;
  }).join('');
}

// Select Conversation
async function selectConversation(id) {
  currentConversationId = id;
  const conv = conversationsData.find(c => c.id == id);
  if (conv && (conv.unreadCount > 0 || conv.isUnread)) {
    const unreadCount = conv.unreadCount || 1;
    conv.isUnread = false;
    conv.unreadCount = 0;
    totalUnreadCount = Math.max(0, totalUnreadCount - unreadCount);
    updateUnreadBadges();

    // Notify backend to mark messages as read
    try {
      await fetch(`../api/messages/read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ user_id: conv.userId })
      });
      fetchSidebarStats();
    } catch (err) {
      console.warn('Failed to mark conversation read on server:', err);
    }
  }

  renderConversationsList();
  renderActiveConversation();

  // On mobile & tablet screens (< 1024px), switch view to active chat
  if (window.innerWidth < 1024) {
    openMobileChat();
  }
}

// Mobile View Navigation: Switch to Chat Stream
function openMobileChat() {
  const convCol = document.getElementById('conversationsColumn');
  const chatCol = document.getElementById('chatColumn');
  if (convCol && chatCol) {
    convCol.classList.add('hidden');
    chatCol.classList.remove('hidden');
    chatCol.classList.add('flex');
    const container = document.getElementById('messagesStream');
    if (container) container.scrollTop = container.scrollHeight;
  }
}

// Mobile View Navigation: Back to Conversation List
function backToConversationList() {
  const convCol = document.getElementById('conversationsColumn');
  const chatCol = document.getElementById('chatColumn');
  if (convCol && chatCol) {
    chatCol.classList.add('hidden');
    chatCol.classList.remove('flex');
    convCol.classList.remove('hidden');
  }
}

// Render Active Conversation (Center + Right Columns)
function renderActiveConversation() {
  const conv = conversationsData.find(c => c.id == currentConversationId);
  if (!conv) {
    // If no active conversation, clear view with elegant empty state
    const headerName = document.getElementById('chatHeaderName');
    if (headerName) headerName.textContent = 'No Conversation Selected';
    const headerAvatar = document.getElementById('chatHeaderAvatar');
    if (headerAvatar) headerAvatar.textContent = 'NS';
    const headerStatus = document.getElementById('chatHeaderStatus');
    if (headerStatus) headerStatus.innerHTML = '';
    const headerMeta = document.getElementById('chatHeaderMeta');
    if (headerMeta) headerMeta.textContent = 'Salon Messages Workspace';

    const stream = document.getElementById('messagesStream');
    if (stream) {
      stream.innerHTML = `
        <div class="h-full min-h-[340px] flex flex-col items-center justify-center p-8 text-center text-[#735e5e] space-y-4 my-auto">
          <div class="w-16 h-16 rounded-full bg-[#FAF6F0] border-2 border-[#DCC3AA] text-[#810B38] flex items-center justify-center text-2xl shadow-sm">
            <i class="fa-solid fa-comments"></i>
          </div>
          <div class="max-w-sm space-y-1.5">
            <h3 class="font-serif text-xl font-bold text-[#541A1A]">No messages yet</h3>
            <p class="text-xs text-[#735e5e] leading-relaxed">
              Select an existing conversation from the list or start a new chat with a client to begin messaging.
            </p>
          </div>
          <button 
            type="button" 
            onclick="openStartChatModal()" 
            class="px-5 py-2.5 rounded-xl bg-[#810B38] hover:bg-[#62082b] text-white text-xs font-bold transition-all shadow-md shadow-[#810B38]/20 hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer">
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Start a Conversation</span>
          </button>
        </div>
      `;
    }

    renderCustomerInfo(null);
    renderMobileCustomerInfo(null);
    return;
  }

  // 1. Update Center Header
  const headerName = document.getElementById('chatHeaderName');
  const headerAvatar = document.getElementById('chatHeaderAvatar');
  const headerStatus = document.getElementById('chatHeaderStatus');
  const headerMeta = document.getElementById('chatHeaderMeta');
  const muteBtn = document.getElementById('btnMuteConversation');

  if (headerName) headerName.textContent = conv.name;
  if (headerAvatar) headerAvatar.textContent = conv.avatar;
  if (headerMeta) headerMeta.textContent = `Customer · ${conv.memberSince || 'Member'}`;
  if (headerStatus) {
    if (conv.status === 'online') {
      headerStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span class="text-emerald-700 font-semibold">Online</span>';
    } else {
      headerStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-gray-400"></span><span class="text-gray-500">Offline</span>';
    }
  }

  if (muteBtn) {
    if (conv.isMuted) {
      muteBtn.innerHTML = '<i class="fa-solid fa-bell-slash text-xs text-[#810B38]"></i>';
      muteBtn.title = 'Unmute Conversation';
      muteBtn.classList.add('bg-[#810B38]/10');
    } else {
      muteBtn.innerHTML = '<i class="fa-solid fa-bell text-xs text-[#735e5e]"></i>';
      muteBtn.title = 'Mute Conversation';
      muteBtn.classList.remove('bg-[#810B38]/10');
    }
  }

  // 2. Render Message Stream
  renderMessageStream(conv);

  // 3. Render Right Column (Customer Information)
  renderCustomerInfo(conv);
  renderMobileCustomerInfo(conv);
}

// Date and Time Parsing & Formatting Helpers
function parseMessageDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  try {
    const s = String(dateStr).trim();
    const isoCandidate = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;
    let d = new Date(isoCandidate);
    if (!isNaN(d.getTime())) return d;

    d = new Date(s.replace(/-/g, '/'));
    if (!isNaN(d.getTime())) return d;
  } catch (_) { }
  return new Date();
}

function formatMessageDateHeader(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) d = new Date();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (diffDays === 0) {
    return `Today, ${formattedDate}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${formattedDate}`;
  } else {
    return formattedDate;
  }
}

function formatMessageTime(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes} ${ampm}`;
}

let isLoadingOlderAdminMessages = false;

async function loadOlderAdminMessages(convId) {
  if (isLoadingOlderAdminMessages) return;
  const conv = conversationsData.find(c => String(c.id) === String(convId) || String(c.userId) === String(convId));
  if (!conv || !conv.oldest_id) return;

  isLoadingOlderAdminMessages = true;
  const btn = document.getElementById('btnAdminLoadOlder');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-[11px]"></i><span>Loading...</span>';
  }

  try {
    const res = await fetch(`../api/messages?user_id=${encodeURIComponent(conv.userId || conv.id)}&before_id=${encodeURIComponent(conv.oldest_id)}&limit=50&_t=${Date.now()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
      cache: 'no-store'
    });

    if (res.ok) {
      const json = await res.json();
      const data = json.data || json;
      const olderMsgs = Array.isArray(data.messages) ? data.messages : (Array.isArray(data) ? data : []);

      conv.has_more = data.has_more ?? false;
      if (olderMsgs.length > 0) {
        conv.oldest_id = data.oldest_id ?? olderMsgs[0].id;

        const stream = document.getElementById('messagesStream');
        const prevScrollHeight = stream ? stream.scrollHeight : 0;
        const prevScrollTop = stream ? stream.scrollTop : 0;

        // Format older messages
        const formattedOlder = olderMsgs.map(m => {
          const d = parseMessageDate(m.created_at);
          return {
            id: parseInt(m.id, 10),
            sender: (m.sender === 'admin' || m.sender === 'salon') ? 'admin' : 'customer',
            senderName: (m.sender === 'admin' || m.sender === 'salon') ? "Nely's Salon" : decodeHtmlEntities(m.sender_name || conv.name || 'Customer'),
            text: decodeHtmlEntities(m.text || ''),
            time: m.time || formatMessageTime(d),
            date: m.date || formatMessageDateHeader(d),
            created_at: m.created_at || d.toISOString(),
            status: m.status || 'sent',
            attachment: m.attachment_name ? { name: decodeHtmlEntities(m.attachment_name), url: m.attachment_url } : null
          };
        });

        conv.messages = [...formattedOlder, ...(conv.messages || [])];
        lastRenderedAdminHash = '';
        renderMessageStream(conv);

        // Preserve scroll position so reading view doesn't jump
        if (stream) {
          const newScrollHeight = stream.scrollHeight;
          stream.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
        }
      } else {
        conv.has_more = false;
        renderMessageStream(conv);
      }
    }
  } catch (err) {
    console.warn('Failed to load older messages for admin:', err);
  } finally {
    isLoadingOlderAdminMessages = false;
  }
}

// Render Message Bubbles in Center Column
function renderMessageStream(conv) {
  const container = document.getElementById('messagesStream');
  if (!container) return;

  if (!conv.messages || conv.messages.length === 0) {
    container.innerHTML = `
      <div class="h-full min-h-[280px] flex flex-col items-center justify-center p-8 text-center text-[#735e5e] space-y-3 my-auto">
        <div class="w-14 h-14 rounded-full bg-[#FAF6F0] border-2 border-[#DCC3AA] flex items-center justify-center mx-auto text-[#810B38] text-xl shadow-xs">
          <i class="fa-solid fa-comment-dots"></i>
        </div>
        <div class="max-w-xs space-y-1">
          <h4 class="font-serif text-base font-bold text-[#541A1A]">No messages yet</h4>
          <p class="text-xs text-[#735e5e] leading-relaxed">
            Send a message to <strong>${escapeHtml(conv.name)}</strong> using the input below to start the conversation.
          </p>
        </div>
      </div>
    `;
    return;
  }

  let html = '';

  if (conv.has_more) {
    html += `
      <div id="adminLoadOlderContainer" class="flex justify-center my-3">
        <button 
          type="button" 
          id="btnAdminLoadOlder" 
          onclick="loadOlderAdminMessages('${conv.id}')"
          class="px-4 py-1.5 rounded-full bg-[#FAF6F0] hover:bg-[#F1E2D1] text-[#810B38] border border-[#DCC3AA] text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:shadow-sm">
          <i class="fa-solid fa-clock-rotate-left text-[11px]"></i>
          <span>Load earlier messages</span>
        </button>
      </div>
    `;
  }

  let lastDateGroupKey = null;

  conv.messages.forEach(msg => {
    const msgDate = parseMessageDate(msg.created_at || msg.date);
    const groupKey = `${msgDate.getFullYear()}-${String(msgDate.getMonth() + 1).padStart(2, '0')}-${String(msgDate.getDate()).padStart(2, '0')}`;

    if (groupKey !== lastDateGroupKey) {
      lastDateGroupKey = groupKey;
      const headerText = formatMessageDateHeader(msgDate);
      html += `
        <!-- Date Header Pill -->
        <div class="flex items-center justify-center my-4">
          <span class="px-3.5 py-1 rounded-full bg-[#FAF6F0] border border-[#DCC3AA]/70 text-[11px] font-semibold text-[#735e5e] shadow-xs">
            ${escapeHtml(headerText)}
          </span>
        </div>
      `;
    }

    const isAdmin = msg.sender === 'admin' || msg.sender === 'salon';
    const displayTime = msg.time || formatMessageTime(msgDate);

    if (isAdmin) {
      html += `
        <!-- Admin Outgoing Bubble -->
        <div class="flex items-end justify-end gap-2 mb-3.5 group">
          <div class="max-w-[78%] sm:max-w-[70%]">
            <div class="bg-[#810B38] text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-md space-y-1">
              <p class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(msg.text)}</p>
              ${renderAdminAttachmentBubble(msg.attachment, true)}
            </div>
            <div class="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-[#735e5e]">
              <span>${escapeHtml(displayTime)}</span>
              ${renderAdminTickIcon(msg.status)}
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <!-- Customer Incoming Bubble -->
        <div class="flex items-start gap-2.5 mb-3.5 group">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#541A1A] to-[#810B38] text-[#F1E2D1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#DCC3AA] mt-1 shadow-xs">
            ${escapeHtml(conv.avatar)}
          </div>
          <div class="max-w-[78%] sm:max-w-[70%]">
            <div class="text-[11px] font-bold text-[#541A1A] mb-1 pl-1">${escapeHtml(conv.name)}</div>
            <div class="bg-white border border-[#DCC3AA]/70 text-[#2b1d1d] px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm space-y-1">
              <p class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(msg.text)}</p>
              ${renderAdminAttachmentBubble(msg.attachment, false)}
            </div>
            <div class="flex items-center gap-1.5 mt-1 text-[10px] text-[#735e5e] pl-1">
              <span>${escapeHtml(displayTime)}</span>
            </div>
          </div>
        </div>
      `;
    }
  });

  const isCurrentTyping = conv && (
    activeTypingCustomerIds.includes(Number(conv.id)) ||
    activeTypingCustomerIds.includes(Number(conv.userId))
  );

  if (isCurrentTyping) {
    html += `
      <div id="customerTypingIndicator" class="flex items-start gap-2.5 mb-3.5">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#541A1A] to-[#810B38] text-[#F1E2D1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#DCC3AA] mt-1 shadow-xs">
          ${escapeHtml(conv.avatar || 'C')}
        </div>
        <div class="max-w-[78%] sm:max-w-[70%]">
          <div class="text-[11px] font-bold text-[#541A1A] mb-1 pl-1">${escapeHtml(conv.name || 'Customer')}</div>
          <div class="bg-white border border-[#DCC3AA]/70 text-[#2b1d1d] px-4 py-2.5 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite; animation-delay: -0.3s;"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite; animation-delay: -0.15s;"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite;"></span>
            <span class="text-xs text-[#735e5e] font-medium ml-1.5">typing...</span>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function renderAdminAttachmentBubble(attachment, isAdmin) {
  if (!attachment) return '';
  const fileUrl = attachment.url || attachment.dataUrl || '';
  const isImg = fileUrl && (
    fileUrl.startsWith('data:image') ||
    fileUrl.includes('/uploads/messages/') && /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(fileUrl) ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(attachment.name || '')
  );

  const textColor = isAdmin ? 'text-white' : 'text-[#541A1A]';
  const subColor = isAdmin ? 'text-white/80' : 'text-[#735e5e]';
  const bgBox = isAdmin ? 'bg-black/20' : 'bg-[#FAF6F0] border border-[#DCC3AA]/40';

  if (isImg) {
    return `
      <div class="mt-2 rounded-xl overflow-hidden border border-black/10 max-w-xs shadow-xs">
        <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="block cursor-pointer group/img">
          <img src="${fileUrl}" alt="${escapeHtml(attachment.name)}" class="w-full h-auto object-cover max-h-48 transition-transform group-hover/img:scale-102">
        </a>
        <div class="p-1.5 text-[10px] ${textColor} ${bgBox} flex items-center justify-between gap-1 truncate">
          <span class="truncate">${escapeHtml(attachment.name)}</span>
          <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="shrink-0 hover:underline font-semibold" title="Open full view">
            <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
          </a>
        </div>
      </div>
    `;
  }

  return `
    <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="mt-2 flex items-center gap-2 p-2 rounded-xl ${bgBox} hover:opacity-90 transition-opacity text-xs">
      <i class="fa-solid fa-paperclip ${isAdmin ? 'text-[#DCC3AA]' : 'text-[#810B38]'}"></i>
      <span class="truncate font-mono underline ${textColor}">${escapeHtml(attachment.name)}</span>
      <i class="fa-solid fa-arrow-up-right-from-square text-[10px] ${textColor} opacity-70 ml-auto"></i>
    </a>
  `;
}

function renderAdminTickIcon(status) {
  if (status === 'read') {
    return '<span title="Read"><i class="fa-solid fa-check-double text-emerald-400 text-[10px]"></i></span>';
  }
  if (status === 'delivered') {
    return '<span title="Delivered"><i class="fa-solid fa-check-double text-stone-300 text-[10px]"></i></span>';
  }
  return '<span title="Sent"><i class="fa-solid fa-check text-stone-300 text-[10px]"></i></span>';
}

// Render Customer Info (Right Column)
function renderCustomerInfo(conv) {
  const infoAvatar = document.getElementById('infoAvatar');
  const infoName = document.getElementById('infoName');
  const infoStatus = document.getElementById('infoStatus');
  const infoPhone = document.getElementById('infoPhone');
  const infoEmail = document.getElementById('infoEmail');
  const infoLocation = document.getElementById('infoLocation');
  const infoVisits = document.getElementById('infoVisits');
  const infoSpent = document.getElementById('infoSpent');
  const infoNotes = document.getElementById('infoNotes');
  const apptWidget = document.getElementById('infoAppointmentWidget');

  if (!conv) {
    if (infoAvatar) infoAvatar.textContent = 'NS';
    if (infoName) infoName.textContent = 'Select Customer';
    if (infoStatus) infoStatus.innerHTML = '<span class="text-stone-400">No active thread</span>';
    if (infoPhone) { infoPhone.textContent = 'None'; infoPhone.removeAttribute('href'); }
    if (infoEmail) { infoEmail.textContent = 'None'; infoEmail.removeAttribute('href'); }
    if (infoLocation) infoLocation.textContent = 'Lagro, Quezon City';
    if (infoVisits) infoVisits.textContent = '0 visits';
    if (infoSpent) infoSpent.textContent = '₱0';
    if (infoNotes) infoNotes.textContent = 'Select a conversation to view customer details.';
    if (apptWidget) {
      apptWidget.innerHTML = `
        <div class="p-4 rounded-2xl border border-dashed border-[#DCC3AA] text-center bg-white/50">
          <i class="fa-solid fa-user-clock text-lg text-[#DCC3AA] mb-1"></i>
          <p class="text-xs font-bold text-[#541A1A]">No customer selected</p>
          <p class="text-[11px] text-[#735e5e] mt-0.5">Select a customer to view their booking information.</p>
        </div>
      `;
    }
    return;
  }

  if (infoAvatar) infoAvatar.textContent = conv.avatar;
  if (infoName) infoName.textContent = conv.name;
  if (infoStatus) {
    infoStatus.innerHTML = conv.status === 'online'
      ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Client · Online'
      : '<span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Verified Client · Offline';
  }
  if (infoPhone) {
    infoPhone.textContent = conv.phone;
    infoPhone.href = `tel:${conv.phone.replace(/\s+/g, '')}`;
  }
  if (infoEmail) {
    infoEmail.textContent = conv.email;
    infoEmail.href = `mailto:${conv.email}`;
  }
  if (infoLocation) infoLocation.textContent = conv.location;
  if (infoVisits) infoVisits.textContent = `${conv.history?.totalVisits || 0} visits`;
  if (infoSpent) infoSpent.textContent = conv.history?.totalSpent || '₱0';
  if (infoNotes) infoNotes.textContent = conv.history?.notes || 'No notes.';

  if (apptWidget) {
    if (conv.upcomingAppointment) {
      const appt = conv.upcomingAppointment;
      apptWidget.innerHTML = `
        <div class="bg-gradient-to-br from-[#FAF6F0] to-white p-4 rounded-2xl border-2 border-[#DCC3AA] shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#810B38]/10 text-[#810B38] uppercase tracking-wider">
              ${escapeHtml(appt.service)}
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              ${escapeHtml(appt.status)}
            </span>
          </div>

          <div class="space-y-1.5 my-3">
            <div class="flex items-center gap-2 text-xs font-semibold text-[#541A1A]">
              <i class="fa-solid fa-calendar text-[#810B38] w-4 text-center"></i>
              <span>${escapeHtml(appt.date)} · ${escapeHtml(appt.time)}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-[#735e5e]">
              <i class="fa-solid fa-user-tie text-[#DCC3AA] w-4 text-center"></i>
              <span>${escapeHtml(appt.stylist)}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-[#735e5e]">
              <i class="fa-solid fa-receipt text-[#DCC3AA] w-4 text-center"></i>
              <span class="font-bold text-[#541A1A]">${escapeHtml(appt.price)}</span>
            </div>
          </div>

          <a 
            href="appointments.html" 
            class="w-full mt-2 py-2 rounded-xl bg-[#810B38] hover:bg-[#62082b] text-white text-xs font-bold tracking-wide uppercase transition-all shadow-xs flex items-center justify-center gap-2 group">
            <span>View Appointment</span>
            <i class="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
          </a>
        </div>
      `;
    } else {
      apptWidget.innerHTML = `
        <div class="p-4 rounded-2xl border border-dashed border-[#DCC3AA] text-center bg-white/50">
          <i class="fa-solid fa-calendar-xmark text-lg text-[#DCC3AA] mb-1"></i>
          <p class="text-xs font-bold text-[#541A1A]">No upcoming appointment</p>
          <p class="text-[11px] text-[#735e5e] mt-0.5">Customer currently has no pending bookings.</p>
        </div>
      `;
    }
  }
}

// Send Message
async function sendMessage() {
  const input = document.getElementById('messageInput');
  if (!input) return;

  const text = input.value.trim();
  if (!text && !attachedFile) return;

  let conv = conversationsData.find(c => String(c.id) === String(currentConversationId) || String(c.userId) === String(currentConversationId));

  if (!conv && currentConversationId) {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUid = urlParams.get('user_id') || currentConversationId;
    conv = {
      id: String(targetUid),
      userId: parseInt(targetUid, 10),
      name: 'Customer #' + targetUid,
      avatar: 'C',
      messages: []
    };
    conversationsData.unshift(conv);
  }

  if (!conv) {
    showToast('Please select a customer conversation from the list to send a message.', 'error');
    return;
  }

  const fileRef = attachedFile;
  let fileDataUrl = null;
  if (fileRef) {
    try {
      fileDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(fileRef);
      });
    } catch (_) { }
  }

  const payload = {
    user_id: conv.userId,
    sender_name: "Nely's Salon",
    text: text,
    attachment_name: fileRef ? fileRef.name : null,
    attachment_url: fileDataUrl
  };

  // Immediate UI clearing
  input.value = '';
  clearAttachment();

  // Clear typing indicator status immediately
  if (adminTypingThrottleTimer) {
    clearTimeout(adminTypingThrottleTimer);
    adminTypingThrottleTimer = null;
  }
  emitAdminTyping(false);

  // Optimistic UI append
  const now = new Date();
  const tempMsg = {
    id: Date.now(),
    sender: 'admin',
    senderName: "Nely's Salon",
    text: text,
    time: formatMessageTime(now),
    date: formatMessageDateHeader(now),
    created_at: now.toISOString(),
    status: 'sent',
    attachment: payload.attachment_name ? { name: payload.attachment_name, url: fileDataUrl } : null
  };

  if (!conv.messages) conv.messages = [];
  conv.messages.push(tempMsg);
  conv.lastTime = tempMsg.time;

  lastRenderedAdminHash = '';
  renderMessageStream(conv);
  renderConversationsList();

  const stream = document.getElementById('messagesStream');
  if (stream) stream.scrollTop = stream.scrollHeight;

  try {
    const res = await fetch('../api/messages', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${res.status}: Failed to send message`);
    }

    const json = await res.json();
    const sentMsg = json.data;

    // Replace optimistic placeholder with authoritative server record
    const idx = conv.messages.findIndex(m => m.id === tempMsg.id);
    if (idx !== -1 && sentMsg) {
      conv.messages[idx] = sentMsg;
    }
    if (sentMsg && sentMsg.time) {
      conv.lastTime = sentMsg.time;
    }

    lastRenderedAdminHash = '';
    fetchConversationsData(true);
    fetchSidebarStats();
    // 0.1s (100ms) ultra-fast follow-up sync
    setTimeout(() => {
      fetchConversationsData(true);
      fetchSidebarStats();
    }, 100);

    showToast('Message sent to ' + conv.name, 'success');
  } catch (err) {
    console.error('Error sending message:', err);
    showToast(err.message || 'Failed to send message to customer.', 'error');
  }
}

// Quick Reply selection
function selectQuickReply(text) {
  const input = document.getElementById('messageInput');
  if (input) {
    input.value = text;
    input.focus();
  }
  const dropdown = document.getElementById('quickReplyDropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

function toggleQuickReplyDropdown() {
  const dropdown = document.getElementById('quickReplyDropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}

// File Attachment handling
function triggerFileInput() {
  const fileInput = document.getElementById('fileAttachmentInput');
  if (fileInput) fileInput.click();
}

function handleFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  attachedFile = file;
  const preview = document.getElementById('attachmentPreview');
  const filename = document.getElementById('attachmentFileName');

  if (preview && filename) {
    filename.textContent = file.name;
    preview.classList.remove('hidden');
  }
}

function clearAttachment() {
  attachedFile = null;
  const fileInput = document.getElementById('fileAttachmentInput');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('attachmentPreview');
  if (preview) preview.classList.add('hidden');
}

// Toggle Mute
function toggleMuteCurrent() {
  const conv = conversationsData.find(c => c.id == currentConversationId);
  if (!conv) return;

  conv.isMuted = !conv.isMuted;
  renderActiveConversation();
  renderConversationsList();

  showToast(
    conv.isMuted ? `Muted notifications for ${conv.name}` : `Unmuted notifications for ${conv.name}`,
    'info'
  );
}

// Delete Conversation Modal
function openDeleteModal() {
  const modal = document.getElementById('deleteConversationModal');
  const modalTarget = document.getElementById('deleteModalTargetName');
  const conv = conversationsData.find(c => c.id == currentConversationId);

  if (modalTarget && conv) {
    modalTarget.textContent = conv.name;
  }
  if (modal) modal.classList.remove('hidden');
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteConversationModal');
  if (modal) modal.classList.add('hidden');
}

async function confirmDeleteConversation() {
  const index = conversationsData.findIndex(c => c.id == currentConversationId);
  if (index === -1) return;

  const targetConv = conversationsData[index];
  const deletedName = targetConv.name;

  try {
    const res = await fetch(`../api/messages/clear`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ user_id: targetConv.userId })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    conversationsData.splice(index, 1);
    closeDeleteModal();

    if (conversationsData.length > 0) {
      currentConversationId = conversationsData[0].id;
    } else {
      currentConversationId = null;
    }

    renderConversationsList();
    renderActiveConversation();
    fetchSidebarStats();

    showToast(`Conversation with ${deletedName} deleted`, 'success');
  } catch (err) {
    console.error('Error deleting conversation:', err);
    showToast('Failed to delete conversation from database.', 'error');
  }
}

// Mobile / Tablet Customer Info Drawer Toggle
function toggleCustomerInfoPanel(show) {
  const drawer = document.getElementById('customerInfoMobileDrawer');
  if (!drawer) return;

  const isHidden = drawer.classList.contains('hidden');
  const shouldOpen = show !== undefined ? show : isHidden;

  if (shouldOpen) {
    const conv = conversationsData.find(c => c.id == currentConversationId);
    if (conv) renderMobileCustomerInfo(conv);
    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  } else {
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }
}

// Render Mobile Customer Info in Bottom Drawer
function renderMobileCustomerInfo(conv) {
  const body = document.getElementById('mobileCustomerInfoBody');
  if (!body || !conv) return;

  const apptHtml = conv.upcomingAppointment ? `
    <div class="bg-gradient-to-br from-[#FAF6F0] to-white p-4 rounded-2xl border-2 border-[#DCC3AA] shadow-xs relative overflow-hidden">
      <div class="flex items-center justify-between mb-2">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#810B38]/10 text-[#810B38] uppercase tracking-wider">
          ${escapeHtml(conv.upcomingAppointment.service)}
        </span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          ${escapeHtml(conv.upcomingAppointment.status)}
        </span>
      </div>

      <div class="space-y-1.5 my-3">
        <div class="flex items-center gap-2 text-xs font-semibold text-[#541A1A]">
          <i class="fa-solid fa-calendar text-[#810B38] w-4 text-center"></i>
          <span>${escapeHtml(conv.upcomingAppointment.date)} · ${escapeHtml(conv.upcomingAppointment.time)}</span>
        </div>
        <div class="flex items-center gap-2 text-xs text-[#735e5e]">
          <i class="fa-solid fa-user-tie text-[#DCC3AA] w-4 text-center"></i>
          <span>${escapeHtml(conv.upcomingAppointment.stylist)}</span>
        </div>
        <div class="flex items-center gap-2 text-xs text-[#735e5e]">
          <i class="fa-solid fa-receipt text-[#DCC3AA] w-4 text-center"></i>
          <span class="font-bold text-[#541A1A]">${escapeHtml(conv.upcomingAppointment.price)}</span>
        </div>
      </div>

      <a 
        href="appointments.html" 
        class="w-full mt-2 py-2 rounded-xl bg-[#810B38] hover:bg-[#62082b] text-white text-xs font-bold tracking-wide uppercase transition-all shadow-xs flex items-center justify-center gap-2 group">
        <span>View Appointment</span>
        <i class="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
      </a>
    </div>
  ` : `
    <div class="p-4 rounded-2xl border border-dashed border-[#DCC3AA] text-center bg-[#FAF6F0]/40">
      <i class="fa-solid fa-calendar-xmark text-lg text-[#DCC3AA] mb-1"></i>
      <p class="text-xs font-bold text-[#541A1A]">No upcoming appointment</p>
      <p class="text-[11px] text-[#735e5e] mt-0.5">Customer currently has no pending bookings.</p>
    </div>
  `;

  body.innerHTML = `
    <!-- Customer Identity Card -->
    <div class="text-center space-y-2">
      <div class="w-16 h-16 rounded-full bg-gradient-to-br from-[#541A1A] to-[#810B38] text-[#F1E2D1] font-bold text-xl flex items-center justify-center mx-auto border-2 border-[#DCC3AA] shadow-md">
        ${escapeHtml(conv.avatar)}
      </div>
      <div>
        <h4 class="font-serif text-lg font-bold text-[#541A1A]">${escapeHtml(conv.name)}</h4>
        <div class="inline-flex items-center gap-1.5 text-xs text-[#735e5e] font-medium">
          <span class="w-1.5 h-1.5 rounded-full ${conv.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}"></span>
          Verified Client · ${conv.status === 'online' ? 'Online' : 'Offline'}
        </div>
      </div>
    </div>

    <!-- Contact Links -->
    <div class="space-y-2 bg-[#FAF6F0] p-3.5 rounded-2xl border border-[#DCC3AA]/50 text-xs">
      <div class="flex items-center gap-2.5 text-[#735e5e]">
        <i class="fa-solid fa-phone text-[#810B38] w-4 text-center"></i>
        <a href="tel:${escapeHtml(conv.phone.replace(/\s+/g, ''))}" class="font-semibold text-[#541A1A] hover:underline">${escapeHtml(conv.phone)}</a>
      </div>
      <div class="flex items-center gap-2.5 text-[#735e5e]">
        <i class="fa-solid fa-envelope text-[#810B38] w-4 text-center"></i>
        <a href="mailto:${escapeHtml(conv.email)}" class="font-semibold text-[#541A1A] hover:underline truncate">${escapeHtml(conv.email)}</a>
      </div>
      <div class="flex items-center gap-2.5 text-[#735e5e]">
        <i class="fa-solid fa-location-dot text-[#810B38] w-4 text-center"></i>
        <span class="text-[#2b1d1d]">${escapeHtml(conv.location)}</span>
      </div>
    </div>

    <!-- Upcoming Appointment Section -->
    <div class="space-y-2">
      <div class="text-xs font-bold text-[#541A1A] flex items-center gap-1.5">
        <i class="fa-solid fa-calendar-check text-[#810B38]"></i>
        <span>Upcoming Appointment</span>
      </div>
      ${apptHtml}
    </div>

    <!-- Patron Summary -->
    <div class="space-y-2.5 border-t border-[#DCC3AA]/30 pt-3">
      <div class="text-xs font-bold text-[#541A1A] uppercase tracking-wider">
        Patron Summary
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-[#FAF6F0] p-2.5 rounded-xl border border-[#DCC3AA]/40 text-center">
          <span class="text-[10px] text-[#735e5e] block">Total Visits</span>
          <span class="font-bold text-[#541A1A] text-sm">${escapeHtml(String(conv.history?.totalVisits || 0))} visits</span>
        </div>
        <div class="bg-[#FAF6F0] p-2.5 rounded-xl border border-[#DCC3AA]/40 text-center">
          <span class="text-[10px] text-[#735e5e] block">Total Spent</span>
          <span class="font-bold text-[#541A1A] text-sm">${escapeHtml(conv.history?.totalSpent || '₱0')}</span>
        </div>
      </div>
      <div class="bg-[#FAF6F0]/40 p-3 rounded-xl border border-[#DCC3AA]/40 text-xs space-y-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[#735e5e]">Admin Notes</span>
        <p class="text-[11px] text-[#2b1d1d] leading-relaxed">
          ${escapeHtml(conv.history?.notes || 'No notes.')}
        </p>
      </div>
    </div>
  `;
}

// Toast Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-[#541A1A] border-[#DCC3AA]' : 'bg-[#810B38] border-[#DCC3AA]';
  const icon = type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-bell text-[#DCC3AA]';

  toast.className = `${bgClass} text-white px-4 py-3 rounded-2xl border shadow-xl flex items-center gap-3 text-xs font-semibold animate-slide-up transition-all pointer-events-auto`;
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utility: Decode HTML entities for proper punctuation rendering
function decodeHtmlEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#0*38;/gi, '&')
    .replace(/&nbsp;/gi, ' ');
}

// Security Helper: Escape HTML (decodes pre-encoded entities first to prevent code artifact display)
function escapeHtml(string) {
  if (string === null || string === undefined) return '';
  const decoded = decodeHtmlEntities(string);
  const str = String(decoded);
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ================= STANDARDIZED ADMIN LOGOUT HANDLERS =================
function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
  }
}

function handleConfirmLogout() {
  try {
    localStorage.removeItem('nelys_token');
    localStorage.removeItem('nelys_user');
    sessionStorage.clear();
  } catch (e) { }
  window.location.href = '../login.html';
}

function confirmLogout() {
  handleConfirmLogout();
}

// ================= MOBILE SIDEBAR DRAWER =================
function toggleMobileSidebar(show) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;

  const isHidden = sidebar.classList.contains('-translate-x-full');
  const shouldOpen = show !== undefined ? show : isHidden;

  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

// ================= START NEW CONVERSATION WITH CUSTOMER MODAL =================
let allCustomersForChat = [];

async function openStartChatModal() {
  const modal = document.getElementById('startChatModal');
  const listContainer = document.getElementById('startChatCustomersList');
  const searchInput = document.getElementById('searchNewChatCustomer');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.style.display = 'flex';
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }

  if (listContainer) {
    listContainer.innerHTML = `
      <div class="py-8 text-center text-xs text-[#735e5e] flex flex-col items-center justify-center gap-2">
        <i class="fa-solid fa-circle-notch fa-spin text-base text-[#810B38]"></i>
        <span>Loading customers...</span>
      </div>
    `;
  }

  try {
    const res = await fetch(`../api/customers?_t=${Date.now()}`, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    if (res.ok) {
      const json = await res.json();
      allCustomersForChat = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
      renderStartChatCustomerList(allCustomersForChat);
    } else {
      if (listContainer) {
        listContainer.innerHTML = `<div class="py-6 text-center text-xs text-rose-600">Failed to load customer list.</div>`;
      }
    }
  } catch (err) {
    console.error('Error fetching customers for new chat:', err);
    if (listContainer) {
      listContainer.innerHTML = `<div class="py-6 text-center text-xs text-rose-600">Network error loading customers.</div>`;
    }
  }
}

function closeStartChatModal() {
  const modal = document.getElementById('startChatModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
  }
}

function filterStartChatCustomers() {
  const searchInput = document.getElementById('searchNewChatCustomer');
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  if (!query) {
    renderStartChatCustomerList(allCustomersForChat);
    return;
  }
  const filtered = allCustomersForChat.filter(c => 
    (c.name || '').toLowerCase().includes(query) ||
    (c.email || '').toLowerCase().includes(query) ||
    (c.phone || '').toLowerCase().includes(query)
  );
  renderStartChatCustomerList(filtered);
}

function renderStartChatCustomerList(customers) {
  const listContainer = document.getElementById('startChatCustomersList');
  if (!listContainer) return;

  if (!customers || customers.length === 0) {
    listContainer.innerHTML = `
      <div class="py-8 text-center text-stone-400 space-y-1">
        <i class="fa-solid fa-user-xmark text-xl text-stone-300"></i>
        <p class="text-xs font-semibold text-[#541A1A]">No customers found</p>
        <p class="text-[11px] text-[#735e5e]">Try searching with another name or phone number.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = customers.map(cust => {
    const uid = cust.userId || cust.id;
    const name = cust.name || cust.full_name || 'Customer';
    const nameParts = name.trim().split(' ');
    const avatar = nameParts.length > 1
      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
    const phone = cust.phone || 'No phone';
    const email = cust.email || '';

    // Check if there is an existing conversation already
    const hasExisting = conversationsData.some(c => String(c.id) === String(uid) || String(c.userId) === String(uid));

    return `
      <div 
        onclick="selectCustomerForNewChat(${uid})"
        class="p-3 hover:bg-[#FAF6F0] cursor-pointer transition-colors flex items-center justify-between gap-3 group">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#541A1A] to-[#810B38] text-[#F1E2D1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#DCC3AA]">
            ${escapeHtml(avatar)}
          </div>
          <div class="min-w-0">
            <h5 class="text-xs font-bold text-[#541A1A] truncate group-hover:text-[#810B38] transition-colors">${escapeHtml(name)}</h5>
            <p class="text-[11px] text-[#735e5e] truncate">${escapeHtml(phone)}${email ? ' · ' + escapeHtml(email) : ''}</p>
          </div>
        </div>
        <button 
          type="button" 
          class="px-2.5 py-1 rounded-lg ${hasExisting ? 'bg-stone-100 text-stone-600' : 'bg-[#810B38] text-white'} text-[11px] font-bold uppercase tracking-wider shrink-0 transition-colors pointer-events-none">
          ${hasExisting ? 'Open' : 'Chat'}
        </button>
      </div>
    `;
  }).join('');
}

function selectCustomerForNewChat(userId) {
  closeStartChatModal();
  const uidStr = String(userId);

  // Check if conversation already exists in conversationsData
  let existing = conversationsData.find(c => String(c.id) === uidStr || String(c.userId) === uidStr);
  if (existing) {
    currentConversationId = existing.id;
    renderConversationsList();
    renderActiveConversation();
    focusAdminMessageInput();
    return;
  }

  // Find customer metadata from loaded customer list
  const cust = allCustomersForChat.find(c => String(c.userId || c.id) === uidStr);
  const name = cust ? (cust.name || cust.full_name || `Customer #${userId}`) : `Customer #${userId}`;
  const nameParts = name.trim().split(' ');
  const avatar = nameParts.length > 1
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();

  const newConv = {
    id: uidStr,
    userId: parseInt(userId, 10),
    name: name,
    avatar: avatar,
    phone: cust?.phone || '0917 123 4567',
    email: cust?.email || '',
    location: cust?.address || cust?.city || 'Lagro, Quezon City',
    memberSince: cust?.joinedDate ? `Member since ${cust.joinedDate}` : 'Member',
    status: 'online',
    isUnread: false,
    unreadCount: 0,
    isMuted: false,
    hasAppointment: false,
    lastTime: 'No activity',
    lastTimestamp: new Date().toISOString(),
    upcomingAppointment: null,
    history: {
      totalVisits: cust?.completedAppointments || 0,
      totalSpent: cust?.totalSpentFormatted || '₱0',
      lastVisit: 'Member record verified',
      notes: (Array.isArray(cust?.notes) && cust.notes.length > 0) ? (cust.notes[0].text || 'No notes available.') : 'No notes available.'
    },
    messages: []
  };

  conversationsData.unshift(newConv);
  currentConversationId = uidStr;
  lastRenderedAdminHash = '';
  renderConversationsList();
  renderActiveConversation();
  focusAdminMessageInput();
}

function focusAdminMessageInput() {
  setTimeout(() => {
    const input = document.getElementById('messageInput');
    if (input) {
      input.focus();
      input.placeholder = 'Type a message to start conversation...';
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// ================= GLOBAL WINDOW EXPORTS =================
window.toggleMobileSidebar = toggleMobileSidebar;
window.selectConversation = selectConversation;
window.backToConversationList = backToConversationList;
window.toggleQuickReplyDropdown = toggleQuickReplyDropdown;
window.selectQuickReply = selectQuickReply;
window.toggleCustomerInfoPanel = toggleCustomerInfoPanel;
window.toggleMuteCurrent = toggleMuteCurrent;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteConversation = confirmDeleteConversation;
window.triggerFileInput = triggerFileInput;
window.clearAttachment = clearAttachment;
window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.handleConfirmLogout = handleConfirmLogout;
window.confirmLogout = confirmLogout;
window.showToast = showToast;
window.openStartChatModal = openStartChatModal;
window.closeStartChatModal = closeStartChatModal;
window.filterStartChatCustomers = filterStartChatCustomers;
window.selectCustomerForNewChat = selectCustomerForNewChat;

// ================= DOM INITIALIZATION & AUTH =================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMessages);
} else {
  initMessages();
}

