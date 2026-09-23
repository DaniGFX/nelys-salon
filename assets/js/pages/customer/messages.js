/**
 * Customer Messages Page Controller
 * Nely's Salon Management System
 */

// Initial Customer Chat Data
let customerChatData = {
  salon: {
    name: "Nely's Salon",
    status: 'online',
    tagline: 'Official Salon Concierge · Lagro, QC',
    avatar: 'NS',
    phone: '0917 123 4567',
    hours: 'Mon - Sat: 9:00 AM - 6:00 PM',
    unreadCount: 1
  },
  appointmentContext: {
    id: 'NS-20260924-0814',
    service: 'Haircut & Blowdry',
    date: 'September 24, 2026',
    time: '2:00 PM',
    status: 'Confirmed',
    stylist: 'Ana Marie',
    price: '₱250.00'
  },
  messages: [
    {
      id: 1,
      sender: 'salon',
      senderName: "Nely's Salon",
      text: 'Hello Maria! Your appointment for Haircut tomorrow at 2:00 PM has been confirmed.',
      time: '10:30 AM',
      date: 'Today',
      status: 'read'
    },
    {
      id: 2,
      sender: 'customer',
      senderName: 'Maria',
      text: 'Thank you po! Can I also ask if I can change my service to Brazilian?',
      time: '10:32 AM',
      date: 'Today',
      status: 'read'
    },
    {
      id: 3,
      sender: 'salon',
      senderName: "Nely's Salon",
      text: 'Yes po. We can update your appointment to include Brazilian blowout. We will adjust the total upon your arrival.',
      time: '10:34 AM',
      date: 'Today',
      status: 'read'
    }
  ]
};

// State
let attachedFile = null;
let isEmptyState = false;
let messageToDeleteId = null;
let searchQuery = '';

// DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  renderChatStream();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  // Search messages in chat
  const searchInput = document.getElementById('searchChatInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderChatStream();
    });
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

// Render Messages
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
    return msg.text.toLowerCase().includes(searchQuery);
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

  stream.innerHTML = `
    <!-- Date Header Pill -->
    <div class="flex items-center justify-center my-3">
      <span class="px-3.5 py-1 rounded-full bg-[#FAF6F0] border border-[#DCC3AA]/70 text-[11px] font-semibold text-[#735e5e] shadow-xs">
        Today, September 23, 2026
      </span>
    </div>
  ` + filtered.map(msg => {
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

          <div class="max-w-[80%] sm:max-w-[70%]">
            <div class="text-[10px] font-bold text-[#735e5e] text-right mb-1 pr-1">You</div>
            <div class="bg-[#810B38] text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-md space-y-1">
              <p class="text-xs sm:text-sm leading-relaxed">${escapeHtml(msg.text)}</p>
              ${msg.attachment ? `
                <div class="mt-2 p-2 rounded-xl bg-black/20 flex items-center gap-2 text-xs">
                  <i class="fa-solid fa-paperclip text-[#DCC3AA]"></i>
                  <span class="truncate underline font-mono text-[11px]">${escapeHtml(msg.attachment.name)}</span>
                </div>
              ` : ''}
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

          <div class="max-w-[80%] sm:max-w-[70%]">
            <div class="text-[11px] font-bold text-[#541A1A] mb-1 pl-1 flex items-center gap-1.5">
              <span>${msg.senderName}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-[#810B38]/10 text-[#810B38] font-semibold">Salon Staff</span>
            </div>
            <div class="bg-white border border-[#DCC3AA]/70 text-[#2b1d1d] px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm space-y-1">
              <p class="text-xs sm:text-sm leading-relaxed">${escapeHtml(msg.text)}</p>
              ${msg.attachment ? `
                <div class="mt-2 p-2 rounded-xl bg-[#FAF6F0] flex items-center gap-2 text-xs border border-[#DCC3AA]/40">
                  <i class="fa-solid fa-paperclip text-[#810B38]"></i>
                  <span class="truncate underline font-mono text-[#810B38] text-[11px]">${escapeHtml(msg.attachment.name)}</span>
                </div>
              ` : ''}
            </div>
            <div class="flex items-center gap-1.5 mt-1 text-[10px] text-[#735e5e] pl-1">
              <span>${msg.time}</span>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  // Scroll to bottom
  stream.scrollTop = stream.scrollHeight;
}

// Send Message
function sendCustomerMessage() {
  const input = document.getElementById('customerMessageInput');
  if (!input) return;

  const text = input.value.trim();
  if (!text && !attachedFile) return;

  const now = new Date();
  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes} ${ampm}`;

  const newMsg = {
    id: Date.now(),
    sender: 'customer',
    senderName: 'Maria',
    text: text || 'Sent an attachment',
    time: timeString,
    date: 'Today',
    status: 'sent',
    attachment: attachedFile ? { name: attachedFile.name, size: attachedFile.size } : null
  };

  customerChatData.messages.push(newMsg);

  // Clear input & attachment
  input.value = '';
  clearCustomerAttachment();

  // Re-render
  renderChatStream();

  // Mark as read after 1.5s
  setTimeout(() => {
    newMsg.status = 'read';
    renderChatStream();
  }, 1500);

  // Simulated auto-reply from salon after 2.5s
  setTimeout(() => {
    const replyMsg = {
      id: Date.now() + 1,
      sender: 'salon',
      senderName: "Nely's Salon",
      text: "Thank you for reaching out po! We received your message and our team will get back to you shortly.",
      time: timeString,
      date: 'Today',
      status: 'read'
    };
    customerChatData.messages.push(replyMsg);
    renderChatStream();
    showCustomerToast("💬 New Message: Nely's Salon sent you a response.");
  }, 2500);
}

// Quick Options Fill
function applyQuickTopic(topic) {
  const input = document.getElementById('customerMessageInput');
  if (!input) return;

  let text = '';
  switch (topic) {
    case 'appointment':
      text = 'Hi! I have a question regarding my appointment.';
      break;
    case 'services':
      text = 'Hello! Can you tell me more about your hair treatment services?';
      break;
    case 'pricing':
      text = 'Hi! I would like to ask about your service prices.';
      break;
    case 'availability':
      text = 'Hi po! Do you have available slots for this Saturday afternoon?';
      break;
    case 'info':
      text = 'Hello! Where are you located and what are your operating hours?';
      break;
    default:
      text = topic;
  }

  input.value = text;
  input.focus();
}

// File Attachment handling
function triggerCustomerFileInput() {
  const fileInput = document.getElementById('customerFileInput');
  if (fileInput) fileInput.click();
}

function handleFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  attachedFile = file;
  const preview = document.getElementById('customerAttachmentPreview');
  const filename = document.getElementById('customerAttachmentFileName');

  if (preview && filename) {
    filename.textContent = file.name;
    preview.classList.remove('hidden');
  }
}

function clearCustomerAttachment() {
  attachedFile = null;
  const fileInput = document.getElementById('customerFileInput');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('customerAttachmentPreview');
  if (preview) preview.classList.add('hidden');
}

// Delete Message Handlers
function promptDeleteMessage(msgId) {
  messageToDeleteId = msgId;
  const modal = document.getElementById('deleteMessageModal');
  if (modal) modal.classList.remove('hidden');
}

function closeDeleteMessageModal() {
  messageToDeleteId = null;
  const modal = document.getElementById('deleteMessageModal');
  if (modal) modal.classList.add('hidden');
}

function confirmDeleteMessage() {
  if (!messageToDeleteId) return;

  const idx = customerChatData.messages.findIndex(m => m.id === messageToDeleteId);
  if (idx > -1) {
    customerChatData.messages.splice(idx, 1);
    closeDeleteMessageModal();
    renderChatStream();
    showCustomerToast('Message removed');
  }
}

// Empty State Demo Toggle
function toggleEmptyStateDemo() {
  isEmptyState = !isEmptyState;
  renderChatStream();
  showCustomerToast(isEmptyState ? 'Demonstrating Empty State' : 'Switched to Active Conversation');
}

function startNewConversation() {
  isEmptyState = false;
  if (customerChatData.messages.length === 0) {
    customerChatData.messages = [
      {
        id: Date.now(),
        sender: 'salon',
        senderName: "Nely's Salon",
        text: "Hello Maria! Welcome to Nely's Salon chat. How can we assist you with your beauty and hair care needs today?",
        time: 'Just now',
        date: 'Today',
        status: 'read'
      }
    ];
  }
  renderChatStream();
  showCustomerToast('Started conversation with Nely\'s Salon');
}

// Toast Helper
function showCustomerToast(message) {
  const container = document.getElementById('customerToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'bg-[#541A1A] border border-[#DCC3AA] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-slide-up transition-all pointer-events-auto';
  toast.innerHTML = `
    <i class="fa-solid fa-comments text-[#DCC3AA]"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Security Helper: Escape HTML
function escapeHtml(string) {
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

// Mobile View Navigation: Switch to Chat Stream
function openMobileChat() {
  const convCol = document.getElementById('conversationsColumn');
  const chatCol = document.getElementById('chatColumn');
  if (convCol && chatCol) {
    convCol.classList.add('hidden');
    chatCol.classList.remove('hidden');
    chatCol.classList.add('flex');
    const stream = document.getElementById('customerChatStream');
    if (stream) stream.scrollTop = stream.scrollHeight;
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

// Mobile Salon Info Drawer Toggle
function toggleSalonInfoDrawer(show) {
  const drawer = document.getElementById('salonInfoMobileDrawer');
  if (!drawer) return;

  const isHidden = drawer.classList.contains('hidden');
  const shouldOpen = show !== undefined ? show : isHidden;

  if (shouldOpen) {
    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  } else {
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }
}
