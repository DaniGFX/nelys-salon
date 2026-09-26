/**
 * Nely's Salon — Admin Dashboard Script
 * Fully Connected to Database API (/api/dashboard/stats)
 * Zero Hardcoded Data — 100% Dynamic Database Binding
 * Instant 0ms Synchronous Hydration + Smart Diffing (Zero Flicker, Zero Glitch)
 */

// Cache Key
const DASHBOARD_CACHE_KEY = 'nelys_admin_dashboard_cache';

// Global State
let dashboardData = window.__PRELOADED_DASHBOARD__ || null;
let currentRevenuePeriod = 'week';
let recentCustomersList = [];
let currentCustPage = 1;
const CUST_PAGE_SIZE = 5;
let lastRenderedHash = '';

// Initialize immediately (synchronously if DOM is ready, or on DOMContentLoaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

function initDashboard() {
  checkAdminAuth();
  initAdminHeaderProfile();

  // 1. Instant Synchronous Cache Hydration (0ms render, no flicker)
  hydrateFromCache();

  // 2. Fetch fresh live data from database backend in background
  fetchDashboardData();

  // 3. Setup global listeners
  setupOutsideClickListeners();
  setupDialogAccessibilityListeners();
}

// ==========================================
// 1. AUTHENTICATION & PROFILE
// ==========================================
function checkAdminAuth() {
  const token = localStorage.getItem('nelys_token');
  const userJson = localStorage.getItem('nelys_user');

  if (!token || !userJson) {
    window.location.replace('../login.html');
    return;
  }

  try {
    const user = JSON.parse(userJson);
    if (user.role !== 'admin') {
      window.location.replace('../customer/booking.html');
      return;
    }
  } catch (e) {
    window.location.replace('../login.html');
  }
}

function initAdminHeaderProfile() {
  const userJson = localStorage.getItem('nelys_user');
  let displayName = 'Admin';

  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      let rawName = user.full_name || user.name || (user.email ? user.email.split('@')[0] : 'Admin');
      rawName = rawName.replace(/atelier\s*/gi, '').trim();
      if (rawName && rawName.toLowerCase() !== 'admin') {
        displayName = rawName;
      }
    } catch (err) {
      console.warn('Error reading admin profile:', err);
    }
  }

  const greetingEl = document.getElementById('dashboardGreeting');
  if (greetingEl) {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 18) timeGreeting = 'Good afternoon';
    else if (hour >= 18) timeGreeting = 'Good evening';
    greetingEl.textContent = `${timeGreeting}, ${displayName}!`;
  }

  const initials = getInitials(displayName);
  const mobileBadge = document.getElementById('mobileAdminBadge');
  if (mobileBadge) mobileBadge.textContent = initials;
}

// ==========================================
// 2. CACHE & LIVE DATA FETCHING
// ==========================================
function hydrateFromCache() {
  try {
    const data = window.__PRELOADED_DASHBOARD__ || JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY) || 'null');
    if (data && typeof data === 'object') {
      dashboardData = data;
      renderAllDashboardComponents(data);
    }
  } catch (err) {
    console.warn('Could not hydrate dashboard from cache:', err);
  }
}

async function fetchDashboardData() {
  const token = localStorage.getItem('nelys_token');
  if (!token) return;

  try {
    const res = await fetch('../api/dashboard/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401 || res.status === 403) {
      showToast('Session expired. Redirecting to login...', 'warning');
      setTimeout(() => { window.location.replace('../login.html'); }, 1200);
      return;
    }

    const result = await res.json();
    if (result.success && result.data) {
      const freshHash = JSON.stringify(result.data);
      // If data is identical to cache, do not re-render (prevents glitch / double blink!)
      if (freshHash === lastRenderedHash) {
        return;
      }

      dashboardData = result.data;
      try {
        localStorage.setItem(DASHBOARD_CACHE_KEY, freshHash);
      } catch (cacheErr) {
        console.warn('Failed to save dashboard cache:', cacheErr);
      }
      renderAllDashboardComponents(result.data);
    } else {
      if (!dashboardData) {
        showToast(result.message || 'Could not load dashboard metrics.', 'error');
      }
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    if (!dashboardData) {
      showToast('Backend server connection error. Please verify Apache/MySQL are running.', 'error');
    }
  }
}

// ==========================================
// 3. COMPONENT RENDERING
// ==========================================
function renderAllDashboardComponents(data) {
  if (!data) return;
  lastRenderedHash = JSON.stringify(data);

  renderDateDisplay(data.date);
  renderSidebarBadges(data.badges);
  renderSummaryCards(data);
  renderTodayScheduleTable(data.today_appointments, data.date);
  renderRevenueSection(data.revenue_summary);
  renderRecentCustomersSection(data.recent_customers);
  renderAppointmentStatusSection(data.status_breakdown);
  renderPopularServicesSection(data.popular_services);
  renderNotificationsList(data.notifications);
  populateModalDropdowns(data.form_options);
}

// Date display
function renderDateDisplay(dateStr) {
  const dateEl = document.getElementById('dashboardDateDisplay');
  if (dateEl && dateStr) {
    dateEl.textContent = `Today is ${dateStr}. Here's what's happening at Nely's Salon.`;
  }
}

// Sidebar Badges
function renderSidebarBadges(badges) {
  if (!badges) return;

  const apptBadge = document.getElementById('sidebarAppointmentsBadge');
  if (apptBadge) {
    const count = badges.pending_appointments || badges.appointments || 0;
    if (count > 0) {
      apptBadge.textContent = count;
      apptBadge.classList.remove('hidden');
    } else {
      apptBadge.classList.add('hidden');
    }
  }

  const notifBadge = document.getElementById('sidebarNotificationsBadge');
  if (notifBadge) {
    const count = badges.unread_notifications || badges.notifications || 0;
    if (count > 0) {
      notifBadge.textContent = count;
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }
  }

  const msgBadge = document.getElementById('sidebarMessagesBadge');
  if (msgBadge) {
    const count = badges.unread_messages || badges.messages || 0;
    if (count > 0) {
      msgBadge.textContent = count;
      msgBadge.classList.remove('hidden');
    } else {
      msgBadge.classList.add('hidden');
    }
  }
}

// Summary KPI Cards
function renderSummaryCards(data) {
  const cards = data.cards || data.summary || {};

  // Card 1: Today's Appointments
  setElText('dashboardTodayAppts', cards.today_appointments_count ?? cards.today_appointments ?? 0);

  const morning = cards.today_morning_count ?? cards.morning_count ?? 0;
  const afternoon = cards.today_afternoon_count ?? cards.afternoon_count ?? 0;
  setElText('dashboardApptsBreakdown', `${morning} Morning • ${afternoon} Afternoon`);

  // Card 2: Total Customers
  setElText('dashboardTotalCustomers', cards.total_customers_count ?? cards.total_customers ?? 0);

  const newThisMonth = cards.new_customers_this_month ?? cards.new_customers_month ?? 0;
  setElText('dashboardCustGrowthBadge', `+${newThisMonth} This Month`);

  // Card 3: Today's Revenue
  const rev = parseFloat(cards.today_revenue || 0);
  setElText('dashboardTodayRevenue', formatCurrency(rev));

  const gcash = parseFloat(cards.today_gcash_revenue || cards.gcash_revenue || 0);
  const cash = parseFloat(cards.today_cash_revenue || cards.cash_revenue || 0);
  setElText('dashboardRevBreakdown', `${formatCurrency(gcash)} GCash • ${formatCurrency(cash)} Cash`);

  // Card 4: Pending Appointments
  const pendingCount = cards.pending_appointments_count ?? cards.pending_appts ?? 0;
  setElText('dashboardPendingAppts', pendingCount);

  const pendingBadge = document.getElementById('dashboardPendingBadge');
  if (pendingBadge) {
    if (pendingCount > 0) {
      pendingBadge.textContent = `${pendingCount} Action Needed`;
      pendingBadge.className = 'text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300';
    } else {
      pendingBadge.textContent = 'All Clear';
      pendingBadge.className = 'text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200';
    }
  }
}

// Today's Appointment Schedule Table
function renderTodayScheduleTable(appointments, dateStr) {
  const tbody = document.getElementById('dashboardScheduleBody');
  if (!tbody) return;

  const dateSub = document.getElementById('dashboardScheduleDateSubtitle');
  if (dateSub && dateStr) {
    dateSub.textContent = `Live schedule for ${dateStr}`;
  }

  if (!appointments || appointments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-[#735e5e]">
          <div class="w-12 h-12 rounded-full bg-[#FAF6F0] border border-[#DCC3AA] flex items-center justify-center mx-auto mb-3 text-[#810B38]">
            <i class="fa-regular fa-calendar-check text-xl"></i>
          </div>
          <p class="font-bold text-sm text-[#541A1A]">No appointments scheduled for today.</p>
          <p class="text-xs text-[#735e5e] mt-1">Use "+ New Appointment" to schedule a client.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appointments.map(appt => {
    const timeFormatted = formatTime12(appt.booking_time || appt.appointment_time);
    const initials = getInitials(appt.customer_name);
    const statusBadge = getStatusBadge(appt.status);
    const priceFormatted = formatCurrency(appt.price || appt.total_price || 0);

    return `
      <tr class="hover:bg-[#FAF6F0]/60 transition-colors group">
        <td class="py-4 px-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <i class="fa-regular fa-clock text-[#810B38] text-xs"></i>
            <span class="font-bold text-xs text-[#541A1A]">${escapeHtml(timeFormatted)}</span>
          </div>
        </td>
        <td class="py-4 px-4 whitespace-nowrap">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-[#FAF6F0] text-[#810B38] border border-[#DCC3AA] flex items-center justify-center font-bold text-xs shrink-0">
              ${escapeHtml(initials)}
            </div>
            <div>
              <span class="font-bold text-xs text-[#541A1A] block leading-tight">${escapeHtml(appt.customer_name || 'Customer')}</span>
              <span class="text-[11px] text-[#735e5e] block">${escapeHtml(appt.customer_phone || appt.customer_email || '—')}</span>
            </div>
          </div>
        </td>
        <td class="py-4 px-4 whitespace-nowrap">
          <span class="text-xs font-semibold text-[#541A1A] block">${escapeHtml(appt.service_name || 'Salon Service')}</span>
          <span class="text-[11px] text-[#735e5e] block font-mono">${priceFormatted}</span>
        </td>
        <td class="py-4 px-4 whitespace-nowrap">
          <span class="text-xs font-medium text-[#735e5e] flex items-center gap-1.5">
            <i class="fa-solid fa-user-tie text-[#DCC3AA] text-[10px]"></i>
            ${escapeHtml(appt.staff_name || 'Unassigned')}
          </span>
        </td>
        <td class="py-4 px-4 whitespace-nowrap">
          ${statusBadge}
        </td>
        <td class="py-4 px-4 whitespace-nowrap text-right">
          <a href="appointments.html?id=${appt.id}" 
            class="px-3 py-1.5 rounded-xl bg-[#FAF6F0] hover:bg-[#810B38] text-[#541A1A] hover:text-white border border-[#DCC3AA] font-semibold text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs">
            <span>Details</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// Revenue Section with Dynamic Bar Chart
function renderRevenueSection(revenueSummary) {
  const container = document.getElementById('revenueChartBars');
  const totalDisplay = document.getElementById('revenueTotalDisplay');
  const sublabel = document.getElementById('revenueChartSublabel');
  const periodBtnText = document.getElementById('revenuePeriodBtnText');

  const summary = revenueSummary || (dashboardData && dashboardData.revenue_summary) || {};
  const periodKey = currentRevenuePeriod === 'today' ? 'day' : currentRevenuePeriod;
  const activeData = summary[periodKey] || { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [0, 0, 0, 0, 0, 0, 0], total: 0 };

  // Period button text
  if (periodBtnText) {
    const titles = { today: 'Today', day: 'Today', week: 'This Week', month: 'This Month', year: 'This Year' };
    periodBtnText.textContent = titles[currentRevenuePeriod] || 'This Week';
  }

  // Sublabel
  if (sublabel) {
    const subs = {
      today: "Today's Payment Method Gross",
      day: "Today's Payment Method Gross",
      week: "This Week's Daily Revenue",
      month: "This Month's Weekly Performance",
      year: "This Year's Quarterly Revenue"
    };
    sublabel.textContent = subs[currentRevenuePeriod] || "This Week's Daily Revenue";
  }

  // Total Display
  const total = activeData.total ?? (activeData.values || []).reduce((a, b) => a + b, 0);
  if (totalDisplay) {
    totalDisplay.textContent = formatCurrency(total);
  }

  if (!container) return;

  const labels = activeData.labels || [];
  const values = activeData.values || [];
  const maxVal = Math.max(...values, 100);

  container.innerHTML = labels.map((label, idx) => {
    const val = values[idx] || 0;
    const heightPct = Math.max(Math.round((val / maxVal) * 100), 4);

    return `
      <div class="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
        <div class="text-[10px] font-bold text-[#810B38] opacity-0 group-hover:opacity-100 transition-opacity font-mono whitespace-nowrap">
          ${formatCurrency(val)}
        </div>
        <div class="w-full bg-[#FAF6F0] rounded-xl flex items-end justify-center overflow-hidden border border-[#DCC3AA]/40 h-40">
          <div class="w-full bg-gradient-to-t from-[#810B38] to-[#9b1548] rounded-xl transition-all duration-300 hover:brightness-110" 
            style="height: ${heightPct}%"></div>
        </div>
        <span class="text-[11px] font-semibold text-[#735e5e] truncate max-w-[60px] block text-center">${escapeHtml(label)}</span>
      </div>
    `;
  }).join('');
}

function toggleRevenueDropdown() {
  const menu = document.getElementById('revenueDropdownMenu');
  if (menu) menu.classList.toggle('hidden');
}

function switchRevenuePeriod(period) {
  currentRevenuePeriod = period;
  const menu = document.getElementById('revenueDropdownMenu');
  if (menu) menu.classList.add('hidden');

  if (dashboardData && dashboardData.revenue_summary) {
    renderRevenueSection(dashboardData.revenue_summary);
  }
}

// Recent Customers Section with Pagination
function renderRecentCustomersSection(customers) {
  recentCustomersList = customers || [];
  renderRecentCustomersPage();
}

function renderRecentCustomersPage() {
  const tbody = document.getElementById('dashboardRecentCustomersBody');
  if (!tbody) return;

  const total = recentCustomersList.length;
  const totalPages = Math.ceil(total / CUST_PAGE_SIZE) || 1;
  if (currentCustPage > totalPages) currentCustPage = totalPages;
  if (currentCustPage < 1) currentCustPage = 1;

  const startIdx = (currentCustPage - 1) * CUST_PAGE_SIZE;
  const pageItems = recentCustomersList.slice(startIdx, startIdx + CUST_PAGE_SIZE);

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-xs text-[#735e5e]">
          No registered customer records found.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = pageItems.map(cust => {
      const initials = getInitials(cust.name);
      const visits = cust.total_visits ?? cust.appointments_count ?? 0;
      const spent = parseFloat(cust.total_spent || 0);

      return `
        <tr class="hover:bg-[#FAF6F0]/60 transition-colors">
          <td class="py-3.5 px-4 whitespace-nowrap">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-[#FAF6F0] text-[#810B38] border border-[#DCC3AA] flex items-center justify-center font-bold text-xs shrink-0">
                ${escapeHtml(initials)}
              </div>
              <div>
                <span class="font-bold text-xs text-[#541A1A] block">${escapeHtml(cust.name || 'Customer')}</span>
                <span class="text-[11px] text-[#735e5e] block">${escapeHtml(cust.email || '—')}</span>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap text-xs text-[#735e5e]">
            ${escapeHtml(cust.phone || '—')}
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap">
            <span class="inline-flex items-center gap-1 text-xs font-bold text-[#810B38] bg-[#FAF6F0] px-2.5 py-0.5 rounded-full border border-[#DCC3AA]/50">
              ${visits} visits
            </span>
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap text-xs font-bold text-[#541A1A]">
            ${formatCurrency(spent)}
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap text-right">
            <a href="customers.html?search=${encodeURIComponent(cust.email || cust.name)}" class="text-xs font-bold text-[#810B38] hover:underline">
              View Profile &rarr;
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Pagination indicators
  setElText('recentCustPageStart', total > 0 ? startIdx + 1 : 0);
  setElText('recentCustPageEnd', Math.min(startIdx + CUST_PAGE_SIZE, total));
  setElText('recentCustTotal', total);

  const prevBtn = document.getElementById('recentCustPrevBtn');
  if (prevBtn) prevBtn.disabled = currentCustPage <= 1;

  const nextBtn = document.getElementById('recentCustNextBtn');
  if (nextBtn) nextBtn.disabled = currentCustPage >= totalPages;

  // Page Links
  const linksContainer = document.getElementById('recentCustPageLinks');
  if (linksContainer) {
    let linksHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      if (p === currentCustPage) {
        linksHtml += `<button type="button" class="w-7 h-7 rounded-lg text-xs font-bold bg-[#810B38] text-white">${p}</button>`;
      } else {
        linksHtml += `<button type="button" onclick="changeRecentCustPage(${p})" class="w-7 h-7 rounded-lg text-xs font-medium text-[#541A1A] hover:bg-[#F1E2D1] transition-colors">${p}</button>`;
      }
    }
    linksContainer.innerHTML = linksHtml;
  }
}

function changeRecentCustPage(page) {
  currentCustPage = page;
  renderRecentCustomersPage();
}

// Appointment Status Breakdown Progress
function renderAppointmentStatusSection(breakdown) {
  const b = breakdown || {
    confirmed: { count: 0, percentage: 0 },
    pending: { count: 0, percentage: 0 },
    completed: { count: 0, percentage: 0 },
    cancelled: { count: 0, percentage: 0 }
  };

  setElText('statusCountConfirmed', `${b.confirmed?.count ?? 0} (${b.confirmed?.percentage ?? 0}%)`);
  setElText('statusCountPending', `${b.pending?.count ?? 0} (${b.pending?.percentage ?? 0}%)`);
  setElText('statusCountCompleted', `${b.completed?.count ?? 0} (${b.completed?.percentage ?? 0}%)`);
  setElText('statusCountCancelled', `${b.cancelled?.count ?? 0} (${b.cancelled?.percentage ?? 0}%)`);

  const barContainer = document.getElementById('dashboardStatusBar');
  if (barContainer) {
    barContainer.innerHTML = `
      <div style="width: ${b.confirmed?.percentage ?? 0}%" class="bg-blue-600 h-full transition-all duration-300" title="Confirmed: ${b.confirmed?.percentage ?? 0}%"></div>
      <div style="width: ${b.pending?.percentage ?? 0}%" class="bg-amber-500 h-full transition-all duration-300" title="Pending: ${b.pending?.percentage ?? 0}%"></div>
      <div style="width: ${b.completed?.percentage ?? 0}%" class="bg-emerald-600 h-full transition-all duration-300" title="Completed: ${b.completed?.percentage ?? 0}%"></div>
      <div style="width: ${b.cancelled?.percentage ?? 0}%" class="bg-rose-500 h-full transition-all duration-300" title="Cancelled: ${b.cancelled?.percentage ?? 0}%"></div>
    `;
  }
}

// Popular Services Breakdown
function renderPopularServicesSection(services) {
  const container = document.getElementById('dashboardPopularServicesList');
  if (!container) return;

  if (!services || services.length === 0) {
    container.innerHTML = `
      <div class="py-6 text-center text-xs text-[#735e5e]">
        No service booking history available yet.
      </div>
    `;
    return;
  }

  const colors = [
    { bg: 'bg-[#810B38]', text: 'text-[#810B38]', light: 'bg-[#FAF6F0]' },
    { bg: 'bg-[#541A1A]', text: 'text-[#541A1A]', light: 'bg-[#FAF6F0]' },
    { bg: 'bg-emerald-700', text: 'text-emerald-800', light: 'bg-emerald-50' },
    { bg: 'bg-amber-600', text: 'text-amber-800', light: 'bg-amber-50' }
  ];

  container.innerHTML = services.map((svc, index) => {
    const c = colors[index % colors.length];
    const pct = svc.percentage || 0;
    const count = svc.bookings_count || 0;
    const price = parseFloat(svc.price || 0);

    return `
      <div>
        <div class="flex items-center justify-between text-xs mb-1.5">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md ${c.light} ${c.text} font-bold text-[10px] flex items-center justify-center border border-[#DCC3AA]">
              #${index + 1}
            </span>
            <span class="font-bold text-[#541A1A]">${escapeHtml(svc.name)}</span>
          </div>
          <div class="text-right">
            <span class="font-bold text-[#541A1A]">${count}</span>
            <span class="text-[10px] text-[#735e5e] ml-1">(${pct}%)</span>
          </div>
        </div>
        <div class="w-full bg-[#FAF6F0] rounded-full h-2 overflow-hidden border border-[#DCC3AA]/30">
          <div class="${c.bg} h-full rounded-full transition-all duration-300" style="width: ${pct}%"></div>
        </div>
        <div class="flex justify-between items-center text-[10px] text-[#735e5e] mt-1">
          <span>Standard rate</span>
          <span class="font-mono font-semibold text-[#541A1A]">${formatCurrency(price)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Notifications List
function renderNotificationsList(notifications) {
  const listEl = document.getElementById('dashboardNotificationsList');
  if (!listEl) return;

  if (!notifications || notifications.length === 0) {
    listEl.innerHTML = `
      <div class="py-8 text-center text-[#735e5e]">
        <i class="fa-regular fa-bell-slash text-2xl mb-2 text-[#DCC3AA]"></i>
        <p class="text-xs font-medium">No recent notifications.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = notifications.map(notif => {
    const isUnread = !notif.is_read;
    const timeAgo = formatTimeAgo(notif.created_at);

    return `
      <div class="p-3.5 rounded-2xl border transition-all ${isUnread ? 'bg-[#FAF6F0]/80 border-[#DCC3AA]' : 'bg-white border-[#FAF6F0]'}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${isUnread ? 'bg-[#810B38]' : 'bg-transparent'} shrink-0"></span>
            <h4 class="font-bold text-xs text-[#541A1A]">${escapeHtml(notif.title)}</h4>
          </div>
          <span class="text-[10px] text-[#735e5e] shrink-0">${escapeHtml(timeAgo)}</span>
        </div>
        <p class="text-xs text-[#735e5e] mt-1 pl-4">${escapeHtml(notif.message)}</p>
      </div>
    `;
  }).join('');
}

// Populate Modal Dropdowns
function populateModalDropdowns(options) {
  if (!options) return;

  const serviceSelect = document.getElementById('quickApptService');
  if (serviceSelect && options.services) {
    serviceSelect.innerHTML = '<option value="">Select a service...</option>' + 
      options.services.map(s => `<option value="${s.id}">${escapeHtml(s.name)} — ${formatCurrency(s.price)}</option>`).join('');
  }

  const staffSelect = document.getElementById('quickApptStaff');
  if (staffSelect && options.staff) {
    staffSelect.innerHTML = '<option value="">Any Available Specialist</option>' + 
      options.staff.map(st => `<option value="${st.id}">${escapeHtml(st.name)} (${escapeHtml(st.role || st.specialties || 'Stylist')})</option>`).join('');
  }
}

// ==========================================
// 4. MODALS & FORMS
// ==========================================
function openAddAppointmentModal() {
  const modal = document.getElementById('addAppointmentModal');
  if (!modal) return;

  const dateInput = document.getElementById('quickApptDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  modal.showModal();
}

function closeAddAppointmentModal() {
  const modal = document.getElementById('addAppointmentModal');
  if (modal) modal.close();
}

async function handleCreateAppointment(e) {
  if (e) e.preventDefault();
  const token = localStorage.getItem('nelys_token');
  if (!token) return;

  const name = document.getElementById('quickApptCustomer')?.value.trim();
  const serviceId = document.getElementById('quickApptService')?.value;
  const staffId = document.getElementById('quickApptStaff')?.value;
  const date = document.getElementById('quickApptDate')?.value;
  const time = document.getElementById('quickApptTime')?.value;

  if (!name || !serviceId || !date || !time) {
    showToast('Please fill in customer name, service, date, and time.', 'warning');
    return;
  }

  try {
    const res = await fetch('../api/appointments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: name,
        service_id: serviceId,
        staff_id: staffId || null,
        appointment_date: date,
        appointment_time: time,
        source: 'admin'
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Appointment scheduled successfully!', 'success');
      closeAddAppointmentModal();
      document.querySelector('#addAppointmentModal form')?.reset();
      fetchDashboardData();
    } else {
      showToast(result.message || 'Failed to book appointment', 'error');
    }
  } catch (err) {
    console.error('Error booking appointment:', err);
    showToast('Network error while creating appointment.', 'error');
  }
}

// Quick Add Customer Modal
function openAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if (modal) modal.showModal();
}

function closeAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if (modal) modal.close();
}

async function handleCreateCustomer(e) {
  if (e) e.preventDefault();
  const token = localStorage.getItem('nelys_token');
  const name = document.getElementById('quickCustName')?.value.trim();
  const phone = document.getElementById('quickCustPhone')?.value.trim();
  const address = document.getElementById('quickCustAddress')?.value.trim();

  if (!name) {
    showToast('Customer full name is required.', 'warning');
    return;
  }

  try {
    const res = await fetch('../api/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        phone: phone,
        email: `client_${Date.now()}@nelyssalon.com`,
        address: address
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Customer registered successfully!', 'success');
      closeAddCustomerModal();
      document.querySelector('#addCustomerModal form')?.reset();
      fetchDashboardData();
    } else {
      showToast(result.message || 'Failed to register customer', 'error');
    }
  } catch (err) {
    console.error('Error saving customer:', err);
    showToast('Network error while registering customer.', 'error');
  }
}

// Quick Add Service Modal
function openAddServiceModal() {
  const modal = document.getElementById('addServiceModal');
  if (modal) modal.showModal();
}

function closeAddServiceModal() {
  const modal = document.getElementById('addServiceModal');
  if (modal) modal.close();
}

async function handleCreateService(e) {
  if (e) e.preventDefault();
  const token = localStorage.getItem('nelys_token');
  const name = document.getElementById('quickServiceName')?.value.trim();
  const category = document.getElementById('quickServiceCategory')?.value;
  const price = document.getElementById('quickServicePrice')?.value;

  if (!name || !price) {
    showToast('Service name and price are required.', 'warning');
    return;
  }

  try {
    const res = await fetch('../api/services', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, category, price: parseFloat(price) })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Service added to catalogue!', 'success');
      closeAddServiceModal();
      document.querySelector('#addServiceModal form')?.reset();
      fetchDashboardData();
    } else {
      showToast(result.message || 'Failed to add service', 'error');
    }
  } catch (err) {
    console.error('Error saving service:', err);
    showToast('Network error while saving service.', 'error');
  }
}

// Quick Add Staff Modal
function openAddStaffModal() {
  const modal = document.getElementById('addStaffModal');
  if (modal) modal.showModal();
}

function closeAddStaffModal() {
  const modal = document.getElementById('addStaffModal');
  if (modal) modal.close();
}

async function handleCreateStaff(e) {
  if (e) e.preventDefault();
  const token = localStorage.getItem('nelys_token');
  const name = document.getElementById('quickStaffName')?.value.trim();
  const role = document.getElementById('quickStaffRole')?.value;
  const phone = document.getElementById('quickStaffPhone')?.value.trim();

  if (!name) {
    showToast('Specialist name is required.', 'warning');
    return;
  }

  try {
    const res = await fetch('../api/staff', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, role, phone, is_active: 1 })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Staff member added!', 'success');
      closeAddStaffModal();
      document.querySelector('#addStaffModal form')?.reset();
      fetchDashboardData();
    } else {
      showToast(result.message || 'Failed to add staff member', 'error');
    }
  } catch (err) {
    console.error('Error saving staff:', err);
    showToast('Network error while saving staff.', 'error');
  }
}

// Notifications Modal
function openNotificationsModal() {
  const modal = document.getElementById('adminNotificationsModal');
  if (modal) modal.showModal();
}

function closeNotificationsModal() {
  const modal = document.getElementById('adminNotificationsModal');
  if (modal) modal.close();
}


function handleConfirmLogout() {
  confirmLogout();
}

// Table horizontal sliding
function scrollScheduleTable(dir) {
  const container = document.getElementById('dashboardScheduleScrollContainer');
  if (container) {
    const delta = dir === 'left' ? -280 : 280;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  }
}

// Sidebar mobile toggle
function toggleMobileSidebar(open = null) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!sidebar) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  const shouldOpen = open !== null ? open : isClosed;

  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    if (backdrop) {
      backdrop.classList.remove('opacity-0', 'pointer-events-none');
      backdrop.classList.add('opacity-100');
    }
  } else {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) {
      backdrop.classList.remove('opacity-100');
      backdrop.classList.add('opacity-0', 'pointer-events-none');
    }
  }
}

// Outside click listeners
function setupOutsideClickListeners() {
  document.addEventListener('click', (e) => {
    const revMenu = document.getElementById('revenueDropdownMenu');
    const revBtn = e.target.closest('button[onclick="toggleRevenueDropdown()"]');
    if (revMenu && !revMenu.classList.contains('hidden') && !revBtn && !revMenu.contains(e.target)) {
      revMenu.classList.add('hidden');
    }
  });
}

function setupDialogAccessibilityListeners() {
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('click', (e) => {
      const rect = dlg.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!inDialog) {
        dlg.close();
      }
    });
  });
}

// ==========================================
// 5. UTILITY FUNCTIONS
// ==========================================
function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatCurrency(amount) {
  const val = parseFloat(amount) || 0;
  return '₱' + val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime12(timeStr) {
  if (!timeStr) return '—';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatTimeAgo(datetimeStr) {
  if (!datetimeStr) return 'Just now';
  const diffSec = Math.floor((new Date() - new Date(datetimeStr)) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function getInitials(nameStr) {
  if (!nameStr) return 'AD';
  const clean = nameStr.replace(/atelier\s*/gi, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase();
}

function getStatusBadge(status) {
  const st = (status || 'pending').toLowerCase();
  if (st === 'confirmed') {
    return `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
      <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
      <span>Confirmed</span>
    </span>`;
  }
  if (st === 'completed') {
    return `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
      <span>Completed</span>
    </span>`;
  }
  if (st === 'cancelled' || st === 'no_show') {
    return `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-900 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
      <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
      <span>${st === 'no_show' ? 'No Show' : 'Cancelled'}</span>
    </span>`;
  }
  return `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
    <span>Pending</span>
  </span>`;
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(container);
  }

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

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


window.handleConfirmLogout = handleConfirmLogout;

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
  } catch(e) {}
  window.location.href = '../login.html';
}

function confirmLogout() {
  handleConfirmLogout();
}

window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.handleConfirmLogout = handleConfirmLogout;
window.confirmLogout = confirmLogout;
