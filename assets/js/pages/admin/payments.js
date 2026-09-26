// Seamless 0ms Cache Preload
const PAYMENTS_CACHE_KEY = 'nelys_admin_payments_cache';
let lastRendered_payments_Hash = '';
/**
 * Nely's Salon — Admin Payments Controller
 * Directly connected to backend database API (/api/payments, /api/dashboard/stats)
 * Manages salon payment transactions, revenue overview, receipt generation,
 * search/filter controls, and complete CRUD & refund modal workflows.
 */

// ================= GLOBAL STATE =================
let paymentsList = [];
let servicesCatalog = [];
let customersList = [];
let summaryMetrics = {
  today_revenue: 0,
  today_visits: 0,
  month_revenue: 0,
  paid_revenue: 0,
  pending_revenue: 0,
  weekly_revenue: [
    { label: 'Monday', day: 'Mon', amount: 0 },
    { label: 'Tuesday', day: 'Tue', amount: 0 },
    { label: 'Wednesday', day: 'Wed', amount: 0 },
    { label: 'Thursday', day: 'Thu', amount: 0 },
    { label: 'Friday', day: 'Fri', amount: 0 },
    { label: 'Saturday', day: 'Sat', amount: 0 },
    { label: 'Sunday', day: 'Sun', amount: 0 }
  ],
  weekly_total: 0,
  highest_day: 'Mon',
  highest_amount: 0,
  daily_average: 0,
  top_payment_method: 'Cash',
  top_payment_pct: 0
};

// In-memory active transaction context
let activePayment = null;
let activeKebabDropdown = null;

// Filter & search criteria
let currentSearch = '';
let currentDateFilter = 'all';
let currentStatusFilter = 'all';
let currentMethodFilter = 'all';
let currentRevenueTimeframe = 'week';

// ================= INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupEventListeners();
  fetchPaymentsData();
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
async function fetchPaymentsData() {
  try {
    const res = await fetch('../api/payments', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('Admin session expired or unauthenticated.');
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch payments data`);
    }

    const json = await res.json();
    if (json.data) {
      if (json.data.payments && Array.isArray(json.data.payments)) {
        paymentsList = json.data.payments.map(mapPaymentRecord);
      } else if (Array.isArray(json.data)) {
        paymentsList = json.data.map(mapPaymentRecord);
      }

      if (json.data.metrics) {
        summaryMetrics = Object.assign(summaryMetrics, json.data.metrics);
      }

      if (json.data.services && Array.isArray(json.data.services)) {
        servicesCatalog = json.data.services;
      }

      if (json.data.customers && Array.isArray(json.data.customers)) {
        customersList = json.data.customers;
      }
    }

    populateRecordModalDropdowns();
    renderSummaryCards();
    renderRevenueOverview(currentRevenueTimeframe);
    applyFiltersAndRender();

  } catch (err) {
    console.error('Error fetching payments from backend:', err);
    showToast('Failed to load payment records from server.', 'error');
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

// Map raw backend payment object
function mapPaymentRecord(p) {
  const amount = parseFloat(p.amount) || 0;
  const rawStatus = (p.raw_status || p.status || 'pending').toLowerCase();
  
  let status = 'Unpaid';
  if (rawStatus === 'paid') status = 'Paid';
  else if (rawStatus === 'partial') status = 'Partial';
  else if (rawStatus === 'refunded') status = 'Refunded';

  const rawMethod = (p.raw_method || p.payment_method || p.method || 'cash').toLowerCase();
  let method = 'Cash';
  if (rawMethod === 'gcash') method = 'GCash';
  else if (rawMethod === 'bank_transfer') method = 'Bank Transfer';
  else if (rawMethod === 'other') method = 'Other';

  const createdDate = p.created_at ? new Date(p.created_at) : new Date();
  const dateFormatted = p.date || createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fullDate = p.fullDate || createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeFormatted = p.transactionTime || createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const idCode = p.transaction_code || ('PAY-' + String(p.id).padStart(4, '0'));

  return {
    id: p.id,
    displayId: idCode,
    transaction_code: idCode,
    booking_id: p.booking_id || null,
    customer: p.customer || p.customer_name || 'Customer',
    customerPhone: p.customerPhone || p.customer_phone || '',
    customerEmail: p.customerEmail || p.customer_email || '',
    service: p.service || p.service_name || 'Salon Service',
    amount: amount,
    method: method,
    raw_method: rawMethod,
    status: status,
    raw_status: rawStatus,
    date: dateFormatted,
    fullDate: fullDate,
    transactionTime: timeFormatted,
    appointmentSchedule: p.appointmentSchedule || `${fullDate} — 9:00 AM`,
    notes: p.notes || '',
    created_at: p.created_at || new Date().toISOString(),
    paid_at: p.paid_at || null,
    staff_name: p.staff_name || ''
  };
}

// Populate customer and service selects for record payment modal
function populateRecordModalDropdowns() {
  const custSelect = document.getElementById('recordCustomerSelect');
  const srvSelect = document.getElementById('recordServiceSelect');

  if (custSelect) {
    if (customersList.length === 0) {
      custSelect.innerHTML = `<option value="">No registered customers found</option>`;
    } else {
      custSelect.innerHTML = `<option value="" disabled selected>Select a customer...</option>` +
        customersList.map(c => {
          const name = c.name || c.full_name || c.email || 'Customer';
          const phone = c.phone ? ` (${c.phone})` : '';
          return `<option value="${c.id || c.user_id}">${name}${phone}</option>`;
        }).join('');
    }
  }

  if (srvSelect) {
    if (servicesCatalog.length === 0) {
      srvSelect.innerHTML = `<option value="">No services available</option>`;
    } else {
      srvSelect.innerHTML = `<option value="" disabled selected>Select a service...</option>` +
        servicesCatalog.map(s => {
          const price = parseFloat(s.price) || 0;
          return `<option value="${s.id}" data-price="${price}">${s.name} (₱${price.toLocaleString()})</option>`;
        }).join('');
    }
  }
}

// Handle Service selection in Record Modal to auto-fill amount
function handleRecordServiceChange(serviceId) {
  const srvSelect = document.getElementById('recordServiceSelect');
  const amtInput = document.getElementById('recordAmount');
  if (!srvSelect || !amtInput) return;

  const selectedOpt = srvSelect.options[srvSelect.selectedIndex];
  if (selectedOpt && selectedOpt.dataset.price !== undefined) {
    amtInput.value = selectedOpt.dataset.price;
  }
}

// ================= DOM EVENT LISTENERS =================
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('paymentSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    });
  }

  // Date Filter
  const dateFilter = document.getElementById('dateFilter');
  if (dateFilter) {
    dateFilter.addEventListener('change', (e) => {
      currentDateFilter = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Status Filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentStatusFilter = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Method Filter
  const methodFilter = document.getElementById('methodFilter');
  if (methodFilter) {
    methodFilter.addEventListener('change', (e) => {
      currentMethodFilter = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Close kebab menus on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.kebab-menu-container')) {
      closeAllKebabMenus();
    }
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// ================= RENDER SUMMARY CARDS =================
function renderSummaryCards() {
  const todayRevEl = document.getElementById('statTodayRevenue');
  const todayVisitsEl = document.getElementById('statTodayVisits');
  const monthRevEl = document.getElementById('statMonthRevenue');
  const paidRevEl = document.getElementById('statPaidRevenue');
  const pendingRevEl = document.getElementById('statPendingRevenue');

  if (todayRevEl) todayRevEl.textContent = `₱${summaryMetrics.today_revenue.toLocaleString()}`;
  if (todayVisitsEl) todayVisitsEl.textContent = `${summaryMetrics.today_visits} visit${summaryMetrics.today_visits === 1 ? '' : 's'}`;
  if (monthRevEl) monthRevEl.textContent = `₱${summaryMetrics.month_revenue.toLocaleString()}`;
  if (paidRevEl) paidRevEl.textContent = `₱${summaryMetrics.paid_revenue.toLocaleString()}`;
  if (pendingRevEl) pendingRevEl.textContent = `₱${summaryMetrics.pending_revenue.toLocaleString()}`;
}

// ================= RENDER REVENUE OVERVIEW =================
function renderRevenueOverview(timeframe = 'week') {
  currentRevenueTimeframe = timeframe;
  const chartContainer = document.getElementById('revenueChartContainer');
  const totalDisplay = document.getElementById('revenueOverviewTotal');
  const highestDayDisplay = document.getElementById('revenueHighestDay');
  const dailyAvgDisplay = document.getElementById('revenueDailyAvg');
  const topMethodDisplay = document.getElementById('revenueTopMethod');

  if (!chartContainer) return;

  const weeklyData = summaryMetrics.weekly_revenue || [
    { label: 'Monday', day: 'Mon', amount: 0 },
    { label: 'Tuesday', day: 'Tue', amount: 0 },
    { label: 'Wednesday', day: 'Wed', amount: 0 },
    { label: 'Thursday', day: 'Thu', amount: 0 },
    { label: 'Friday', day: 'Fri', amount: 0 },
    { label: 'Saturday', day: 'Sat', amount: 0 },
    { label: 'Sunday', day: 'Sun', amount: 0 }
  ];

  if (timeframe === 'week') {
    if (totalDisplay) totalDisplay.textContent = `₱${summaryMetrics.weekly_total.toLocaleString()}`;
    if (highestDayDisplay) {
      highestDayDisplay.textContent = summaryMetrics.highest_amount > 0 
        ? `${summaryMetrics.highest_day} (₱${summaryMetrics.highest_amount.toLocaleString()})`
        : '—';
    }
    if (dailyAvgDisplay) dailyAvgDisplay.textContent = `₱${summaryMetrics.daily_average.toLocaleString()}`;
  } else if (timeframe === 'today') {
    if (totalDisplay) totalDisplay.textContent = `₱${summaryMetrics.today_revenue.toLocaleString()}`;
    if (highestDayDisplay) highestDayDisplay.textContent = `Today (₱${summaryMetrics.today_revenue.toLocaleString()})`;
    if (dailyAvgDisplay) dailyAvgDisplay.textContent = `₱${summaryMetrics.today_revenue.toLocaleString()}`;
  } else if (timeframe === 'month') {
    if (totalDisplay) totalDisplay.textContent = `₱${summaryMetrics.month_revenue.toLocaleString()}`;
    if (highestDayDisplay) highestDayDisplay.textContent = `Month (₱${summaryMetrics.month_revenue.toLocaleString()})`;
    if (dailyAvgDisplay) dailyAvgDisplay.textContent = `₱${Math.round(summaryMetrics.month_revenue / 30).toLocaleString()}`;
  }

  if (topMethodDisplay) {
    topMethodDisplay.textContent = summaryMetrics.top_payment_pct > 0 
      ? `${summaryMetrics.top_payment_method} (${summaryMetrics.top_payment_pct}%)`
      : `${summaryMetrics.top_payment_method || 'Cash'}`;
  }

  const maxVal = Math.max(...weeklyData.map(d => d.amount), 1);

  chartContainer.innerHTML = weeklyData.map(d => {
    const heightPercent = d.amount > 0 ? Math.max(Math.round((d.amount / maxVal) * 100), 8) : 4;
    const isPeak = d.amount > 0 && d.amount === summaryMetrics.highest_amount;
    const barBg = isPeak 
      ? 'bg-[#810B38]' 
      : (d.amount > 0 ? 'bg-[#DCC3AA] group-hover:bg-[#810B38]/80' : 'bg-stone-200');

    return `
      <div class="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
        <!-- Amount Tooltip on hover -->
        <div class="opacity-0 group-hover:opacity-100 transition-opacity bg-[#541A1A] text-[#F1E2D1] text-[10px] font-bold px-2 py-1 rounded-md shadow-md pointer-events-none whitespace-nowrap mb-1">
          ₱${d.amount.toLocaleString()}
        </div>

        <!-- Visual Bar -->
        <div class="w-full max-w-[36px] bg-stone-100 rounded-t-xl overflow-hidden h-40 flex items-end">
          <div 
            style="height: ${heightPercent}%;" 
            class="w-full ${barBg} rounded-t-xl transition-all duration-500 ease-out group-hover:scale-y-105 origin-bottom">
          </div>
        </div>

        <!-- Day Label -->
        <div class="text-center mt-1">
          <span class="block text-xs font-bold text-stone-700">${d.day}</span>
          <span class="block text-[10px] text-stone-400 font-mono">₱${(d.amount / 1000).toFixed(1)}k</span>
        </div>
      </div>
    `;
  }).join('');
}

// Switch Revenue timeframe
function changeRevenueTimeframe(timeframe) {
  renderRevenueOverview(timeframe);
}

// ================= FILTER & RENDER LOGIC =================
function applyFiltersAndRender() {
  closeAllKebabMenus();

  let filtered = [...paymentsList];

  // 1. Search (Customer, Service, ID, Notes, Staff)
  if (currentSearch) {
    filtered = filtered.filter(p => 
      (p.customer && p.customer.toLowerCase().includes(currentSearch)) ||
      (p.service && p.service.toLowerCase().includes(currentSearch)) ||
      (p.displayId && p.displayId.toLowerCase().includes(currentSearch)) ||
      (p.method && p.method.toLowerCase().includes(currentSearch)) ||
      (p.notes && p.notes.toLowerCase().includes(currentSearch)) ||
      (p.staff_name && p.staff_name.toLowerCase().includes(currentSearch))
    );
  }

  // 2. Date Filter
  if (currentDateFilter !== 'all') {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (currentDateFilter === 'today') {
      filtered = filtered.filter(p => {
        const pDate = p.created_at ? p.created_at.slice(0, 10) : '';
        const paidDate = p.paid_at ? p.paid_at.slice(0, 10) : '';
        return pDate === todayStr || paidDate === todayStr;
      });
    } else if (currentDateFilter === 'yesterday') {
      filtered = filtered.filter(p => {
        const pDate = p.created_at ? p.created_at.slice(0, 10) : '';
        const paidDate = p.paid_at ? p.paid_at.slice(0, 10) : '';
        return pDate === yesterdayStr || paidDate === yesterdayStr;
      });
    }
  }

  // 3. Status Filter
  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(p => p.status.toLowerCase() === currentStatusFilter.toLowerCase());
  }

  // 4. Method Filter
  if (currentMethodFilter !== 'all') {
    filtered = filtered.filter(p => p.method.toLowerCase() === currentMethodFilter.toLowerCase());
  }

  renderPaymentsTable(filtered);
}

// Reset filters
function resetFilters() {
  currentSearch = '';
  currentDateFilter = 'all';
  currentStatusFilter = 'all';
  currentMethodFilter = 'all';

  const sInput = document.getElementById('paymentSearchInput');
  if (sInput) sInput.value = '';

  const dFilter = document.getElementById('dateFilter');
  if (dFilter) dFilter.value = 'all';

  const stFilter = document.getElementById('statusFilter');
  if (stFilter) stFilter.value = 'all';

  const mFilter = document.getElementById('methodFilter');
  if (mFilter) mFilter.value = 'all';

  applyFiltersAndRender();
  showToast('Filters have been reset', 'info');
}

// Filter by summary card click
function filterBySummaryCard(filterType) {
  if (filterType === 'all') {
    currentStatusFilter = 'all';
    currentDateFilter = 'all';
  } else if (filterType === 'today') {
    currentDateFilter = 'today';
    const dFilter = document.getElementById('dateFilter');
    if (dFilter) dFilter.value = 'today';
  } else if (filterType === 'paid') {
    currentStatusFilter = 'Paid';
    const stFilter = document.getElementById('statusFilter');
    if (stFilter) stFilter.value = 'Paid';
  } else if (filterType === 'pending') {
    currentStatusFilter = 'Partial';
    const stFilter = document.getElementById('statusFilter');
    if (stFilter) stFilter.value = 'Partial';
  }
  applyFiltersAndRender();
}

// ================= RENDER PAYMENTS TABLE =================
function renderPaymentsTable(items) {
  const tableBody = document.getElementById('paymentsTableBody');
  const emptyState = document.getElementById('paymentsEmptyState');
  const tableContainer = document.getElementById('paymentsTableContainer');
  const resultCount = document.getElementById('paymentsResultCount');

  if (resultCount) {
    resultCount.textContent = `Showing ${items.length} transaction${items.length === 1 ? '' : 's'}`;
  }

  if (!tableBody) return;

  if (items.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (tableContainer) tableContainer.classList.remove('hidden');

  tableBody.innerHTML = items.map(p => {
    // Status Badge
    let statusBadge = '';
    if (p.status === 'Paid') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <i class="fa-solid fa-circle text-[8px] text-emerald-500"></i>
        Paid
      </span>`;
    } else if (p.status === 'Partial') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <i class="fa-solid fa-circle text-[8px] text-amber-500"></i>
        Partial
      </span>`;
    } else if (p.status === 'Unpaid') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <i class="fa-solid fa-circle text-[8px] text-rose-500"></i>
        Unpaid
      </span>`;
    } else if (p.status === 'Refunded') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">
        <i class="fa-solid fa-arrow-rotate-left text-[9px] text-stone-400"></i>
        Refunded
      </span>`;
    }

    // Payment Method Badge
    let methodBadge = '';
    if (p.method === 'Cash') {
      methodBadge = `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700"><i class="fa-solid fa-money-bill-wave text-emerald-600"></i> Cash</span>`;
    } else if (p.method === 'GCash') {
      methodBadge = `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700"><i class="fa-solid fa-mobile-screen-button text-blue-600"></i> GCash</span>`;
    } else if (p.method === 'Bank Transfer') {
      methodBadge = `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700"><i class="fa-solid fa-building-columns text-indigo-600"></i> Bank Transfer</span>`;
    } else {
      methodBadge = `<span class="text-xs text-stone-500 font-medium">${p.method}</span>`;
    }

    return `
      <tr class="border-b border-[#F1E2D1]/60 hover:bg-[#FAF6F0]/60 transition-colors group">
        <!-- Date -->
        <td class="px-5 py-4">
          <div class="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <i class="fa-regular fa-calendar text-[11px] text-[#810B38]"></i>
            ${p.date}
          </div>
          <div class="text-[10px] text-stone-400 font-mono mt-0.5">${p.displayId}</div>
        </td>

        <!-- Customer -->
        <td class="px-5 py-4">
          <button 
            type="button" 
            onclick="openPaymentDetailsModal(${p.id})"
            class="font-serif font-bold text-sm text-[#541A1A] hover:text-[#810B38] transition-colors text-left group-hover:underline block">
            ${p.customer}
          </button>
          <div class="text-[11px] text-stone-400 font-mono">${p.customerPhone || '09XX XXX XXXX'}</div>
        </td>

        <!-- Service -->
        <td class="px-5 py-4">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#810B38] bg-[#FAF6F0] px-2.5 py-1 rounded-lg border border-[#DCC3AA]/50">
            <i class="fa-solid fa-scissors text-[10px]"></i>
            ${p.service}
          </span>
        </td>

        <!-- Amount -->
        <td class="px-5 py-4">
          <span class="font-serif text-base font-bold text-[#541A1A]">₱${p.amount.toLocaleString()}</span>
        </td>

        <!-- Method -->
        <td class="px-5 py-4">
          ${methodBadge}
        </td>

        <!-- Status -->
        <td class="px-5 py-4">
          ${statusBadge}
        </td>

        <!-- Action (⋮ Kebab Menu) -->
        <td class="px-5 py-4 text-right">
          <div class="relative inline-block text-left kebab-menu-container">
            <button 
              type="button" 
              onclick="toggleKebabMenu(event, ${p.id})"
              class="w-8 h-8 rounded-lg bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-600 transition-colors flex items-center justify-center text-sm shadow-xs focus:outline-none"
              aria-label="Actions for payment ${p.displayId}">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>

            <!-- Dropdown Menu -->
            <div 
              id="kebab-menu-${p.id}" 
              class="hidden absolute right-0 mt-1 w-48 bg-white border border-[#DCC3AA]/50 rounded-xl shadow-xl z-30 py-1.5 text-left text-xs divide-y divide-stone-100">
              
              <div class="py-1">
                <!-- View Payment -->
                <button 
                  type="button" 
                  onclick="openPaymentDetailsModal(${p.id})"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-[#810B38] font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-eye text-[#810B38] w-4 text-center"></i>
                  <span>View Payment</span>
                </button>

                <!-- Edit Payment -->
                <button 
                  type="button" 
                  onclick="openEditPaymentModal(${p.id})"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-[#810B38] font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-pen-to-square text-[#810B38] w-4 text-center"></i>
                  <span>Edit Payment</span>
                </button>
              </div>

              <div class="py-1">
                <!-- Record Payment / Mark Paid -->
                <button 
                  type="button" 
                  onclick="quickMarkPaid(${p.id})"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-emerald-700 font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-money-bill-wave text-emerald-600 w-4 text-center"></i>
                  <span>${p.status === 'Paid' ? 'Re-confirm Paid' : 'Mark as Paid'}</span>
                </button>

                <!-- View Receipt -->
                <button 
                  type="button" 
                  onclick="openReceiptModal(${p.id})"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-indigo-700 font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-receipt text-indigo-600 w-4 text-center"></i>
                  <span>View Receipt</span>
                </button>
              </div>

              <div class="py-1">
                <!-- Refund -->
                <button 
                  type="button" 
                  onclick="openRefundModal(${p.id})"
                  class="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-arrow-rotate-left text-rose-600 w-4 text-center"></i>
                  <span>Refund</span>
                </button>
              </div>

            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ================= KEBAB MENU TOGGLE =================
function toggleKebabMenu(event, paymentId) {
  event.stopPropagation();
  const menu = document.getElementById(`kebab-menu-${paymentId}`);
  if (!menu) return;

  const isHidden = menu.classList.contains('hidden');
  closeAllKebabMenus();

  if (isHidden) {
    menu.classList.remove('hidden');
    activeKebabDropdown = menu;
  }
}

function closeAllKebabMenus() {
  document.querySelectorAll('[id^="kebab-menu-"]').forEach(el => {
    el.classList.add('hidden');
  });
  activeKebabDropdown = null;
}

// ================= PAYMENT DETAILS MODAL =================
function openPaymentDetailsModal(paymentId) {
  closeAllKebabMenus();
  const p = paymentsList.find(item => item.id === paymentId || item.displayId === paymentId);
  if (!p) return;

  activePayment = p;

  const idEl = document.getElementById('detailsPaymentId');
  const custEl = document.getElementById('detailsCustomerName');
  const apptEl = document.getElementById('detailsAppointmentSchedule');
  const srvEl = document.getElementById('detailsServiceName');
  const amtEl = document.getElementById('detailsAmount');
  const methodEl = document.getElementById('detailsPaymentMethod');
  const statusEl = document.getElementById('detailsStatusBadge');
  const dateEl = document.getElementById('detailsTransactionDate');
  const notesEl = document.getElementById('detailsNotes');

  if (idEl) idEl.textContent = `Payment #${p.displayId}`;
  if (custEl) custEl.textContent = p.customer;
  if (apptEl) apptEl.textContent = p.appointmentSchedule;
  if (srvEl) srvEl.textContent = p.service;
  if (amtEl) amtEl.textContent = `₱${p.amount.toLocaleString()}`;
  if (methodEl) methodEl.textContent = p.method;
  if (dateEl) dateEl.textContent = `${p.fullDate} — ${p.transactionTime}`;
  if (notesEl) notesEl.textContent = p.notes || 'No additional payment notes recorded.';

  if (statusEl) {
    if (p.status === 'Paid') {
      statusEl.innerHTML = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">🟢 Paid</span>`;
    } else if (p.status === 'Partial') {
      statusEl.innerHTML = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">🟡 Partial</span>`;
    } else if (p.status === 'Unpaid') {
      statusEl.innerHTML = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">🔴 Unpaid</span>`;
    } else {
      statusEl.innerHTML = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">⚪ Refunded</span>`;
    }
  }

  const modal = document.getElementById('paymentDetailsModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closePaymentDetailsModal() {
  const modal = document.getElementById('paymentDetailsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// ================= OFFICIAL RECEIPT MODAL =================
function openReceiptModal(paymentId) {
  closeAllKebabMenus();
  closePaymentDetailsModal();

  const p = (paymentId ? paymentsList.find(item => item.id === paymentId || item.displayId === paymentId) : null) || activePayment;
  if (!p) return;

  activePayment = p;

  const rCust = document.getElementById('receiptCustomer');
  const rSrv = document.getElementById('receiptService');
  const rAmt = document.getElementById('receiptAmount');
  const rMethod = document.getElementById('receiptMethod');
  const rStatus = document.getElementById('receiptStatus');
  const rDate = document.getElementById('receiptDate');
  const rTx = document.getElementById('receiptTransaction');

  if (rCust) rCust.textContent = p.customer;
  if (rSrv) rSrv.textContent = p.service;
  if (rAmt) rAmt.textContent = `₱${p.amount.toLocaleString()}`;
  if (rMethod) rMethod.textContent = p.method;
  if (rStatus) rStatus.textContent = p.status.toUpperCase();
  if (rDate) rDate.textContent = p.fullDate;
  if (rTx) rTx.textContent = p.displayId;

  const modal = document.getElementById('receiptModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function printReceipt() {
  window.print();
}

// ================= RECORD / CREATE PAYMENT MODAL =================
function openRecordPaymentModal() {
  closeAllKebabMenus();
  activePayment = null;

  const form = document.getElementById('recordPaymentForm');
  if (form) form.reset();

  populateRecordModalDropdowns();

  const amtInput = document.getElementById('recordAmount');
  if (amtInput) amtInput.value = '0';

  const modal = document.getElementById('recordPaymentModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeRecordPaymentModal() {
  const modal = document.getElementById('recordPaymentModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  activePayment = null;
}

async function handleSaveRecordPayment(event) {
  event.preventDefault();

  const custSelect = document.getElementById('recordCustomerSelect');
  const srvSelect = document.getElementById('recordServiceSelect');
  const amtInput = document.getElementById('recordAmount');
  const methodSelect = document.getElementById('recordMethod');
  const statusSelect = document.getElementById('recordStatus');
  const notesInput = document.getElementById('recordNotes');

  const customerId = custSelect && custSelect.value ? parseInt(custSelect.value) : null;
  const serviceId = srvSelect && srvSelect.value ? parseInt(srvSelect.value) : null;
  const amount = amtInput ? parseFloat(amtInput.value) || 0 : 0;
  const method = methodSelect ? methodSelect.value : 'Cash';
  const status = statusSelect ? statusSelect.value : 'Paid';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (amount <= 0) {
    showToast('Please enter a valid payment amount.', 'warning');
    return;
  }

  const payload = {
    customer_id: customerId,
    service_id: serviceId,
    amount: amount,
    payment_method: method.toLowerCase().replace(' ', '_'),
    status: status.toLowerCase(),
    notes: notes
  };

  try {
    const res = await fetch('../api/payments', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to record payment');
    }

    showToast(`Payment of ₱${amount.toLocaleString()} recorded successfully!`, 'success');
    closeRecordPaymentModal();
    await fetchPaymentsData();
    await fetchSidebarStats();

  } catch (err) {
    console.error('Error saving payment:', err);
    showToast(err.message || 'Failed to record payment.', 'error');
  }
}

// Quick action to mark a transaction paid
async function quickMarkPaid(paymentId) {
  closeAllKebabMenus();
  const p = paymentsList.find(item => item.id === paymentId);
  if (!p) return;

  try {
    const res = await fetch(`../api/payments/${p.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: 'paid',
        payment_method: p.raw_method === '—' ? 'cash' : p.raw_method
      })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update payment status');
    }

    showToast(`Transaction ${p.displayId} marked as PAID.`, 'success');
    await fetchPaymentsData();
    await fetchSidebarStats();

  } catch (err) {
    console.error('Error updating payment:', err);
    showToast(err.message || 'Failed to mark payment as paid.', 'error');
  }
}

// ================= EDIT PAYMENT MODAL =================
function openEditPaymentModal(paymentId) {
  closeAllKebabMenus();
  closePaymentDetailsModal();

  const p = (paymentId ? paymentsList.find(item => item.id === paymentId || item.displayId === paymentId) : null) || activePayment;
  if (!p) return;

  activePayment = p;

  const idInput = document.getElementById('editPaymentId');
  const custInput = document.getElementById('editCustomerName');
  const srvInput = document.getElementById('editService');
  const amtInput = document.getElementById('editAmount');
  const methodSelect = document.getElementById('editMethod');
  const statusSelect = document.getElementById('editStatus');
  const notesInput = document.getElementById('editNotes');

  if (idInput) idInput.value = p.id;
  if (custInput) custInput.value = p.customer;
  if (srvInput) srvInput.value = p.service;
  if (amtInput) amtInput.value = p.amount;
  if (methodSelect) methodSelect.value = p.method === '—' ? 'Cash' : p.method;
  if (statusSelect) statusSelect.value = p.status;
  if (notesInput) notesInput.value = p.notes || '';

  const modal = document.getElementById('editPaymentModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeEditPaymentModal() {
  const modal = document.getElementById('editPaymentModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleSaveEditPayment(event) {
  event.preventDefault();

  const idInput = document.getElementById('editPaymentId');
  const amtInput = document.getElementById('editAmount');
  const methodSelect = document.getElementById('editMethod');
  const statusSelect = document.getElementById('editStatus');
  const notesInput = document.getElementById('editNotes');

  const id = idInput ? parseInt(idInput.value) : (activePayment ? activePayment.id : null);
  if (!id) return;

  const amount = amtInput ? parseFloat(amtInput.value) || 0 : 0;
  const method = methodSelect ? methodSelect.value : 'Cash';
  const status = statusSelect ? statusSelect.value : 'Paid';
  const notes = notesInput ? notesInput.value.trim() : '';

  const payload = {
    amount: amount,
    payment_method: method.toLowerCase().replace(' ', '_'),
    status: status.toLowerCase(),
    notes: notes
  };

  try {
    const res = await fetch(`../api/payments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update payment');
    }

    showToast(`Payment #${activePayment ? activePayment.displayId : id} updated successfully!`, 'success');
    closeEditPaymentModal();
    await fetchPaymentsData();
    await fetchSidebarStats();

  } catch (err) {
    console.error('Error editing payment:', err);
    showToast(err.message || 'Failed to update payment.', 'error');
  }
}

// ================= REFUND MODAL =================
function openRefundModal(paymentId) {
  closeAllKebabMenus();
  closePaymentDetailsModal();

  const p = (paymentId ? paymentsList.find(item => item.id === paymentId || item.displayId === paymentId) : null) || activePayment;
  if (!p) return;

  activePayment = p;

  const targetCust = document.getElementById('refundCustomerTarget');
  const targetAmt = document.getElementById('refundAmountTarget');

  if (targetCust) targetCust.textContent = p.customer;
  if (targetAmt) targetAmt.textContent = `₱${p.amount.toLocaleString()}`;

  const modal = document.getElementById('refundModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeRefundModal() {
  const modal = document.getElementById('refundModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleConfirmRefund() {
  if (!activePayment) return;

  try {
    const res = await fetch(`../api/payments/${activePayment.id}/refund`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to refund payment');
    }

    showToast(`Payment ${activePayment.displayId} has been marked as REFUNDED.`, 'success');
    closeRefundModal();
    await fetchPaymentsData();
    await fetchSidebarStats();

  } catch (err) {
    console.error('Error refunding payment:', err);
    showToast(err.message || 'Failed to process refund.', 'error');
  }
}

// ================= CLOSE ALL MODALS =================
function closeAllModals() {
  closePaymentDetailsModal();
  closeReceiptModal();
  closeRecordPaymentModal();
  closeEditPaymentModal();
  closeRefundModal();
  closeLogoutModal();
}

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
