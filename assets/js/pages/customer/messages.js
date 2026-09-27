/**
 * Customer Messages Page Controller
 * Nely's Salon Management System
 * Connected to live backend Messages API (/api/messages)
 * Dynamic messaging with live MySQL persistence, appointment context,
 * simulated concierge typing, offline resilience, and responsive UI.
 * Optimized with 0ms pre-hydration & SWR cache diffing.
 */

// Seamless 0ms Cache Preload & State
let lastRendered_cust_messages_Hash = '';

// Current Customer & Chat State
let currentUser = null;
let customerChatData = {
  salon: {
    name: "Nely's Salon",
    status: 'online',
    tagline: 'Admin · Customer Support',
    avatar: 'NS',
    phone: '0917 123 4567',
    hours: 'Mon - Sat: 9:00 AM - 6:00 PM',
  },
  messages: []
};

// UI State
let attachedFile = null;
let isEmptyState = false;
let messageToDeleteId = null;

// Real-time synchronization state
let customerPollTimer = null;
let customerEventSource = null;
let searchQuery = '';

// Typing Indicator State
let isSalonTyping = false;
let salonTypingDismissTimer = null;
let customerTypingThrottleTimer = null;

// Pagination State
let customerHasMore = false;
let customerOldestId = null;
let isLoadingOlderMessages = false;

// Push Notification & Audio Alerts State
let audioCtx = null;
let originalPageTitle = document.title;
let titleFlashTimer = null;
let lastSeenCustomerMessageId = 0;

// Immediate 0ms Hydration
function hydrateCustomerMessagesFromCache() {
  purgeLegacyMockStorage();
  initPatronProfile();
  
  let preloaded = window.__PRELOADED_CUSTOMER_MESSAGES__;
  if (!preloaded) {
    try {
      const key = getStorageKey();
      const raw = localStorage.getItem(key);
      if (raw) preloaded = JSON.parse(raw);
    } catch (e) {}
  }

  if (Array.isArray(preloaded) && preloaded.length > 0) {
    try {
      // Discard if contains legacy mock
      const isLegacyMock = preloaded.some(m => 
        (m.text || '').includes('Haircut tomorrow at 2:00 PM') || 
        (m.text || '').includes('change my service to Brazilian')
      );
      if (!isLegacyMock) {
        preloaded.forEach(m => {
          if (m.sender === 'salon' || (m.senderName && m.senderName.includes('Concierge'))) {
            m.senderName = "Nely's Salon";
          }
        });
        customerChatData.messages = preloaded;
        isEmptyState = false;
        lastRendered_cust_messages_Hash = JSON.stringify(preloaded);
        renderChatStream();
      }
    } catch (e) {
      console.warn('Messages cache hydration error:', e);
    }
  }
}


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
    } catch (_) {}
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
  } catch (_) {}
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function showBrowserNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!document.hidden && window.document.hasFocus()) return;

  try {
    const notif = new Notification(title, {
      body: body || 'You have received a new message.',
      icon: '../assets/images/logo.jfif',
      badge: '../assets/images/logo.jfif',
      tag: 'nelys-customer-msg',
      renotify: true
    });

    notif.onclick = function() {
      window.focus();
      this.close();
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

function initCustomerMessagesPage() {
  unlockAudioContextOnUserGesture();
  hydrateCustomerMessagesFromCache();
  loadCustomerChatData();
  setupEventListeners();
  loadAppointmentContext();
  loadNotificationBadges();
  setupDialogBackdropClicks();
  initCustomerSSE();
  startCustomerRealtimePolling();
}

function startCustomerRealtimePolling() {
  stopCustomerRealtimePolling();
  // With SSE active, fallback polling runs gently every 15s (or 30s when hidden)
  const interval = document.hidden ? 30000 : 15000;
  customerPollTimer = setInterval(() => {
    loadCustomerChatData();
  }, interval);
}

function stopCustomerRealtimePolling() {
  if (customerPollTimer) {
    clearInterval(customerPollTimer);
    customerPollTimer = null;
  }
}

function initCustomerSSE() {
  const token = localStorage.getItem('nelys_token') || sessionStorage.getItem('nelys_token');
  if (!token || !window.EventSource) return;

  if (customerEventSource) {
    try { customerEventSource.close(); } catch (_) {}
    customerEventSource = null;
  }

  try {
    const sseUrl = `../api/messages/stream?token=${encodeURIComponent(token)}`;
    customerEventSource = new EventSource(sseUrl);

    customerEventSource.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && Array.isArray(data.messages)) {
          applyCustomerMessagesData(data.messages);
        }
      } catch (e) {
        console.warn('Customer SSE update parse error:', e);
      }
    });

    customerEventSource.addEventListener('typing', (event) => {
      try {
        const data = JSON.parse(event.data);
        setSalonTypingStatus(!!data.is_typing);
      } catch (e) {
        console.warn('Customer SSE typing parse error:', e);
      }
    });

    customerEventSource.onerror = () => {
      // EventSource automatically handles reconnection
    };
  } catch (err) {
    console.warn('Customer SSE connection error, fallback polling active:', err);
  }
}

// Immediate refresh on tab focus / visibility
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadCustomerChatData();
    loadNotificationBadges();
    loadAppointmentContext();
  }
  startCustomerRealtimePolling();
});

window.addEventListener('focus', () => {
  loadCustomerChatData();
  loadNotificationBadges();
  startCustomerRealtimePolling();
});

// Purge any old hardcoded demo messages lingering in browser storage from legacy versions
function purgeLegacyMockStorage() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('nelys_messages') || k.includes('messages') || k.includes('chat'))) {
        const val = localStorage.getItem(k);
        if (val && (
          val.includes('Haircut tomorrow at 2:00 PM') ||
          val.includes('change my service to Brazilian') ||
          val.includes('adjust the total upon your arrival') ||
          val.includes('Hello Maria!')
        )) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Legacy storage check error:', e);
  }
}

// 1. Initialize Patron Profile in Sidebar and State
function initPatronProfile() {
  const savedUserJson = localStorage.getItem('nelys_user');
  if (!savedUserJson) {
    currentUser = { id: 'guest', full_name: 'Client Patron', email: '' };
    return;
  }

  try {
    currentUser = JSON.parse(savedUserJson);
    const displayName = currentUser.full_name || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Client Patron');

    const sidebarName = document.getElementById('customerSidebarName') || document.querySelector('aside .truncate');
    if (sidebarName) {
      sidebarName.textContent = displayName;
    }

    const avatarEl = document.getElementById('customerAvatarInitials') || document.querySelector('aside .w-10.h-10.rounded-full');
    if (avatarEl) {
      const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      if (initials) avatarEl.textContent = initials;
    }
  } catch (e) {
    console.warn('Error reading saved user in messages:', e);
    currentUser = { id: 'guest', full_name: 'Client Patron', email: '' };
  }
}

// 2. Storage Key per user (for local caching & fallback)
function getStorageKey() {
  const uid = currentUser && (currentUser.id || currentUser.email) ? (currentUser.id || currentUser.email) : 'guest';
  return `nelys_messages_${uid}`;
}

// 3. Load Chat Data from Backend API (with LocalStorage cache fallback)
async function loadCustomerChatData() {
  const token = localStorage.getItem('nelys_token');

  // If user is logged in, fetch authoritative chat stream from backend with cache-busting
  if (token) {
    try {
      const res = await fetch(`../api/messages?limit=50&_t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success || json.status === 'success') {
          applyCustomerMessagesData(json.data);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend messages API unreachable, continuing with cached chat:', err);
    }
  }
}

function applyCustomerMessagesData(payload) {
  if (!payload) return;
  const rawData = Array.isArray(payload) ? payload : (Array.isArray(payload.messages) ? payload.messages : []);
  if (payload.has_more !== undefined) {
    customerHasMore = !!payload.has_more;
  }
  if (payload.oldest_id !== undefined) {
    customerOldestId = payload.oldest_id;
  } else if (rawData.length > 0 && !customerOldestId) {
    customerOldestId = rawData[0].id;
  }

  const newHash = JSON.stringify(rawData);
  if (newHash !== lastRendered_cust_messages_Hash || customerChatData.messages.length === 0) {
    lastRendered_cust_messages_Hash = newHash;
    const prevCount = customerChatData.messages.length;

    // Detect new incoming salon messages for sound chime & desktop notification
    if (lastSeenCustomerMessageId > 0 && rawData.length > 0) {
      const newIncomingSalonMsg = rawData.find(m => (m.sender === 'admin' || m.sender === 'salon') && m.id > lastSeenCustomerMessageId);
      if (newIncomingSalonMsg) {
        playMessageNotificationSound();
        showBrowserNotification("Nely's Salon", newIncomingSalonMsg.text || 'Sent an attachment');
        if (document.hidden) {
          startTabTitleFlash("Nely's Salon");
        }
      }
    }

    if (rawData.length > 0) {
      const maxId = Math.max(...rawData.map(m => m.id || 0));
      if (maxId > lastSeenCustomerMessageId) {
        lastSeenCustomerMessageId = maxId;
      }
    }

    if (rawData.length > 0) {
      if (customerChatData.messages.length > rawData.length) {
        // Keep previously loaded older pages, merge any new incoming messages
        const existingIds = new Set(customerChatData.messages.map(m => m.id));
        const newIncoming = rawData.filter(m => !existingIds.has(m.id)).map(mapBackendMessage);
        if (newIncoming.length > 0) {
          customerChatData.messages.push(...newIncoming);
        }
        // Update statuses of existing messages (e.g. read receipts)
        const statusMap = new Map(rawData.map(m => [m.id, m.status]));
        customerChatData.messages.forEach(m => {
          if (statusMap.has(m.id)) {
            m.status = statusMap.get(m.id);
          }
        });
      } else {
        customerChatData.messages = rawData.map(mapBackendMessage);
      }
      isEmptyState = false;
    } else {
      customerChatData.messages = [];
      isEmptyState = true;
    }

    saveCustomerChatData();
    renderChatStream();
    if (customerChatData.messages.length > prevCount || prevCount === 0) {
      scrollChatToBottom(false);
    }

    // Automatically mark incoming salon messages as read when viewing chat
    const hasUnread = rawData.some(m => (m.sender === 'admin' || m.sender === 'salon') && m.status !== 'read');
    if (hasUnread) {
      markCustomerMessagesRead();
    }
  }
}

async function loadOlderCustomerMessages() {
  if (isLoadingOlderMessages || !customerOldestId) return;
  isLoadingOlderMessages = true;

  const btn = document.getElementById('btnLoadOlderMessages');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-[11px]"></i><span>Loading...</span>';
  }

  const token = localStorage.getItem('nelys_token') || sessionStorage.getItem('nelys_token');
  if (!token) {
    isLoadingOlderMessages = false;
    return;
  }

  try {
    const res = await fetch(`../api/messages?limit=50&before_id=${customerOldestId}&_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (res.ok) {
      const json = await res.json();
      const data = json.data || json;
      const olderMsgs = Array.isArray(data.messages) ? data.messages : (Array.isArray(data) ? data : []);

      customerHasMore = data.has_more ?? false;
      if (olderMsgs.length > 0) {
        customerOldestId = data.oldest_id ?? olderMsgs[0].id;

        const container = document.getElementById('customerChatStream');
        const prevScrollHeight = container ? container.scrollHeight : 0;
        const prevScrollTop = container ? container.scrollTop : 0;

        // Prepend older messages
        const mappedOlder = olderMsgs.map(mapBackendMessage);
        customerChatData.messages = [...mappedOlder, ...customerChatData.messages];
        saveCustomerChatData();
        lastRendered_cust_messages_Hash = JSON.stringify(customerChatData.messages);

        renderChatStream();

        // Restore scroll position so user doesn't jump
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
        }
      } else {
        customerHasMore = false;
        renderChatStream();
      }
    }
  } catch (err) {
    console.warn('Failed to load older customer messages:', err);
  } finally {
    isLoadingOlderMessages = false;
  }
}

async function markCustomerMessagesRead() {
  const token = localStorage.getItem('nelys_token') || sessionStorage.getItem('nelys_token');
  if (!token) return;
  try {
    await fetch('../api/messages/mark-read', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (_) {}
}

function renderTickIcon(status) {
  if (status === 'read') {
    return '<span title="Read"><i class="fa-solid fa-check-double text-emerald-400 text-[10px]"></i></span>';
  }
  if (status === 'delivered') {
    return '<span title="Delivered"><i class="fa-solid fa-check-double text-stone-300 text-[10px]"></i></span>';
  }
  return '<span title="Sent"><i class="fa-solid fa-check text-stone-300 text-[10px]"></i></span>';
}

function emitCustomerTyping(isTyping) {
  const token = localStorage.getItem('nelys_token') || sessionStorage.getItem('nelys_token');
  if (!token) return;
  fetch('../api/messages/typing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ is_typing: isTyping })
  }).catch(() => {});
}

function handleCustomerTypingInput() {
  if (customerTypingThrottleTimer) return;
  emitCustomerTyping(true);
  customerTypingThrottleTimer = setTimeout(() => {
    customerTypingThrottleTimer = null;
  }, 600);
}

function setSalonTypingStatus(isTyping) {
  isSalonTyping = isTyping;
  if (salonTypingDismissTimer) {
    clearTimeout(salonTypingDismissTimer);
    salonTypingDismissTimer = null;
  }

  const container = document.getElementById('customerChatStream');
  if (!container) return;

  const existing = document.getElementById('salonTypingIndicator');

  if (isTyping) {
    if (!existing) {
      const bubbleEl = document.createElement('div');
      bubbleEl.id = 'salonTypingIndicator';
      bubbleEl.className = 'flex items-start gap-2.5 sm:gap-3 mb-3.5';
      bubbleEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-[#541A1A] text-[#F1E2D1] font-bold text-xs flex items-center justify-center border border-[#DCC3AA] shrink-0 mt-1 shadow-xs">
          NS
        </div>
        <div class="bg-white text-[#2b1d1d] border border-[#DCC3AA]/80 px-4 py-2.5 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite; animation-delay: -0.3s;"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite; animation-delay: -0.15s;"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#810B38]" style="animation: bounce 0.45s infinite;"></span>
          <span class="text-xs text-[#735e5e] font-medium ml-1.5">Nely's Salon is typing...</span>
        </div>
      `;
      container.appendChild(bubbleEl);
      scrollChatToBottom(false);
    }
    salonTypingDismissTimer = setTimeout(() => {
      setSalonTypingStatus(false);
    }, 4000);
  } else {
    if (existing) {
      existing.remove();
    }
  }
}

// Date and Time Parsing & Formatting Helpers
function parseMessageDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  try {
    const s = String(dateStr).trim();
    // Handle MySQL "YYYY-MM-DD HH:mm:ss" by replacing space with T for ISO-like parsing
    const isoCandidate = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;
    let d = new Date(isoCandidate);
    if (!isNaN(d.getTime())) return d;

    // Fallback replace dashes with slashes
    d = new Date(s.replace(/-/g, '/'));
    if (!isNaN(d.getTime())) return d;
  } catch (_) {}
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

// Map backend DB message record to UI model
function mapBackendMessage(item) {
  const d = parseMessageDate(item.created_at);
  const timeStr = formatTime(d);
  const dateStr = formatMessageDateHeader(d);

  return {
    id: item.id,
    sender: item.sender || 'customer',
    senderName: (item.sender === 'salon' || (item.sender_name && item.sender_name.includes('Concierge')))
      ? "Nely's Salon"
      : (item.sender_name || (item.sender === 'salon' ? "Nely's Salon" : 'You')),
    text: item.text || '',
    time: timeStr,
    date: dateStr,
    created_at: item.created_at || d.toISOString(),
    status: item.status || 'sent',
    attachment: item.attachment_name ? {
      name: item.attachment_name,
      url: item.attachment_url || null,
      dataUrl: item.attachment_url || null
    } : null
  };
}

// 4. Save Chat Data to LocalStorage cache
function saveCustomerChatData() {
  const key = getStorageKey();
  try {
    localStorage.setItem(key, JSON.stringify(customerChatData.messages));
  } catch (e) {
    console.warn('Error saving messages to localStorage cache:', e);
  }
}

// 5. Fetch Live Bookings to display appointment context banner and update sidebar badges
async function loadAppointmentContext() {
  const token = localStorage.getItem('nelys_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const res = await fetch('../api/bookings', { headers });
    if (!res.ok) return;

    const json = await res.json();
    if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
      const bookings = json.data;

      // Filter active bookings (pending or confirmed)
      const activeBookings = bookings.filter(b => {
        const st = (b.status || '').toLowerCase();
        return st === 'pending' || st === 'confirmed';
      });

      // Update Sidebar Badge
      const sidebarBadge = document.getElementById('sidebarAppointmentsBadge');
      if (sidebarBadge) {
        if (activeBookings.length > 0) {
          sidebarBadge.textContent = activeBookings.length;
          sidebarBadge.classList.remove('hidden');
        } else {
          sidebarBadge.classList.add('hidden');
        }
      }

      // Check for nearest upcoming appointment
      if (activeBookings.length > 0) {
        const banner = document.getElementById('chatAppointmentContext');
        const serviceEl = document.getElementById('chatContextService');
        const timeEl = document.getElementById('chatContextTime');

        if (banner && serviceEl) {
          activeBookings.sort((a, b) => new Date(a.booking_date || 0) - new Date(b.booking_date || 0));
          const nearest = activeBookings[0];

          const serviceName = nearest.service_name || nearest.service_id || 'Salon Appointment';
          let formattedDate = nearest.booking_date || '';
          try {
            const d = new Date(nearest.booking_date);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          } catch (_) {}

          const bookingTime = nearest.booking_time || '';
          const timeFormatted = bookingTime ? formatTimeString(bookingTime) : '';

          serviceEl.textContent = serviceName;
          if (timeEl) {
            timeEl.textContent = `· ${formattedDate}${timeFormatted ? ` at ${timeFormatted}` : ''}`;
          }
          banner.classList.remove('hidden');
        }
      }
    }
  } catch (err) {
    console.warn('Could not load appointment context:', err);
  }
}

// 6. Fetch Unread Notifications for Sidebar & Mobile Badges
async function loadNotificationBadges() {
  const token = localStorage.getItem('nelys_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const res = await fetch('../api/notifications', { headers });
    let unreadCount = 0;

    let readSet = new Set();
    try {
      const storedRead = localStorage.getItem('nelys_read_notifications');
      if (storedRead) readSet = new Set(JSON.parse(storedRead));
    } catch (_) {}

    if (res.ok) {
      const json = await res.json();
      if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
        unreadCount = json.data.filter(n => !n.is_read && !readSet.has(n.id)).length;
      }
    }

    const badge = document.getElementById('sidebarNotificationsBadge');
    const mobileDot = document.getElementById('mobileNotifDot');

    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (mobileDot) {
      if (unreadCount > 0) {
        mobileDot.classList.remove('hidden');
      } else {
        mobileDot.classList.add('hidden');
      }
    }
  } catch (e) {
    console.warn('Could not load notifications badge:', e);
  }
}

// 7. Event Listeners Setup
function setupEventListeners() {
  // Desktop Search
  const searchInput = document.getElementById('searchChatInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  // Mobile Search
  const mobileSearchInput = document.getElementById('mobileSearchChatInput');
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', handleSearchInput);
  }

  // Form submit
  const messageForm = document.getElementById('customerMessageForm');
  if (messageForm) {
    messageForm.addEventListener('submit', handleSendMessage);
  }

  const msgInput = document.getElementById('customerMessageInput');
  if (msgInput) {
    msgInput.addEventListener('focus', () => {
      requestNotificationPermission();
    }, { once: true });
    msgInput.addEventListener('input', handleCustomerTypingInput);
    msgInput.addEventListener('blur', () => {
      if (!msgInput.value.trim()) {
        emitCustomerTyping(false);
      }
    });
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
      }
    });
  }

  // File Attachment input
  const fileInput = (document.getElementById('chatFileInput') || document.getElementById('customerFileInput'));
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelected);
  }
}

// 8. Render Chat Messages Stream
function renderChatStream() {
  const container = document.getElementById('customerChatStream');
  const emptyContainer = (document.getElementById('emptyChatState') || document.getElementById('emptyStateView'));
  if (!container) return;

  if (isEmptyState || customerChatData.messages.length === 0) {
    container.innerHTML = '';
    if (emptyContainer) {
      emptyContainer.classList.remove('hidden');
    }
    return;
  }

  if (emptyContainer) {
    emptyContainer.classList.add('hidden');
  }

  let filtered = customerChatData.messages;
  if (searchQuery) {
    filtered = filtered.filter(m => 
      (m.text || '').toLowerCase().includes(searchQuery) ||
      (m.attachment && m.attachment.name.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-stone-400 space-y-2">
        <i class="fa-solid fa-magnifying-glass text-2xl text-stone-300"></i>
        <p class="text-xs">No messages matching "<strong>${escapeHtml(searchQuery)}</strong>"</p>
        <button type="button" onclick="clearMessageSearch()" class="text-xs text-[#810B38] font-bold hover:underline">
          Clear Search
        </button>
      </div>
    `;
    return;
  }

  let html = '';

  if (customerHasMore && !searchQuery) {
    html += `
      <div id="loadOlderContainer" class="flex justify-center my-3">
        <button 
          type="button" 
          id="btnLoadOlderMessages" 
          onclick="loadOlderCustomerMessages()"
          class="px-4 py-1.5 rounded-full bg-[#FAF6F0] hover:bg-[#F1E2D1] text-[#810B38] border border-[#DCC3AA] text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:shadow-sm">
          <i class="fa-solid fa-clock-rotate-left text-[11px]"></i>
          <span>Load earlier messages</span>
        </button>
      </div>
    `;
  }

  let lastDateGroupKey = null;

  filtered.forEach(msg => {
    const msgDate = parseMessageDate(msg.created_at);
    const groupKey = `${msgDate.getFullYear()}-${String(msgDate.getMonth() + 1).padStart(2, '0')}-${String(msgDate.getDate()).padStart(2, '0')}`;

    if (groupKey !== lastDateGroupKey) {
      lastDateGroupKey = groupKey;
      const headerText = formatMessageDateHeader(msgDate);
      html += `
        <div class="flex items-center justify-center my-4">
          <span class="px-3.5 py-1 rounded-full bg-[#FAF6F0] border border-[#DCC3AA]/70 text-[11px] font-semibold text-[#735e5e] shadow-xs">
            ${escapeHtml(headerText)}
          </span>
        </div>
      `;
    }

    const isCustomer = msg.sender === 'customer';

    if (isCustomer) {
      // Outgoing customer bubble (Burgundy)
      html += `
        <div class="flex items-end justify-end gap-2 mb-3.5 group" id="msg-${msg.id}">
          <!-- Hover action button: Delete message -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-2">
            <button 
              type="button" 
              onclick="promptDeleteMessage(${msg.id})"
              title="Delete message"
              class="w-6 h-6 rounded-full bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-600 flex items-center justify-center text-[10px] transition-colors">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>

          <div class="max-w-[85%] sm:max-w-[70%]">
            <div class="text-[10px] font-bold text-[#735e5e] text-right mb-1 pr-1">You</div>
            <div class="bg-[#810B38] text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-md space-y-1">
              ${msg.text ? `<p class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(msg.text)}</p>` : ''}
              ${renderAttachmentBubble(msg.attachment, true)}
            </div>
            <div class="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-[#735e5e]">
              <span>${escapeHtml(msg.time || formatTime(msgDate))}</span>
              ${renderTickIcon(msg.status)}
            </div>
          </div>
        </div>
      `;
    } else {
      // Incoming salon bubble (White card)
      html += `
        <div class="flex items-start gap-2.5 sm:gap-3 mb-3.5" id="msg-${msg.id}">
          <div class="w-8 h-8 rounded-full bg-[#541A1A] text-[#F1E2D1] font-bold text-xs flex items-center justify-center border border-[#DCC3AA] shrink-0 mt-1 shadow-xs">
            NS
          </div>
          <div class="max-w-[85%] sm:max-w-[70%]">
            <div class="flex items-center gap-2 mb-1 pl-1">
              <span class="text-[11px] font-bold text-[#541A1A]">${escapeHtml(msg.senderName || "Nely's Salon")}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">Official</span>
            </div>
            <div class="bg-white text-[#2b1d1d] border border-[#DCC3AA]/80 px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm space-y-1">
              ${msg.text ? `<p class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-[#2b1d1d]">${escapeHtml(msg.text)}</p>` : ''}
              ${renderAttachmentBubble(msg.attachment, false)}
            </div>
            <div class="flex items-center gap-1.5 mt-1 pl-1 text-[10px] text-[#735e5e]">
              <span>${escapeHtml(msg.time || formatTime(msgDate))}</span>
            </div>
          </div>
        </div>
      `;
    }
  });

  if (isSalonTyping) {
    html += `
      <div id="salonTypingIndicator" class="flex items-start gap-2.5 sm:gap-3 mb-3.5 transition-all duration-300">
        <div class="w-8 h-8 rounded-full bg-[#541A1A] text-[#F1E2D1] font-bold text-xs flex items-center justify-center border border-[#DCC3AA] shrink-0 mt-1 shadow-xs">
          NS
        </div>
        <div class="bg-white text-[#2b1d1d] border border-[#DCC3AA]/80 px-4 py-2.5 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#810B38] animate-bounce [animation-delay:-0.3s]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#810B38] animate-bounce [animation-delay:-0.15s]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#810B38] animate-bounce"></span>
          <span class="text-xs text-[#735e5e] font-medium ml-1.5">Nely's Salon is typing...</span>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  scrollChatToBottom();
}

function renderAttachmentBubble(attachment, isCustomer) {
  if (!attachment) return '';

  const fileUrl = attachment.url || attachment.dataUrl || '';
  const isImg = fileUrl && (
    fileUrl.startsWith('data:image') || 
    fileUrl.includes('/uploads/messages/') && /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(fileUrl) ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(attachment.name || '')
  );
  const textColor = isCustomer ? 'text-white' : 'text-[#541A1A]';
  const subColor = isCustomer ? 'text-white/80' : 'text-[#735e5e]';
  const bgBox = isCustomer ? 'bg-black/10' : 'bg-[#FAF6F0] border border-[#DCC3AA]';

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
    <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="mt-2 flex items-center gap-2.5 p-2 rounded-xl ${bgBox} hover:opacity-90 transition-opacity">
      <div class="w-8 h-8 rounded-lg bg-[#FAF6F0] text-[#810B38] flex items-center justify-center text-sm shrink-0 border border-[#DCC3AA]/40">
        <i class="fa-solid fa-file"></i>
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-xs font-semibold ${textColor} truncate">${escapeHtml(attachment.name)}</div>
        <div class="text-[10px] ${subColor}">Click to view / download</div>
      </div>
      <i class="fa-solid fa-arrow-up-right-from-square text-[10px] ${subColor} pr-1"></i>
    </a>
  `;
}

function scrollChatToBottom(smooth = false) {
  const container = document.getElementById('customerChatStream');
  if (container) {
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }
}

// 9. Send Message Handler
async function handleSendMessage(e) {
  if (e) e.preventDefault();

  const input = document.getElementById('customerMessageInput');
  if (!input) return;

  const text = input.value.trim();
  const fileAttachment = attachedFile;

  if (!text && !fileAttachment) return;

  // Clear typing indicator status immediately
  if (customerTypingThrottleTimer) {
    clearTimeout(customerTypingThrottleTimer);
    customerTypingThrottleTimer = null;
  }
  emitCustomerTyping(false);

  const token = localStorage.getItem('nelys_token');
  const now = new Date();
  const timeStr = formatTime(now);
  const dateStr = formatMessageDateHeader(now);

  const localMsg = {
    id: Date.now(),
    sender: 'customer',
    senderName: currentUser && currentUser.full_name ? currentUser.full_name : 'You',
    text: text,
    time: timeStr,
    date: dateStr,
    created_at: now.toISOString(),
    status: 'sent',
    attachment: fileAttachment ? {
      name: fileAttachment.name,
      dataUrl: fileAttachment.dataUrl
    } : null
  };

  // Optimistically add to chat stream
  customerChatData.messages.push(localMsg);
  isEmptyState = false;
  saveCustomerChatData();

  // Reset inputs
  input.value = '';
  clearAttachedFile();
  lastRendered_cust_messages_Hash = '';
  renderChatStream();
  scrollChatToBottom(false);

  // Post message to live Backend API
  if (token) {
    try {
      const res = await fetch('../api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: text,
          attachment_name: fileAttachment ? fileAttachment.name : null,
          attachment_url: fileAttachment ? fileAttachment.dataUrl : null
        })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success || result.status === 'success') {
          if (result.data && result.data.id) {
            localMsg.id = result.data.id;
            localMsg.created_at = result.data.created_at || localMsg.created_at;
            localMsg.time = result.data.time || localMsg.time;
          }
          saveCustomerChatData();
          lastRendered_cust_messages_Hash = '';
          await loadCustomerChatData();
        }
      }
    } catch (err) {
      console.warn('Backend message sync notice:', err);
    }
  }

  // (No bot replies for customer messages)
}

// 10. Quick Action Chips & Topic Starters
function sendQuickPrompt(promptText) {
  const input = document.getElementById('customerMessageInput');
  if (input) {
    input.value = promptText;
    autoResizeTextarea(input);
    input.focus();
  }
}

function applyQuickTopic(topic) {
  const input = document.getElementById('customerMessageInput');
  if (!input) return;

  const topics = {
    'appointment': 'Hi! I would like to inquire about booking an appointment.',
    'services': 'Hi! I would like to ask about your available salon services and packages.',
    'pricing': 'Hi! Could you please share the pricing and rates for your treatments?',
    'availability': 'Hi! Are there available slots for today or this week?',
    'info': "Hi! I would like to ask for more information regarding Nely's Salon."
  };

  input.value = topics[topic] || 'Hello! I would like to inquire about your salon services.';
  input.focus();
  autoResizeTextarea(input);
}

function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// 12. File Attachment Handling
function triggerFileInput() {
  const fileInput = (document.getElementById('chatFileInput') || document.getElementById('customerFileInput'));
  if (fileInput) fileInput.click();
}

function handleFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('File size must be under 5MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    attachedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: evt.target.result
    };
    showAttachmentPreview();
  };
  reader.readAsDataURL(file);
}

function showAttachmentPreview() {
  const previewBox = (document.getElementById('attachmentPreviewBox') || document.getElementById('customerAttachmentPreview'));
  const previewName = (document.getElementById('previewFileName') || document.getElementById('customerAttachmentFileName'));
  const previewThumb = document.getElementById('previewThumbnail');

  if (!previewBox || !attachedFile) return;

  if (previewName) previewName.textContent = attachedFile.name;

  if (previewThumb) {
    if (attachedFile.dataUrl.startsWith('data:image')) {
      previewThumb.innerHTML = `<img src="${attachedFile.dataUrl}" class="w-full h-full object-cover rounded-md">`;
    } else {
      previewThumb.innerHTML = `<i class="fa-solid fa-file text-[#810B38]"></i>`;
    }
  }

  previewBox.classList.remove('hidden');
}

function clearAttachedFile() {
  attachedFile = null;
  const previewBox = (document.getElementById('attachmentPreviewBox') || document.getElementById('customerAttachmentPreview'));
  const fileInput = (document.getElementById('chatFileInput') || document.getElementById('customerFileInput'));
  if (previewBox) previewBox.classList.add('hidden');
  if (fileInput) fileInput.value = '';
}

// 13. Search Filtering in Messages
function handleSearchInput(e) {
  searchQuery = (e.target.value || '').trim().toLowerCase();
  renderChatStream();
}

function toggleMobileSearch() {
  const mobileBar = document.getElementById('mobileSearchBar');
  const mobileInput = document.getElementById('mobileSearchChatInput');
  if (!mobileBar) return;

  if (mobileBar.classList.contains('hidden')) {
    mobileBar.classList.remove('hidden');
    if (mobileInput) mobileInput.focus();
  } else {
    mobileBar.classList.add('hidden');
    if (mobileInput) mobileInput.value = '';
    searchQuery = '';
    renderChatStream();
  }
}

function clearMessageSearch() {
  searchQuery = '';
  const searchInput = document.getElementById('searchChatInput');
  const mobileInput = document.getElementById('mobileSearchChatInput');
  const mobileBar = document.getElementById('mobileSearchBar');

  if (searchInput) searchInput.value = '';
  if (mobileInput) mobileInput.value = '';
  if (mobileBar) mobileBar.classList.add('hidden');

  renderChatStream();
}

// Delete Single Message
function promptDeleteMessage(msgId) {
  messageToDeleteId = msgId;
  const modal = document.getElementById('deleteMessageModal');
  if (modal) {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.classList.remove('hidden');
    }
  }
}

function closeDeleteMessageModal() {
  messageToDeleteId = null;
  const modal = document.getElementById('deleteMessageModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.classList.add('hidden');
    }
  }
}

async function confirmDeleteMessage() {
  if (!messageToDeleteId) return;

  const token = localStorage.getItem('nelys_token');
  const idToDelete = messageToDeleteId;

  // Optimistically remove from state
  customerChatData.messages = customerChatData.messages.filter(m => m.id !== idToDelete);
  saveCustomerChatData();

  if (customerChatData.messages.length === 0) {
    isEmptyState = true;
  }

  closeDeleteMessageModal();
  renderChatStream();

  // Send DELETE request to Backend if authenticated and valid ID
  if (token && typeof idToDelete === 'number') {
    try {
      await fetch(`../api/messages/${idToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.warn('Backend message delete notice:', e);
    }
  }

  showToast('Message removed from chat history.', 'info');
}

// 14. Clear All Chat History (Connected to Backend POST /api/messages/clear)
function promptClearChat() {
  const modal = document.getElementById('clearChatModal');
  if (modal) {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.classList.remove('hidden');
    }
  }
}

function closeClearChatModal() {
  const modal = document.getElementById('clearChatModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.classList.add('hidden');
    }
  }
}

async function confirmClearChat() {
  const token = localStorage.getItem('nelys_token');

  customerChatData.messages = [];
  isEmptyState = true;
  saveCustomerChatData();
  closeClearChatModal();
  renderChatStream();

  if (token) {
    try {
      await fetch('../api/messages/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.warn('Backend clear chat notice:', e);
    }
  }

  showToast('Chat history cleared.', 'info');
}

// Dialog outside click backdrop closing
function setupDialogBackdropClicks() {
  [document.getElementById('deleteMessageModal'), document.getElementById('clearChatModal'), document.getElementById('logoutModal')].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        const rect = modal.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          if (typeof modal.close === 'function') modal.close();
        }
      });
    }
  });
}

// 15. Start New Conversation
function startNewConversation() {
  isEmptyState = false;
  loadCustomerChatData();
  renderChatStream();
}

// 16. Mobile Sidebar Toggle
function toggleMobileSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!sidebar) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  const shouldOpen = typeof force === 'boolean' ? force : isClosed;

  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    if (backdrop) backdrop.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

// 17. Mobile Salon Info Drawer
function toggleSalonInfoDrawer(open) {
  const drawer = document.getElementById('salonInfoMobileDrawer');
  if (!drawer) return;

  if (open) {
    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  } else {
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }
}

// 18. Logout Modal Handlers
function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.showModal === 'function') {
    if (window.innerWidth < 1024 && typeof toggleMobileSidebar === 'function') {
      toggleMobileSidebar(false);
    }
    modal.showModal();
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.close === 'function') {
    modal.close();
  }
}

function confirmLogout() {
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  sessionStorage.clear();
  showToast('Logging out...', 'info');
  window.location.href = '../login.html';
}

function handleLogout(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  openLogoutModal();
  return false;
}

// Global window bindings
window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.handleLogout = handleLogout;
window.applyQuickTopic = applyQuickTopic;
window.autoResizeTextarea = autoResizeTextarea;
window.triggerCustomerFileInput = triggerFileInput;
window.triggerFileInput = triggerFileInput;
window.clearCustomerAttachment = clearAttachedFile;
window.clearAttachedFile = clearAttachedFile;
window.toggleSalonInfoDrawer = toggleSalonInfoDrawer;
window.promptClearChat = promptClearChat;
window.closeClearChatModal = closeClearChatModal;
window.confirmClearChat = confirmClearChat;
window.promptDeleteMessage = promptDeleteMessage;
window.closeDeleteMessageModal = closeDeleteMessageModal;
window.confirmDeleteMessage = confirmDeleteMessage;
window.clearMessageSearch = clearMessageSearch;
window.toggleMobileSearch = toggleMobileSearch;
window.startNewConversation = startNewConversation;
window.toggleMobileSidebar = toggleMobileSidebar;

// 19. Toast Notification Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('customerToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-rose-900 border-rose-700' : 'bg-[#541A1A] border-[#DCC3AA]';
  const iconClass = type === 'error' ? 'fa-circle-exclamation text-rose-300' : 'fa-circle-check text-emerald-400';

  toast.className = `${bgClass} text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs border animate-slide-up pointer-events-auto`;
  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span class="font-medium">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utility: Format Time
function formatTime(d) {
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes} ${ampm}`;
}

// Utility: Format HH:mm string to h:mm A
function formatTimeString(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// Utility: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Lifecycle Bootstrapping
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomerMessagesPage);
} else {
  initCustomerMessagesPage();
}

