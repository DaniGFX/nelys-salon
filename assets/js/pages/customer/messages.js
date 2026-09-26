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
    tagline: 'Official Salon Concierge · Lagro, QC',
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
let searchQuery = '';

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

// Lifecycle Bootstrapping
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomerMessagesPage);
} else {
  initCustomerMessagesPage();
}

function initCustomerMessagesPage() {
  hydrateCustomerMessagesFromCache();
  loadCustomerChatData();
  setupEventListeners();
  loadAppointmentContext();
  loadNotificationBadges();
  setupDialogBackdropClicks();
}

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
  const key = getStorageKey();

  // If user is logged in, fetch authoritative chat stream from backend
  if (token) {
    try {
      const res = await fetch('../api/messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
          const newHash = JSON.stringify(json.data);
          if (newHash !== lastRendered_cust_messages_Hash || customerChatData.messages.length === 0) {
            lastRendered_cust_messages_Hash = newHash;
            if (json.data.length > 0) {
              customerChatData.messages = json.data.map(mapBackendMessage);
              isEmptyState = false;
            } else {
              customerChatData.messages = [];
              isEmptyState = true;
            }
            saveCustomerChatData();
            renderChatStream();
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Backend messages API unreachable, continuing with cached chat:', err);
    }
  }

  // If no backend data and no cache, initialize default clean concierge greeting
  if (customerChatData.messages.length === 0 && !isEmptyState) {
    const firstName = currentUser && currentUser.full_name && currentUser.id !== 'guest'
      ? currentUser.full_name.split(' ')[0]
      : '';

    const greetingText = firstName
      ? `Hello ${firstName}! Welcome to Nely's Salon official support. How can we assist you today with appointments, treatments, or questions?`
      : `Hello! Welcome to Nely's Salon official support. How can we assist you today with appointments, treatments, or beauty questions?`;

    customerChatData.messages = [
      {
        id: Date.now(),
        sender: 'salon',
        senderName: "Nely's Salon Concierge",
        text: greetingText,
        time: formatTime(new Date()),
        date: 'Today',
        status: 'read'
      }
    ];
    isEmptyState = false;
    saveCustomerChatData();
    renderChatStream();
  }
}

// Map backend DB message record to UI model
function mapBackendMessage(item) {
  let timeStr = '';
  if (item.created_at) {
    try {
      const d = new Date(item.created_at.replace(/-/g, '/'));
      if (!isNaN(d.getTime())) {
        timeStr = formatTime(d);
      }
    } catch (_) {}
  }
  if (!timeStr) timeStr = formatTime(new Date());

  return {
    id: item.id,
    sender: item.sender || 'customer',
    senderName: item.sender_name || (item.sender === 'salon' ? "Nely's Salon Concierge" : 'You'),
    text: item.text || '',
    time: timeStr,
    date: 'Today',
    status: item.status || 'sent',
    attachment: item.attachment_name ? {
      name: item.attachment_name,
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

  // Keydown for enter to send
  const msgInput = document.getElementById('customerMessageInput');
  if (msgInput) {
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
      }
    });
  }

  // Quick Action Chips
  document.querySelectorAll('.quick-reply-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) {
        sendQuickPrompt(prompt);
      }
    });
  });

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
  const todayDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  html += `
    <div class="flex items-center justify-center my-4">
      <span class="px-3.5 py-1 rounded-full bg-[#FAF6F0] border border-[#DCC3AA]/70 text-[11px] font-semibold text-[#735e5e] shadow-xs">
        Today, ${todayDateStr}
      </span>
    </div>
  `;

  html += filtered.map(msg => {
    const isCustomer = msg.sender === 'customer';

    if (isCustomer) {
      // Outgoing customer bubble (Burgundy)
      return `
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
              <span>${msg.time}</span>
              ${msg.status === 'read' 
                ? '<span title="Read"><i class="fa-solid fa-check-double text-emerald-600 text-[10px]"></i></span>'
                : '<span title="Sent"><i class="fa-solid fa-check text-stone-400 text-[10px]"></i></span>'
              }
            </div>
          </div>
        </div>
      `;
    } else {
      // Incoming salon bubble (White card)
      return `
        <div class="flex items-start gap-2.5 sm:gap-3 mb-3.5" id="msg-${msg.id}">
          <div class="w-8 h-8 rounded-full bg-[#541A1A] text-[#F1E2D1] font-bold text-xs flex items-center justify-center border border-[#DCC3AA] shrink-0 mt-1 shadow-xs">
            NS
          </div>
          <div class="max-w-[85%] sm:max-w-[70%]">
            <div class="flex items-center gap-2 mb-1 pl-1">
              <span class="text-[11px] font-bold text-[#541A1A]">${escapeHtml(msg.senderName || "Nely's Salon Concierge")}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">Official</span>
            </div>
            <div class="bg-white text-[#2b1d1d] border border-[#DCC3AA]/80 px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm space-y-1">
              ${msg.text ? `<p class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-[#2b1d1d]">${escapeHtml(msg.text)}</p>` : ''}
              ${renderAttachmentBubble(msg.attachment, false)}
            </div>
            <div class="flex items-center gap-1.5 mt-1 pl-1 text-[10px] text-[#735e5e]">
              <span>${msg.time}</span>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  container.innerHTML = html;
  scrollChatToBottom();
}

function renderAttachmentBubble(attachment, isCustomer) {
  if (!attachment) return '';

  const isImg = attachment.dataUrl && (attachment.dataUrl.startsWith('data:image') || attachment.dataUrl.includes('image'));
  const textColor = isCustomer ? 'text-white' : 'text-[#541A1A]';
  const subColor = isCustomer ? 'text-white/80' : 'text-[#735e5e]';
  const bgBox = isCustomer ? 'bg-black/10' : 'bg-[#FAF6F0] border border-[#DCC3AA]';

  if (isImg) {
    return `
      <div class="mt-2 rounded-xl overflow-hidden border border-black/10 max-w-xs shadow-xs">
        <img src="${attachment.dataUrl}" alt="${escapeHtml(attachment.name)}" class="w-full h-auto object-cover max-h-48">
        <div class="p-1.5 text-[10px] ${textColor} ${bgBox} truncate">
          ${escapeHtml(attachment.name)}
        </div>
      </div>
    `;
  }

  return `
    <div class="mt-2 flex items-center gap-2.5 p-2 rounded-xl ${bgBox}">
      <div class="w-8 h-8 rounded-lg bg-[#FAF6F0] text-[#810B38] flex items-center justify-center text-sm shrink-0 border border-[#DCC3AA]/40">
        <i class="fa-solid fa-file"></i>
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-xs font-semibold ${textColor} truncate">${escapeHtml(attachment.name)}</div>
        <div class="text-[10px] ${subColor}">Attachment</div>
      </div>
    </div>
  `;
}

function scrollChatToBottom(smooth = false) {
  const container = document.getElementById('customerChatStream');
  if (container) {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
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

  const token = localStorage.getItem('nelys_token');
  const now = new Date();
  const timeStr = formatTime(now);

  const localMsg = {
    id: Date.now(),
    sender: 'customer',
    senderName: currentUser && currentUser.full_name ? currentUser.full_name : 'You',
    text: text,
    time: timeStr,
    date: 'Today',
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
  renderChatStream();

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
          localMsg.id = result.data ? result.data.id : localMsg.id;
          saveCustomerChatData();
        }
      }
    } catch (err) {
      console.warn('Backend message sync notice:', err);
    }
  }

  // Simulate concierge response
  triggerConciergeSmartReply(text);
}

// 10. Quick Action Chips
function sendQuickPrompt(promptText) {
  const input = document.getElementById('customerMessageInput');
  if (input) {
    input.value = promptText;
    handleSendMessage();
  }
}

// 11. Simulated Intelligent Salon Concierge Auto-Reply
function triggerConciergeSmartReply(userText) {
  showTypingIndicator();

  setTimeout(async () => {
    hideTypingIndicator();

    const lower = (userText || '').toLowerCase();
    let reply = "Thank you for reaching out! Our reception desk has received your message and a salon coordinator will get back to you shortly.";

    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('reserve')) {
      reply = "We would love to welcome you! You can easily book an appointment through our Book Appointment page or let us know your preferred date, time, and service right here.";
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('how much') || lower.includes('brazilian') || lower.includes('rebond')) {
      reply = "Our Brazilian treatment starts at ₱1,999, Keratin treatment at ₱499, Hair Rebonding at ₱1,499, and Hair Dye at ₱699. You can also view the full catalog in our 'Services & Prices' tab!";
    } else if (lower.includes('hour') || lower.includes('open') || lower.includes('time') || lower.includes('location') || lower.includes('where')) {
      reply = "We are located at BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City. We are open Monday through Saturday from 9:00 AM to 6:00 PM.";
    } else if (lower.includes('home') || lower.includes('service')) {
      reply = "Yes! We offer home service across Lagro, Fairview, Novaliches, and nearby QC areas. You can select 'Home Service' when booking your appointment.";
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('good morning') || lower.includes('good afternoon')) {
      const firstName = currentUser && currentUser.full_name && currentUser.id !== 'guest' ? currentUser.full_name.split(' ')[0] : 'there';
      reply = `Hello ${firstName}! How can we assist you today at Nely's Salon?`;
    }

    const salonMsg = {
      id: Date.now() + 1,
      sender: 'salon',
      senderName: "Nely's Salon Concierge",
      text: reply,
      time: formatTime(new Date()),
      date: 'Today',
      status: 'read'
    };

    customerChatData.messages.push(salonMsg);
    saveCustomerChatData();
    renderChatStream();

    const token = localStorage.getItem('nelys_token');
    if (token) {
      try {
        await fetch('../api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sender: 'salon',
            sender_name: "Nely's Salon Concierge",
            text: reply
          })
        });
      } catch (_) {}
    }
  }, 1400);
}

function showTypingIndicator() {
  const container = document.getElementById('customerChatStream');
  if (!container) return;

  const existing = (document.getElementById('conciergeTypingIndicator') || document.getElementById('typingIndicator'));
  if (existing) existing.remove();

  const typingEl = document.createElement('div');
  typingEl.id = 'conciergeTypingIndicator';
  typingEl.className = 'flex items-center gap-3 mb-3.5';
  typingEl.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-[#541A1A] text-[#F1E2D1] font-bold text-xs flex items-center justify-center border border-[#DCC3AA] shrink-0 shadow-xs">
      NS
    </div>
    <div class="bg-white border border-[#DCC3AA]/80 px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-[#810B38] animate-bounce [animation-delay:-0.3s]"></span>
      <span class="w-2 h-2 rounded-full bg-[#810B38] animate-bounce [animation-delay:-0.15s]"></span>
      <span class="w-2 h-2 rounded-full bg-[#810B38] animate-bounce"></span>
    </div>
  `;

  container.appendChild(typingEl);
  scrollChatToBottom(true);
}

function hideTypingIndicator() {
  const el = (document.getElementById('conciergeTypingIndicator') || document.getElementById('typingIndicator'));
  if (el) el.remove();
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
