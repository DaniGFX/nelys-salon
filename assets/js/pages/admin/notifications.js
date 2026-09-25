// Seamless 0ms Cache Preload
const NOTIFICATIONS_CACHE_KEY = 'nelys_admin_notifications_cache';
let lastRendered_notifications_Hash = '';
/**
 * Nely's Salon — Admin Notifications Controller
 * Directly connected to backend database API (/api/notifications, /api/dashboard/stats)
 * Manages admin notifications, unread status indicators, category filtering,
 * quick action routing, details modal, and notification preferences settings.
 */

// ================= GLOBAL STATE =================
let notificationsList = [];
let summaryMetrics = {
  total: 0,
  unread: 0,
  appointments: 0,
  payments: 0,
  customers: 0,
  system: 0
};
let notificationPreferences = {
  newBooking: true,
  apptConfirmation: true,
  apptCancellation: true,
  apptRescheduling: true,
  paymentReceived: true,
  pendingPayment: true,
  newCustomer: true
};

let activeNotification = null;
let currentFilter = 'all';

// ================= DOM INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  fetchNotificationsData();
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
async function fetchNotificationsData() {
  try {
    const res = await fetch(`../api/notifications?category=${encodeURIComponent(currentFilter)}`, {
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
      throw new Error(`HTTP ${res.status}: Failed to fetch notifications`);
    }

    const json = await res.json();
    if (json.data) {
      if (Array.isArray(json.data.notifications)) {
        notificationsList = json.data.notifications.map(mapNotificationRecord);
      } else if (Array.isArray(json.data)) {
        notificationsList = json.data.map(mapNotificationRecord);
      }

      if (json.data.metrics) {
        summaryMetrics = Object.assign(summaryMetrics, json.data.metrics);
      }

      if (json.data.preferences) {
        notificationPreferences = Object.assign(notificationPreferences, json.data.preferences);
        populatePreferencesForm(notificationPreferences);
      }
    }

    renderSummaryCards();
    applyFilterAndRender();

  } catch (err) {
    console.error('Error fetching notifications:', err);
    showToast('Failed to load notifications from database.', 'error');
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

// Map raw notification from backend
function mapNotificationRecord(n) {
  const isUnread = n.is_read === 0 || n.is_read === false || n.is_read === '0' || n.isUnread === true;
  const category = (n.category || 'appointments').toLowerCase();

  return {
    id: n.id,
    user_id: n.user_id,
    booking_id: n.booking_id,
    category: category,
    title: n.title || 'Notification Alert',
    details: n.details || n.message || '',
    message: n.message || n.details || '',
    actionText: n.actionText || getActionTextForCategory(category),
    actionUrl: n.actionUrl || getActionUrlForCategory(category),
    isUnread: isUnread,
    is_read: isUnread ? 0 : 1,
    timestamp: n.timestamp || 'Recently',
    date: n.date || 'Today',
    time: n.time || '',
    created_at: n.created_at || '',
    icon: n.icon || getIconForCategory(category, n.title),
    iconColor: n.iconColor || getIconColorForCategory(category, n.title)
  };
}

function getActionTextForCategory(cat) {
  switch (cat) {
    case 'appointments': return 'View Appointment';
    case 'payments': return 'View Payment';
    case 'customers': return 'View Profile';
    case 'system': return 'System Health';
    default: return 'View Details';
  }
}

function getActionUrlForCategory(cat) {
  switch (cat) {
    case 'appointments': return 'appointments.html';
    case 'payments': return 'payments.html';
    case 'customers': return 'customers.html';
    case 'system': return 'settings.html';
    default: return 'dashboard.html';
  }
}

function getIconForCategory(cat, title = '') {
  const t = (title || '').toLowerCase();
  if (cat === 'appointments') {
    if (t.includes('cancel')) return 'fa-calendar-xmark';
    if (t.includes('resched')) return 'fa-clock-rotate-left';
    if (t.includes('confirm')) return 'fa-calendar-check';
    return 'fa-calendar-plus';
  }
  if (cat === 'payments') {
    if (t.includes('refund')) return 'fa-arrow-rotate-left';
    if (t.includes('pending')) return 'fa-clock';
    return 'fa-money-bill-wave';
  }
  if (cat === 'customers') return 'fa-user-plus';
  if (cat === 'system') {
    if (t.includes('backup') || t.includes('server')) return 'fa-server';
    if (t.includes('price') || t.includes('service')) return 'fa-gear';
    return 'fa-sliders';
  }
  return 'fa-bell';
}

function getIconColorForCategory(cat, title = '') {
  const t = (title || '').toLowerCase();
  if (cat === 'appointments') {
    if (t.includes('cancel')) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (t.includes('resched')) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  }
  if (cat === 'payments') {
    if (t.includes('refund')) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (t.includes('pending')) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  }
  if (cat === 'customers') return 'text-indigo-600 bg-indigo-50 border-indigo-200';
  return 'text-stone-600 bg-stone-100 border-stone-200';
}

// ================= SUMMARY STATS RENDERING =================
function renderSummaryCards() {
  const total = summaryMetrics.total !== undefined ? summaryMetrics.total : notificationsList.length;
  const unread = summaryMetrics.unread !== undefined ? summaryMetrics.unread : notificationsList.filter(n => n.isUnread).length;
  const appts = summaryMetrics.appointments !== undefined ? summaryMetrics.appointments : notificationsList.filter(n => n.category === 'appointments').length;
  const paymentsCount = summaryMetrics.payments !== undefined ? summaryMetrics.payments : notificationsList.filter(n => n.category === 'payments').length;

  const totalEl = document.getElementById('statTotalNotifs');
  const unreadEl = document.getElementById('statUnreadNotifs');
  const apptsEl = document.getElementById('statApptNotifs');
  const paymentsEl = document.getElementById('statPaymentNotifs');

  if (totalEl) totalEl.textContent = total;
  if (unreadEl) unreadEl.textContent = unread;
  if (apptsEl) apptsEl.textContent = appts;
  if (paymentsEl) paymentsEl.textContent = paymentsCount;

  // Sync sidebar badge directly
  const sidebarNotifBadge = document.getElementById('sidebarNotificationsBadge');
  if (sidebarNotifBadge) {
    sidebarNotifBadge.textContent = unread;
  }
}

// ================= FILTER & RENDER TIMELINE =================
function setNotificationFilter(filter) {
  currentFilter = filter;

  // Update tabs styling
  const tabs = ['all', 'appointments', 'payments', 'customers', 'system'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-notif-${t}`);
    if (btn) {
      if (t === filter) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-[#810B38] text-white shadow-sm transition-colors duration-150 shrink-0';
      } else {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-semibold bg-[#FAF6F0] hover:bg-[#DCC3AA]/40 text-stone-700 transition-colors duration-150 shrink-0';
      }
    }
  });

  applyFilterAndRender();
}

function applyFilterAndRender() {
  let filtered = [...notificationsList];

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
        <div class="flex items-start gap-3.5 min-w-0 flex-1">
          
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
                ${escapeHtml(n.title)}
              </h4>
              <span class="text-[11px] font-mono text-stone-400">· ${escapeHtml(n.timestamp)}</span>
            </div>
            
            <p class="text-xs text-stone-600 mt-1 leading-relaxed">
              ${escapeHtml(n.details)}
            </p>

            <div class="flex items-center gap-3 text-[11px] text-stone-400 mt-2 font-mono">
              <span><i class="fa-regular fa-clock mr-1"></i>${escapeHtml(n.date)}${n.time ? ` · ${escapeHtml(n.time)}` : ''}</span>
            </div>
          </div>
        </div>

        <!-- Right: Actions (View, Mark Read, Delete) -->
        <div class="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 w-full sm:w-auto justify-end">
          
          <!-- Direct Quick Action -->
          <a 
            href="${escapeHtml(n.actionUrl)}"
            onclick="markSingleAsRead(${n.id})"
            class="px-3.5 py-1.5 rounded-xl bg-white border border-[#DCC3AA] text-[#541A1A] hover:bg-[#FAF6F0] font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs">
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-[#810B38]"></i>
            <span>${escapeHtml(n.actionText)}</span>
          </a>

          <!-- View Modal -->
          <button 
            type="button" 
            onclick="openNotificationModal(${n.id})"
            class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-600 transition-colors flex items-center justify-center text-xs shadow-2xs"
            title="View Details">
            <i class="fa-solid fa-eye"></i>
          </button>

          <!-- Toggle Read/Unread -->
          <button 
            type="button" 
            onclick="toggleReadStatus(${n.id})"
            class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-600 transition-colors flex items-center justify-center text-xs shadow-2xs"
            title="${n.isUnread ? 'Mark as Read' : 'Mark as Unread'}">
            <i class="fa-solid ${n.isUnread ? 'fa-check' : 'fa-envelope'}"></i>
          </button>

          <!-- Delete -->
          <button 
            type="button" 
            onclick="deleteNotification(${n.id})"
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
async function markAllAsRead() {
  try {
    const res = await fetch('../api/notifications/mark-all-read', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to mark all notifications as read`);
    }

    notificationsList.forEach(n => {
      n.isUnread = false;
      n.is_read = 1;
    });

    if (summaryMetrics) {
      summaryMetrics.unread = 0;
    }

    renderSummaryCards();
    applyFilterAndRender();
    fetchSidebarStats();

    showToast('All notifications marked as read.', 'success');
  } catch (err) {
    console.error('Error marking all as read:', err);
    showToast('Failed to mark all as read.', 'error');
  }
}

async function markSingleAsRead(id) {
  const notif = notificationsList.find(n => n.id == id);
  if (!notif || !notif.isUnread) return;

  notif.isUnread = false;
  notif.is_read = 1;
  if (summaryMetrics.unread > 0) summaryMetrics.unread--;

  renderSummaryCards();
  applyFilterAndRender();

  try {
    await fetch(`../api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ is_read: true })
    });
    fetchSidebarStats();
  } catch (err) {
    console.error('Error updating notification read state:', err);
  }
}

async function toggleReadStatus(id) {
  const notif = notificationsList.find(n => n.id == id);
  if (!notif) return;

  const previousState = notif.isUnread;
  notif.isUnread = !notif.isUnread;
  notif.is_read = notif.isUnread ? 0 : 1;

  if (notif.isUnread) {
    summaryMetrics.unread = (summaryMetrics.unread || 0) + 1;
  } else {
    summaryMetrics.unread = Math.max(0, (summaryMetrics.unread || 0) - 1);
  }

  renderSummaryCards();
  applyFilterAndRender();

  try {
    const res = await fetch(`../api/notifications/${id}/toggle`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    fetchSidebarStats();
    showToast(`Notification marked as ${notif.isUnread ? 'unread' : 'read'}.`, 'info');
  } catch (err) {
    console.error('Error toggling notification read status:', err);
    // Revert state on failure
    notif.isUnread = previousState;
    notif.is_read = previousState ? 0 : 1;
    renderSummaryCards();
    applyFilterAndRender();
    showToast('Failed to update notification state.', 'error');
  }
}

async function deleteNotification(id) {
  if (!confirm('Are you sure you want to delete this notification?')) {
    return;
  }

  const notifIndex = notificationsList.findIndex(n => n.id == id);
  if (notifIndex === -1) return;

  const [deleted] = notificationsList.splice(notifIndex, 1);
  if (summaryMetrics.total > 0) summaryMetrics.total--;
  if (deleted.isUnread && summaryMetrics.unread > 0) summaryMetrics.unread--;
  if (summaryMetrics[deleted.category] && summaryMetrics[deleted.category] > 0) {
    summaryMetrics[deleted.category]--;
  }

  renderSummaryCards();
  applyFilterAndRender();

  try {
    const res = await fetch(`../api/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    fetchSidebarStats();
    showToast('Notification deleted successfully.', 'info');
  } catch (err) {
    console.error('Error deleting notification:', err);
    showToast('Failed to delete notification.', 'error');
    fetchNotificationsData();
  }
}

// ================= NOTIFICATION DETAILS MODAL =================
function openNotificationModal(id) {
  const notif = notificationsList.find(n => n.id == id);
  if (!notif) return;

  activeNotification = notif;
  markSingleAsRead(id);

  const titleEl = document.getElementById('modalNotifTitle');
  const detailsEl = document.getElementById('modalNotifDetails');
  const dateEl = document.getElementById('modalNotifDate');
  const categoryEl = document.getElementById('modalNotifCategory');
  const actionBtn = document.getElementById('modalNotifActionBtn');

  if (titleEl) titleEl.textContent = notif.title;
  if (detailsEl) detailsEl.textContent = notif.details;
  if (dateEl) dateEl.textContent = `${notif.date}${notif.time ? ` at ${notif.time}` : ''} (${notif.timestamp})`;
  if (categoryEl) categoryEl.textContent = notif.category.toUpperCase();

  if (actionBtn) {
    actionBtn.href = notif.actionUrl;
    actionBtn.innerHTML = `
      <i class="fa-solid fa-arrow-up-right-from-square"></i>
      <span>${escapeHtml(notif.actionText)}</span>
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
function populatePreferencesForm(prefs) {
  const elNewBooking = document.getElementById('prefNewBooking');
  const elApptConf = document.getElementById('prefApptConfirmation');
  const elApptCancel = document.getElementById('prefApptCancellation');
  const elApptResched = document.getElementById('prefApptRescheduling');
  const elPayReceived = document.getElementById('prefPaymentReceived');
  const elPayPending = document.getElementById('prefPendingPayment');
  const elNewCust = document.getElementById('prefNewCustomer');

  if (elNewBooking) elNewBooking.checked = prefs.newBooking !== false;
  if (elApptConf) elApptConf.checked = prefs.apptConfirmation !== false;
  if (elApptCancel) elApptCancel.checked = prefs.apptCancellation !== false;
  if (elApptResched) elApptResched.checked = prefs.apptRescheduling !== false;
  if (elPayReceived) elPayReceived.checked = prefs.paymentReceived !== false;
  if (elPayPending) elPayPending.checked = prefs.pendingPayment !== false;
  if (elNewCust) elNewCust.checked = prefs.newCustomer !== false;
}

async function saveNotificationPreferences(event) {
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
    const res = await fetch('../api/notifications/preferences', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(prefs)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    notificationPreferences = prefs;
    showToast('Notification preferences saved successfully!', 'success');
  } catch (err) {
    console.error('Error saving notification preferences:', err);
    showToast('Failed to save preferences to server.', 'error');
  }
}

// ================= MODAL HELPERS & NAV =================
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
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  window.location.href = '../login.html';
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
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
    <span class="flex-1">${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

// Utility: Escape HTML
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
