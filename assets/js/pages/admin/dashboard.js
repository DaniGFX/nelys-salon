/**
 * Nely's Salon — Admin Dashboard Script
 * Fully connected to the backend API (/api/dashboard/stats)
 * Zero hardcoded data: metrics, badges, schedule, status progress,
 * popular services, customers, notifications, and modals load dynamically.
 */

// State
let dashboardData = null;
let currentPeriod = 'week';
let isDashboardModalScrollLocked = false;
let recentCustomersList = [];
let currentCustPage = 1;
const CUST_PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  initAdminProfileHeader();
  fetchDashboardData();
  setupClickOutside();
  setupDialogSteadyListeners();
});

// 1. Auth Guard
function checkAdminAuth() {
  const token = localStorage.getItem('nelys_token');
  const userJson = localStorage.getItem('nelys_user');

  if (!token || !userJson) {
    // If not logged in, redirect to login
    window.location.href = '../login.html';
    return;
  }

  try {
    const user = JSON.parse(userJson);
    if (user.role !== 'admin') {
      window.location.href = '../customer/booking.html';
      return;
    }
  } catch (e) {
    window.location.href = '../login.html';
  }
}

// 2. Init Admin Profile Header & Avatar
function initAdminProfileHeader() {
  const userJson = localStorage.getItem('nelys_user');
  let displayName = 'Admin';

  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      let rawName = user.full_name || user.name || (user.email ? user.email.split('@')[0] : 'Admin');
      // Strip any "Atelier" from the display name
      rawName = rawName.replace(/atelier\s*/gi, '').trim();
      if (rawName && rawName.toLowerCase() !== 'admin') {
        displayName = rawName;
      } else {
        displayName = 'Admin';
      }
    } catch (err) {
      console.warn('Error reading admin profile:', err);
    }
  }

  // Greeting: "Good morning, Admin!" (without "Atelier")
  const greetingEl = document.getElementById('dashboardGreeting');
  if (greetingEl) {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 18) timeGreeting = 'Good afternoon';
    else if (hour >= 18) timeGreeting = 'Good evening';
    greetingEl.textContent = `${timeGreeting}, ${displayName}!`;
  }

  // Header Admin Name & Initials
  const nameEl = document.getElementById('adminDisplayName');
  if (nameEl) nameEl.textContent = displayName;

  const initialsBadge = document.getElementById('adminInitialsBadge');
  if (initialsBadge) {
    const parts = displayName.split(' ').filter(Boolean);
    const initials = parts.length > 1 
      ? (parts[0][0] + parts[1][0]).toUpperCase() 
      : (displayName.substring(0, 2)).toUpperCase();
    initialsBadge.textContent = initials || 'AD';
  }

  const mobileBadge = document.getElementById('mobileAdminBadge');
  if (mobileBadge) {
    const parts = displayName.split(' ').filter(Boolean);
    const initials = parts.length > 1 
      ? (parts[0][0] + parts[1][0]).toUpperCase() 
      : (displayName.substring(0, 2)).toUpperCase();
    mobileBadge.textContent = initials || 'AD';
  }
}

// 3. Fetch Real Database Data
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
      showToast('Session expired. Please log in again.', 'warning');
      setTimeout(() => { window.location.href = '../login.html'; }, 1000);
      return;
    }

    const result = await res.json();
    if (result.success && result.data) {
      dashboardData = result.data;
      renderAllDashboardComponents(result.data);
    } else {
      showToast(result.message || 'Could not load dashboard statistics.', 'error');
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    showToast('Failed to connect to backend server. Please verify MySQL/Apache are active.', 'error');
  }
}

// 4. Render All Components
function renderAllDashboardComponents(data) {
  renderSidebarBadges(data.badges);
  renderSummaryCards(data);
  renderAppointmentsTable(data.today_appointments, data.date);
  renderRecentCustomersTable(data.recent_customers);
  renderAppointmentStatusSection(data.status_breakdown);
  renderPopularServicesSection(data.popular_services);
  renderRevenueChartFromBackend(data.revenue_summary);
  renderNotificationsModalList(data.notifications);
  populateModalDropdowns(data.form_options);
}

// 4.1 Sidebar Badges
function renderSidebarBadges(badges) {
  if (!badges) return;
  const map = {
    sidebarAppointmentsBadge: parseInt(badges.appointments ?? 0, 10) || 0,
    sidebarNotificationsBadge: parseInt(badges.notifications ?? 0, 10) || 0,
    sidebarMessagesBadge: parseInt(badges.messages ?? 0, 10) || 0
  };

  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = val;
      if (val > 0) {
        el.classList.remove('hidden');
        el.style.display = '';
      } else {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    }
  }
}

// 4.2 Top Summary KPI Cards
function renderSummaryCards(data) {
  const summary = data.summary || {};
  const dateInfo = data.date || {};

  // Header Date
  const dateDisplay = document.getElementById('dashboardDateDisplay');
  if (dateDisplay) {
    const formatted = dateInfo.formatted || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    dateDisplay.textContent = `Today is ${formatted}. Here's what's happening at Nely's Salon.`;
  }

  // Card 1: Today's Appointments
  const todayApptsEl = document.getElementById('dashboardTodayAppts');
  if (todayApptsEl) todayApptsEl.textContent = summary.today_appointments ?? 0;

  const apptsBreakdownEl = document.getElementById('dashboardApptsBreakdown');
  if (apptsBreakdownEl) {
    const m = summary.morning_count ?? 0;
    const a = summary.afternoon_count ?? 0;
    apptsBreakdownEl.textContent = `${m} Morning · ${a} Afternoon`;
  }

  // Card 2: Total Customers
  const totalCustEl = document.getElementById('dashboardTotalCustomers');
  if (totalCustEl) totalCustEl.textContent = summary.total_customers ?? 0;

  const custGrowthBadge = document.getElementById('dashboardCustGrowthBadge');
  if (custGrowthBadge) {
    const newCount = summary.new_customers_month ?? 0;
    custGrowthBadge.textContent = `+${newCount} This Month`;
  }

  // Card 3: Today's Revenue
  const todayRevEl = document.getElementById('dashboardTodayRevenue');
  if (todayRevEl) {
    todayRevEl.textContent = formatCurrency(summary.today_revenue ?? 0);
  }

  const revBreakdownEl = document.getElementById('dashboardRevBreakdown');
  if (revBreakdownEl) {
    const gcash = formatCurrency(summary.gcash_revenue ?? 0);
    const cash = formatCurrency(summary.cash_revenue ?? 0);
    revBreakdownEl.textContent = `${gcash} GCash · ${cash} Cash`;
  }

  // Card 4: Pending Appointments
  const pendingApptsEl = document.getElementById('dashboardPendingAppts');
  if (pendingApptsEl) pendingApptsEl.textContent = summary.pending_appts ?? 0;

  const pendingBadge = document.getElementById('dashboardPendingBadge');
  if (pendingBadge) {
    const pendingCount = summary.pending_appts ?? 0;
    if (pendingCount > 0) {
      pendingBadge.textContent = `${pendingCount} Need Action`;
      pendingBadge.className = 'text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300';
    } else {
      pendingBadge.textContent = 'All Caught Up';
      pendingBadge.className = 'text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200';
    }
  }
}

// 4.3 Today's Schedule Table
function renderAppointmentsTable(appointments, dateInfo) {
  const tbody = document.getElementById('dashboardScheduleBody');
  const subtitle = document.getElementById('dashboardScheduleDateSubtitle');
  if (!tbody) return;

  if (subtitle && dateInfo) {
    subtitle.textContent = dateInfo.is_actual_today_data 
      ? `Live timeline for today (${dateInfo.formatted})`
      : `Latest scheduled appointments from database`;
  }

  if (!appointments || appointments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-10 px-4 text-center text-[#735e5e]">
          <div class="w-12 h-12 rounded-2xl bg-[#FAF6F0] text-[#810B38] flex items-center justify-center text-xl mx-auto mb-3 border border-[#DCC3AA]">
            <i class="fa-solid fa-calendar-xmark"></i>
          </div>
          <p class="font-bold text-[#541A1A] text-sm">No Appointments Scheduled</p>
          <p class="text-xs text-[#735e5e] mt-1">There are no client bookings on this schedule right now.</p>
          <button type="button" onclick="openAddAppointmentModal()" class="mt-4 px-4 py-2 rounded-xl bg-[#810B38] text-white text-xs font-bold hover:bg-[#541A1A] transition-colors shadow-sm">
            <i class="fa-solid fa-plus mr-1.5"></i>Create Appointment
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appointments.map((appt) => {
    const timeFormatted = formatTimeSlot(appt.booking_time);
    const dateFormatted = appt.booking_date;
    const custName = escapeHtml(appt.customer_name || 'Valued Client');
    const custInitials = getInitials(custName);
    const serviceName = escapeHtml(appt.service_name || 'Haircut');
    const staffName = escapeHtml(appt.staff_name || 'Unassigned');
    const status = (appt.status || 'pending').toLowerCase();
    const statusBadge = getStatusBadgeHtml(status);

    return `
      <tr class="hover:bg-[#FAF6F0]/40 transition-colors">
        <td class="py-3.5 px-4 font-bold text-[#541A1A] whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            <i class="fa-regular fa-clock text-[#810B38] text-xs"></i>
            <span>${timeFormatted}</span>
          </div>
          <span class="text-[10px] text-[#735e5e] block font-normal">${dateFormatted}</span>
        </td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-[#810B38] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              ${custInitials}
            </div>
            <div class="min-w-0">
              <span class="font-bold text-[#541A1A] block truncate">${custName}</span>
              <span class="text-[10px] text-[#735e5e] block truncate">${escapeHtml(appt.customer_phone || '')}</span>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 text-[#2b1d1d] font-medium">
          <span class="block">${serviceName}</span>
          <span class="text-[10px] text-[#735e5e]">${formatCurrency(appt.total_price || 0)}</span>
        </td>
        <td class="py-3.5 px-4 text-[#735e5e]">
          <span class="inline-flex items-center gap-1.5">
            <i class="fa-solid fa-user-tie text-[10px] text-[#810B38]"></i>
            <span>${staffName}</span>
          </span>
        </td>
        <td class="py-3.5 px-4">
          ${statusBadge}
        </td>
        <td class="py-3.5 px-4 text-right whitespace-nowrap">
          ${status === 'pending' ? `
            <button type="button" onclick="updateAppointmentStatus(${appt.id}, 'confirmed')" class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-600 hover:text-white text-[11px] font-bold transition-colors mr-1">
              Confirm
            </button>
          ` : ''}
          ${status === 'confirmed' ? `
            <button type="button" onclick="updateAppointmentStatus(${appt.id}, 'completed')" class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-600 hover:text-white text-[11px] font-bold transition-colors mr-1">
              Done
            </button>
          ` : ''}
          <a href="appointments.html?id=${appt.id}" class="text-xs font-bold text-[#810B38] hover:text-[#541A1A] hover:underline ml-1">
            Details
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// 4.4 Recent Customers Table with Pagination (1-10 items per page, links 1, 2, 3, Prev/Next)
function renderRecentCustomersTable(customers) {
  recentCustomersList = Array.isArray(customers) ? customers : [];
  currentCustPage = 1;
  renderRecentCustomersPage();
}

function renderRecentCustomersPage() {
  const tbody = document.getElementById('dashboardRecentCustomersBody');
  const paginationContainer = document.getElementById('recentCustPaginationContainer');
  const pageStartEl = document.getElementById('recentCustPageStart');
  const pageEndEl = document.getElementById('recentCustPageEnd');
  const totalEl = document.getElementById('recentCustTotal');
  const prevBtn = document.getElementById('recentCustPrevBtn');
  const nextBtn = document.getElementById('recentCustNextBtn');
  const linksContainer = document.getElementById('recentCustPageLinks');

  if (!tbody) return;

  const totalItems = recentCustomersList.length;

  if (totalItems === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-xs text-[#735e5e]">
          No registered customer accounts yet.
        </td>
      </tr>
    `;
    if (pageStartEl) pageStartEl.textContent = '0';
    if (pageEndEl) pageEndEl.textContent = '0';
    if (totalEl) totalEl.textContent = '0';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (linksContainer) {
      linksContainer.innerHTML = `
        <button type="button" class="w-8 h-8 rounded-xl bg-[#810B38] text-white font-bold text-xs shadow-sm flex items-center justify-center">1</button>
        <button type="button" disabled class="w-8 h-8 rounded-xl bg-[#FAF6F0]/60 text-[#735e5e]/50 border border-[#DCC3AA]/40 font-bold text-xs flex items-center justify-center cursor-not-allowed">2</button>
        <button type="button" disabled class="w-8 h-8 rounded-xl bg-[#FAF6F0]/60 text-[#735e5e]/50 border border-[#DCC3AA]/40 font-bold text-xs flex items-center justify-center cursor-not-allowed">3</button>
      `;
    }
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / CUST_PAGE_SIZE));
  if (currentCustPage > totalPages) currentCustPage = totalPages;
  if (currentCustPage < 1) currentCustPage = 1;

  const startIndex = (currentCustPage - 1) * CUST_PAGE_SIZE;
  const endIndex = Math.min(startIndex + CUST_PAGE_SIZE, totalItems);
  const pageItems = recentCustomersList.slice(startIndex, endIndex);

  // Render Table Rows
  tbody.innerHTML = pageItems.map(cust => {
    const name = escapeHtml(cust.full_name || cust.email || 'Patron');
    const initials = getInitials(name);
    const service = escapeHtml(cust.last_service || 'First Visit');
    const date = cust.last_visit ? formatDate(cust.last_visit) : formatDate(cust.created_at);
    const status = (cust.last_status || 'New').toLowerCase();
    const statusBadge = getCustomerStatusBadgeHtml(status);

    return `
      <tr class="hover:bg-[#FAF6F0]/40 transition-colors">
        <td class="py-3.5 px-4 font-bold text-[#541A1A]">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-[#541A1A] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              ${initials}
            </div>
            <div class="min-w-0">
              <span class="block truncate">${name}</span>
              <span class="text-[10px] text-[#735e5e] font-normal block truncate">${escapeHtml(cust.email || cust.phone || '')}</span>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 text-[#2b1d1d] font-medium">${service}</td>
        <td class="py-3.5 px-4 text-[#735e5e] whitespace-nowrap">${date}</td>
        <td class="py-3.5 px-4">${statusBadge}</td>
        <td class="py-3.5 px-4 text-right">
          <a href="customers.html?id=${cust.user_id}" class="text-xs font-bold text-[#810B38] hover:text-[#541A1A] hover:underline">
            View
          </a>
        </td>
      </tr>
    `;
  }).join('');

  // Update Pagination Info
  if (pageStartEl) pageStartEl.textContent = startIndex + 1;
  if (pageEndEl) pageEndEl.textContent = endIndex;
  if (totalEl) totalEl.textContent = totalItems;

  // Prev / Next button states
  if (prevBtn) prevBtn.disabled = currentCustPage <= 1;
  if (nextBtn) nextBtn.disabled = currentCustPage >= totalPages;

  // Render Page Links (1, 2, 3...)
  if (linksContainer) {
    const maxDisplayPages = Math.max(3, totalPages);
    const pagesList = [];
    for (let p = 1; p <= maxDisplayPages; p++) {
      pagesList.push(p);
    }

    linksContainer.innerHTML = pagesList.map(p => {
      const isActive = p === currentCustPage;
      const isAvailable = p <= totalPages;

      if (isActive) {
        return `
          <button type="button" class="w-8 h-8 rounded-xl bg-[#810B38] text-white font-bold text-xs shadow-sm flex items-center justify-center pointer-events-none">
            ${p}
          </button>
        `;
      } else if (isAvailable) {
        return `
          <button type="button" onclick="changeRecentCustPage(${p})" class="w-8 h-8 rounded-xl bg-[#FAF6F0] hover:bg-[#F1E2D1] text-[#541A1A] border border-[#DCC3AA] font-bold text-xs transition-colors flex items-center justify-center">
            ${p}
          </button>
        `;
      } else {
        return `
          <button type="button" disabled class="w-8 h-8 rounded-xl bg-[#FAF6F0]/60 text-[#735e5e]/50 border border-[#DCC3AA]/40 font-bold text-xs flex items-center justify-center cursor-not-allowed">
            ${p}
          </button>
        `;
      }
    }).join('');
  }
}

function changeRecentCustPage(page) {
  const totalPages = Math.max(1, Math.ceil(recentCustomersList.length / CUST_PAGE_SIZE));
  if (page < 1 || page > totalPages) return;
  currentCustPage = page;
  renderRecentCustomersPage();
}

// 4.5 Appointment Status Breakdown Section
function renderAppointmentStatusSection(statusBreakdown) {
  if (!statusBreakdown) return;

  const total = statusBreakdown.total || 0;
  const confirmed = statusBreakdown.confirmed || 0;
  const pending = statusBreakdown.pending || 0;
  const completed = statusBreakdown.completed || 0;
  const cancelled = (statusBreakdown.cancelled || 0) + (statusBreakdown.no_show || 0);

  // Sublabel
  const sublabel = document.getElementById('dashboardStatusSublabel');
  if (sublabel) {
    sublabel.textContent = total > 0 
      ? `Real-time status breakdown for ${total} total database records`
      : `No booking records found in database yet`;
  }

  // Count Pills
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setVal('statusCountConfirmed', confirmed);
  setVal('statusCountPending', pending);
  setVal('statusCountCompleted', completed);
  setVal('statusCountCancelled', cancelled);

  // Progress Bar
  const barContainer = document.getElementById('dashboardStatusBar');
  const legendContainer = document.getElementById('dashboardStatusLegend');

  if (total === 0) {
    if (barContainer) {
      barContainer.innerHTML = `<div style="width: 100%;" class="bg-gray-200 h-full" title="No appointments"></div>`;
    }
    if (legendContainer) {
      legendContainer.innerHTML = `<span>0% Confirmed</span><span>0% Completed</span>`;
    }
    return;
  }

  const pct = (cnt) => Math.round((cnt / total) * 100);
  const pConf = pct(confirmed);
  const pPend = pct(pending);
  const pComp = pct(completed);
  const pCanc = pct(cancelled);

  if (barContainer) {
    barContainer.innerHTML = `
      <div style="width: ${pConf}%;" class="bg-emerald-500 h-full transition-all duration-500" title="Confirmed: ${confirmed} (${pConf}%)"></div>
      <div style="width: ${pPend}%;" class="bg-amber-500 h-full transition-all duration-500" title="Pending: ${pending} (${pPend}%)"></div>
      <div style="width: ${pComp}%;" class="bg-blue-500 h-full transition-all duration-500" title="Completed: ${completed} (${pComp}%)"></div>
      <div style="width: ${pCanc}%;" class="bg-rose-500 h-full transition-all duration-500" title="Cancelled: ${cancelled} (${pCanc}%)"></div>
    `;
  }

  if (legendContainer) {
    legendContainer.innerHTML = `
      <span>${confirmed} Confirmed (${pConf}%)</span>
      <span>${completed} Completed (${pComp}%)</span>
    `;
  }
}

// 4.6 Popular Services List
function renderPopularServicesSection(services) {
  const container = document.getElementById('dashboardPopularServicesList');
  if (!container) return;

  if (!services || services.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-xs text-[#735e5e] bg-[#FAF6F0] rounded-2xl border border-[#E8D9CA]">
        <p class="font-bold text-[#541A1A]">No service bookings recorded yet</p>
        <p class="mt-1">Add bookings or treatments to see popular rankings.</p>
      </div>
    `;
    return;
  }

  // Find max count for relative bar scaling
  const maxCount = Math.max(...services.map(s => Number(s.booking_count) || 1), 1);

  const icons = {
    'Hair': 'fa-scissors',
    'Nails': 'fa-hand-sparkles',
    'Spa': 'fa-spa',
    'Treatment': 'fa-wand-magic-sparkles',
    'Foot Care': 'fa-socks',
  };

  container.innerHTML = services.map((svc, index) => {
    const rank = index + 1;
    const name = escapeHtml(svc.name);
    const count = Number(svc.booking_count) || 0;
    const price = formatCurrency(svc.price || 0);
    const percentage = Math.max(Math.round((count / maxCount) * 100), 12);
    const icon = icons[svc.category] || 'fa-sparkles';
    const rankBadgeBg = rank === 1 ? 'bg-[#810B38] text-white' : rank <= 3 ? 'bg-[#541A1A] text-white' : 'bg-[#DCC3AA] text-[#541A1A] font-extrabold';

    return `
      <div class="p-3 rounded-2xl bg-[#FAF6F0] border border-[#E8D9CA] space-y-1.5 hover:border-[#810B38] transition-colors">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-[#541A1A] flex items-center gap-2">
            <span class="w-5 h-5 rounded-md ${rankBadgeBg} flex items-center justify-center text-[10px]">${rank}</span>
            <i class="fa-solid ${icon} text-[#810B38]"></i>
            <span>${name}</span>
          </span>
          <span class="font-extrabold text-[#810B38]">${count} bookings <span class="text-[10px] text-[#735e5e] font-normal">(${price})</span></span>
        </div>
        <div class="h-2 w-full rounded-full bg-white overflow-hidden">
          <div style="width: ${percentage}%;" class="h-full bg-[#810B38] rounded-full transition-all duration-500"></div>
        </div>
      </div>
    `;
  }).join('');
}

// 4.7 Revenue Overview Chart (Accurate database breakdowns for today, week, month, year)
function renderRevenueChartFromBackend(revSummary) {
  const totalDisplay = document.getElementById('revenueTotalDisplay');
  const labelDisplay = document.getElementById('revenueChartSublabel');
  const chartContainer = document.getElementById('revenueChartBars');
  if (!chartContainer) return;

  const summary = revSummary || {};
  let bars = [];
  let totalNum = 0;
  let sublabelText = "This Week's Daily Revenue";

  if (currentPeriod === 'today') {
    sublabelText = "Today's Revenue Overview";
    totalNum = Number(summary.today_total) || 0;
    const todayBarsData = Array.isArray(summary.today_bars) ? summary.today_bars : [];

    if (todayBarsData.length > 0) {
      const maxAmt = Math.max(...todayBarsData.map(b => Number(b.amount) || 0), 1);
      bars = todayBarsData.map(b => {
        const amt = Number(b.amount) || 0;
        const heightPct = totalNum > 0 ? Math.max(Math.round((amt / maxAmt) * 100), 8) : 8;
        return {
          label: b.label || 'Method',
          amount: formatCurrency(amt),
          height: `${heightPct}%`
        };
      });
    } else {
      bars = [
        { label: "GCash", amount: formatCurrency(0), height: "8%" },
        { label: "Cash", amount: formatCurrency(0), height: "8%" }
      ];
    }
  } else if (currentPeriod === 'month') {
    sublabelText = "This Month's Weekly Breakdown";
    totalNum = Number(summary.month_total) || 0;
    const monthBarsData = Array.isArray(summary.month_bars) ? summary.month_bars : [];

    if (monthBarsData.length > 0) {
      const maxAmt = Math.max(...monthBarsData.map(b => Number(b.amount) || 0), 1);
      bars = monthBarsData.map(b => {
        const amt = Number(b.amount) || 0;
        const heightPct = totalNum > 0 ? Math.max(Math.round((amt / maxAmt) * 100), 8) : 8;
        return {
          label: b.label,
          amount: formatCurrency(amt),
          height: `${heightPct}%`
        };
      });
    } else {
      bars = [
        { label: "Wk 1", amount: formatCurrency(0), height: "8%" },
        { label: "Wk 2", amount: formatCurrency(0), height: "8%" },
        { label: "Wk 3", amount: formatCurrency(0), height: "8%" },
        { label: "Wk 4", amount: formatCurrency(0), height: "8%" }
      ];
    }
  } else if (currentPeriod === 'year') {
    sublabelText = "This Year's Quarterly Breakdown";
    totalNum = Number(summary.year_total) || 0;
    const yearBarsData = Array.isArray(summary.year_bars) ? summary.year_bars : [];

    if (yearBarsData.length > 0) {
      const maxAmt = Math.max(...yearBarsData.map(b => Number(b.amount) || 0), 1);
      bars = yearBarsData.map(b => {
        const amt = Number(b.amount) || 0;
        const heightPct = totalNum > 0 ? Math.max(Math.round((amt / maxAmt) * 100), 8) : 8;
        return {
          label: b.label,
          amount: formatCurrency(amt),
          height: `${heightPct}%`
        };
      });
    } else {
      bars = [
        { label: "Q1", amount: formatCurrency(0), height: "8%" },
        { label: "Q2", amount: formatCurrency(0), height: "8%" },
        { label: "Q3", amount: formatCurrency(0), height: "8%" },
        { label: "Q4", amount: formatCurrency(0), height: "8%" }
      ];
    }
  } else {
    // Default: 'week'
    sublabelText = "This Week's Daily Revenue";
    totalNum = Number(summary.week_total) || 0;
    const weekBarsData = Array.isArray(summary.week_bars) ? summary.week_bars : [];

    if (weekBarsData.length > 0) {
      const maxAmt = Math.max(...weekBarsData.map(d => Number(d.amount) || 0), 1);
      bars = weekBarsData.map(d => {
        const amt = Number(d.amount) || 0;
        const heightPct = totalNum > 0 ? Math.max(Math.round((amt / maxAmt) * 100), 8) : 8;
        return {
          label: (d.label || 'Day').substring(0, 3),
          amount: formatCurrency(amt),
          height: `${heightPct}%`
        };
      });
    } else {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      bars = days.map(day => ({ label: day, amount: formatCurrency(0), height: '8%' }));
    }
  }

  if (totalDisplay) totalDisplay.textContent = formatCurrency(totalNum);
  if (labelDisplay) labelDisplay.textContent = sublabelText;

  chartContainer.innerHTML = bars.map(bar => `
    <div class="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">
      <!-- Hover Tooltip -->
      <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 rounded-md bg-[#541A1A] text-white text-[10px] font-bold pointer-events-none whitespace-nowrap shadow-md z-20">
        ${bar.amount}
      </div>

      <!-- Bar column -->
      <div class="w-full max-w-[36px] bg-[#FAF6F0] rounded-t-xl overflow-hidden flex flex-col justify-end border border-[#DCC3AA]/50 group-hover:border-[#810B38] transition-all h-full p-0.5">
        <div 
          style="height: ${bar.height};" 
          class="w-full bg-gradient-to-t from-[#810B38] to-[#9e1449] rounded-t-lg transition-all duration-500 group-hover:brightness-110 shadow-inner">
        </div>
      </div>

      <!-- X-axis label -->
      <span class="text-[11px] font-bold text-[#541A1A] tracking-wider uppercase">${bar.label}</span>
      <span class="text-[10px] text-[#735e5e] font-semibold">${bar.amount}</span>
    </div>
  `).join('');
}

// 4.8 Notifications Modal List
function renderNotificationsModalList(notifications) {
  const container = document.getElementById('dashboardNotificationsList');
  if (!container) return;

  if (!notifications || notifications.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-xs text-[#735e5e]">
        <i class="fa-solid fa-bell-slash text-2xl text-[#810B38] mb-2 block"></i>
        <p class="font-bold text-[#541A1A]">No notifications at this time</p>
        <p class="mt-1">All salon alerts and updates will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifications.map(n => {
    const title = escapeHtml(n.title || 'System Notification');
    const msg = escapeHtml(n.message || '');
    const time = formatDate(n.created_at);
    const isUnread = n.status === 'sent';

    return `
      <div class="p-3.5 rounded-2xl ${isUnread ? 'bg-[#FAF6F0] border-[#DCC3AA]' : 'bg-white border-[#E8D9CA]'} border flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg bg-[#810B38] text-white flex items-center justify-center text-xs shrink-0">
          <i class="fa-solid fa-bell"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-[#541A1A] truncate">${title}</span>
            <span class="text-[10px] text-[#735e5e] whitespace-nowrap ml-2">${time}</span>
          </div>
          <p class="text-xs text-[#2b1d1d] mt-1 leading-relaxed">
            ${msg}
          </p>
        </div>
      </div>
    `;
  }).join('');
}

// 4.9 Populate Dynamic Form Options in Quick Modals
function populateModalDropdowns(options) {
  if (!options) return;

  // Services Select
  const serviceSelect = document.getElementById('quickApptService');
  if (serviceSelect && Array.isArray(options.services)) {
    serviceSelect.innerHTML = '<option value="">Select Service...</option>' + 
      options.services.map(s => `
        <option value="${s.id}">${escapeHtml(s.name)} (₱${Number(s.price).toLocaleString()})</option>
      `).join('');
  }

  // Staff Select
  const staffSelect = document.getElementById('quickApptStaff');
  if (staffSelect && Array.isArray(options.staff)) {
    staffSelect.innerHTML = '<option value="">Select Staff...</option>' + 
      options.staff.map(st => `
        <option value="${st.id}">${escapeHtml(st.name)} (${escapeHtml(st.role || 'Stylist')})</option>
      `).join('');
  }
}

// 5. Quick Appointment Booking Submit
async function handleCreateAppointment(e) {
  e.preventDefault();
  const token = localStorage.getItem('nelys_token');
  const customerName = document.getElementById('quickApptCustomer').value.trim();
  const serviceId = document.getElementById('quickApptService').value;
  const staffId = document.getElementById('quickApptStaff').value;
  const date = document.getElementById('quickApptDate').value;
  const time = document.getElementById('quickApptTime').value;

  if (!serviceId) {
    showToast('Please select a service for the appointment.', 'warning');
    return;
  }

  const payload = {
    client_name: customerName,
    client_phone: '09170000000', // Default placeholder for quick admin add
    service_id: serviceId,
    staff_id: staffId || null,
    booking_date: date,
    booking_time: convertTimeSlotTo24H(time),
    payment_method: 'cash',
    visit_type: 'salon'
  };

  try {
    const res = await fetch('../api/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      closeAddAppointmentModal();
      showToast(`Appointment successfully created for ${customerName}!`, 'success');
      e.target.reset();
      fetchDashboardData(); // Refresh UI
    } else {
      showToast(result.message || 'Could not save appointment.', 'error');
    }
  } catch (err) {
    console.error('Create appointment error:', err);
    showToast('Failed to connect to backend server.', 'error');
  }
}

// 6. Quick Service Create Submit
async function handleCreateService(e) {
  e.preventDefault();
  const token = localStorage.getItem('nelys_token');
  const name = document.getElementById('quickServiceName').value.trim();
  const category = document.getElementById('quickServiceCategory').value;
  const price = document.getElementById('quickServicePrice').value;

  const code = 'SVC-' + name.substring(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

  const payload = {
    code: code,
    name: name,
    category: category,
    price: Number(price),
    duration_minutes: 45
  };

  try {
    const res = await fetch('../api/services', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      closeAddServiceModal();
      showToast(`Service "${name}" created successfully!`, 'success');
      e.target.reset();
      fetchDashboardData();
    } else {
      showToast(result.message || 'Could not save service.', 'error');
    }
  } catch (err) {
    console.error('Create service error:', err);
    showToast('Failed to create service.', 'error');
  }
}

// 7. Quick Customer Create
async function handleCreateCustomer(e) {
  e.preventDefault();
  const name = document.getElementById('quickCustName').value.trim();
  const phone = document.getElementById('quickCustPhone').value.trim();

  // Redirect to full customers page with prefilled parameters or register
  closeAddCustomerModal();
  showToast(`Patron "${name}" recorded. Opening customer records...`, 'info');
  setTimeout(() => {
    window.location.href = `customers.html?new_name=${encodeURIComponent(name)}&new_phone=${encodeURIComponent(phone)}`;
  }, 500);
}

// 8. Quick Staff Add
function handleCreateStaff(e) {
  e.preventDefault();
  const name = document.getElementById('quickStaffName').value.trim();
  const role = document.getElementById('quickStaffRole').value;
  closeAddStaffModal();
  showToast(`Redirecting to Staff Management to complete ${name}'s profile...`, 'info');
  setTimeout(() => {
    window.location.href = `staff.html?new_name=${encodeURIComponent(name)}&new_role=${encodeURIComponent(role)}`;
  }, 500);
}

// 9. Update Appointment Status Directly
async function updateAppointmentStatus(bookingId, newStatus) {
  const token = localStorage.getItem('nelys_token');
  try {
    const res = await fetch(`../api/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });

    const result = await res.json();
    if (result.success) {
      showToast(`Appointment status changed to ${newStatus.toUpperCase()}.`, 'success');
      fetchDashboardData();
    } else {
      showToast(result.message || 'Could not update status.', 'error');
    }
  } catch (err) {
    console.error('Update status error:', err);
    showToast('Failed to update status on server.', 'error');
  }
}

// 10. Switch Revenue Chart Period
function switchRevenuePeriod(period) {
  currentPeriod = period;
  const selectBtn = document.getElementById('revenuePeriodBtnText');
  const periodNames = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year'
  };

  if (selectBtn) selectBtn.textContent = periodNames[period] || 'This Week';

  const dropdown = document.getElementById('revenueDropdownMenu');
  if (dropdown) dropdown.classList.add('hidden');

  if (dashboardData && dashboardData.revenue_summary) {
    renderRevenueChartFromBackend(dashboardData.revenue_summary);
  }
  showToast(`Revenue view switched to ${periodNames[period]}.`, 'info');
}

function toggleRevenueDropdown() {
  const dropdown = document.getElementById('revenueDropdownMenu');
  if (dropdown) dropdown.classList.toggle('hidden');
}

// 11. Modal Controls
function openAddAppointmentModal() {
  const modal = document.getElementById('addAppointmentModal');
  if (modal && typeof modal.showModal === 'function') {
    const dateInput = document.getElementById('quickApptDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
      dateInput.min = today;
    }
    modal.showModal();
    lockBodyScroll();
  }
}

function closeAddAppointmentModal() {
  const modal = document.getElementById('addAppointmentModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function openAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function openAddServiceModal() {
  const modal = document.getElementById('addServiceModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeAddServiceModal() {
  const modal = document.getElementById('addServiceModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function openAddStaffModal() {
  const modal = document.getElementById('addStaffModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeAddStaffModal() {
  const modal = document.getElementById('addStaffModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function openNotificationsModal() {
  const modal = document.getElementById('adminNotificationsModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeNotificationsModal() {
  const modal = document.getElementById('adminNotificationsModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function confirmLogout() {
  closeLogoutModal();
  showToast('Logging out of admin panel...', 'info');
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  setTimeout(() => {
    window.location.href = '../login.html';
  }, 400);
}

// 12. Mobile Sidebar & Steady Listeners
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
    lockBodyScroll();
  } else {
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    unlockBodyScroll();
  }
}

function setupClickOutside() {
  document.addEventListener('click', (e) => {
    const revDropdown = document.getElementById('revenueDropdownMenu');
    const revBtn = e.target.closest('#revenuePeriodBtnText, [onclick*="toggleRevenueDropdown"]');
    if (revDropdown && !revDropdown.contains(e.target) && !revBtn) {
      revDropdown.classList.add('hidden');
    }
  });
}

function setupDialogSteadyListeners() {
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('close', () => unlockBodyScroll());
    dlg.addEventListener('cancel', () => unlockBodyScroll());
    dlg.addEventListener('click', (e) => {
      const rect = dlg.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        dlg.close();
        unlockBodyScroll();
      }
    });
  });
}

function lockBodyScroll() {
  // Keeping sidebar steady: Native dialog modal handles top-layer focus & backdrop isolation
  // without modifying document.body classes or altering vertical page scroll position
}

function unlockBodyScroll() {
  // Preserves layout stability and eliminates upward sidebar shifts
}

// 13. Helpers
function formatCurrency(val) {
  const num = Number(val) || 0;
  return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTimeSlot(timeStr) {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  let hour = parseInt(parts[0], 10);
  const min = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${min} ${ampm}`;
}

function convertTimeSlotTo24H(time12h) {
  if (!time12h) return '09:00:00';
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name) {
  if (!name) return 'NS';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getStatusBadgeHtml(status) {
  const map = {
    confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    pending: 'bg-amber-50 text-amber-800 border-amber-300',
    completed: 'bg-blue-50 text-blue-800 border-blue-300',
    cancelled: 'bg-rose-50 text-rose-800 border-rose-300',
    no_show: 'bg-gray-100 text-gray-700 border-gray-300'
  };
  const cls = map[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  return `
    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls} uppercase">
      ${escapeHtml(status)}
    </span>
  `;
}

function getCustomerStatusBadgeHtml(status) {
  if (status === 'completed') {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">Completed</span>`;
  }
  if (status === 'confirmed') {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Confirmed</span>`;
  }
  if (status === 'pending') {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Pending</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Active</span>`;
}

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 14. Schedule Table Horizontal Scroll Controls
function scrollScheduleTable(direction) {
  const container = document.getElementById('dashboardScheduleScrollContainer');
  if (!container) return;
  const scrollAmount = 280;
  if (direction === 'left') {
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  } else {
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }
}
