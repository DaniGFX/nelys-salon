/**
 * Nely's Salon — Customer Notifications Script
 * Handles live database notification synchronization, appointment/payment alerts,
 * category filtering (All, Appointments, Payments, Updates), mark all as read,
 * unread status management, and contextual detail modals.
 */

let notificationsData = [];
let currentCategory = 'all';
let currentUserId = 'guest';

document.addEventListener('DOMContentLoaded', () => {
  initPatronProfile();
  loadNotifications();
  setupEventListeners();
});

// 1. Initialize Patron Profile in Sidebar
function initPatronProfile() {
  const savedUserJson = localStorage.getItem('nelys_user');
  if (!savedUserJson) return;

  try {
    const user = JSON.parse(savedUserJson);
    currentUserId = user.id || user.email || 'guest';
    const displayName = user.full_name || user.name || (user.email ? user.email.split('@')[0] : 'Client');

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

    const modalName = document.getElementById('profileModalName');
    if (modalName) modalName.value = displayName;

    const modalPhone = document.getElementById('profileModalPhone');
    if (modalPhone) modalPhone.value = user.phone || '';

    const modalAddr = document.getElementById('profileModalAddress');
    if (modalAddr) modalAddr.value = user.address || user.home_address || 'Lagro, Quezon City';
  } catch (e) {
    console.warn('Error reading saved user:', e);
  }
}

// 2. Fetch Notifications from Live Database & Bookings
async function loadNotifications() {
  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const readSet = getReadSet();
  let fetchedNotifs = [];

  try {
    // 1. Fetch DB notifications
    const res = await fetch('../api/notifications', { headers });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        fetchedNotifs = json.data.map(item => mapDbNotification(item, readSet));
      }
    }
  } catch (err) {
    console.warn('Notifications endpoint notice:', err);
  }

  // 2. Fetch Bookings to provide rich live updates
  try {
    const bRes = await fetch('../api/bookings', { headers });
    if (bRes.ok) {
      const bJson = await bRes.json();
      if (bJson.status === 'success' && Array.isArray(bJson.data)) {
        const bookingNotifs = bJson.data.map(b => mapBookingToNotification(b, readSet));
        // Merge without duplicates by ID
        const existingIds = new Set(fetchedNotifs.map(n => n.id));
        bookingNotifs.forEach(bn => {
          if (!existingIds.has(bn.id)) {
            fetchedNotifs.push(bn);
            existingIds.add(bn.id);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Bookings endpoint notice:', err);
  }

  // 3. Fallback only if both returned empty
  if (fetchedNotifs.length === 0) {
    fetchedNotifs = getDefaultFallbackNotifications(readSet);
  }

  // Sort by date / recency
  fetchedNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  notificationsData = fetchedNotifs;
  updateCountsAndBadges();
  renderNotifications();
}

function getReadSet() {
  try {
    const raw = localStorage.getItem(`nelys_read_notifications_${currentUserId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveReadSet(set) {
  try {
    localStorage.setItem(`nelys_read_notifications_${currentUserId}`, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error saving read notifications:', e);
  }
}

// Map from DB `notifications` table
function mapDbNotification(dbNotif, readSet) {
  const id = `NOTIF-DB-${dbNotif.id}`;
  const isRead = readSet.has(id);
  const title = dbNotif.title || 'Salon Notification';
  const category = title.toLowerCase().includes('payment') ? 'payments' : 'appointments';

  return {
    id,
    category,
    title,
    message: dbNotif.message || '',
    time: formatDateLabel(dbNotif.created_at),
    timestamp: new Date(dbNotif.created_at).getTime() || Date.now(),
    isRead,
    icon: category === 'payments' ? 'fa-solid fa-receipt' : 'fa-solid fa-bell',
    iconBg: category === 'payments' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#810B38] text-white',
    dotColor: isRead ? null : 'bg-[#810B38]',
    payload: {
      type: category === 'payments' ? 'payment' : 'appointment',
      bookingId: dbNotif.booking_id ? `NS-${dbNotif.booking_id}` : 'N/A',
      service: title,
      dateTime: dbNotif.created_at || 'Recently',
      status: dbNotif.status === 'sent' ? 'Delivered' : 'Pending'
    }
  };
}

// Map customer bookings into rich contextual notifications
function mapBookingToNotification(b, readSet) {
  const id = `NOTIF-BOOK-${b.id}-${b.status}`;
  const isRead = readSet.has(id);
  const status = (b.status || 'pending').toLowerCase();
  const serviceName = b.service_name || 'Beauty Treatment';
  const refNo = b.reference_no || `NS-${b.id}`;
  const dateFormatted = `${b.booking_date} at ${b.booking_time ? b.booking_time.substring(0, 5) : 'Scheduled Time'}`;
  const priceFormatted = b.total_price ? `₱${parseFloat(b.total_price).toLocaleString('en-PH')}` : '₱0';

  let title = 'Booking Update';
  let message = `Your appointment for ${serviceName} is currently ${status}.`;
  let category = 'appointments';
  let icon = 'fa-solid fa-calendar-check';
  let iconBg = 'bg-[#810B38] text-white';

  if (status === 'confirmed') {
    title = 'Booking Confirmed';
    message = `Your appointment for ${serviceName} on ${b.booking_date} has been confirmed.`;
    icon = 'fa-solid fa-calendar-check';
    iconBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else if (status === 'completed') {
    title = 'Service Completed';
    message = `Thank you for visiting! Your ${serviceName} session is marked completed.`;
    icon = 'fa-solid fa-circle-check';
    iconBg = 'bg-emerald-100 text-emerald-700';
  } else if (status === 'cancelled') {
    title = 'Appointment Cancelled';
    message = `Your appointment for ${serviceName} on ${b.booking_date} was cancelled.`;
    icon = 'fa-solid fa-circle-xmark';
    iconBg = 'bg-rose-50 text-rose-700 border border-rose-200';
  }

  // Payment verified notification
  if (b.payment_status === 'paid') {
    category = 'payments';
    icon = 'fa-solid fa-receipt';
    iconBg = 'bg-emerald-100 text-emerald-700';
  }

  return {
    id,
    category,
    title,
    message,
    time: formatDateLabel(b.created_at || b.booking_date),
    timestamp: new Date(b.created_at || b.booking_date).getTime() || Date.now(),
    isRead,
    icon,
    iconBg,
    dotColor: isRead ? null : 'bg-[#810B38]',
    payload: {
      type: category === 'payments' ? 'payment' : 'appointment',
      bookingId: refNo,
      service: serviceName,
      dateTime: dateFormatted,
      location: b.visit_type === 'home' ? (b.home_address || 'Home Service') : "Nely's Salon Atelier (Lagro, QC)",
      status: b.status ? b.status.toUpperCase() : 'PENDING',
      reason: b.cancel_reason || '',
      amount: priceFormatted
    }
  };
}

// Fallback items if fresh database has no bookings yet
function getDefaultFallbackNotifications(readSet) {
  const items = [
    {
      id: "NOTIF-WELCOME",
      category: "updates",
      title: "Welcome to Nely's Salon Patron Portal",
      message: "Manage your bookings, explore beauty treatments, and track hair care history effortlessly.",
      time: "Today",
      timestamp: Date.now(),
      isRead: readSet.has("NOTIF-WELCOME"),
      icon: "fa-solid fa-sparkles",
      iconBg: "bg-[#FAF6F0] text-[#810B38] border border-[#DCC3AA]",
      dotColor: readSet.has("NOTIF-WELCOME") ? null : "bg-[#810B38]",
      payload: {
        type: "update",
        title: "Welcome to Nely's Salon",
        message: "We are delighted to have you! Book your favorite hair, nail, and foot spa appointments anytime.",
        promoCode: "NELYS15"
      }
    },
    {
      id: "NOTIF-ANNIV",
      category: "updates",
      title: "15-Year Anniversary Celebration",
      message: "Enjoy 10% off any premium hair care package and complimentary consultation this month at our Lagro atelier.",
      time: "This Week",
      timestamp: Date.now() - 86400000,
      isRead: readSet.has("NOTIF-ANNIV"),
      icon: "fa-solid fa-gift",
      iconBg: "bg-[#FAF6F0] text-[#810B38] border border-[#DCC3AA]",
      dotColor: readSet.has("NOTIF-ANNIV") ? null : "bg-[#810B38]",
      payload: {
        type: "update",
        title: "15 Years of Beauty Heritage",
        message: "Thank you for being part of our journey! Show promo code NELYS15 upon appointment arrival.",
        promoCode: "NELYS15"
      }
    }
  ];

  return items;
}

// 3. Update Dynamic Category Counts and Header Badges
function updateCountsAndBadges() {
  const countAll = notificationsData.length;
  const countAppt = notificationsData.filter(n => n.category === 'appointments').length;
  const countPay = notificationsData.filter(n => n.category === 'payments').length;
  const countUpd = notificationsData.filter(n => n.category === 'updates').length;
  const unreadCount = notificationsData.filter(n => !n.isRead).length;

  const elAll = document.getElementById('count-all');
  const elAppt = document.getElementById('count-appointments');
  const elPay = document.getElementById('count-payments');
  const elUpd = document.getElementById('count-updates');
  const elBadge = document.getElementById('headerUnreadBadge');

  if (elAll) elAll.textContent = countAll;
  if (elAppt) elAppt.textContent = countAppt;
  if (elPay) elPay.textContent = countPay;
  if (elUpd) elUpd.textContent = countUpd;

  if (elBadge) {
    elBadge.textContent = unreadCount > 0 ? `${unreadCount} Unread` : 'All Caught Up';
  }

  // Update sidebar counter for notifications
  const asideBadge = document.querySelector('a[href="notifications.html"] span.ml-auto');
  if (asideBadge) {
    asideBadge.textContent = unreadCount;
  }
}

// 4. Render Notifications Cards
function renderNotifications() {
  const container = document.getElementById('notificationsContainer');
  const emptyState = document.getElementById('emptyNotificationsState');
  if (!container) return;

  const filtered = notificationsData.filter(n => {
    if (currentCategory === 'all') return true;
    return n.category === currentCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');

  let html = '';
  filtered.forEach(notif => {
    const isUnread = !notif.isRead;
    const cardBg = isUnread ? 'bg-[#FFFDF9] border-[#810B38]/30 shadow-sm' : 'bg-white border-[#E8D9CA] opacity-90';

    html += `
      <article 
        onclick="handleNotificationClick('${escapeHtml(notif.id)}')"
        class="${cardBg} hover:border-[#810B38] rounded-3xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer hover:shadow-md group relative flex items-start gap-4">
        
        <!-- Icon Avatar -->
        <div class="w-11 h-11 rounded-2xl ${notif.iconBg} flex items-center justify-center text-lg shrink-0 shadow-sm transition-transform group-hover:scale-105">
          <i class="${notif.icon}"></i>
        </div>

        <!-- Body Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-2 min-w-0">
              <h3 class="font-bold text-sm sm:text-base text-[#541A1A] group-hover:text-[#810B38] transition-colors truncate">
                ${escapeHtml(notif.title)}
              </h3>
              ${isUnread ? `
                <span class="w-2.5 h-2.5 rounded-full bg-[#810B38] shrink-0 animate-pulse shadow-sm" title="Unread notification"></span>
              ` : ''}
            </div>
            <span class="text-[11px] text-[#735e5e] shrink-0 font-medium">${escapeHtml(notif.time)}</span>
          </div>

          <p class="text-xs sm:text-sm text-[#2b1d1d] leading-relaxed">
            ${escapeHtml(notif.message)}
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

// 5. Handle Click on Notification Card
function handleNotificationClick(id) {
  const notif = notificationsData.find(n => n.id === id);
  if (!notif) return;

  // Mark as read
  if (!notif.isRead) {
    notif.isRead = true;
    notif.dotColor = null;
    const readSet = getReadSet();
    readSet.add(id);
    saveReadSet(readSet);
    updateCountsAndBadges();
    renderNotifications();
  }

  // Open Contextual Modal
  if (notif.payload && notif.payload.type === 'payment') {
    openPaymentModal(notif);
  } else if (notif.payload && notif.payload.type === 'update') {
    openUpdateModal(notif);
  } else {
    openAppointmentModal(notif);
  }
}

// 6. Mark All As Read
function markAllAsRead() {
  const readSet = getReadSet();
  notificationsData.forEach(n => {
    n.isRead = true;
    n.dotColor = null;
    readSet.add(n.id);
  });

  saveReadSet(readSet);
  updateCountsAndBadges();
  renderNotifications();
  showToast('All notifications marked as read.');
}

// 7. Category Filter Switcher
function switchCategory(cat) {
  currentCategory = cat;

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

// 8. Contextual Modal 1: Appointment Notification
function openAppointmentModal(notif) {
  const p = notif.payload || {};

  const titleEl = document.getElementById('apptNotifTitle');
  const serviceEl = document.getElementById('apptNotifService');
  const dtEl = document.getElementById('apptNotifDateTime');
  const locEl = document.getElementById('apptNotifLocation');
  const statusEl = document.getElementById('apptNotifStatus');
  const amtEl = document.getElementById('apptNotifAmount');
  const reasonRow = document.getElementById('apptNotifReasonRow');
  const reasonEl = document.getElementById('apptNotifReason');

  if (titleEl) titleEl.textContent = notif.title;
  if (serviceEl) serviceEl.textContent = p.service || notif.title;
  if (dtEl) dtEl.textContent = p.dateTime || notif.time;
  if (locEl) locEl.textContent = p.location || "Nely's Salon Atelier (Lagro, QC)";
  if (statusEl) statusEl.textContent = p.status || 'CONFIRMED';
  if (amtEl) amtEl.textContent = p.amount || '₱0.00';

  if (reasonRow && reasonEl) {
    if (p.reason) {
      reasonEl.textContent = p.reason;
      reasonRow.classList.remove('hidden');
    } else {
      reasonRow.classList.add('hidden');
    }
  }

  const modal = document.getElementById('appointmentNotifModal');
  if (modal && typeof modal.showModal === 'function') modal.showModal();
}

function closeAppointmentModal() {
  const modal = document.getElementById('appointmentNotifModal');
  if (modal) modal.close();
}

// 9. Contextual Modal 2: Payment Notification
function openPaymentModal(notif) {
  const p = notif.payload || {};

  const titleEl = document.getElementById('payNotifTitle');
  const idEl = document.getElementById('payNotifPaymentId');
  const serviceEl = document.getElementById('payNotifService');
  const methodEl = document.getElementById('payNotifMethod');
  const refEl = document.getElementById('payNotifRef');
  const statusEl = document.getElementById('payNotifStatus');
  const dtEl = document.getElementById('payNotifDate');
  const amtEl = document.getElementById('payNotifAmount');

  if (titleEl) titleEl.textContent = notif.title;
  if (idEl) idEl.textContent = p.bookingId || notif.id;
  if (serviceEl) serviceEl.textContent = p.service || 'Salon Service';
  if (methodEl) methodEl.textContent = p.method || 'GCash / Cash';
  if (refEl) refEl.textContent = p.referenceNo || 'Verified';
  if (statusEl) statusEl.textContent = p.status || 'Settled';
  if (dtEl) dtEl.textContent = p.dateTime || notif.time;
  if (amtEl) amtEl.textContent = p.amount || '₱0.00';

  const modal = document.getElementById('paymentNotifModal');
  if (modal && typeof modal.showModal === 'function') modal.showModal();
}

function closePaymentModal() {
  const modal = document.getElementById('paymentNotifModal');
  if (modal) modal.close();
}

// 10. Contextual Modal 3: Update / Promo Notification
function openUpdateModal(notif) {
  const p = notif.payload || {};

  const titleEl = document.getElementById('updateNotifTitle');
  const msgEl = document.getElementById('updateNotifMessage');
  const promoEl = document.getElementById('updateNotifPromoCode');

  if (titleEl) titleEl.textContent = notif.title;
  if (msgEl) msgEl.textContent = notif.message;
  if (promoEl && p.promoCode) promoEl.textContent = p.promoCode;

  const modal = document.getElementById('updateNotifModal');
  if (modal && typeof modal.showModal === 'function') modal.showModal();
}

function closeUpdateModal() {
  const modal = document.getElementById('updateNotifModal');
  if (modal) modal.close();
}

// 11. Copy Promo Code helper
function copyPromoCode() {
  const codeEl = document.getElementById('updateNotifPromoCode');
  const code = codeEl ? codeEl.textContent : 'NELYS15';
  navigator.clipboard.writeText(code).then(() => {
    showToast('Promo code copied to clipboard!');
  }).catch(() => {
    showToast(`Code: ${code}`);
  });
}

// 12. Setup General Event Listeners
function setupEventListeners() {
  // Mobile sidebar controls if needed
}

// Utility: Format Date Label
function formatDateLabel(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// Toast Helper
function showToast(msg) {
  const container = document.getElementById('toastContainer') || document.body;
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-5 right-5 z-50 bg-[#541A1A] border border-[#DCC3AA] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs pointer-events-auto animate-slide-up';
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check text-emerald-400"></i>
    <span class="font-medium">${escapeHtml(msg)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
