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

// ================= DOM INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupEventListeners();
  fetchConversationsData();
  fetchSidebarStats();
});

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
async function fetchConversationsData() {
  try {
    const res = await fetch(`../api/messages?search=${encodeURIComponent(searchQuery)}&filter=${encodeURIComponent(currentFilter)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
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
    if (json.data) {
      if (Array.isArray(json.data.conversations)) {
        conversationsData = json.data.conversations;
      } else if (Array.isArray(json.data)) {
        conversationsData = json.data;
      }

      if (json.data.unread_total !== undefined) {
        totalUnreadCount = json.data.unread_total;
      } else {
        totalUnreadCount = conversationsData.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      }
    }

    // Update unread badge in column header & sidebar
    updateUnreadBadges();

    // Select first conversation if none selected
    if (conversationsData.length > 0) {
      if (!currentConversationId || !conversationsData.some(c => c.id == currentConversationId)) {
        currentConversationId = conversationsData[0].id;
      }
    } else {
      currentConversationId = null;
    }

    renderConversationsList();
    renderActiveConversation();

  } catch (err) {
    console.error('Error fetching conversations from backend:', err);
    showToast('Failed to load conversations from server.', 'error');
  }
}

// Fetch sidebar badge counts
async function fetchSidebarStats() {
  try {
    const res = await fetch('../api/dashboard/stats', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
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

  // Textarea Enter key (Shift+Enter for newline)
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
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
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery) ||
      (conv.messages && conv.messages.some(m => (m.text || '').toLowerCase().includes(searchQuery)));

    // Filter match
    if (!matchesSearch) return false;
    if (currentFilter === 'unread') return conv.isUnread;
    if (currentFilter === 'appointments') return conv.hasAppointment;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-[#735e5e]">
        <div class="w-12 h-12 rounded-full bg-[#FAF6F0] border border-[#DCC3AA]/50 flex items-center justify-center mx-auto mb-3 text-[#810B38]">
          <i class="fa-solid fa-comments text-lg"></i>
        </div>
        <p class="text-sm font-semibold text-[#541A1A]">No messages found</p>
        <p class="text-xs text-[#735e5e] mt-1">Try another search or filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(conv => {
    const isActive = conv.id == currentConversationId;
    const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
    const previewText = lastMsg 
      ? (lastMsg.sender === 'admin' ? `You: ${lastMsg.text}` : lastMsg.text) 
      : 'No messages yet';

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
            ${escapeHtml(conv.avatar)}
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
              <span>${escapeHtml(conv.name)}</span>
              ${conv.isMuted ? '<i class="fa-solid fa-bell-slash text-[10px] text-[#735e5e]/60" title="Muted"></i>' : ''}
            </h4>
            <span class="text-[11px] font-semibold text-[#735e5e]/70 shrink-0">${escapeHtml(conv.lastTime || '')}</span>
          </div>

          <p class="text-xs truncate ${conv.isUnread ? 'font-bold text-[#2b1d1d]' : 'text-[#735e5e]'}">
            ${escapeHtml(previewText)}
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
  if (conv && conv.isUnread) {
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
    // If no active conversation, clear view
    const headerName = document.getElementById('chatHeaderName');
    if (headerName) headerName.textContent = 'No Conversation Selected';
    const stream = document.getElementById('messagesStream');
    if (stream) stream.innerHTML = `<div class="p-8 text-center text-[#735e5e] text-xs">Select a customer conversation from the list to start messaging.</div>`;
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

// Render Message Bubbles in Center Column
function renderMessageStream(conv) {
  const container = document.getElementById('messagesStream');
  if (!container) return;

  if (!conv.messages || conv.messages.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-[#735e5e]">
        <div class="w-12 h-12 rounded-full bg-white border border-[#DCC3AA]/50 flex items-center justify-center mx-auto mb-2 text-[#810B38]">
          <i class="fa-solid fa-hand-wave text-base"></i>
        </div>
        <p class="text-xs font-bold text-[#541A1A]">No message history yet</p>
        <p class="text-[11px] text-[#735e5e] mt-1">Start a conversation with ${escapeHtml(conv.name)} below.</p>
      </div>
    `;
    return;
  }

  const dateHeading = conv.messages[0]?.date || 'Today';

  container.innerHTML = `
    <!-- Date Header Pill -->
    <div class="flex items-center justify-center my-4">
      <span class="px-3.5 py-1 rounded-full bg-[#FAF6F0] border border-[#DCC3AA]/70 text-[11px] font-semibold text-[#735e5e] shadow-xs">
        ${escapeHtml(dateHeading)}
      </span>
    </div>
  ` + conv.messages.map(msg => {
    const isAdmin = msg.sender === 'admin' || msg.sender === 'salon';

    if (isAdmin) {
      return `
        <!-- Admin Outgoing Bubble -->
        <div class="flex items-end justify-end gap-2 mb-3.5 group">
          <div class="max-w-[78%] sm:max-w-[70%]">
            <div class="bg-[#810B38] text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-md space-y-1">
              <p class="text-xs sm:text-sm leading-relaxed">${escapeHtml(msg.text)}</p>
              ${msg.attachment ? `
                <div class="mt-2 p-2 rounded-xl bg-black/20 flex items-center gap-2 text-xs">
                  <i class="fa-solid fa-paperclip text-[#DCC3AA]"></i>
                  <span class="truncate underline font-mono">${escapeHtml(msg.attachment.name)}</span>
                </div>
              ` : ''}
            </div>
            <div class="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-[#735e5e]">
              <span>${escapeHtml(msg.time)}</span>
              <span title="Read">
                <i class="fa-solid fa-check-double text-emerald-600 text-[10px]"></i>
              </span>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <!-- Customer Incoming Bubble -->
        <div class="flex items-start gap-2.5 mb-3.5 group">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#541A1A] to-[#810B38] text-[#F1E2D1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#DCC3AA] mt-1 shadow-xs">
            ${escapeHtml(conv.avatar)}
          </div>
          <div class="max-w-[78%] sm:max-w-[70%]">
            <div class="text-[11px] font-bold text-[#541A1A] mb-1 pl-1">${escapeHtml(conv.name)}</div>
            <div class="bg-white border border-[#DCC3AA]/70 text-[#2b1d1d] px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm space-y-1">
              <p class="text-xs sm:text-sm leading-relaxed">${escapeHtml(msg.text)}</p>
              ${msg.attachment ? `
                <div class="mt-2 p-2 rounded-xl bg-[#FAF6F0] flex items-center gap-2 text-xs border border-[#DCC3AA]/40">
                  <i class="fa-solid fa-paperclip text-[#810B38]"></i>
                  <span class="truncate underline font-mono text-[#810B38]">${escapeHtml(msg.attachment.name)}</span>
                </div>
              ` : ''}
            </div>
            <div class="flex items-center gap-1.5 mt-1 text-[10px] text-[#735e5e] pl-1">
              <span>${escapeHtml(msg.time)}</span>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
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

  const conv = conversationsData.find(c => c.id == currentConversationId);
  if (!conv) return;

  const payload = {
    user_id: conv.userId,
    sender_name: "Nely's Salon Concierge",
    text: text,
    attachment_name: attachedFile ? attachedFile.name : null,
    attachment_url: null
  };

  try {
    const res = await fetch('../api/messages', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to send message`);
    }

    const json = await res.json();
    const sentMsg = json.data;

    // Append to local state
    if (!conv.messages) conv.messages = [];
    conv.messages.push(sentMsg);
    conv.lastTime = sentMsg.time;

    // Clear input & attachment
    input.value = '';
    clearAttachment();

    // Re-render
    renderMessageStream(conv);
    renderConversationsList();

    showToast('Message sent to ' + conv.name, 'success');
  } catch (err) {
    console.error('Error sending message:', err);
    showToast('Failed to send message to customer.', 'error');
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

// Security Helper: Escape HTML
function escapeHtml(string) {
  if (string === null || string === undefined) return '';
  const str = String(string);
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
