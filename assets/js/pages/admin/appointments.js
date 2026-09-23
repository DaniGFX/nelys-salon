/**
 * Nely's Salon — Admin Appointments Management Script
 * Handles real-time search, multi-criteria filtering (Date, Status, Staff, Service),
 * KPI counter updates, appointment details modal, manual booking creation,
 * editing, quick status confirmation, rescheduling, cancellation, and deletion.
 */

// Master Appointments Dataset
let appointmentsData = [
  {
    id: "NS-20260923-01",
    customer: "Maria Santos",
    phone: "0917 888 9999",
    service: "Haircut",
    price: 250,
    priceFormatted: "₱250",
    staff: "Nely",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "9:00 AM",
    status: "confirmed",
    paymentStatus: "Paid",
    paymentMethod: "GCash",
    notes: "Customer requested shoulder-length haircut."
  },
  {
    id: "NS-20260923-02",
    customer: "Angela Cruz",
    phone: "0918 123 4567",
    service: "Hair Color",
    price: 850,
    priceFormatted: "₱850",
    staff: "Ana",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "10:30 AM",
    status: "pending",
    paymentStatus: "Unpaid",
    paymentMethod: "Cash",
    notes: "Preferred ash brown tone with subtle highlights."
  },
  {
    id: "NS-20260923-03",
    customer: "Jamie Reyes",
    phone: "0920 444 5555",
    service: "Manicure",
    price: 300,
    priceFormatted: "₱300",
    staff: "Nely",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "1:00 PM",
    status: "pending",
    paymentStatus: "Partial",
    paymentMethod: "GCash",
    notes: "Classic French tip with gel coating."
  },
  {
    id: "NS-20260923-04",
    customer: "Carla Dela Cruz",
    phone: "0919 777 8888",
    service: "Hair Treatment",
    price: 600,
    priceFormatted: "₱600",
    staff: "Ana",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "3:00 PM",
    status: "confirmed",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
    notes: "Intense deep conditioning for damaged ends."
  },
  {
    id: "NS-20260923-05",
    customer: "Patricia Lim",
    phone: "0925 333 4444",
    service: "Haircut",
    price: 250,
    priceFormatted: "₱250",
    staff: "Nely",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "4:00 PM",
    status: "confirmed",
    paymentStatus: "Paid",
    paymentMethod: "GCash",
    notes: "Regular trim and styling before dinner."
  },
  {
    id: "NS-20260923-06",
    customer: "Bea Gomez",
    phone: "0917 555 6677",
    service: "Pedicure",
    price: 350,
    priceFormatted: "₱350",
    staff: "Elena",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "4:30 PM",
    status: "confirmed",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
    notes: "Foot spa and nail clean."
  },
  {
    id: "NS-20260923-07",
    customer: "Clarisse Tan",
    phone: "0915 222 1199",
    service: "Hair Treatment",
    price: 600,
    priceFormatted: "₱600",
    staff: "Ana",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "5:30 PM",
    status: "confirmed",
    paymentStatus: "Paid",
    paymentMethod: "GCash",
    notes: "Keratin smooth express session."
  },
  {
    id: "NS-20260923-08",
    customer: "Janine Mercado",
    phone: "0917 666 8899",
    service: "Manicure",
    price: 300,
    priceFormatted: "₱300",
    staff: "Elena",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "6:00 PM",
    status: "confirmed",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
    notes: "Nude pink gel polish."
  },
  {
    id: "NS-20260923-09",
    customer: "Kristine David",
    phone: "0921 777 0011",
    service: "Hair Color",
    price: 850,
    priceFormatted: "₱850",
    staff: "Ana",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "6:30 PM",
    status: "confirmed",
    paymentStatus: "Paid",
    paymentMethod: "GCash",
    notes: "Root retouch."
  },
  {
    id: "NS-20260923-10",
    customer: "Chloe Valenzuela",
    phone: "0927 999 8822",
    service: "Haircut",
    price: 250,
    priceFormatted: "₱250",
    staff: "Nely",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "7:00 PM",
    status: "pending",
    paymentStatus: "Unpaid",
    paymentMethod: "Cash",
    notes: "Waiting for confirmation via phone."
  },
  {
    id: "NS-20260923-11",
    customer: "Grace Ocampo",
    phone: "0918 333 9922",
    service: "Manicure",
    price: 300,
    priceFormatted: "₱300",
    staff: "Elena",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "7:30 PM",
    status: "pending",
    paymentStatus: "Unpaid",
    paymentMethod: "GCash",
    notes: "Evening appointment after office."
  },
  {
    id: "NS-20260923-12",
    customer: "Melissa Garcia",
    phone: "0922 111 4455",
    service: "Pedicure",
    price: 350,
    priceFormatted: "₱350",
    staff: "Elena",
    date: "2026-09-23",
    dateFormatted: "Sept 23, 2026",
    time: "7:45 PM",
    status: "pending",
    paymentStatus: "Unpaid",
    paymentMethod: "Cash",
    notes: "Walk-in slot inquiry."
  },
  {
    id: "NS-20260922-01",
    customer: "Sophia Reyes",
    phone: "0922 999 1111",
    service: "Pedicure",
    price: 350,
    priceFormatted: "₱350",
    staff: "Nely",
    date: "2026-09-22",
    dateFormatted: "Sept 22, 2026",
    time: "2:00 PM",
    status: "completed",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
    notes: "Footspa package upgrade availed."
  },
  {
    id: "NS-20260922-02",
    customer: "Diana Ross",
    phone: "0916 444 2233",
    service: "Haircut",
    price: 250,
    priceFormatted: "₱250",
    staff: "Ana",
    date: "2026-09-22",
    dateFormatted: "Sept 22, 2026",
    time: "11:00 AM",
    status: "completed",
    paymentStatus: "Paid",
    paymentMethod: "GCash",
    notes: "Layered cut with bangs."
  },
  {
    id: "NS-20260922-03",
    customer: "Karen Villanueva",
    phone: "0915 888 7766",
    service: "Hair Color",
    price: 850,
    priceFormatted: "₱850",
    staff: "Ana",
    date: "2026-09-22",
    dateFormatted: "Sept 22, 2026",
    time: "1:30 PM",
    status: "completed",
    paymentStatus: "Paid",
    paymentMethod: "GCash",
    notes: "Full chocolate brown tone."
  },
  {
    id: "NS-20260921-01",
    customer: "Regina George",
    phone: "0917 111 2233",
    service: "Hair Treatment",
    price: 600,
    priceFormatted: "₱600",
    staff: "Nely",
    date: "2026-09-21",
    dateFormatted: "Sept 21, 2026",
    time: "10:00 AM",
    status: "completed",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
    notes: "Brazilian keratin treatment."
  },
  {
    id: "NS-20260921-02",
    customer: "Jessica Alba",
    phone: "0918 888 4455",
    service: "Manicure",
    price: 300,
    priceFormatted: "₱300",
    staff: "Elena",
    date: "2026-09-21",
    dateFormatted: "Sept 21, 2026",
    time: "3:30 PM",
    status: "cancelled",
    paymentStatus: "Unpaid",
    paymentMethod: "GCash",
    notes: "Cancelled by client due to personal emergency."
  },
  {
    id: "NS-20260920-01",
    customer: "Camille Flores",
    phone: "0920 666 3322",
    service: "Hair Color",
    price: 850,
    priceFormatted: "₱850",
    staff: "Ana",
    date: "2026-09-20",
    dateFormatted: "Sept 20, 2026",
    time: "2:00 PM",
    status: "cancelled",
    paymentStatus: "Unpaid",
    paymentMethod: "Cash",
    notes: "Rescheduled to a later date."
  }
];

// Add additional mock completed records to match the 18 completed requirement
const additionalCompleted = [
  "Rochelle Pineda", "Lorna Tolentino", "Gretchen Barretto", "Sarah Geronimo",
  "Anne Curtis", "Judy Ann Santos", "Marian Rivera", "Kathryn Bernardo",
  "Liza Soberano", "Nadine Lustre", "Bea Alonzo", "Angel Locsin",
  "Heart Evangelista", "Catriona Gray"
];

additionalCompleted.forEach((name, idx) => {
  appointmentsData.push({
    id: `NS-2026091${idx}-C${idx}`,
    customer: name,
    phone: `0917 ${String(idx * 77).padStart(3, '0')} 1234`,
    service: idx % 2 === 0 ? "Haircut" : "Manicure",
    price: idx % 2 === 0 ? 250 : 300,
    priceFormatted: idx % 2 === 0 ? "₱250" : "₱300",
    staff: idx % 3 === 0 ? "Nely" : (idx % 3 === 1 ? "Ana" : "Elena"),
    date: `2026-09-${String(10 + idx).padStart(2, '0')}`,
    dateFormatted: `Sept ${10 + idx}, 2026`,
    time: "11:00 AM",
    status: "completed",
    paymentStatus: "Paid",
    paymentMethod: "GCash",
    notes: "Completed session with salon loyalty stamp awarded."
  });
});

// Active Filter State
let filterState = {
  search: "",
  date: "all",
  status: "all",
  staff: "all",
  service: "all",
  customDate: ""
};

// Active Pagination State (10 appointments per page)
let paginationState = {
  currentPage: 1,
  pageSize: 10
};

let currentActionAppointmentId = null;

// Steady Background Lock & Modal System
let isApptModalScrollLocked = false;

function onPreventApptBackgroundWheel(e) {
  const scrollable = e.target.closest('dialog, .overflow-y-auto');
  if (scrollable) {
    const isScrollingDown = e.deltaY > 0;
    const canScrollDown = scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 1;
    const canScrollUp = scrollable.scrollTop > 0;

    if ((isScrollingDown && canScrollDown) || (!isScrollingDown && canScrollUp)) {
      return;
    }
  }

  e.preventDefault();
}

function onPreventApptBackgroundTouch(e) {
  const scrollable = e.target.closest('dialog, .overflow-y-auto');
  if (!scrollable) {
    e.preventDefault();
  }
}

function onPreventApptBackgroundKeys(e) {
  const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (scrollKeys.includes(e.key)) {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (!isInput) {
      e.preventDefault();
    }
  }
}

function lockBodyScroll() {
  if (isApptModalScrollLocked) return;
  isApptModalScrollLocked = true;
  document.body.classList.add('modal-open');
  window.addEventListener('wheel', onPreventApptBackgroundWheel, { passive: false });
  window.addEventListener('touchmove', onPreventApptBackgroundTouch, { passive: false });
  window.addEventListener('keydown', onPreventApptBackgroundKeys, { passive: false });
}

function unlockBodyScroll() {
  const anyOpen = document.querySelector('dialog[open], .fixed.inset-0.z-50.flex');
  if (anyOpen) return;

  isApptModalScrollLocked = false;
  document.body.classList.remove('modal-open');
  window.removeEventListener('wheel', onPreventApptBackgroundWheel);
  window.removeEventListener('touchmove', onPreventApptBackgroundTouch);
  window.removeEventListener('keydown', onPreventApptBackgroundKeys);
}

function setupDialogSteadyListeners() {
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('close', () => unlockBodyScroll());
    dlg.addEventListener('cancel', () => unlockBodyScroll());

    // Dismiss dialog cleanly when clicking backdrop
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderSummaryCounters();
  renderAppointmentsTable();
  setupEventListeners();
  setupDialogSteadyListeners();
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

// 2. Render KPI Summary Cards
function renderSummaryCounters() {
  const todayStr = "2026-09-23";
  const todayCount = appointmentsData.filter(a => a.date === todayStr).length;
  const pendingCount = appointmentsData.filter(a => a.status === 'pending').length;
  const confirmedCount = appointmentsData.filter(a => a.status === 'confirmed').length;
  const completedCount = appointmentsData.filter(a => a.status === 'completed').length;
  const cancelledCount = appointmentsData.filter(a => a.status === 'cancelled').length;

  const countTodayEl = document.getElementById('summaryCountToday');
  const countPendingEl = document.getElementById('summaryCountPending');
  const countConfirmedEl = document.getElementById('summaryCountConfirmed');
  const countCompletedEl = document.getElementById('summaryCountCompleted');
  const countCancelledEl = document.getElementById('summaryCountCancelled');

  if (countTodayEl) countTodayEl.textContent = todayCount;
  if (countPendingEl) countPendingEl.textContent = pendingCount;
  if (countConfirmedEl) countConfirmedEl.textContent = confirmedCount;
  if (countCompletedEl) countCompletedEl.textContent = completedCount;
  if (countCancelledEl) countCancelledEl.textContent = cancelledCount;
}

// 3. Filter and Search Logic
function handleSearchInput(e) {
  filterState.search = e.target.value.toLowerCase().trim();
  paginationState.currentPage = 1;
  renderAppointmentsTable();
}

function handleDateFilter(val) {
  filterState.date = val;
  paginationState.currentPage = 1;
  const customDateContainer = document.getElementById('customDateContainer');
  if (customDateContainer) {
    customDateContainer.classList.toggle('hidden', val !== 'custom');
  }
  renderAppointmentsTable();
}

function handleCustomDateInput(e) {
  filterState.customDate = e.target.value;
  paginationState.currentPage = 1;
  renderAppointmentsTable();
}

function handleStatusFilter(val) {
  filterState.status = val;
  paginationState.currentPage = 1;
  renderAppointmentsTable();
}

function handleStaffFilter(val) {
  filterState.staff = val;
  paginationState.currentPage = 1;
  renderAppointmentsTable();
}

function handleServiceFilter(val) {
  filterState.service = val;
  paginationState.currentPage = 1;
  renderAppointmentsTable();
}

function filterBySummaryCard(statusType) {
  paginationState.currentPage = 1;
  if (statusType === 'today') {
    filterState.date = 'today';
    filterState.status = 'all';
    const dateSelect = document.getElementById('filterDate');
    const statusSelect = document.getElementById('filterStatus');
    if (dateSelect) dateSelect.value = 'today';
    if (statusSelect) statusSelect.value = 'all';
  } else {
    filterState.status = statusType;
    filterState.date = 'all';
    const statusSelect = document.getElementById('filterStatus');
    const dateSelect = document.getElementById('filterDate');
    if (statusSelect) statusSelect.value = statusType;
    if (dateSelect) dateSelect.value = 'all';
  }
  renderAppointmentsTable();
  showToast(`Filtered table by: ${statusType.toUpperCase()}`, 'info');
}

function resetAllFilters() {
  paginationState.currentPage = 1;
  filterState = {
    search: "",
    date: "all",
    status: "all",
    staff: "all",
    service: "all",
    customDate: ""
  };

  const searchInput = document.getElementById('searchAppointmentsInput');
  const dateSelect = document.getElementById('filterDate');
  const statusSelect = document.getElementById('filterStatus');
  const staffSelect = document.getElementById('filterStaff');
  const serviceSelect = document.getElementById('filterService');
  const customDateContainer = document.getElementById('customDateContainer');

  if (searchInput) searchInput.value = "";
  if (dateSelect) dateSelect.value = "all";
  if (statusSelect) statusSelect.value = "all";
  if (staffSelect) staffSelect.value = "all";
  if (serviceSelect) serviceSelect.value = "all";
  if (customDateContainer) customDateContainer.classList.add('hidden');

  renderAppointmentsTable();
  showToast("All filters have been reset.", "info");
}

// 4. Render Table
function renderAppointmentsTable() {
  const tbody = document.getElementById('appointmentsTableBody');
  const emptyState = document.getElementById('appointmentsEmptyState');
  const countLabel = document.getElementById('tableResultsCount');
  if (!tbody) return;

  const todayStr = "2026-09-23";
  const tomorrowStr = "2026-09-24";

  const filtered = appointmentsData.filter(item => {
    // Search filter
    if (filterState.search) {
      const q = filterState.search;
      const match = item.customer.toLowerCase().includes(q) ||
        item.service.toLowerCase().includes(q) ||
        item.staff.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Status filter
    if (filterState.status !== 'all' && item.status !== filterState.status) {
      return false;
    }

    // Staff filter
    if (filterState.staff !== 'all' && item.staff !== filterState.staff) {
      return false;
    }

    // Service filter
    if (filterState.service !== 'all' && item.service !== filterState.service) {
      return false;
    }

    // Date filter
    if (filterState.date === 'today') {
      if (item.date !== todayStr) return false;
    } else if (filterState.date === 'tomorrow') {
      if (item.date !== tomorrowStr) return false;
    } else if (filterState.date === 'this_week') {
      if (!item.date.startsWith('2026-09-2')) return false;
    } else if (filterState.date === 'this_month') {
      if (!item.date.startsWith('2026-09')) return false;
    } else if (filterState.date === 'custom' && filterState.customDate) {
      if (item.date !== filterState.customDate) return false;
    }

    return true;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / paginationState.pageSize) || 1;

  if (paginationState.currentPage > totalPages) {
    paginationState.currentPage = totalPages;
  }
  if (paginationState.currentPage < 1) {
    paginationState.currentPage = 1;
  }

  const startIndex = (paginationState.currentPage - 1) * paginationState.pageSize;
  const endIndex = Math.min(startIndex + paginationState.pageSize, totalItems);
  const pageItems = filtered.slice(startIndex, endIndex);

  const paginationContainer = document.getElementById('appointmentsPaginationContainer');

  if (countLabel) {
    countLabel.textContent = totalItems === 0
      ? 'Showing 0 appointments'
      : `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} appointment${totalItems === 1 ? '' : 's'}`;
  }

  if (totalItems === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (paginationContainer) paginationContainer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (paginationContainer) paginationContainer.classList.remove('hidden');

  tbody.innerHTML = pageItems.map(item => {
    let statusBadge = '';
    if (item.status === 'confirmed') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        Confirmed
      </span>`;
    } else if (item.status === 'pending') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        Pending
      </span>`;
    } else if (item.status === 'completed') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
        <i class="fa-solid fa-circle-check text-[11px] text-blue-600"></i>
        Completed
      </span>`;
    } else if (item.status === 'cancelled') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <i class="fa-solid fa-circle-xmark text-[11px] text-rose-600"></i>
        Cancelled
      </span>`;
    }

    // Format date & time nicely
    const shortDate = item.dateFormatted.replace(', 2026', '');

    return `
      <tr class="hover:bg-[#FAF6F0]/40 transition-colors group">
        <!-- Date & Time -->
        <td class="py-4 px-4 whitespace-nowrap">
          <div class="font-bold text-[#541A1A]">${shortDate}, ${item.time}</div>
          <span class="text-[11px] font-mono text-[#735e5e] block">${item.id}</span>
        </td>

        <!-- Customer -->
        <td class="py-4 px-4 whitespace-nowrap">
          <div class="font-bold text-[#541A1A]">${escapeHtml(item.customer)}</div>
          <span class="text-[11px] text-[#735e5e] flex items-center gap-1">
            <i class="fa-solid fa-phone text-[10px] text-[#810B38]"></i>
            ${item.phone}
          </span>
        </td>

        <!-- Service -->
        <td class="py-4 px-4">
          <span class="font-bold text-[#810B38] block">${escapeHtml(item.service)}</span>
          <span class="text-[11px] text-[#735e5e] line-clamp-1">${escapeHtml(item.notes || 'Standard treatment')}</span>
        </td>

        <!-- Staff -->
        <td class="py-4 px-4 whitespace-nowrap">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FAF6F0] border border-[#DCC3AA] font-bold text-xs text-[#541A1A]">
            <i class="fa-solid fa-scissors text-[10px] text-[#810B38]"></i>
            ${escapeHtml(item.staff)}
          </span>
        </td>

        <!-- Price -->
        <td class="py-4 px-4 whitespace-nowrap">
          <span class="font-serif text-base font-extrabold text-[#810B38]">${item.priceFormatted}</span>
          <span class="block text-[10px] uppercase font-bold text-[#735e5e]">${item.paymentStatus}</span>
        </td>

        <!-- Status -->
        <td class="py-4 px-4 whitespace-nowrap">
          ${statusBadge}
        </td>

        <!-- Action (⋮ Kebab Menu) -->
        <td class="py-4 px-4 text-right relative whitespace-nowrap">
          <div class="inline-block text-left">
            <button 
              type="button" 
              onclick="toggleRowKebabMenu('${item.id}', event)"
              class="w-8 h-8 rounded-xl bg-[#FAF6F0] hover:bg-[#810B38] text-[#541A1A] hover:text-white border border-[#DCC3AA] flex items-center justify-center transition-colors shadow-sm focus:outline-none"
              title="Actions for ${item.customer}">
              <i class="fa-solid fa-ellipsis-vertical text-sm"></i>
            </button>

            <!-- Kebab Action Dropdown Menu -->
            <div 
              id="kebabMenu-${item.id}" 
              class="kebab-dropdown-menu hidden absolute right-4 mt-1 w-48 rounded-2xl bg-white border border-[#DCC3AA] shadow-2xl py-1.5 z-30 text-left">
              
              <!-- 1. View Details -->
              <button 
                type="button" 
                onclick="openViewDetailsModal('${item.id}')"
                class="w-full px-4 py-2 text-xs font-semibold text-[#541A1A] hover:bg-[#FAF6F0] flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-eye text-[#810B38] w-4 text-center"></i>
                <span>View Details</span>
              </button>

              <!-- 2. Edit Appointment -->
              <button 
                type="button" 
                onclick="openEditModal('${item.id}')"
                class="w-full px-4 py-2 text-xs font-semibold text-[#541A1A] hover:bg-[#FAF6F0] flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-pen text-[#810B38] w-4 text-center"></i>
                <span>Edit Appointment</span>
              </button>

              <!-- 3. Confirm (If not confirmed) -->
              ${item.status !== 'confirmed' && item.status !== 'completed' ? `
                <button 
                  type="button" 
                  onclick="confirmAppointment('${item.id}')"
                  class="w-full px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-circle-check text-emerald-600 w-4 text-center"></i>
                  <span>Confirm</span>
                </button>
              ` : ''}

              <!-- 4. Reschedule -->
              <button 
                type="button" 
                onclick="openRescheduleModal('${item.id}')"
                class="w-full px-4 py-2 text-xs font-semibold text-[#541A1A] hover:bg-[#FAF6F0] flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-repeat text-[#810B38] w-4 text-center"></i>
                <span>Reschedule</span>
              </button>

              <!-- 5. Cancel -->
              ${item.status !== 'cancelled' ? `
                <button 
                  type="button" 
                  onclick="openCancelModal('${item.id}')"
                  class="w-full px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-ban text-rose-600 w-4 text-center"></i>
                  <span>Cancel</span>
                </button>
              ` : ''}

              <div class="border-t border-[#F1E2D1] my-1"></div>

              <!-- 6. Delete -->
              <button 
                type="button" 
                onclick="openDeleteModal('${item.id}')"
                class="w-full px-4 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-trash-can text-rose-600 w-4 text-center"></i>
                <span>Delete</span>
              </button>

            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPaginationControls(totalItems, totalPages, startIndex, endIndex);
}

// Render Pagination Controls (10 records per page)
function renderPaginationControls(totalItems, totalPages, startIndex, endIndex) {
  const startEl = document.getElementById('paginationStartCount');
  const endEl = document.getElementById('paginationEndCount');
  const totalEl = document.getElementById('paginationTotalCount');
  const controls = document.getElementById('paginationControls');

  if (startEl) startEl.textContent = totalItems > 0 ? startIndex + 1 : 0;
  if (endEl) endEl.textContent = endIndex;
  if (totalEl) totalEl.textContent = totalItems;

  if (!controls) return;

  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }

  let html = '';

  // Prev Button
  const isPrevDisabled = paginationState.currentPage === 1;
  html += `
    <button 
      type="button" 
      onclick="changePage(${paginationState.currentPage - 1})"
      ${isPrevDisabled ? 'disabled' : ''}
      class="px-3 py-1.5 rounded-xl border ${isPrevDisabled ? 'border-[#DCC3AA]/40 text-stone-300 cursor-not-allowed bg-stone-50/50' : 'border-[#DCC3AA] bg-white hover:bg-[#FAF6F0] text-[#541A1A] cursor-pointer shadow-2xs'} font-semibold text-xs transition-colors flex items-center gap-1.5"
      title="Previous Page">
      <i class="fa-solid fa-chevron-left text-[10px]"></i>
      <span class="hidden sm:inline">Prev</span>
    </button>
  `;

  // Number Buttons (with ellipsis for clean UI when many pages)
  let pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (paginationState.currentPage > 3) pages.push('...');
    
    const start = Math.max(2, paginationState.currentPage - 1);
    const end = Math.min(totalPages - 1, paginationState.currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (paginationState.currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  pages.forEach(p => {
    if (p === '...') {
      html += `<span class="w-8 h-8 flex items-center justify-center text-[#735e5e] text-xs font-bold select-none">…</span>`;
    } else {
      const isActive = p === paginationState.currentPage;
      html += `
        <button 
          type="button" 
          onclick="changePage(${p})"
          class="w-8 h-8 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
            isActive 
              ? 'bg-[#810B38] text-white shadow-xs scale-105 pointer-events-none' 
              : 'bg-white hover:bg-[#FAF6F0] border border-[#DCC3AA] text-[#541A1A] cursor-pointer shadow-2xs'
          }">
          ${p}
        </button>
      `;
    }
  });

  // Next Button
  const isNextDisabled = paginationState.currentPage === totalPages;
  html += `
    <button 
      type="button" 
      onclick="changePage(${paginationState.currentPage + 1})"
      ${isNextDisabled ? 'disabled' : ''}
      class="px-3 py-1.5 rounded-xl border ${isNextDisabled ? 'border-[#DCC3AA]/40 text-stone-300 cursor-not-allowed bg-stone-50/50' : 'border-[#DCC3AA] bg-white hover:bg-[#FAF6F0] text-[#541A1A] cursor-pointer shadow-2xs'} font-semibold text-xs transition-colors flex items-center gap-1.5"
      title="Next Page">
      <span class="hidden sm:inline">Next</span>
      <i class="fa-solid fa-chevron-right text-[10px]"></i>
    </button>
  `;

  controls.innerHTML = html;
}

// Change Page Action
function changePage(page) {
  paginationState.currentPage = page;
  renderAppointmentsTable();

  // Scroll smoothly to table on page change
  const tableSection = document.getElementById('appointmentsTableBody');
  if (tableSection) {
    tableSection.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 5. Kebab Dropdown Toggle and Click Outside
function toggleRowKebabMenu(id, event) {
  event.stopPropagation();
  const allMenus = document.querySelectorAll('.kebab-dropdown-menu');
  const targetMenu = document.getElementById(`kebabMenu-${id}`);

  allMenus.forEach(menu => {
    if (menu !== targetMenu) menu.classList.add('hidden');
  });

  if (targetMenu) {
    targetMenu.classList.toggle('hidden');
  }
}

function setupEventListeners() {
  document.addEventListener('click', () => {
    const allMenus = document.querySelectorAll('.kebab-dropdown-menu');
    allMenus.forEach(menu => menu.classList.add('hidden'));
  });
}

// 6. View Details Modal
function openViewDetailsModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('detailCustomerName').textContent = item.customer;
  document.getElementById('detailCustomerPhone').textContent = item.phone;
  document.getElementById('detailDateTime').textContent = `${item.dateFormatted} at ${item.time}`;
  document.getElementById('detailService').textContent = item.service;
  document.getElementById('detailPrice').textContent = item.priceFormatted;
  document.getElementById('detailStaff').textContent = item.staff;
  document.getElementById('detailNotes').textContent = item.notes || "None specified.";
  document.getElementById('detailPayment').textContent = `${item.paymentStatus} (${item.paymentMethod})`;

  const statusBadge = document.getElementById('detailStatusBadge');
  if (statusBadge) {
    if (item.status === 'confirmed') {
      statusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300";
      statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Confirmed`;
    } else if (item.status === 'pending') {
      statusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300";
      statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pending`;
    } else if (item.status === 'completed') {
      statusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200";
      statusBadge.innerHTML = `<i class="fa-solid fa-circle-check text-xs text-blue-600"></i> Completed`;
    } else if (item.status === 'cancelled') {
      statusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200";
      statusBadge.innerHTML = `<i class="fa-solid fa-circle-xmark text-xs text-rose-600"></i> Cancelled`;
    }
  }

  const modal = document.getElementById('appointmentDetailsModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeViewDetailsModal() {
  const modal = document.getElementById('appointmentDetailsModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function openEditFromDetails() {
  closeViewDetailsModal();
  if (currentActionAppointmentId) {
    openEditModal(currentActionAppointmentId);
  }
}

// 7. Add Appointment Modal
function openAddAppointmentModal() {
  document.getElementById('addCustomerSelect').value = "Maria Santos";
  document.getElementById('addServiceSelect').value = "Haircut";
  document.getElementById('addStaffSelect').value = "Nely";
  document.getElementById('addDateInput').value = "2026-09-23";
  document.getElementById('addTimeSelect').value = "9:00 AM";
  document.getElementById('addNotesInput').value = "";
  document.getElementById('addPaymentSelect').value = "Paid";
  document.getElementById('newCustomerFields').classList.add('hidden');
  document.getElementById('btnToggleNewCustomer').textContent = "+ Add New Customer";

  const modal = document.getElementById('addAppointmentModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeAddAppointmentModal() {
  const modal = document.getElementById('addAppointmentModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function toggleNewCustomerSection() {
  const fields = document.getElementById('newCustomerFields');
  const btn = document.getElementById('btnToggleNewCustomer');
  const isHidden = fields.classList.contains('hidden');

  if (isHidden) {
    fields.classList.remove('hidden');
    btn.textContent = "- Use Existing Customer";
  } else {
    fields.classList.add('hidden');
    btn.textContent = "+ Add New Customer";
  }
}

function handleCreateAppointment(e) {
  e.preventDefault();

  const isNewCust = !document.getElementById('newCustomerFields').classList.contains('hidden');
  let customerName = document.getElementById('addCustomerSelect').value;
  let customerPhone = "0917 888 9999";

  if (isNewCust) {
    const newName = document.getElementById('newCustomerName').value.trim();
    const newPhone = document.getElementById('newCustomerPhone').value.trim();
    if (!newName) {
      showToast("Please enter customer full name.", "error");
      return;
    }
    customerName = newName;
    customerPhone = newPhone || "09XX XXX XXXX";
  }

  const service = document.getElementById('addServiceSelect').value;
  const staff = document.getElementById('addStaffSelect').value;
  const dateVal = document.getElementById('addDateInput').value;
  const time = document.getElementById('addTimeSelect').value;
  const notes = document.getElementById('addNotesInput').value.trim();
  const paymentStatus = document.getElementById('addPaymentSelect').value;

  // Price mapping
  const prices = {
    "Haircut": 250,
    "Hair Color": 850,
    "Hair Treatment": 600,
    "Manicure": 300,
    "Pedicure": 350
  };

  const price = prices[service] || 400;

  // Date formatted
  const [yyyy, mm, dd] = dateVal.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}, ${yyyy}`;

  const newAppt = {
    id: `NS-${yyyy}${mm}${dd}-${Math.floor(1000 + Math.random() * 9000)}`,
    customer: customerName,
    phone: customerPhone,
    service: service,
    price: price,
    priceFormatted: `₱${price}`,
    staff: staff,
    date: dateVal,
    dateFormatted: formattedDate,
    time: time,
    status: "confirmed",
    paymentStatus: paymentStatus,
    paymentMethod: paymentStatus === 'Paid' ? "GCash" : "Cash",
    notes: notes || "Booking manually created by admin."
  };

  appointmentsData.unshift(newAppt);
  paginationState.currentPage = 1;
  closeAddAppointmentModal();
  renderSummaryCounters();
  renderAppointmentsTable();
  showToast(`Appointment created successfully for ${customerName}!`, 'success');
}

// 8. Edit Appointment Modal
function openEditModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('editApptIdDisplay').textContent = item.id;
  document.getElementById('editCustomerName').value = item.customer;
  document.getElementById('editCustomerPhone').value = item.phone;
  document.getElementById('editServiceSelect').value = item.service;
  document.getElementById('editStaffSelect').value = item.staff;
  document.getElementById('editDateInput').value = item.date;
  document.getElementById('editTimeSelect').value = item.time;
  document.getElementById('editStatusSelect').value = item.status;
  document.getElementById('editPaymentSelect').value = item.paymentStatus;
  document.getElementById('editNotesInput').value = item.notes;

  const modal = document.getElementById('editAppointmentModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeEditModal() {
  const modal = document.getElementById('editAppointmentModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function handleSaveEdit(e) {
  e.preventDefault();
  const item = appointmentsData.find(a => a.id === currentActionAppointmentId);
  if (!item) return;

  item.customer = document.getElementById('editCustomerName').value.trim();
  item.phone = document.getElementById('editCustomerPhone').value.trim();
  item.service = document.getElementById('editServiceSelect').value;
  item.staff = document.getElementById('editStaffSelect').value;
  item.date = document.getElementById('editDateInput').value;
  item.time = document.getElementById('editTimeSelect').value;
  item.status = document.getElementById('editStatusSelect').value;
  item.paymentStatus = document.getElementById('editPaymentSelect').value;
  item.notes = document.getElementById('editNotesInput').value.trim();

  // Price update if service changed
  const prices = { "Haircut": 250, "Hair Color": 850, "Hair Treatment": 600, "Manicure": 300, "Pedicure": 350 };
  item.price = prices[item.service] || 350;
  item.priceFormatted = `₱${item.price}`;

  const [yyyy, mm, dd] = item.date.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  item.dateFormatted = `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}, ${yyyy}`;

  closeEditModal();
  renderSummaryCounters();
  renderAppointmentsTable();
  showToast(`Appointment ${item.id} updated successfully!`, 'success');
}

// 9. Confirm Appointment Action
function confirmAppointment(id) {
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  item.status = "confirmed";
  renderSummaryCounters();
  renderAppointmentsTable();
  showToast(`Appointment for ${item.customer} is now CONFIRMED!`, 'success');
}

// 10. Reschedule Appointment Modal
function openRescheduleModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('rescheduleCurrentCustomer').textContent = item.customer;
  document.getElementById('rescheduleCurrentService').textContent = item.service;
  document.getElementById('rescheduleCurrentSlot').textContent = `${item.dateFormatted} — ${item.time}`;

  // Default to tomorrow or Sept 25
  document.getElementById('rescheduleNewDate').value = "2026-09-25";
  document.getElementById('rescheduleNewTime').value = "10:30 AM";

  const modal = document.getElementById('rescheduleModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeRescheduleModal() {
  const modal = document.getElementById('rescheduleModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function handleConfirmReschedule(e) {
  e.preventDefault();
  const item = appointmentsData.find(a => a.id === currentActionAppointmentId);
  if (!item) return;

  const newDate = document.getElementById('rescheduleNewDate').value;
  const newTime = document.getElementById('rescheduleNewTime').value;

  const [yyyy, mm, dd] = newDate.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}, ${yyyy}`;

  item.date = newDate;
  item.dateFormatted = formattedDate;
  item.time = newTime;
  item.status = "confirmed"; // Rescheduled appointments are confirmed

  closeRescheduleModal();
  renderSummaryCounters();
  renderAppointmentsTable();
  showToast(`Appointment for ${item.customer} rescheduled to ${formattedDate} at ${newTime}!`, 'success');
}

// 11. Cancel Appointment Modal
function openCancelModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('cancelModalRef').textContent = `${item.id} — ${item.customer} (${item.service})`;
  const modal = document.getElementById('cancelAppointmentModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeCancelModal() {
  const modal = document.getElementById('cancelAppointmentModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function handleConfirmCancellation() {
  const item = appointmentsData.find(a => a.id === currentActionAppointmentId);
  if (!item) return;

  item.status = "cancelled";
  closeCancelModal();
  renderSummaryCounters();
  renderAppointmentsTable();
  showToast(`Appointment ${item.id} cancelled.`, 'warning');
}

// 12. Delete Appointment Modal
function openDeleteModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('deleteModalRef').textContent = `${item.id} — ${item.customer} (${item.service})`;
  const modal = document.getElementById('deleteAppointmentModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteAppointmentModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function handleConfirmDeletion() {
  const index = appointmentsData.findIndex(a => a.id === currentActionAppointmentId);
  if (index !== -1) {
    const deletedId = appointmentsData[index].id;
    appointmentsData.splice(index, 1);
    closeDeleteModal();
    renderSummaryCounters();
    renderAppointmentsTable();
    showToast(`Appointment ${deletedId} deleted permanently.`, 'info');
  }
}

// 13. Toast Notification Helper
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
