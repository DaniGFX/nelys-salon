/**
 * Customer Messages Page Controller
 * Nely's Salon Management System
 * Connected to live backend Messages API (/api/messages)
 * Dynamic messaging with live MySQL persistence, appointment context,
 * simulated concierge typing, offline resilience, and responsive UI.
 */

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

// DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  purgeLegacyMockStorage();
  initPatronProfile();
  loadCustomerChatData();
  setupEventListeners();
  loadAppointmentContext();
  loadNotificationBadges();
  setupDialogBackdropClicks();
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
    const displayName = currentUser.full_name || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Client');

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

  // Load from cache first for immediate rendering
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Discard if contains legacy mock
        const isLegacyMock = parsed.some(m => 
          (m.text || '').includes('Haircut tomorrow at 2:00 PM') || 
          (m.text || '').includes('change my service to Brazilian')
        );
        if (isLegacyMock) {
          localStorage.removeItem(key);
        } else {
          customerChatData.messages = parsed;
          isEmptyState = false;
          renderChatStream();
        }
      }
    } catch (_) {}
  }

  // If user is logged in, fetch authoritative chat stream from backend
  if (token) {
    try {
      const res = await fetch('../api/messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
          if (json.data.length > 0) {
            customerChatData.messages = json.data.map(mapBackendMessage);
            isEmptyState = false;
          } else {
            customerChatData.messages = [];
            isEmptyState = true;
          }
          saveCustomerChatData();
          renderChatStream();
          return;
        }
      }
    } catch (err) {
      console.warn('Backend messages API unreachable, continuing with cached chat:', err);
    }
  }

  // If no backend data and no cache, initialize default clean concierge greeting
  if (!cached || customerChatData.messages.length === 0) {
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
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendCustomerMessage();
    });
  }

  // Textarea Enter key (Shift+Enter for newline)
  const messageInput = document.getElementById('customerMessageInput');
  if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCustomerMessage();
      }
    });
  }

  // File Attachment input
  const fileInput = document.getElementById('customerFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelected);
  }

  // Window Resize
  window.addEventListener('resize', () => {
    const chatCol = document.getElementById('chatColumn');
    if (chatCol) {
      chatCol.classList.remove('hidden');
      chatCol.classList.add('flex');
    }
  });
}

// Search Filter Input Handler
function handleSearchInput(e) {
  searchQuery = e.target.value.toLowerCase().trim();

  // Sync both inputs
  const desktopInput = document.getElementById('searchChatInput');
  const mobileInput = document.getElementById('mobileSearchChatInput');
  if (desktopInput && desktopInput !== e.target) desktopInput.value = e.target.value;
  if (mobileInput && mobileInput !== e.target) mobileInput.value = e.target.value;

  renderChatStream();
}

// Toggle Mobile Search Bar
function toggleMobileSearch() {
  const bar = document.getElementById('mobileSearchBar');
  const input = document.getElementById('mobileSearchChatInput');
  if (!bar) return;

  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden') && input) {
    input.focus();
  }
}

// Textarea Auto-resize
function autoResizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, 120);
  textarea.style.height = `${newHeight}px`;
}

// 8. Render Messages
function renderChatStream() {
  const stream = document.getElementById('customerChatStream');
  const emptyView = document.getElementById('emptyStateView');
  const activeView = document.getElementById('activeChatView');

  if (!stream) return;

  if (isEmptyState || customerChatData.messages.length === 0) {
    if (emptyView) emptyView.classList.remove('hidden');
    if (activeView) activeView.classList.add('hidden');
    return;
  } else {
    if (emptyView) emptyView.classList.add('hidden');
    if (activeView) activeView.classList.remove('hidden');
  }

  const filtered = customerChatData.messages.filter(msg => {
    if (!searchQuery) return true;
    return (msg.text || '').toLowerCase().includes(searchQuery);
  });

  if (filtered.length === 0 && searchQuery) {
    stream.innerHTML = `
      <div class="py-12 text-center text-[#735e5e]">
        <i class="fa-solid fa-magnifying-glass text-2xl text-[#DCC3AA] mb-2"></i>
        <p class="text-xs font-bold text-[#541A1A]">No messages match "${escapeHtml(searchQuery)}"</p>
        <p class="text-[11px] text-[#735e5e] mt-1">Try another search term.</p>
      </div>
    `;
    return;
  }

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let html = `
    <!-- Date Header Pill -->
    <div class="flex items-center justify-center my-3">
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
        <div class="flex items-start gap-2.5 mb-3.5 group" id="msg-${msg.id}">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#541A1A] to-[#810B38] text-[#F1E2D1] font-bold text-xs flex items-center justify-center shrink-0 border border-[#DCC3AA] mt-1 shadow-xs">
            <i class="fa-solid fa-scissors text-[10px] text-[#DCC3AA]"></i>
          </div>

          <div class="max-w-[85%] sm:max-w-[70%]">
            <div class="text-[11px] font-bold text-[#541A1A] mb-1 pl-1 flex items-center gap-1.5">
              <span>${escapeHtml(msg.senderName || "Nely's Salon Concierge")}</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-[#810B38]/10 text-[#810B38] font-semibold">Salon Staff</span>
            </div>
            <div class="bg-white border border-[#DCC3AA]/70 text-[#2b1d1d] px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm space-y-1">
              ${msg.text ? `<p class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(msg.text)}</p>` : ''}
              ${renderAttachmentBubble(msg.attachment, false)}
            </div>
            <div class="flex items-center gap-1.5 mt-1 text-[10px] text-[#735e5e] pl-1">
              <span>${msg.time}</span>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  stream.innerHTML = html;
  stream.scrollTop = stream.scrollHeight;
}

// Render Attachment inside message bubble
function renderAttachmentBubble(attachment, isOutgoing) {
  if (!attachment) return '';

  if (attachment.dataUrl) {
    return `
      <div class="mt-2">
        <img 
          src="${attachment.dataUrl}" 
          alt="${escapeHtml(attachment.name || 'Photo')}" 
          class="max-w-xs max-h-48 rounded-xl object-cover border ${isOutgoing ? 'border-white/20' : 'border-[#DCC3AA]/50'} shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
          onclick="window.open('${attachment.dataUrl}', '_blank')" />
        <span class="block text-[10px] ${isOutgoing ? 'text-white/70' : 'text-[#735e5e]'} mt-1 truncate">
          ${escapeHtml(attachment.name || 'Photo')}
        </span>
      </div>
    `;
  }

  return `
    <div class="mt-2 p-2 rounded-xl ${isOutgoing ? 'bg-black/20' : 'bg-[#FAF6F0] border border-[#DCC3AA]/40'} flex items-center gap-2 text-xs">
      <i class="fa-solid fa-paperclip ${isOutgoing ? 'text-[#DCC3AA]' : 'text-[#810B38]'}"></i>
      <span class="truncate underline font-mono text-[11px] ${isOutgoing ? 'text-white' : 'text-[#810B38]'}">
        ${escapeHtml(attachment.name || 'Attachment')}
      </span>
    </div>
  `;
}

// 9. Send Message (Connected to Backend POST /api/messages)
async function sendCustomerMessage(customText = null) {
  const input = document.getElementById('customerMessageInput');
  const text = customText !== null ? customText : (input ? input.value.trim() : '');

  if (!text && !attachedFile) return;

  const token = localStorage.getItem('nelys_token');
  const customerName = currentUser && currentUser.full_name ? currentUser.full_name : 'Client';
  const now = new Date();
  const timeString = formatTime(now);

  const localAttachment = attachedFile ? { ...attachedFile } : null;

  // 1. Optimistic Outgoing Message
  const optimisticMsg = {
    id: Date.now(),
    sender: 'customer',
    senderName: customerName,
    text: text || (localAttachment ? `Shared attachment: ${localAttachment.name}` : ''),
    time: timeString,
    date: 'Today',
    status: 'sent',
    attachment: localAttachment
  };

  customerChatData.messages.push(optimisticMsg);
  saveCustomerChatData();

  // Clear Form Inputs
  if (input && customText === null) {
    input.value = '';
    input.style.height = 'auto';
  }
  clearCustomerAttachment();

  renderChatStream();

  // Show Typing Indicator
  showTypingIndicator();

  // 2. Send to Backend API if user is authenticated
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
          attachment_name: localAttachment ? localAttachment.name : null,
          attachment_url: localAttachment ? localAttachment.dataUrl : null
        })
      });

      if (res.ok) {
        const json = await res.json();
        if ((json.success || json.status === 'success') && json.data) {
          // Keep typing indicator visible briefly for realistic conversational UX
          setTimeout(() => {
            hideTypingIndicator();

            // Replace optimistic customer message with DB record if returned
            if (json.data.customer_message) {
              const idx = customerChatData.messages.findIndex(m => m.id === optimisticMsg.id);
              if (idx !== -1) {
                customerChatData.messages[idx] = mapBackendMessage(json.data.customer_message);
              }
            }

            // Append salon reply from backend
            if (json.data.salon_reply) {
              customerChatData.messages.push(mapBackendMessage(json.data.salon_reply));
            }

            saveCustomerChatData();
            renderChatStream();
          }, 850);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend send failed, falling back to local responder:', err);
    }
  }

  // 3. Fallback to Local Concierge Responder if offline or unauthenticated
  setTimeout(() => {
    hideTypingIndicator();
    respondAsConciergeFallback(text);
  }, 900);
}

// Typing Indicator Helpers
function showTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  const stream = document.getElementById('customerChatStream');
  if (indicator) {
    indicator.classList.remove('hidden');
  }
  if (stream) {
    stream.scrollTop = stream.scrollHeight;
  }
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.classList.add('hidden');
  }
}

// 10. Local Concierge Reply Fallback (Used when offline)
function respondAsConciergeFallback(customerQuery) {
  const query = (customerQuery || '').toLowerCase();
  let reply = "Thank you for reaching out to Nely's Salon! Our front desk staff has received your message and will assist you shortly.";

  if (query.includes('appointment') || query.includes('booking') || query.includes('sched')) {
    reply = "You can view or manage all your bookings under 'My Appointments', or schedule a new one right away under 'Book Appointment'!";
  } else if (query.includes('price') || query.includes('cost') || query.includes('magkano') || query.includes('how much') || query.includes('rate')) {
    reply = "Our full updated price list is available under 'Services & Prices'. Brazilian blowout starts at ₱1,999, haircuts at ₱150, and gel nails at ₱499.";
  } else if (query.includes('hour') || query.includes('time') || query.includes('open') || query.includes('schedule') || query.includes('closing')) {
    reply = "Nely's Salon is open Monday through Saturday from 9:00 AM to 6:00 PM in Lagro, Quezon City.";
  } else if (query.includes('location') || query.includes('address') || query.includes('saan') || query.includes('where')) {
    reply = "We are located at BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City. We also offer Home Service for select hair and nail treatments!";
  } else if (query.includes('service') || query.includes('rebond') || query.includes('brazilian') || query.includes('nail') || query.includes('spa')) {
    reply = "We offer 13 signature hair, nail, and foot spa treatments! Check out the 'Services & Prices' tab to view full details, inclusions, and book.";
  } else if (query.includes('stylist') || query.includes('staff') || query.includes('nely')) {
    reply = "Our salon is led by Nely and certified senior stylists with over 15 years of beauty heritage in Lagro, QC.";
  } else if (query.includes('hello') || query.includes('hi') || query.includes('good morning') || query.includes('good afternoon')) {
    const firstName = currentUser && currentUser.full_name ? currentUser.full_name.split(' ')[0] : 'there';
    reply = `Hello ${firstName}! How can we make your day more beautiful today?`;
  }

  const salonMsg = {
    id: Date.now(),
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
}

// 11. Quick Topic Buttons
function applyQuickTopic(topic) {
  let prompt = '';
  switch (topic) {
    case 'appointment':
      prompt = "Hi, I have a question regarding my appointment schedule.";
      break;
    case 'services':
      prompt = "Hello! Can you tell me more about your signature hair and nail treatments?";
      break;
    case 'pricing':
      prompt = "Hi! How much are your current rates for hair and nail services?";
      break;
    case 'availability':
      prompt = "Hello, what are your available slots for this week?";
      break;
    case 'info':
      prompt = "Hi! Where are you located and what are your operating hours?";
      break;
    default:
      prompt = "Hello Nely's Salon!";
  }

  sendCustomerMessage(prompt);
}

// 12. Attachment Handlers
function triggerCustomerFileInput() {
  const fileInput = document.getElementById('customerFileInput');
  if (fileInput) fileInput.click();
}

function handleFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.getElementById('customerAttachmentPreview');
  const fileName = document.getElementById('customerAttachmentFileName');

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (event) => {
      attachedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: event.target.result
      };
      if (preview && fileName) {
        fileName.textContent = file.name;
        preview.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  } else {
    attachedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: null
    };
    if (preview && fileName) {
      fileName.textContent = file.name;
      preview.classList.remove('hidden');
    }
  }
}

function clearCustomerAttachment() {
  attachedFile = null;
  const fileInput = document.getElementById('customerFileInput');
  if (fileInput) fileInput.value = '';

  const preview = document.getElementById('customerAttachmentPreview');
  if (preview) preview.classList.add('hidden');
}

// 13. Delete Single Message (Connected to Backend DELETE /api/messages/{id})
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
  [document.getElementById('deleteMessageModal'), document.getElementById('clearChatModal')].forEach(modal => {
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

// 18. Logout Handler
function handleLogout(e) {
  if (confirm("Are you sure you want to log out of Nely's Salon?")) {
    localStorage.removeItem('nelys_token');
    localStorage.removeItem('nelys_user');
    showToast('Logging out...', 'info');
    return true;
  }
  if (e) e.preventDefault();
  return false;
}

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
