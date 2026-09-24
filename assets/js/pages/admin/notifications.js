/**
 * Nely's Salon — Admin Notifications Controller
 * Manages admin notifications, real-time unread dot status,
 * category filtering (All, Appointments, Payments, Customers, System),
 * quick action links, notification modal, and notification preferences settings.
 */

// ================= STORAGE KEYS & INITIAL DATA =================
const NOTIFICATIONS_STORAGE_KEY = 'nelys_admin_notifications_data';
const NOTIF_PREFS_STORAGE_KEY = 'nelys_admin_notif_prefs';

// Initial dataset matching specifications: Total 24, Unread 6, Appointments 12, Payments 6
const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    category: 'appointments',
    type: 'new_booking',
    title: 'Maria Santos booked an appointment',
    details: 'Haircut — September 23, 2026 at 9:00 AM',
    timestamp: '5 minutes ago',
    date: 'Sept 23, 2026',
    time: '8:55 AM',
    isUnread: true,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-plus',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-2',
    category: 'appointments',
    type: 'confirmation',
    title: 'Angela Cruz\'s appointment was confirmed',
    details: 'Brazilian — September 23, 2026 at 10:30 AM',
    timestamp: '20 minutes ago',
    date: 'Sept 23, 2026',
    time: '8:40 AM',
    isUnread: true,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-check',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-3',
    category: 'payments',
    type: 'payment_received',
    title: 'Payment received from Jamie Reyes',
    details: '₱149 — Manicure — Cash',
    timestamp: '1 hour ago',
    date: 'Sept 23, 2026',
    time: '8:00 AM',
    isUnread: true,
    actionText: 'View Payment',
    actionUrl: 'payments.html',
    icon: 'fa-money-bill-wave',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  {
    id: 'notif-4',
    category: 'appointments',
    type: 'rescheduled',
    title: 'Carla Dela Cruz rescheduled an appointment',
    details: 'Hair Dye — September 24 → September 25',
    timestamp: '2 hours ago',
    date: 'Sept 23, 2026',
    time: '7:00 AM',
    isUnread: true,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-clock-rotate-left',
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    id: 'notif-5',
    category: 'appointments',
    type: 'cancelled',
    title: 'Sophia Reyes cancelled an appointment',
    details: 'Pedicure — September 23, 2026 at 2:00 PM',
    timestamp: 'Yesterday',
    date: 'Sept 22, 2026',
    time: '4:30 PM',
    isUnread: true,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-xmark',
    iconColor: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  {
    id: 'notif-6',
    category: 'customers',
    type: 'new_customer',
    title: 'Joshua Garcia registered as a new customer',
    details: 'Customer ID: CUST-1007 · Mobile: 0933 666 8899',
    timestamp: 'Yesterday',
    date: 'Sept 22, 2026',
    time: '2:15 PM',
    isUnread: true,
    actionText: 'View Profile',
    actionUrl: 'customers.html',
    icon: 'fa-user-plus',
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  {
    id: 'notif-7',
    category: 'payments',
    type: 'payment_received',
    title: 'Payment received from Maria Santos',
    details: '₱250 — Haircut — Cash (PAY-0001)',
    timestamp: 'Sept 22',
    date: 'Sept 22, 2026',
    time: '11:00 AM',
    isUnread: false,
    actionText: 'View Payment',
    actionUrl: 'payments.html',
    icon: 'fa-money-bill-wave',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  {
    id: 'notif-8',
    category: 'appointments',
    type: 'new_booking',
    title: 'Katrina Halili booked an appointment',
    details: 'Keratine Treatment — September 23, 2026 at 1:30 PM',
    timestamp: 'Sept 22',
    date: 'Sept 22, 2026',
    time: '10:00 AM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-plus',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-9',
    category: 'payments',
    type: 'payment_received',
    title: 'Payment received from Angela Cruz',
    details: '₱1,999 — Brazilian — GCash (PAY-0002)',
    timestamp: 'Sept 22',
    date: 'Sept 22, 2026',
    time: '9:30 AM',
    isUnread: false,
    actionText: 'View Payment',
    actionUrl: 'payments.html',
    icon: 'fa-money-bill-wave',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  {
    id: 'notif-10',
    category: 'system',
    type: 'system_alert',
    title: 'Daily salon database backup completed',
    details: 'Automated backup completed with 248 patrons and 186 appointments synced.',
    timestamp: 'Sept 22',
    date: 'Sept 22, 2026',
    time: '3:00 AM',
    isUnread: false,
    actionText: 'System Health',
    actionUrl: 'settings.html',
    icon: 'fa-server',
    iconColor: 'text-stone-600 bg-stone-100 border-stone-200'
  },
  {
    id: 'notif-11',
    category: 'payments',
    type: 'pending_payment',
    title: 'Pending balance reminder: Sophia Reyes',
    details: '₱149 balance pending for Pedicure appointment',
    timestamp: 'Sept 21',
    date: 'Sept 21, 2026',
    time: '5:00 PM',
    isUnread: false,
    actionText: 'View Payment',
    actionUrl: 'payments.html',
    icon: 'fa-clock',
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    id: 'notif-12',
    category: 'appointments',
    type: 'confirmation',
    title: 'Patricia Gomez\'s appointment was confirmed',
    details: 'Haircut & Styling — September 22, 2026 at 3:00 PM',
    timestamp: 'Sept 21',
    date: 'Sept 21, 2026',
    time: '2:30 PM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-check',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-13',
    category: 'appointments',
    type: 'new_booking',
    title: 'Carla Dela Cruz booked an appointment',
    details: 'Hair Dye & Color Refresh — September 22, 2026 at 3:00 PM',
    timestamp: 'Sept 21',
    date: 'Sept 21, 2026',
    time: '1:15 PM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-plus',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-14',
    category: 'customers',
    type: 'new_customer',
    title: 'Patricia Gomez registered as a new customer',
    details: 'Customer ID: CUST-1006 · Mobile: 0920 111 4477',
    timestamp: 'Sept 21',
    date: 'Sept 21, 2026',
    time: '11:00 AM',
    isUnread: false,
    actionText: 'View Profile',
    actionUrl: 'customers.html',
    icon: 'fa-user-plus',
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  {
    id: 'notif-15',
    category: 'payments',
    type: 'refund_processed',
    title: 'Refund processed for Patricia Gomez',
    details: '₱500 — Consultation Deposit — GCash reversed (PAY-0008)',
    timestamp: 'Sept 21',
    date: 'Sept 21, 2026',
    time: '3:05 PM',
    isUnread: false,
    actionText: 'View Payment',
    actionUrl: 'payments.html',
    icon: 'fa-arrow-rotate-left',
    iconColor: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  {
    id: 'notif-16',
    category: 'appointments',
    type: 'rescheduled',
    title: 'Maria Santos rescheduled an appointment',
    details: 'Haircut — September 22 → September 23',
    timestamp: 'Sept 20',
    date: 'Sept 20, 2026',
    time: '4:15 PM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-clock-rotate-left',
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    id: 'notif-17',
    category: 'appointments',
    type: 'confirmation',
    title: 'Jamie Reyes\'s appointment was confirmed',
    details: 'Manicure — September 23, 2026 at 1:00 PM',
    timestamp: 'Sept 20',
    date: 'Sept 20, 2026',
    time: '3:00 PM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-check',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-18',
    category: 'appointments',
    type: 'cancelled',
    title: 'Elena Cruz cancelled an appointment',
    details: 'Cold Wave — September 20, 2026 at 10:00 AM',
    timestamp: 'Sept 20',
    date: 'Sept 20, 2026',
    time: '8:45 AM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-xmark',
    iconColor: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  {
    id: 'notif-19',
    category: 'payments',
    type: 'payment_received',
    title: 'Payment received from Carla Dela Cruz',
    details: '₱699 — Hair Dye — GCash (PAY-0004)',
    timestamp: 'Sept 19',
    date: 'Sept 19, 2026',
    time: '4:30 PM',
    isUnread: false,
    actionText: 'View Payment',
    actionUrl: 'payments.html',
    icon: 'fa-money-bill-wave',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  {
    id: 'notif-20',
    category: 'appointments',
    type: 'new_booking',
    title: 'Bea Alonzo booked an appointment',
    details: 'Power Dose — September 22, 2026 at 11:00 AM',
    timestamp: 'Sept 19',
    date: 'Sept 19, 2026',
    time: '2:00 PM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-plus',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-21',
    category: 'appointments',
    type: 'confirmation',
    title: 'Joshua Garcia\'s appointment was confirmed',
    details: 'Trim — September 23, 2026 at 9:30 AM',
    timestamp: 'Sept 19',
    date: 'Sept 19, 2026',
    time: '11:30 AM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-check',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-22',
    category: 'system',
    type: 'system_alert',
    title: 'System update: Price configuration updated',
    details: 'Rebonding set to consultation pricing; Brazilian updated to ₱1,999.',
    timestamp: 'Sept 18',
    date: 'Sept 18, 2026',
    time: '6:00 PM',
    isUnread: false,
    actionText: 'View Services',
    actionUrl: 'services.html',
    icon: 'fa-gear',
    iconColor: 'text-stone-600 bg-stone-100 border-stone-200'
  },
  {
    id: 'notif-23',
    category: 'appointments',
    type: 'new_booking',
    title: 'Sophia Reyes booked an appointment',
    details: 'Pedicure — September 22, 2026 at 2:00 PM',
    timestamp: 'Sept 18',
    date: 'Sept 18, 2026',
    time: '1:45 PM',
    isUnread: false,
    actionText: 'View Appointment',
    actionUrl: 'appointments.html',
    icon: 'fa-calendar-plus',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'notif-24',
    category: 'customers',
    type: 'new_customer',
    title: 'Katrina Halili registered as a new customer',
    details: 'Customer ID: CUST-1008 · Mobile: 0918 999 0011',
    timestamp: 'Sept 18',
    date: 'Sept 18, 2026',
    time: '10:15 AM',
    isUnread: false,
    actionText: 'View Profile',
    actionUrl: 'customers.html',
    icon: 'fa-user-plus',
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  }
];

// In-memory state
let notifications = [];
let activeNotification = null;
let currentFilter = 'all';

// ================= STORAGE HELPERS =================
function loadNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      notifications = JSON.parse(raw);
    } else {
      notifications = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS));
      saveNotifications();
    }
  } catch (err) {
    console.error('Error loading notifications:', err);
    notifications = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS));
  }
}

function saveNotifications() {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error('Error saving notifications:', err);
  }
}

// ================= DOM INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();
  renderSummaryCards();
  applyFilterAndRender();
  loadNotificationPreferences();
  updateTimeBadge();
});

// ================= SUMMARY CARDS =================
function renderSummaryCards() {
  const total = notifications.length;
  const unread = notifications.filter(n => n.isUnread).length;
  const appts = notifications.filter(n => n.category === 'appointments').length;
  const paymentsCount = notifications.filter(n => n.category === 'payments').length;

  const totalEl = document.getElementById('statTotalNotifs');
  const unreadEl = document.getElementById('statUnreadNotifs');
  const apptsEl = document.getElementById('statApptNotifs');
  const paymentsEl = document.getElementById('statPaymentNotifs');

  if (totalEl) totalEl.textContent = total;
  if (unreadEl) unreadEl.textContent = unread;
  if (apptsEl) apptsEl.textContent = appts;
  if (paymentsEl) paymentsEl.textContent = paymentsCount;
}

// ================= FILTER & RENDER TIMELINE =================
function setNotificationFilter(filter) {
  currentFilter = filter;

  // Update tabs styling (fixed dimensions to avoid layout shifting)
  const tabs = ['all', 'appointments', 'payments', 'customers', 'system'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-notif-${t}`);
    if (btn) {
      if (t === filter) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-[#810B38] text-white shadow-sm transition-colors duration-150';
      } else {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-semibold bg-[#FAF6F0] hover:bg-[#DCC3AA]/40 text-stone-700 transition-colors duration-150';
      }
    }
  });

  applyFilterAndRender();
}

function applyFilterAndRender() {
  let filtered = [...notifications];

  if (currentFilter !== 'all') {
    filtered = filtered.filter(n => n.category === currentFilter);
  }

  renderNotificationsList(filtered);
}

function renderNotificationsList(items) {
  const container = document.getElementById('notificationsListContainer');
  const emptyState = document.getElementById('notificationsEmptyState');
  const countText = document.getElementById('notificationsResultCount');

  if (countText) {
    countText.textContent = `Showing ${items.length} notification${items.length === 1 ? '' : 's'}`;
  }

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    container.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  container.classList.remove('hidden');

  container.innerHTML = items.map(n => {
    // Unread visual blue dot
    const unreadDot = n.isUnread
      ? `<span class="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 shadow-xs ring-4 ring-blue-100" title="Unread notification"></span>`
      : `<span class="w-2.5 h-2.5 rounded-full bg-transparent shrink-0"></span>`;

    const cardBg = n.isUnread ? 'bg-white border-[#DCC3AA]' : 'bg-[#FAF6F0]/50 border-stone-200/80';

    return `
      <div class="${cardBg} rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-[#810B38] group">
        
        <!-- Left: Dot + Icon + Content -->
        <div class="flex items-start gap-3.5 min-w-0">
          
          <!-- Blue Dot Indicator -->
          <div class="pt-2">
            ${unreadDot}
          </div>

          <!-- Category Icon -->
          <div class="w-11 h-11 rounded-2xl border ${n.iconColor} flex items-center justify-center text-sm shrink-0 shadow-2xs mt-0.5">
            <i class="fa-solid ${n.icon}"></i>
          </div>

          <!-- Text Details -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="font-serif font-bold text-sm text-[#541A1A] group-hover:text-[#810B38] transition-colors">
                ${n.title}
              </h4>
              <span class="text-[11px] font-mono text-stone-400">· ${n.timestamp}</span>
            </div>
            
            <p class="text-xs text-stone-600 mt-1 leading-relaxed">
              ${n.details}
            </p>

            <div class="flex items-center gap-3 text-[11px] text-stone-400 mt-2 font-mono">
              <span><i class="fa-regular fa-clock mr-1"></i>${n.date} · ${n.time}</span>
            </div>
          </div>
        </div>

        <!-- Right: Actions (View, Mark Read, Delete) -->
        <div class="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 w-full sm:w-auto justify-end">
          
          <!-- Direct Quick Action (e.g. View Appointment) -->
          <a 
            href="${n.actionUrl}"
            onclick="markSingleAsRead('${n.id}')"
            class="px-3.5 py-1.5 rounded-xl bg-white border border-[#DCC3AA] text-[#541A1A] hover:bg-[#FAF6F0] font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs">
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-[#810B38]"></i>
            <span>${n.actionText}</span>
          </a>

          <!-- View Modal -->
          <button 
            type="button" 
            onclick="openNotificationModal('${n.id}')"
            class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-600 transition-colors flex items-center justify-center text-xs shadow-2xs"
            title="View Details">
            <i class="fa-solid fa-eye"></i>
          </button>

          <!-- Toggle Read/Unread -->
          <button 
            type="button" 
            onclick="toggleReadStatus('${n.id}')"
            class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-600 transition-colors flex items-center justify-center text-xs shadow-2xs"
            title="${n.isUnread ? 'Mark as Read' : 'Mark as Unread'}">
            <i class="fa-solid ${n.isUnread ? 'fa-check' : 'fa-envelope'}"></i>
          </button>

          <!-- Delete -->
          <button 
            type="button" 
            onclick="deleteNotification('${n.id}')"
            class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-rose-600 hover:text-white text-stone-600 transition-colors flex items-center justify-center text-xs shadow-2xs"
            title="Delete Notification">
            <i class="fa-solid fa-trash-can"></i>
          </button>

        </div>

      </div>
    `;
  }).join('');
}

// ================= NOTIFICATION ACTIONS =================
function markAllAsRead() {
  let count = 0;
  notifications.forEach(n => {
    if (n.isUnread) {
      n.isUnread = false;
      count++;
    }
  });

  saveNotifications();
  renderSummaryCards();
  applyFilterAndRender();

  showToast(`Marked ${count} notifications as read.`, 'success');
}

function markSingleAsRead(id) {
  const notif = notifications.find(n => n.id === id);
  if (notif && notif.isUnread) {
    notif.isUnread = false;
    saveNotifications();
    renderSummaryCards();
  }
}

function toggleReadStatus(id) {
  const notif = notifications.find(n => n.id === id);
  if (!notif) return;

  notif.isUnread = !notif.isUnread;
  saveNotifications();
  renderSummaryCards();
  applyFilterAndRender();

  showToast(`Notification marked as ${notif.isUnread ? 'unread' : 'read'}.`, 'info');
}

function deleteNotification(id) {
  notifications = notifications.filter(n => n.id !== id);
  saveNotifications();
  renderSummaryCards();
  applyFilterAndRender();

  showToast('Notification deleted.', 'info');
}

// ================= NOTIFICATION DETAILS MODAL =================
function openNotificationModal(id) {
  const notif = notifications.find(n => n.id === id);
  if (!notif) return;

  activeNotification = notif;
  markSingleAsRead(id);
  applyFilterAndRender();

  const titleEl = document.getElementById('modalNotifTitle');
  const detailsEl = document.getElementById('modalNotifDetails');
  const dateEl = document.getElementById('modalNotifDate');
  const categoryEl = document.getElementById('modalNotifCategory');
  const actionBtn = document.getElementById('modalNotifActionBtn');

  if (titleEl) titleEl.textContent = notif.title;
  if (detailsEl) detailsEl.textContent = notif.details;
  if (dateEl) dateEl.textContent = `${notif.date} at ${notif.time} (${notif.timestamp})`;
  if (categoryEl) categoryEl.textContent = notif.category.toUpperCase();

  if (actionBtn) {
    actionBtn.href = notif.actionUrl;
    actionBtn.innerHTML = `
      <i class="fa-solid fa-arrow-up-right-from-square"></i>
      <span>${notif.actionText}</span>
    `;
  }

  const modal = document.getElementById('notificationDetailsModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeNotificationModal() {
  const modal = document.getElementById('notificationDetailsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  activeNotification = null;
}

// ================= NOTIFICATION PREFERENCES =================
function loadNotificationPreferences() {
  const defaultPrefs = {
    newBooking: true,
    apptConfirmation: true,
    apptCancellation: true,
    apptRescheduling: true,
    paymentReceived: true,
    pendingPayment: true,
    newCustomer: true
  };

  let prefs = defaultPrefs;
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_STORAGE_KEY);
    if (raw) prefs = JSON.parse(raw);
  } catch (e) {
    prefs = defaultPrefs;
  }

  const elNewBooking = document.getElementById('prefNewBooking');
  const elApptConf = document.getElementById('prefApptConfirmation');
  const elApptCancel = document.getElementById('prefApptCancellation');
  const elApptResched = document.getElementById('prefApptRescheduling');
  const elPayReceived = document.getElementById('prefPaymentReceived');
  const elPayPending = document.getElementById('prefPendingPayment');
  const elNewCust = document.getElementById('prefNewCustomer');

  if (elNewBooking) elNewBooking.checked = prefs.newBooking;
  if (elApptConf) elApptConf.checked = prefs.apptConfirmation;
  if (elApptCancel) elApptCancel.checked = prefs.apptCancellation;
  if (elApptResched) elApptResched.checked = prefs.apptRescheduling;
  if (elPayReceived) elPayReceived.checked = prefs.paymentReceived;
  if (elPayPending) elPayPending.checked = prefs.pendingPayment;
  if (elNewCust) elNewCust.checked = prefs.newCustomer;
}

function saveNotificationPreferences(event) {
  if (event) event.preventDefault();

  const prefs = {
    newBooking: !!document.getElementById('prefNewBooking')?.checked,
    apptConfirmation: !!document.getElementById('prefApptConfirmation')?.checked,
    apptCancellation: !!document.getElementById('prefApptCancellation')?.checked,
    apptRescheduling: !!document.getElementById('prefApptRescheduling')?.checked,
    paymentReceived: !!document.getElementById('prefPaymentReceived')?.checked,
    pendingPayment: !!document.getElementById('prefPendingPayment')?.checked,
    newCustomer: !!document.getElementById('prefNewCustomer')?.checked
  };

  try {
    localStorage.setItem(NOTIF_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    showToast('Notification preferences saved successfully!', 'success');
  } catch (err) {
    showToast('Failed to save preferences.', 'error');
  }
}

// ================= MODAL HELPERS & NAV =================
function closeAllModals() {
  const modalIds = ['notificationDetailsModal', 'logoutModal'];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
}

function toggleMobileSidebar(show) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!sidebar || !backdrop) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  const shouldOpen = typeof show === 'boolean' ? show : isClosed;

  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('pointer-events-none', 'opacity-0');
    backdrop.classList.add('opacity-100');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('pointer-events-none', 'opacity-0');
    backdrop.classList.remove('opacity-100');
  }
}

function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleConfirmLogout() {
  window.location.href = '../login.html';
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('adminToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'adminToastContainer';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const icon = type === 'success'
    ? 'fa-circle-check text-emerald-400'
    : type === 'error'
      ? 'fa-circle-exclamation text-rose-400'
      : 'fa-circle-info text-[#DCC3AA]';

  const borderColor = type === 'success'
    ? 'border-emerald-500/50'
    : type === 'error'
      ? 'border-rose-500/50'
      : 'border-[#DCC3AA]/50';

  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 bg-[#541A1A] text-[#F1E2D1] border ${borderColor} rounded-xl shadow-2xl text-xs font-medium animate-fadeIn transition-all duration-300`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-base shrink-0"></i>
    <span class="flex-1">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function updateTimeBadge() {
  const clockEl = document.getElementById('topClockDisplay');
  if (!clockEl) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  clockEl.textContent = `${dateStr} · ${timeStr}`;

  setTimeout(updateTimeBadge, 1000);
}
