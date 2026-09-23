/**
 * Nely's Salon — Admin Dashboard Script
 * Manages KPI data, revenue timeframe filters, quick action modals,
 * schedule status updates, admin profile dropdown, and logout confirmation.
 */

// Revenue Data Sets for Timeframe Dropdown
const revenueData = {
  today: {
    label: "Today's Hourly Revenue",
    total: "₱8,450",
    bars: [
      { label: "9 AM", amount: "₱1,200", height: "35%" },
      { label: "11 AM", amount: "₱1,850", height: "55%" },
      { label: "1 PM", amount: "₱1,400", height: "42%" },
      { label: "3 PM", amount: "₱2,200", height: "68%" },
      { label: "5 PM", amount: "₱1,800", height: "52%" },
      { label: "7 PM", amount: "₱0", height: "8%" }
    ]
  },
  week: {
    label: "This Week's Daily Revenue",
    total: "₱47,850",
    bars: [
      { label: "Mon", amount: "₱4,200", height: "42%" },
      { label: "Tue", amount: "₱5,100", height: "51%" },
      { label: "Wed", amount: "₱6,800", height: "68%" },
      { label: "Thu", amount: "₱5,600", height: "56%" },
      { label: "Fri", amount: "₱8,450", height: "84%" },
      { label: "Sat", amount: "₱10,200", height: "100%" },
      { label: "Sun", amount: "₱7,500", height: "75%" }
    ]
  },
  month: {
    label: "This Month's Weekly Revenue",
    total: "₱188,400",
    bars: [
      { label: "Week 1", amount: "₱42,100", height: "78%" },
      { label: "Week 2", amount: "₱46,500", height: "86%" },
      { label: "Week 3", amount: "₱51,950", height: "96%" },
      { label: "Week 4", amount: "₱47,850", height: "88%" }
    ]
  },
  year: {
    label: "Year 2026 Quarterly Revenue",
    total: "₱1,420,000",
    bars: [
      { label: "Q1", amount: "₱320,000", height: "65%" },
      { label: "Q2", amount: "₱380,000", height: "76%" },
      { label: "Q3", amount: "₱490,000", height: "100%" },
      { label: "Q4", amount: "₱230,000", height: "46%" }
    ]
  }
};

let currentPeriod = 'week';

document.addEventListener('DOMContentLoaded', () => {
  renderRevenueChart(currentPeriod);
  setupClickOutside();
  setupDialogSteadyListeners();
});

// 1. Mobile Sidebar Toggle
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

// 2. Admin Profile Dropdown
function toggleAdminDropdown() {
  const menu = document.getElementById('adminDropdownMenu');
  if (!menu) return;
  menu.classList.toggle('hidden');
}

function setupClickOutside() {
  document.addEventListener('click', (e) => {
    const dropdownContainer = document.getElementById('adminDropdownContainer');
    const menu = document.getElementById('adminDropdownMenu');
    if (dropdownContainer && menu && !dropdownContainer.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

// 3. Revenue Period Switcher
function switchRevenuePeriod(period) {
  currentPeriod = period;
  const selectBtn = document.getElementById('revenuePeriodBtnText');
  const periodNames = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year'
  };

  if (selectBtn) {
    selectBtn.textContent = periodNames[period] || 'This Week';
  }

  // Close dropdown if open
  const dropdown = document.getElementById('revenueDropdownMenu');
  if (dropdown) dropdown.classList.add('hidden');

  renderRevenueChart(period);
  showToast(`Revenue chart updated for ${periodNames[period]}.`, 'info');
}

function toggleRevenueDropdown() {
  const dropdown = document.getElementById('revenueDropdownMenu');
  if (dropdown) dropdown.classList.toggle('hidden');
}

function renderRevenueChart(period) {
  const data = revenueData[period] || revenueData.week;
  const chartContainer = document.getElementById('revenueChartBars');
  const totalDisplay = document.getElementById('revenueTotalDisplay');
  const labelDisplay = document.getElementById('revenueChartSublabel');

  if (totalDisplay) totalDisplay.textContent = data.total;
  if (labelDisplay) labelDisplay.textContent = data.label;
  if (!chartContainer) return;

  chartContainer.innerHTML = data.bars.map((bar, index) => `
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

// Steady Background Lock & Modal System
let isDashboardModalScrollLocked = false;

function onPreventDashboardBackgroundWheel(e) {
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

function onPreventDashboardBackgroundTouch(e) {
  const scrollable = e.target.closest('dialog, .overflow-y-auto');
  if (!scrollable) {
    e.preventDefault();
  }
}

function onPreventDashboardBackgroundKeys(e) {
  const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (scrollKeys.includes(e.key)) {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (!isInput) {
      e.preventDefault();
    }
  }
}

function lockBodyScroll() {
  if (isDashboardModalScrollLocked) return;
  isDashboardModalScrollLocked = true;
  document.body.classList.add('modal-open');
  window.addEventListener('wheel', onPreventDashboardBackgroundWheel, { passive: false });
  window.addEventListener('touchmove', onPreventDashboardBackgroundTouch, { passive: false });
  window.addEventListener('keydown', onPreventDashboardBackgroundKeys, { passive: false });
}

function unlockBodyScroll() {
  const anyOpen = document.querySelector('dialog[open], .fixed.inset-0.z-50.flex');
  if (anyOpen) return;

  isDashboardModalScrollLocked = false;
  document.body.classList.remove('modal-open');
  window.removeEventListener('wheel', onPreventDashboardBackgroundWheel);
  window.removeEventListener('touchmove', onPreventDashboardBackgroundTouch);
  window.removeEventListener('keydown', onPreventDashboardBackgroundKeys);
}

function setupDialogSteadyListeners() {
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('close', () => unlockBodyScroll());
    dlg.addEventListener('cancel', () => unlockBodyScroll());

    // Dismiss dialog cleanly when clicking backdrop outside dialog card
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

// 4. Quick Action Modal Handlers
function openAddAppointmentModal() {
  const modal = document.getElementById('addAppointmentModal');
  if (modal && typeof modal.showModal === 'function') {
    // Default date to today
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

function handleCreateAppointment(e) {
  e.preventDefault();
  const customer = document.getElementById('quickApptCustomer').value.trim();
  const service = document.getElementById('quickApptService').value;
  const staff = document.getElementById('quickApptStaff').value;
  const time = document.getElementById('quickApptTime').value;

  closeAddAppointmentModal();
  showToast(`Appointment booked for ${customer} with ${staff} at ${time}!`, 'success');
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

function handleCreateCustomer(e) {
  e.preventDefault();
  const name = document.getElementById('quickCustName').value.trim();
  closeAddCustomerModal();
  showToast(`Patron ${name} registered successfully!`, 'success');
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

function handleCreateService(e) {
  e.preventDefault();
  const title = document.getElementById('quickServiceName').value.trim();
  const price = document.getElementById('quickServicePrice').value.trim();
  closeAddServiceModal();
  showToast(`Service "${title}" added with price ₱${price}!`, 'success');
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

function handleCreateStaff(e) {
  e.preventDefault();
  const name = document.getElementById('quickStaffName').value.trim();
  const role = document.getElementById('quickStaffRole').value;
  closeAddStaffModal();
  showToast(`Staff member ${name} (${role}) added successfully!`, 'success');
}

// 5. Notifications Modal
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

// 6. Logout Modal
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
  setTimeout(() => {
    window.location.href = '../login.html';
  }, 400);
}

// 7. Toast Notification System
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
