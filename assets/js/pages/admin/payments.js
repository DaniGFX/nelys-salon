/**
 * Nely's Salon — Admin Payments Controller
 * Manages payment transactions, tracking paid, partial, and unpaid appointments,
 * receipt generator, revenue weekly breakdown chart, and modal CRUD operations.
 */

// ================= GLOBAL STATE & STORAGE =================
const PAYMENTS_STORAGE_KEY = 'nelys_admin_payments_data';

const DEFAULT_PAYMENTS = [
  {
    id: 'PAY-0001',
    customer: 'Maria Santos',
    customerPhone: '0917 888 9999',
    service: 'Haircut',
    amount: 250,
    method: 'Cash',
    status: 'Paid', // Paid, Partial, Unpaid, Refunded
    date: 'Sept 23',
    fullDate: 'September 23, 2026',
    transactionTime: '9:42 AM',
    appointmentSchedule: 'September 23, 2026 — 9:00 AM',
    notes: 'Walk-in cash settlement completed after styling.'
  },
  {
    id: 'PAY-0002',
    customer: 'Angela Cruz',
    customerPhone: '0928 777 6666',
    service: 'Brazilian',
    amount: 1999,
    method: 'GCash',
    status: 'Paid',
    date: 'Sept 23',
    fullDate: 'September 23, 2026',
    transactionTime: '11:15 AM',
    appointmentSchedule: 'September 23, 2026 — 10:30 AM',
    notes: 'GCash Reference: 902837416281. Full payment confirmed.'
  },
  {
    id: 'PAY-0003',
    customer: 'Jamie Reyes',
    customerPhone: '0919 555 4433',
    service: 'Manicure',
    amount: 149,
    method: 'Cash',
    status: 'Partial',
    date: 'Sept 23',
    fullDate: 'September 23, 2026',
    transactionTime: '1:45 PM',
    appointmentSchedule: 'September 23, 2026 — 1:00 PM',
    notes: 'Partial deposit paid (₱100); remaining ₱49 balance to settle upon gel polish topcoat.'
  },
  {
    id: 'PAY-0004',
    customer: 'Carla Dela Cruz',
    customerPhone: '0995 222 1100',
    service: 'Hair Dye',
    amount: 699,
    method: 'GCash',
    status: 'Paid',
    date: 'Sept 22',
    fullDate: 'September 22, 2026',
    transactionTime: '4:20 PM',
    appointmentSchedule: 'September 22, 2026 — 3:00 PM',
    notes: 'GCash Ref: 483920194821 verified by salon cashier.'
  },
  {
    id: 'PAY-0005',
    customer: 'Sophia Reyes',
    customerPhone: '0917 444 3322',
    service: 'Pedicure',
    amount: 149,
    method: '—',
    status: 'Unpaid',
    date: 'Sept 22',
    fullDate: 'September 22, 2026',
    transactionTime: '2:00 PM',
    appointmentSchedule: 'September 22, 2026 — 2:00 PM',
    notes: 'Pending customer settlement via home service or cash counter.'
  },
  {
    id: 'PAY-0006',
    customer: 'Joshua Garcia',
    customerPhone: '0933 666 8899',
    service: 'Trim',
    amount: 149,
    method: 'Cash',
    status: 'Paid',
    date: 'Sept 23',
    fullDate: 'September 23, 2026',
    transactionTime: '10:00 AM',
    appointmentSchedule: 'September 23, 2026 — 9:30 AM',
    notes: 'Cash payment settled at salon counter.'
  },
  {
    id: 'PAY-0007',
    customer: 'Katrina Halili',
    customerPhone: '0918 999 0011',
    service: 'Keratine Treatment',
    amount: 499,
    method: 'Bank Transfer',
    status: 'Paid',
    date: 'Sept 23',
    fullDate: 'September 23, 2026',
    transactionTime: '2:30 PM',
    appointmentSchedule: 'September 23, 2026 — 1:30 PM',
    notes: 'BDO Online transfer reference 8847291.'
  },
  {
    id: 'PAY-0008',
    customer: 'Patricia Gomez',
    customerPhone: '0920 111 4477',
    service: 'Hair Treatment',
    amount: 600,
    method: 'GCash',
    status: 'Refunded',
    date: 'Sept 21',
    fullDate: 'September 21, 2026',
    transactionTime: '3:00 PM',
    appointmentSchedule: 'September 21, 2026 — 2:00 PM',
    notes: 'Client rescheduled appointment due to emergency; deposit reversed via GCash.'
  }
];

// Revenue weekly data matching prompt
const WEEKLY_REVENUE = [
  { day: 'Mon', amount: 4200, label: 'Monday' },
  { day: 'Tue', amount: 5100, label: 'Tuesday' },
  { day: 'Wed', amount: 6800, label: 'Wednesday' },
  { day: 'Thu', amount: 5600, label: 'Thursday' },
  { day: 'Fri', amount: 8450, label: 'Friday' },
  { day: 'Sat', amount: 7200, label: 'Saturday' },
  { day: 'Sun', amount: 5900, label: 'Sunday' }
];

// In-memory state
let payments = [];
let activePayment = null;
let activeKebabDropdown = null;

// Filters
let currentSearch = '';
let currentDateFilter = 'all';
let currentStatusFilter = 'all';
let currentMethodFilter = 'all';

// ================= STORAGE HELPERS =================
function loadPayments() {
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (raw) {
      payments = JSON.parse(raw);
    } else {
      payments = JSON.parse(JSON.stringify(DEFAULT_PAYMENTS));
      savePayments();
    }
  } catch (err) {
    console.error('Error loading payments:', err);
    payments = JSON.parse(JSON.stringify(DEFAULT_PAYMENTS));
  }
}

function savePayments() {
  try {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
  } catch (err) {
    console.error('Error saving payments:', err);
  }
}

// ================= DOM INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  loadPayments();
  renderSummaryCards();
  renderRevenueOverview();
  applyFiltersAndRender();
  setupEventListeners();
  updateTimeBadge();
});

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
  // Matching user's sample figures:
  // Today's Revenue: ₱8,450
  // This Month: ₱52,680
  // Paid: ₱7,250
  // Pending: ₱1,200
  const todayRevEl = document.getElementById('statTodayRevenue');
  const monthRevEl = document.getElementById('statMonthRevenue');
  const paidRevEl = document.getElementById('statPaidRevenue');
  const pendingRevEl = document.getElementById('statPendingRevenue');

  if (todayRevEl) todayRevEl.textContent = '₱8,450';
  if (monthRevEl) monthRevEl.textContent = '₱52,680';
  if (paidRevEl) paidRevEl.textContent = '₱7,250';
  if (pendingRevEl) pendingRevEl.textContent = '₱1,200';
}

// ================= RENDER REVENUE OVERVIEW =================
function renderRevenueOverview(timeframe = 'week') {
  const chartContainer = document.getElementById('revenueChartContainer');
  const totalDisplay = document.getElementById('revenueOverviewTotal');
  if (!chartContainer) return;

  const total = WEEKLY_REVENUE.reduce((sum, item) => sum + item.amount, 0);
  if (totalDisplay) totalDisplay.textContent = `₱${total.toLocaleString()}`;

  const maxVal = Math.max(...WEEKLY_REVENUE.map(d => d.amount));

  chartContainer.innerHTML = WEEKLY_REVENUE.map(d => {
    const heightPercent = Math.round((d.amount / maxVal) * 100);
    const isPeak = d.amount === maxVal;
    const barBg = isPeak ? 'bg-[#810B38]' : 'bg-[#DCC3AA] group-hover:bg-[#810B38]/80';

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
  const labelEl = document.getElementById('revenueTimeframeLabel');
  if (labelEl) {
    if (timeframe === 'today') labelEl.textContent = 'Today (₱8,450)';
    else if (timeframe === 'month') labelEl.textContent = 'This Month (₱52,680)';
    else labelEl.textContent = 'This Week (₱43,250)';
  }
  renderRevenueOverview(timeframe);
}

// ================= FILTER & RENDER LOGIC =================
function applyFiltersAndRender() {
  closeAllKebabMenus();

  let filtered = [...payments];

  // 1. Search (Customer, Service, ID, Notes)
  if (currentSearch) {
    filtered = filtered.filter(p => 
      p.customer.toLowerCase().includes(currentSearch) ||
      p.service.toLowerCase().includes(currentSearch) ||
      p.id.toLowerCase().includes(currentSearch) ||
      p.method.toLowerCase().includes(currentSearch) ||
      (p.notes && p.notes.toLowerCase().includes(currentSearch))
    );
  }

  // 2. Date Filter
  if (currentDateFilter !== 'all') {
    if (currentDateFilter === 'today') {
      filtered = filtered.filter(p => p.date === 'Sept 23');
    } else if (currentDateFilter === 'yesterday') {
      filtered = filtered.filter(p => p.date === 'Sept 22');
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
      methodBadge = `<span class="text-xs text-stone-400 font-medium">${p.method}</span>`;
    }

    return `
      <tr class="border-b border-[#F1E2D1]/60 hover:bg-[#FAF6F0]/60 transition-colors group">
        <!-- Date -->
        <td class="px-5 py-4">
          <div class="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <i class="fa-regular fa-calendar text-[11px] text-[#810B38]"></i>
            ${p.date}
          </div>
          <div class="text-[10px] text-stone-400 font-mono mt-0.5">${p.id}</div>
        </td>

        <!-- Customer -->
        <td class="px-5 py-4">
          <button 
            type="button" 
            onclick="openPaymentDetailsModal('${p.id}')"
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
              onclick="toggleKebabMenu(event, '${p.id}')"
              class="w-8 h-8 rounded-lg bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-600 transition-colors flex items-center justify-center text-sm shadow-xs focus:outline-none"
              aria-label="Actions for payment ${p.id}">
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
                  onclick="openPaymentDetailsModal('${p.id}')"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-[#810B38] font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-eye text-[#810B38] w-4 text-center"></i>
                  <span>View Payment</span>
                </button>

                <!-- Edit Payment -->
                <button 
                  type="button" 
                  onclick="openEditPaymentModal('${p.id}')"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-[#810B38] font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-pen-to-square text-[#810B38] w-4 text-center"></i>
                  <span>Edit Payment</span>
                </button>
              </div>

              <div class="py-1">
                <!-- Record Payment / Mark Paid -->
                <button 
                  type="button" 
                  onclick="quickMarkPaid('${p.id}')"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-emerald-700 font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-money-bill-wave text-emerald-600 w-4 text-center"></i>
                  <span>${p.status === 'Paid' ? 'Re-record Payment' : 'Mark as Paid'}</span>
                </button>

                <!-- View Receipt -->
                <button 
                  type="button" 
                  onclick="openReceiptModal('${p.id}')"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-indigo-700 font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-receipt text-indigo-600 w-4 text-center"></i>
                  <span>View Receipt</span>
                </button>
              </div>

              <div class="py-1">
                <!-- Refund -->
                <button 
                  type="button" 
                  onclick="openRefundModal('${p.id}')"
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
  const p = payments.find(item => item.id === paymentId);
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

  if (idEl) idEl.textContent = `Payment #${p.id}`;
  if (custEl) custEl.textContent = p.customer;
  if (apptEl) apptEl.textContent = p.appointmentSchedule || `${p.fullDate} — 9:00 AM`;
  if (srvEl) srvEl.textContent = p.service;
  if (amtEl) amtEl.textContent = `₱${p.amount.toLocaleString()}`;
  if (methodEl) methodEl.textContent = p.method === '—' ? 'Not recorded yet' : p.method;
  if (dateEl) dateEl.textContent = `${p.fullDate} — ${p.transactionTime || '9:42 AM'}`;
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

  const p = payments.find(item => item.id === paymentId) || activePayment;
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
  if (rMethod) rMethod.textContent = p.method === '—' ? 'Cash' : p.method;
  if (rStatus) rStatus.textContent = p.status.toUpperCase();
  if (rDate) rDate.textContent = p.fullDate;
  if (rTx) rTx.textContent = p.id;

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

function handleSaveRecordPayment(event) {
  event.preventDefault();

  const custSelect = document.getElementById('recordCustomerSelect');
  const srvSelect = document.getElementById('recordServiceSelect');
  const amtInput = document.getElementById('recordAmount');
  const methodSelect = document.getElementById('recordMethod');
  const statusSelect = document.getElementById('recordStatus');
  const notesInput = document.getElementById('recordNotes');

  const customer = custSelect ? custSelect.value : 'Maria Santos';
  const service = srvSelect ? srvSelect.value : 'Haircut';
  const amount = amtInput ? parseFloat(amtInput.value) || 250 : 250;
  const method = methodSelect ? methodSelect.value : 'Cash';
  const status = statusSelect ? statusSelect.value : 'Paid';
  const notes = notesInput ? notesInput.value.trim() : '';

  const newId = 'PAY-000' + (payments.length + 1);

  const newPayment = {
    id: newId,
    customer: customer,
    customerPhone: '0917 888 9999',
    service: service,
    amount: amount,
    method: method,
    status: status,
    date: 'Sept 23',
    fullDate: 'September 23, 2026',
    transactionTime: '9:45 AM',
    appointmentSchedule: 'September 23, 2026 — 9:00 AM',
    notes: notes || `Payment recorded via ${method} by Admin.`
  };

  payments.unshift(newPayment);
  savePayments();
  applyFiltersAndRender();
  closeRecordPaymentModal();

  showToast(`Payment ${newId} (₱${amount.toLocaleString()}) recorded successfully!`, 'success');
}

// Quick action to mark a transaction paid
function quickMarkPaid(paymentId) {
  closeAllKebabMenus();
  const p = payments.find(item => item.id === paymentId);
  if (!p) return;

  p.status = 'Paid';
  if (p.method === '—') p.method = 'Cash';
  savePayments();
  applyFiltersAndRender();
  showToast(`Transaction ${p.id} marked as PAID.`, 'success');
}

// ================= EDIT PAYMENT MODAL =================
function openEditPaymentModal(paymentId) {
  closeAllKebabMenus();
  closePaymentDetailsModal();

  const p = payments.find(item => item.id === paymentId);
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
  activePayment = null;
}

function handleSaveEditPayment(event) {
  event.preventDefault();
  if (!activePayment) return;

  const amtInput = document.getElementById('editAmount');
  const methodSelect = document.getElementById('editMethod');
  const statusSelect = document.getElementById('editStatus');
  const notesInput = document.getElementById('editNotes');

  activePayment.amount = amtInput ? parseFloat(amtInput.value) || activePayment.amount : activePayment.amount;
  activePayment.method = methodSelect ? methodSelect.value : activePayment.method;
  activePayment.status = statusSelect ? statusSelect.value : activePayment.status;
  activePayment.notes = notesInput ? notesInput.value.trim() : activePayment.notes;

  const idx = payments.findIndex(item => item.id === activePayment.id);
  if (idx !== -1) {
    payments[idx] = activePayment;
    savePayments();
  }

  applyFiltersAndRender();
  closeEditPaymentModal();
  showToast(`Transaction ${activePayment.id} updated successfully!`, 'success');
}

// ================= REFUND MODAL =================
function openRefundModal(paymentId) {
  closeAllKebabMenus();
  const p = payments.find(item => item.id === paymentId);
  if (!p) return;

  activePayment = p;

  const targetName = document.getElementById('refundCustomerTarget');
  const targetAmt = document.getElementById('refundAmountTarget');

  if (targetName) targetName.textContent = p.customer;
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
  activePayment = null;
}

function handleConfirmRefund() {
  if (!activePayment) return;

  activePayment.status = 'Refunded';
  activePayment.notes = `Refund of ₱${activePayment.amount} processed on Sept 23. ` + (activePayment.notes || '');

  const idx = payments.findIndex(item => item.id === activePayment.id);
  if (idx !== -1) {
    payments[idx] = activePayment;
    savePayments();
  }

  applyFiltersAndRender();
  closeRefundModal();
  showToast(`Transaction ${activePayment.id} has been marked as REFUNDED.`, 'info');
}

// ================= MODAL HELPERS =================
function closeAllModals() {
  const modalIds = [
    'paymentDetailsModal',
    'receiptModal',
    'recordPaymentModal',
    'editPaymentModal',
    'refundModal',
    'logoutModal'
  ];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
  closeAllKebabMenus();
}

// Mobile sidebar toggle
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

// Logout Modal
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

// Toast notification
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

// Real-time clock badge
function updateTimeBadge() {
  const clockEl = document.getElementById('topClockDisplay');
  if (!clockEl) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  clockEl.textContent = `${dateStr} · ${timeStr}`;

  setTimeout(updateTimeBadge, 1000);
}
