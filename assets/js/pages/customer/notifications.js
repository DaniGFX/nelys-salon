/**
 * Nely's Salon — Customer Notifications Script
 * Handles notification filtering by category (All, Appointments, Payments, Updates),
 * mark all as read, unread status management, and contextual detail modals.
 */

let notificationsData = [
  {
    id: "NOTIF-001",
    category: "appointments",
    title: "Appointment Reminder",
    message: "Your Brazilian Treatment appointment is tomorrow at 10:00 AM.",
    time: "Today, 9:00 AM",
    isRead: false,
    icon: "fa-solid fa-bell",
    iconBg: "bg-[#810B38] text-white",
    dotColor: "bg-[#810B38]",
    payload: {
      type: "appointment",
      bookingId: "NS-20260925-0814",
      service: "Brazilian Treatment",
      dateTime: "September 25, 2026 at 10:00 AM",
      location: "Nely's Salon Atelier (Lagro, QC)",
      status: "Confirmed",
      amount: "₱1,999"
    }
  },
  {
    id: "NOTIF-002",
    category: "payments",
    title: "Payment Verified",
    message: "Your GCash payment of ₱1,999 for Brazilian Treatment has been verified.",
    time: "Today, 8:45 AM",
    isRead: false,
    icon: "fa-solid fa-circle-check",
    iconBg: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-[#810B38]",
    payload: {
      type: "payment",
      paymentId: "PAY-20260925-0814",
      service: "Brazilian Treatment",
      amount: "₱1,999",
      method: "GCash",
      referenceNo: "GC-92817401",
      status: "Verified & Settled",
      date: "September 24, 2026 at 8:45 AM"
    }
  },
  {
    id: "NOTIF-003",
    category: "payments",
    title: "Payment Verification",
    message: "Your uploaded payment receipt is currently being reviewed by our salon cashier.",
    time: "Yesterday, 4:15 PM",
    isRead: false,
    icon: "fa-solid fa-clock",
    iconBg: "bg-amber-100 text-amber-700",
    dotColor: "bg-[#810B38]",
    payload: {
      type: "payment",
      paymentId: "PAY-20260928-1420",
      service: "Hair Dye Treatment",
      amount: "₱699",
      method: "GCash Receipt Upload",
      referenceNo: "GC-77401928",
      status: "Under Cashier Review",
      date: "September 23, 2026 at 4:15 PM"
    }
  },
  {
    id: "NOTIF-004",
    category: "appointments",
    title: "Booking Confirmed",
    message: "Your appointment for September 25, 2026 at 10:00 AM has been confirmed.",
    time: "Yesterday, 3:30 PM",
    isRead: true,
    icon: "fa-solid fa-calendar-check",
    iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dotColor: null,
    payload: {
      type: "appointment",
      bookingId: "NS-20260925-0814",
      service: "Brazilian Treatment",
      dateTime: "September 25, 2026 at 10:00 AM",
      location: "Nely's Salon Atelier (Lagro, QC)",
      status: "Confirmed",
      amount: "₱1,999"
    }
  },
  {
    id: "NOTIF-005",
    category: "appointments",
    title: "Appointment Cancelled",
    message: "Your appointment on September 28 has been cancelled as requested.",
    time: "September 20, 2026",
    isRead: true,
    icon: "fa-solid fa-circle-xmark",
    iconBg: "bg-rose-50 text-rose-700 border border-rose-200",
    dotColor: null,
    payload: {
      type: "appointment",
      bookingId: "NS-20260920-0419",
      service: "Cold Wave & Trim",
      dateTime: "September 28, 2026 at 2:00 PM",
      location: "Nely's Salon Atelier (Lagro, QC)",
      status: "Cancelled",
      reason: "Customer requested cancellation (Change of schedule)",
      amount: "₱848 (No charge)"
    }
  },
  {
    id: "NOTIF-006",
    category: "updates",
    title: "15-Year Anniversary Treat",
    message: "Celebrate 15 Years of Beauty Heritage at Nely's Salon! Enjoy a complimentary deep hair consultation and 10% off any premium hair care package this month.",
    time: "3 days ago",
    isRead: true,
    icon: "fa-solid fa-gift",
    iconBg: "bg-[#FAF6F0] text-[#810B38] border border-[#DCC3AA]",
    dotColor: null,
    payload: {
      type: "update",
      title: "15-Year Anniversary Celebration Treat",
      announcementId: "ANN-15Y",
      details: "Thank you for trusting Nely's Salon for 15 wonderful years in Lagro, QC. As our token of gratitude, present code 'NELYS15' at the counter or during online booking to redeem 10% discount on any hair treatment.",
      promoCode: "NELYS15",
      validUntil: "October 31, 2026"
    }
  }
];

let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderNotifications();
  updateCategoryCounters();
});

// 1. Mobile Sidebar Drawer Controls
function toggleMobileSidebar(open = null) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!sidebar || !backdrop) return;

  const isOpen = sidebar.classList.contains('translate-x-0');
  const shouldOpen = open !== null ? open : !isOpen;

  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
  }
}

// 2. Switch Category Filter (with zero layout shifting)
function switchCategory(cat) {
  activeCategory = cat;

  const categories = ['all', 'appointments', 'payments', 'updates'];
  categories.forEach(c => {
    const btn = document.getElementById(`tabBtn-${c}`);
    if (!btn) return;

    if (c === cat) {
      btn.className = "tab-btn px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors duration-150 flex items-center gap-2 shrink-0 select-none border border-[#810B38] bg-[#810B38] text-white shadow-sm focus:outline-none";
      const counter = btn.querySelector('.tab-counter');
      if (counter) {
        counter.className = "tab-counter px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#DCC3AA] bg-[#DCC3AA] text-[#541A1A] min-w-[20px] text-center inline-block";
      }
    } else {
      btn.className = "tab-btn px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors duration-150 flex items-center gap-2 shrink-0 select-none border border-[#DCC3AA]/60 bg-white/80 hover:bg-[#FAF6F0] text-[#541A1A] shadow-sm focus:outline-none";
      const counter = btn.querySelector('.tab-counter');
      if (counter) {
        counter.className = "tab-counter px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#DCC3AA]/60 bg-[#FAF6F0] text-[#735e5e] min-w-[20px] text-center inline-block";
      }
    }
  });

  renderNotifications();
}

// 3. Update Category Badge Counters
function updateCategoryCounters() {
  const counts = {
    all: notificationsData.length,
    appointments: notificationsData.filter(n => n.category === 'appointments').length,
    payments: notificationsData.filter(n => n.category === 'payments').length,
    updates: notificationsData.filter(n => n.category === 'updates').length
  };

  const unreadCount = notificationsData.filter(n => !n.isRead).length;

  for (const [key, val] of Object.entries(counts)) {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = val;
  }

  // Header unread status badge
  const unreadBadgeEl = document.getElementById('headerUnreadBadge');
  if (unreadBadgeEl) {
    if (unreadCount > 0) {
      unreadBadgeEl.classList.remove('hidden');
      unreadBadgeEl.textContent = `${unreadCount} Unread`;
    } else {
      unreadBadgeEl.classList.add('hidden');
    }
  }

  // Sidebar badge
  const sidebarBadge = document.getElementById('sidebarNotifCount');
  if (sidebarBadge) {
    sidebarBadge.textContent = unreadCount;
    if (unreadCount === 0) {
      sidebarBadge.classList.add('opacity-40');
    } else {
      sidebarBadge.classList.remove('opacity-40');
    }
  }
}

// 4. Mark All as Read
function markAllAsRead() {
  const unreadCount = notificationsData.filter(n => !n.isRead).length;
  if (unreadCount === 0) {
    showToast("All notifications are already marked as read.", "info");
    return;
  }

  notificationsData.forEach(n => {
    n.isRead = true;
    n.dotColor = null;
  });

  renderNotifications();
  updateCategoryCounters();
  showToast("All notifications marked as read.", "success");
}

// 5. Render Notifications
function renderNotifications() {
  const container = document.getElementById('notificationsContainer');
  const emptyState = document.getElementById('emptyNotificationsState');
  if (!container || !emptyState) return;

  const filtered = activeCategory === 'all' 
    ? notificationsData 
    : notificationsData.filter(n => n.category === activeCategory);

  if (filtered.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  emptyState.classList.add('hidden');

  let html = '';
  filtered.forEach(item => {
    const unreadPill = !item.isRead 
      ? `<span class="w-2.5 h-2.5 rounded-full bg-[#810B38] shrink-0 animate-pulse shadow-sm" title="Unread notification"></span>` 
      : '';

    const cardBg = !item.isRead 
      ? `bg-[#FFFDF9] border-[#810B38]/30 shadow-sm hover:border-[#810B38]` 
      : `bg-white border-[#E8D9CA] hover:border-[#DCC3AA] opacity-90`;

    html += `
      <article 
        onclick="handleNotificationClick('${item.id}')"
        class="${cardBg} rounded-3xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer hover:shadow-md group relative flex items-start gap-4">
        
        <!-- Icon Container -->
        <div class="w-11 h-11 rounded-2xl ${item.iconBg} flex items-center justify-center text-lg shrink-0 shadow-sm transition-transform group-hover:scale-105">
          <i class="${item.icon}"></i>
        </div>

        <!-- Notification Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-2 min-w-0">
              <h3 class="font-bold text-sm sm:text-base text-[#541A1A] group-hover:text-[#810B38] transition-colors truncate">
                ${escapeHtml(item.title)}
              </h3>
              ${unreadPill}
            </div>
            <span class="text-[11px] text-[#735e5e] shrink-0 font-medium">
              ${escapeHtml(item.time)}
            </span>
          </div>

          <p class="text-xs sm:text-sm text-[#2b1d1d] leading-relaxed">
            ${escapeHtml(item.message)}
          </p>

          <div class="mt-3 flex items-center gap-2 text-[11px] font-semibold text-[#810B38] group-hover:translate-x-0.5 transition-transform">
            <span>View details</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </div>
        </div>

      </article>
    `;
  });

  container.innerHTML = html;
}

// 6. Handle Notification Click
function handleNotificationClick(notifId) {
  const item = notificationsData.find(n => n.id === notifId);
  if (!item) return;

  // Mark as read
  if (!item.isRead) {
    item.isRead = true;
    item.dotColor = null;
    renderNotifications();
    updateCategoryCounters();
  }

  // Open contextual modal based on type
  if (item.payload.type === 'appointment') {
    openAppointmentModal(item);
  } else if (item.payload.type === 'payment') {
    openPaymentModal(item);
  } else if (item.payload.type === 'update') {
    openAnnouncementModal(item);
  }
}

// 7. Contextual Modal 1: Appointment Notification
function openAppointmentModal(item) {
  const p = item.payload;
  document.getElementById('apptNotifTitle').textContent = item.title;
  document.getElementById('apptNotifService').textContent = p.service;
  document.getElementById('apptNotifDateTime').textContent = p.dateTime;
  document.getElementById('apptNotifLocation').textContent = p.location;
  document.getElementById('apptNotifBookingId').textContent = p.bookingId;
  document.getElementById('apptNotifStatus').textContent = p.status;
  document.getElementById('apptNotifAmount').textContent = p.amount;

  const reasonRow = document.getElementById('apptNotifReasonRow');
  const reasonText = document.getElementById('apptNotifReason');
  if (p.reason) {
    reasonRow.classList.remove('hidden');
    reasonText.textContent = p.reason;
  } else {
    reasonRow.classList.add('hidden');
  }

  const modal = document.getElementById('appointmentNotifModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeAppointmentModal() {
  const modal = document.getElementById('appointmentNotifModal');
  if (modal) modal.close();
}

// 8. Contextual Modal 2: Payment Notification
function openPaymentModal(item) {
  const p = item.payload;
  document.getElementById('payNotifTitle').textContent = item.title;
  document.getElementById('payNotifPaymentId').textContent = p.paymentId;
  document.getElementById('payNotifService').textContent = p.service;
  document.getElementById('payNotifAmount').textContent = p.amount;
  document.getElementById('payNotifMethod').textContent = p.method;
  document.getElementById('payNotifRef').textContent = p.referenceNo;
  document.getElementById('payNotifStatus').textContent = p.status;
  document.getElementById('payNotifDate').textContent = p.date;

  const modal = document.getElementById('paymentNotifModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closePaymentModal() {
  const modal = document.getElementById('paymentNotifModal');
  if (modal) modal.close();
}

// 9. Contextual Modal 3: Announcement / Update Notification
function openAnnouncementModal(item) {
  const p = item.payload;
  document.getElementById('annNotifTitle').textContent = p.title;
  document.getElementById('annNotifDetails').textContent = p.details;
  document.getElementById('annNotifPromoCode').textContent = p.promoCode;
  document.getElementById('annNotifValidUntil').textContent = p.validUntil;

  const modal = document.getElementById('announcementNotifModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeAnnouncementModal() {
  const modal = document.getElementById('announcementNotifModal');
  if (modal) modal.close();
}

// 10. Copy Text Helper
function copyPromoCode(code) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Promo code '${code}' copied to clipboard!`, 'success');
    });
  } else {
    showToast(`Code: ${code}`, 'info');
  }
}

// 11. Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    info: 'bg-[#541A1A] text-[#F1E2D1] border-[#810B38]',
    success: 'bg-emerald-800 text-white border-emerald-500',
    warning: 'bg-amber-800 text-white border-amber-500',
    error: 'bg-rose-900 text-white border-rose-500'
  };

  const icons = {
    info: 'fa-solid fa-circle-info text-[#DCC3AA]',
    success: 'fa-solid fa-circle-check text-emerald-300',
    warning: 'fa-solid fa-triangle-exclamation text-amber-300',
    error: 'fa-solid fa-circle-xmark text-rose-300'
  };

  toast.className = `p-4 rounded-2xl shadow-2xl border text-xs font-medium flex items-center gap-3 transition-all duration-300 transform translate-y-3 opacity-0 pointer-events-auto max-w-sm ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info} text-base shrink-0"></i>
    <span class="flex-1">${escapeHtml(message)}</span>
    <button type="button" onclick="this.parentElement.remove()" class="w-5 h-5 rounded-md hover:bg-white/20 flex items-center justify-center text-xs opacity-75 hover:opacity-100">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
