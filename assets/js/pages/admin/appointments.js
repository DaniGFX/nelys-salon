/**
 * Nely's Salon — Admin Appointments Management Script
 * Connected directly to the backend database API (/api/bookings)
 * Handles real-time search, multi-criteria filtering (Date, Status, Staff, Service),
 * live KPI summary counters, appointment details modal, dynamic customer/service/staff dropdowns,
 * manual booking creation, editing, quick confirmation, rescheduling, cancellation, and deletion.
 */

// Live Global State
let appointmentsData = [];
let servicesList = [];
let staffList = [];
let customersList = [];
let summaryMetrics = {
  today: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
  total: 0
};

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
let isApptModalScrollLocked = false;

// ================= INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupEventListeners();
  setupDialogSteadyListeners();
  fetchAppointments();
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
      console.warn('Error reading admin profile:', e);
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

// Helper to get auth header
function getAuthHeaders() {
  const token = localStorage.getItem('nelys_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// Helper to get local YYYY-MM-DD
function getLocalDateString(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper to format date string to human readable (e.g. Sept 25, 2026)
function formatDateString(dateStr) {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const year = parts[0];
  return `${months[monthIdx] || ''} ${day}, ${year}`;
}

// Helper to format time string (e.g. 09:00:00 -> 9:00 AM)
function formatTimeString(timeStr) {
  if (!timeStr) return '';
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

// ================= FETCH LIVE APPOINTMENTS FROM BACKEND =================
async function fetchAppointments() {
  const tbody = document.getElementById('appointmentsTableBody');
  if (tbody && appointmentsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-[#735e5e]">
          <div class="inline-flex items-center gap-2 font-semibold">
            <i class="fa-solid fa-spinner fa-spin text-[#810B38]"></i>
            <span>Loading live appointments from database...</span>
          </div>
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('../api/bookings', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      showToast('Session expired. Redirecting to login...', 'warning');
      setTimeout(() => { window.location.href = '../login.html'; }, 1200);
      return;
    }

    const result = await res.json();
    if (result.success && result.data) {
      const rawBookings = result.data.bookings || [];
      servicesList = result.data.services || [];
      staffList = result.data.staff || [];
      customersList = result.data.customers || [];
      summaryMetrics = result.data.summary || summaryMetrics;

      // Normalize bookings
      appointmentsData = rawBookings.map(b => {
        const rawDate = b.booking_date || '';
        const rawTime = b.booking_time || '';
        const rawStatus = (b.status || 'pending').toLowerCase();
        const rawPaymentStatus = (b.payment_status || 'pending').toLowerCase();
        const priceNum = parseFloat(b.total_price || 0);

        return {
          id: b.id,
          reference_no: b.reference_no,
          displayId: b.reference_no || `APPT-${String(b.id).padStart(5, '0')}`,
          customer_id: b.customer_id,
          customer: b.customer_name || (b.customer_email ? b.customer_email.split('@')[0] : 'Patron'),
          phone: b.customer_phone || b.phone || 'N/A',
          email: b.customer_email || b.email || '',
          service_id: b.service_id,
          service: b.service_name || 'Salon Service',
          price: priceNum,
          priceFormatted: `₱${priceNum.toLocaleString()}`,
          staff_id: b.staff_id,
          staff: b.staff_name || 'Unassigned',
          date: rawDate,
          dateFormatted: formatDateString(rawDate),
          time: formatTimeString(rawTime),
          rawTime: rawTime,
          status: rawStatus,
          paymentStatus: rawPaymentStatus === 'paid' ? 'Paid' : (rawPaymentStatus === 'partial' ? 'Partial' : 'Unpaid'),
          paymentMethod: b.payment_method ? (b.payment_method.toUpperCase() === 'GCASH' ? 'GCash' : (b.payment_method.toLowerCase() === 'bank_transfer' ? 'Bank Transfer' : 'Cash')) : 'Cash',
          notes: b.notes || '',
          visit_type: b.visit_type || 'salon',
          home_address: b.home_address || ''
        };
      });

      populateDropdowns();
      renderSummaryCounters();
      renderAppointmentsTable();
      updateSidebarBadges();
    } else {
      showToast(result.message || 'Failed to load appointments.', 'error');
    }
  } catch (error) {
    console.error('Error fetching appointments:', error);
    showToast('Failed to connect to backend server. Please verify MySQL/Apache are active.', 'error');
  }
}

// ================= POPULATE DYNAMIC SELECT DROPDOWNS =================
function populateDropdowns() {
  // 1. Staff Filter Dropdown
  const filterStaff = document.getElementById('filterStaff');
  if (filterStaff) {
    const currentVal = filterStaff.value;
    let opts = '<option value="all">Staff: All Staff</option>';
    staffList.forEach(st => {
      opts += `<option value="${escapeHtml(st.name)}">Staff: ${escapeHtml(st.name)}</option>`;
    });
    filterStaff.innerHTML = opts;
    if (currentVal && filterStaff.querySelector(`option[value="${currentVal}"]`)) {
      filterStaff.value = currentVal;
    }
  }

  // 2. Service Filter Dropdown
  const filterService = document.getElementById('filterService');
  if (filterService) {
    const currentVal = filterService.value;
    let opts = '<option value="all">Service: All Services</option>';
    servicesList.forEach(svc => {
      opts += `<option value="${escapeHtml(svc.name)}">${escapeHtml(svc.name)}</option>`;
    });
    filterService.innerHTML = opts;
    if (currentVal && filterService.querySelector(`option[value="${currentVal}"]`)) {
      filterService.value = currentVal;
    }
  }

  // 3. Add Modal: Customer Select
  const addCustomerSelect = document.getElementById('addCustomerSelect');
  if (addCustomerSelect) {
    let opts = '<option value="" disabled selected>Select a patron...</option>';
    customersList.forEach(cust => {
      const name = cust.full_name || cust.email.split('@')[0];
      const contact = cust.phone || cust.email || '';
      opts += `<option value="${cust.user_id}" data-name="${escapeHtml(name)}" data-phone="${escapeHtml(cust.phone || '')}">${escapeHtml(name)} ${contact ? `(${escapeHtml(contact)})` : ''}</option>`;
    });
    addCustomerSelect.innerHTML = opts;
  }

  // 4. Add Modal: Service Select
  const addServiceSelect = document.getElementById('addServiceSelect');
  if (addServiceSelect) {
    let opts = '<option value="" disabled selected>Select service...</option>';
    servicesList.forEach(svc => {
      opts += `<option value="${svc.id}" data-price="${svc.price}" data-name="${escapeHtml(svc.name)}">${escapeHtml(svc.name)} (₱${Number(svc.price).toLocaleString()})</option>`;
    });
    addServiceSelect.innerHTML = opts;
  }

  // 5. Add Modal: Staff Select
  const addStaffSelect = document.getElementById('addStaffSelect');
  if (addStaffSelect) {
    let opts = '<option value="">Any Available Staff</option>';
    staffList.forEach(st => {
      opts += `<option value="${st.id}">${escapeHtml(st.name)} (${escapeHtml(st.role || 'Stylist')})</option>`;
    });
    addStaffSelect.innerHTML = opts;
  }

  // 6. Edit Modal: Service Select
  const editServiceSelect = document.getElementById('editServiceSelect');
  if (editServiceSelect) {
    let opts = '<option value="" disabled>Select service...</option>';
    servicesList.forEach(svc => {
      opts += `<option value="${svc.id}" data-price="${svc.price}" data-name="${escapeHtml(svc.name)}">${escapeHtml(svc.name)} (₱${Number(svc.price).toLocaleString()})</option>`;
    });
    editServiceSelect.innerHTML = opts;
  }

  // 7. Edit Modal: Staff Select
  const editStaffSelect = document.getElementById('editStaffSelect');
  if (editStaffSelect) {
    let opts = '<option value="">Unassigned</option>';
    staffList.forEach(st => {
      opts += `<option value="${st.id}">${escapeHtml(st.name)} (${escapeHtml(st.role || 'Stylist')})</option>`;
    });
    editStaffSelect.innerHTML = opts;
  }
}

// ================= RENDER KPI SUMMARY CARDS =================
function renderSummaryCounters() {
  const todayStr = getLocalDateString();
  const todayCount = appointmentsData.filter(a => a.date === todayStr).length;
  const pendingCount = appointmentsData.filter(a => a.status === 'pending').length;
  const confirmedCount = appointmentsData.filter(a => a.status === 'confirmed').length;
  const completedCount = appointmentsData.filter(a => a.status === 'completed').length;
  const cancelledCount = appointmentsData.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;

  const countTodayEl = document.getElementById('summaryCountToday');
  const countPendingEl = document.getElementById('summaryCountPending');
  const countConfirmedEl = document.getElementById('summaryCountConfirmed');
  const countCompletedEl = document.getElementById('summaryCountCompleted');
  const countCancelledEl = document.getElementById('summaryCountCancelled');

  if (countTodayEl) countTodayEl.textContent = summaryMetrics.today !== undefined ? summaryMetrics.today : todayCount;
  if (countPendingEl) countPendingEl.textContent = summaryMetrics.pending !== undefined ? summaryMetrics.pending : pendingCount;
  if (countConfirmedEl) countConfirmedEl.textContent = summaryMetrics.confirmed !== undefined ? summaryMetrics.confirmed : confirmedCount;
  if (countCompletedEl) countCompletedEl.textContent = summaryMetrics.completed !== undefined ? summaryMetrics.completed : completedCount;
  if (countCancelledEl) countCancelledEl.textContent = summaryMetrics.cancelled !== undefined ? summaryMetrics.cancelled : cancelledCount;
}

async function updateSidebarBadges() {
  const pendingCount = appointmentsData.filter(a => a.status === 'pending').length;
  const apptBadge = document.getElementById('sidebarAppointmentsBadge');
  if (apptBadge) {
    if (pendingCount > 0) {
      apptBadge.textContent = pendingCount;
      apptBadge.classList.remove('hidden');
      apptBadge.style.display = '';
    } else {
      apptBadge.textContent = '0';
      apptBadge.classList.add('hidden');
      apptBadge.style.display = 'none';
    }
  }

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
        const bNotif = document.getElementById('sidebarNotificationsBadge');
        const bMsg = document.getElementById('sidebarMessagesBadge');
        const notifCount = parseInt(d.unread_notifications ?? 0, 10);
        const msgCount = parseInt(d.unread_messages ?? 0, 10);

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
  } catch (e) {}
}

// ================= FILTER AND SEARCH LOGIC =================
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

// ================= RENDER APPOINTMENTS TABLE =================
function renderAppointmentsTable() {
  const tbody = document.getElementById('appointmentsTableBody');
  const emptyState = document.getElementById('appointmentsEmptyState');
  const countLabel = document.getElementById('tableResultsCount');
  if (!tbody) return;

  const todayStr = getLocalDateString();
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrowObj);
  const currentMonthPrefix = todayStr.substring(0, 7);

  const filtered = appointmentsData.filter(item => {
    // Search filter
    if (filterState.search) {
      const q = filterState.search;
      const match = (item.customer && item.customer.toLowerCase().includes(q)) ||
        (item.service && item.service.toLowerCase().includes(q)) ||
        (item.staff && item.staff.toLowerCase().includes(q)) ||
        (item.displayId && item.displayId.toLowerCase().includes(q)) ||
        (item.phone && item.phone.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status filter
    if (filterState.status !== 'all') {
      if (filterState.status === 'cancelled') {
        if (item.status !== 'cancelled' && item.status !== 'no_show') return false;
      } else if (item.status !== filterState.status) {
        return false;
      }
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
      const itemDate = new Date(item.date);
      const now = new Date();
      const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
      if (itemDate < firstDayOfWeek || itemDate > lastDayOfWeek) return false;
    } else if (filterState.date === 'this_month') {
      if (!item.date || !item.date.startsWith(currentMonthPrefix)) return false;
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
    } else {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <i class="fa-solid fa-circle-xmark text-[11px] text-rose-600"></i>
        ${item.status === 'no_show' ? 'No Show' : 'Cancelled'}
      </span>`;
    }

    return `
      <tr class="hover:bg-[#FAF6F0]/40 transition-colors group">
        <!-- Date & Time -->
        <td class="py-4 px-4 whitespace-nowrap">
          <div class="font-bold text-[#541A1A]">${escapeHtml(item.dateFormatted)}, ${escapeHtml(item.time)}</div>
          <span class="text-[11px] font-mono text-[#735e5e] block">${escapeHtml(item.displayId)}</span>
        </td>

        <!-- Customer -->
        <td class="py-4 px-4 whitespace-nowrap">
          <div class="font-bold text-[#541A1A]">${escapeHtml(item.customer)}</div>
          <span class="text-[11px] text-[#735e5e] flex items-center gap-1">
            <i class="fa-solid fa-phone text-[10px] text-[#810B38]"></i>
            ${escapeHtml(item.phone)}
          </span>
        </td>

        <!-- Service -->
        <td class="py-4 px-4">
          <span class="font-bold text-[#810B38] block">${escapeHtml(item.service)}</span>
          <span class="text-[11px] text-[#735e5e] line-clamp-1">${escapeHtml(item.notes || (item.visit_type === 'home' ? 'Home Service Appointment' : 'Salon Visit'))}</span>
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
          <span class="font-serif text-base font-extrabold text-[#810B38]">${escapeHtml(item.priceFormatted)}</span>
          <span class="block text-[10px] uppercase font-bold text-[#735e5e]">${escapeHtml(item.paymentStatus)} (${escapeHtml(item.paymentMethod)})</span>
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
              onclick="toggleRowKebabMenu(${item.id}, event)"
              class="w-8 h-8 rounded-xl bg-[#FAF6F0] hover:bg-[#810B38] text-[#541A1A] hover:text-white border border-[#DCC3AA] flex items-center justify-center transition-colors shadow-sm focus:outline-none"
              title="Actions for ${escapeHtml(item.customer)}">
              <i class="fa-solid fa-ellipsis-vertical text-sm"></i>
            </button>

            <!-- Kebab Action Dropdown Menu -->
            <div 
              id="kebabMenu-${item.id}" 
              class="kebab-dropdown-menu hidden absolute right-4 mt-1 w-48 rounded-2xl bg-white border border-[#DCC3AA] shadow-2xl py-1.5 z-30 text-left">
              
              <!-- 1. View Details -->
              <button 
                type="button" 
                onclick="openViewDetailsModal(${item.id})"
                class="w-full px-4 py-2 text-xs font-semibold text-[#541A1A] hover:bg-[#FAF6F0] flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-eye text-[#810B38] w-4 text-center"></i>
                <span>View Details</span>
              </button>

              <!-- 2. Edit Appointment -->
              <button 
                type="button" 
                onclick="openEditModal(${item.id})"
                class="w-full px-4 py-2 text-xs font-semibold text-[#541A1A] hover:bg-[#FAF6F0] flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-pen text-[#810B38] w-4 text-center"></i>
                <span>Edit Appointment</span>
              </button>

              <!-- 3. Confirm (If not confirmed/completed) -->
              ${item.status !== 'confirmed' && item.status !== 'completed' ? `
                <button 
                  type="button" 
                  onclick="confirmAppointment(${item.id})"
                  class="w-full px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-circle-check text-emerald-600 w-4 text-center"></i>
                  <span>Confirm</span>
                </button>
              ` : ''}

              <!-- 4. Reschedule -->
              <button 
                type="button" 
                onclick="openRescheduleModal(${item.id})"
                class="w-full px-4 py-2 text-xs font-semibold text-[#541A1A] hover:bg-[#FAF6F0] flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-repeat text-[#810B38] w-4 text-center"></i>
                <span>Reschedule</span>
              </button>

              <!-- 5. Cancel -->
              ${item.status !== 'cancelled' && item.status !== 'no_show' ? `
                <button 
                  type="button" 
                  onclick="openCancelModal(${item.id})"
                  class="w-full px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-ban text-rose-600 w-4 text-center"></i>
                  <span>Cancel</span>
                </button>
              ` : ''}

              <div class="border-t border-[#F1E2D1] my-1"></div>

              <!-- 6. Delete -->
              <button 
                type="button" 
                onclick="openDeleteModal(${item.id})"
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

// ================= RENDER PAGINATION CONTROLS =================
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

  // Number Buttons
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

function changePage(page) {
  paginationState.currentPage = page;
  renderAppointmentsTable();

  const tableSection = document.getElementById('appointmentsTableBody');
  if (tableSection) {
    tableSection.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ================= KEBAB MENU HANDLING =================
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

// ================= MODAL 1: VIEW DETAILS =================
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
    } else {
      statusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200";
      statusBadge.innerHTML = `<i class="fa-solid fa-circle-xmark text-xs text-rose-600"></i> ${item.status === 'no_show' ? 'No Show' : 'Cancelled'}`;
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

// ================= MODAL 2: ADD APPOINTMENT =================
function openAddAppointmentModal() {
  const addCustomerSelect = document.getElementById('addCustomerSelect');
  if (addCustomerSelect && addCustomerSelect.options.length > 1) {
    addCustomerSelect.selectedIndex = 1;
  }
  const addServiceSelect = document.getElementById('addServiceSelect');
  if (addServiceSelect && addServiceSelect.options.length > 1) {
    addServiceSelect.selectedIndex = 1;
  }
  const addStaffSelect = document.getElementById('addStaffSelect');
  if (addStaffSelect) addStaffSelect.selectedIndex = 0;

  document.getElementById('addDateInput').value = getLocalDateString();
  document.getElementById('addTimeSelect').value = "09:00:00";
  document.getElementById('addNotesInput').value = "";
  document.getElementById('addPaymentSelect').value = "paid";
  document.getElementById('newCustomerFields').classList.add('hidden');
  document.getElementById('newCustomerName').value = "";
  document.getElementById('newCustomerPhone').value = "";
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

async function handleCreateAppointment(e) {
  e.preventDefault();

  const isNewCust = !document.getElementById('newCustomerFields').classList.contains('hidden');
  let customerId = null;
  let clientName = null;
  let clientPhone = null;

  if (isNewCust) {
    clientName = document.getElementById('newCustomerName').value.trim();
    clientPhone = document.getElementById('newCustomerPhone').value.trim();
    if (!clientName) {
      showToast("Please enter customer full name.", "error");
      return;
    }
  } else {
    const custSelect = document.getElementById('addCustomerSelect');
    if (!custSelect.value) {
      showToast("Please select a customer or add a new patron.", "error");
      return;
    }
    customerId = parseInt(custSelect.value, 10);
  }

  const serviceId = document.getElementById('addServiceSelect').value;
  if (!serviceId) {
    showToast("Please select a service.", "error");
    return;
  }

  const staffIdVal = document.getElementById('addStaffSelect').value;
  const staffId = staffIdVal ? parseInt(staffIdVal, 10) : null;
  const bookingDate = document.getElementById('addDateInput').value;
  const bookingTime = document.getElementById('addTimeSelect').value;
  const notes = document.getElementById('addNotesInput').value.trim();
  const paymentStatus = document.getElementById('addPaymentSelect').value;

  const payload = {
    service_id: parseInt(serviceId, 10),
    staff_id: staffId,
    booking_date: bookingDate,
    booking_time: bookingTime,
    payment_method: paymentStatus === 'paid' ? 'gcash' : 'cash',
    payment_status: paymentStatus,
    status: 'confirmed',
    notes: notes || 'Booking created by admin.',
    visit_type: 'salon'
  };

  if (isNewCust) {
    payload.client_name = clientName;
    payload.client_phone = clientPhone;
  } else {
    payload.customer_id = customerId;
  }

  try {
    const res = await fetch('../api/bookings', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeAddAppointmentModal();
      showToast('Appointment created successfully!', 'success');
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to create appointment.', 'error');
    }
  } catch (error) {
    console.error('Error creating appointment:', error);
    showToast('Network error while creating appointment.', 'error');
  }
}

// ================= MODAL 3: EDIT APPOINTMENT =================
function openEditModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('editApptIdDisplay').textContent = item.displayId;
  document.getElementById('editCustomerName').value = item.customer;
  document.getElementById('editCustomerPhone').value = item.phone === 'N/A' ? '' : item.phone;
  
  const editServiceSelect = document.getElementById('editServiceSelect');
  if (editServiceSelect) {
    if (item.service_id) {
      editServiceSelect.value = item.service_id;
    } else {
      // Find service by name
      const foundSvc = servicesList.find(s => s.name.toLowerCase() === item.service.toLowerCase());
      if (foundSvc) editServiceSelect.value = foundSvc.id;
    }
  }

  const editStaffSelect = document.getElementById('editStaffSelect');
  if (editStaffSelect) {
    editStaffSelect.value = item.staff_id || '';
  }

  document.getElementById('editDateInput').value = item.date;

  const editTimeSelect = document.getElementById('editTimeSelect');
  if (editTimeSelect) {
    // Format raw time to HH:MM:00
    let cleanTime = item.rawTime;
    if (cleanTime && cleanTime.length === 5) cleanTime += ':00';
    editTimeSelect.value = cleanTime || '09:00:00';
  }

  document.getElementById('editStatusSelect').value = item.status;
  document.getElementById('editPaymentSelect').value = item.paymentStatus.toLowerCase();
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

async function handleSaveEdit(e) {
  e.preventDefault();
  if (!currentActionAppointmentId) return;

  const customerName = document.getElementById('editCustomerName').value.trim();
  const customerPhone = document.getElementById('editCustomerPhone').value.trim();
  const serviceId = document.getElementById('editServiceSelect').value;
  const staffIdVal = document.getElementById('editStaffSelect').value;
  const bookingDate = document.getElementById('editDateInput').value;
  const bookingTime = document.getElementById('editTimeSelect').value;
  const status = document.getElementById('editStatusSelect').value;
  const paymentStatus = document.getElementById('editPaymentSelect').value;
  const notes = document.getElementById('editNotesInput').value.trim();

  // Find price from service list
  const selectedSvc = servicesList.find(s => String(s.id) === String(serviceId));
  const totalPrice = selectedSvc ? parseFloat(selectedSvc.price) : undefined;

  const payload = {
    customer_name: customerName,
    customer_phone: customerPhone,
    service_id: parseInt(serviceId, 10),
    staff_id: staffIdVal ? parseInt(staffIdVal, 10) : null,
    booking_date: bookingDate,
    booking_time: bookingTime,
    status: status,
    payment_status: paymentStatus,
    notes: notes,
    total_price: totalPrice
  };

  try {
    const res = await fetch(`../api/bookings/${currentActionAppointmentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeEditModal();
      showToast('Appointment updated successfully!', 'success');
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to update appointment.', 'error');
    }
  } catch (error) {
    console.error('Error updating appointment:', error);
    showToast('Network error while updating appointment.', 'error');
  }
}

// ================= MODAL 4: CONFIRM APPOINTMENT ACTION =================
async function confirmAppointment(id) {
  try {
    const res = await fetch(`../api/bookings/${id}/status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'confirmed' }),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      showToast('Appointment has been CONFIRMED!', 'success');
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to confirm appointment.', 'error');
    }
  } catch (error) {
    console.error('Error confirming appointment:', error);
    showToast('Network error while confirming appointment.', 'error');
  }
}

// ================= MODAL 5: RESCHEDULE APPOINTMENT =================
function openRescheduleModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('rescheduleCurrentCustomer').textContent = item.customer;
  document.getElementById('rescheduleCurrentService').textContent = item.service;
  document.getElementById('rescheduleCurrentSlot').textContent = `${item.dateFormatted} — ${item.time}`;

  // Default to tomorrow
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  document.getElementById('rescheduleNewDate').value = getLocalDateString(tomorrowObj);
  document.getElementById('rescheduleNewTime').value = "10:30:00";

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

async function handleConfirmReschedule(e) {
  e.preventDefault();
  if (!currentActionAppointmentId) return;

  const newDate = document.getElementById('rescheduleNewDate').value;
  const newTime = document.getElementById('rescheduleNewTime').value;

  const payload = {
    booking_date: newDate,
    booking_time: newTime,
    status: 'confirmed'
  };

  try {
    const res = await fetch(`../api/bookings/${currentActionAppointmentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeRescheduleModal();
      showToast(`Appointment rescheduled to ${formatDateString(newDate)}!`, 'success');
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to reschedule appointment.', 'error');
    }
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    showToast('Network error while rescheduling appointment.', 'error');
  }
}

// ================= MODAL 6: CANCEL APPOINTMENT =================
function openCancelModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('cancelModalRef').textContent = `${item.displayId} — ${item.customer} (${item.service})`;
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

async function handleConfirmCancellation() {
  if (!currentActionAppointmentId) return;

  try {
    const res = await fetch(`../api/bookings/${currentActionAppointmentId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason: 'Admin cancelled' }),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeCancelModal();
      showToast('Appointment has been cancelled.', 'warning');
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to cancel appointment.', 'error');
    }
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    showToast('Network error while cancelling appointment.', 'error');
  }
}

// ================= MODAL 7: DELETE APPOINTMENT =================
function openDeleteModal(id) {
  currentActionAppointmentId = id;
  const item = appointmentsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('deleteModalRef').textContent = `${item.displayId} — ${item.customer} (${item.service})`;
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

async function handleConfirmDeletion() {
  if (!currentActionAppointmentId) return;

  try {
    const res = await fetch(`../api/bookings/${currentActionAppointmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeDeleteModal();
      showToast('Appointment record deleted permanently.', 'info');
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to delete appointment.', 'error');
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    showToast('Network error while deleting appointment.', 'error');
  }
}

// ================= MODAL STEADY & SCROLL LOCK =================
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
  const anyOpen = document.querySelector('dialog[open]');
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

function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

// ================= TOAST NOTIFICATION HELPER =================
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
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
