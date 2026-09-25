/**
 * Nely's Salon — Admin Appointments Management Script
 * Connected directly to the backend database API (/api/bookings)
 * Handles real-time search, multi-criteria filtering (Date, Status, Staff, Service),
 * live KPI summary counters, appointment details modal, dynamic customer/service/staff dropdowns,
 * manual booking creation, editing, quick confirmation, rescheduling, cancellation, and deletion.
 * 100% Dynamic Database Binding — Zero Hardcoded Mocks — Zero Flickering
 */

// Cache Key
const APPOINTMENTS_CACHE_KEY = 'nelys_admin_appointments_cache';

// Live Global State
let appointmentsData = [];
let lastRenderedApptsHash = '';
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

// Normalize backend booking item to standard format
function normalizeBookingItem(b) {
  if (!b) return null;
  const rawDate = b.booking_date || '';
  const rawTime = b.booking_time || '';
  const rawStatus = (b.status || 'pending').toLowerCase();
  const rawPaymentStatus = (b.payment_status || 'pending').toLowerCase();
  const priceNum = parseFloat(b.total_price || b.price || 0);

  return {
    id: b.id,
    reference_no: b.reference_no,
    displayId: b.reference_no || ('APPT-' + String(b.id).padStart(5, '0')),
    customer_id: b.customer_id,
    customer: b.customer_name || (b.customer_email ? b.customer_email.split('@')[0] : 'Patron'),
    phone: b.customer_phone || b.phone || '—',
    email: b.customer_email || b.email || '',
    service_id: b.service_id,
    service: b.service_name || 'Salon Service',
    price: priceNum,
    priceFormatted: '₱' + priceNum.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
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
}

// Instant SWR Cache Hydration (0ms render, zero layout shift)
function hydrateAppointmentsFromCache() {
  try {
    const data = window.__PRELOADED_APPOINTMENTS__ || JSON.parse(localStorage.getItem(APPOINTMENTS_CACHE_KEY) || 'null');
    if (cached) {
      const data = JSON.parse(cached);
      if (data && typeof data === 'object') {
        const rawBookings = data.bookings || [];
        servicesList = data.services || [];
        staffList = data.staff || [];
        customersList = data.customers || [];
        summaryMetrics = data.summary || summaryMetrics;

        appointmentsData = rawBookings.map(normalizeBookingItem).filter(Boolean);

        populateDropdowns();
        renderSummaryCounters();
        renderAppointmentsTable();
        updateSidebarBadges();
      }
    }
  } catch (err) {
    console.warn('Could not read appointments cache:', err);
  }
}

// ================= INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  hydrateAppointmentsFromCache();
  checkAdminAuth();
  setupEventListeners();
  setupDialogSteadyListeners();
  fetchAppointments();
});

function checkAdminAuth() {
  const token = localStorage.getItem('nelys_token');
  const userJson = localStorage.getItem('nelys_user');

  if (!token) {
    window.location.replace('../login.html');
    return;
  }

  let displayName = 'Admin';
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user.role !== 'admin') {
        window.location.replace('../customer/booking.html');
        return;
      }
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
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format date string to human readable (e.g. Sept 25, 2026)
function formatDateString(dateStr) {
  if (!dateStr) return '—';
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
      headers: getAuthHeaders()
    });

    if (res.status === 401 || res.status === 403) {
      showToast('Session expired. Redirecting to login...', 'warning');
      setTimeout(() => { window.location.replace('../login.html'); }, 1200);
      return;
    }

    const result = await res.json();
    if (result.success && result.data) {
      const freshHash = JSON.stringify(result.data);
      if (freshHash === lastRenderedApptsHash) {
        return; // Zero-flicker: data is identical, skip DOM re-render
      }
      lastRenderedApptsHash = freshHash;
      try {
        localStorage.setItem(APPOINTMENTS_CACHE_KEY, JSON.stringify(result.data));
      } catch (cacheErr) {
        console.warn('Failed to save appointments cache:', cacheErr);
      }

      const rawBookings = result.data.bookings || (Array.isArray(result.data) ? result.data : []);
      servicesList = result.data.services || [];
      staffList = result.data.staff || [];
      customersList = result.data.customers || [];
      summaryMetrics = result.data.summary || summaryMetrics;

      appointmentsData = rawBookings.map(normalizeBookingItem).filter(Boolean);

      populateDropdowns();
      renderSummaryCounters();
      renderAppointmentsTable();
      updateSidebarBadges();
    } else {
      if (appointmentsData.length === 0) {
        showToast(result.message || 'Failed to load appointments.', 'error');
      }
    }
  } catch (error) {
    console.error('Error fetching appointments:', error);
    if (appointmentsData.length === 0) {
      showToast('Could not load appointments. Please check backend connection.', 'error');
    }
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
      opts += `<option value="${escapeHtml(svc.name)}">Service: ${escapeHtml(svc.name)}</option>`;
    });
    filterService.innerHTML = opts;
    if (currentVal && filterService.querySelector(`option[value="${currentVal}"]`)) {
      filterService.value = currentVal;
    }
  }

  // 3. Add Modal: Service Select
  const addServiceSelect = document.getElementById('addServiceSelect');
  if (addServiceSelect) {
    let opts = '<option value="" disabled selected>Select service...</option>';
    servicesList.forEach(svc => {
      const price = parseFloat(svc.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
      opts += `<option value="${svc.id}">${escapeHtml(svc.name)} (₱${price})</option>`;
    });
    addServiceSelect.innerHTML = opts;
  }

  // 4. Add Modal: Staff Select
  const addStaffSelect = document.getElementById('addStaffSelect');
  if (addStaffSelect) {
    let opts = '<option value="">Any Available Staff</option>';
    staffList.forEach(st => {
      opts += `<option value="${st.id}">${escapeHtml(st.name)} (${escapeHtml(st.role || 'Stylist')})</option>`;
    });
    addStaffSelect.innerHTML = opts;
  }

  // 5. Add Modal: Customer Select
  const addCustomerSelect = document.getElementById('addCustomerSelect');
  if (addCustomerSelect) {
    let opts = '<option value="" disabled selected>Select a patron...</option>';
    customersList.forEach(c => {
      const name = c.full_name || c.name || (c.email ? c.email.split('@')[0] : 'Customer');
      const phone = c.phone ? ` • ${c.phone}` : '';
      opts += `<option value="${c.user_id || c.id}">${escapeHtml(name)}${escapeHtml(phone)}</option>`;
    });
    addCustomerSelect.innerHTML = opts;
  }

  // 6. Edit Modal: Service Select
  const editServiceSelect = document.getElementById('editServiceSelect');
  if (editServiceSelect) {
    let opts = '';
    servicesList.forEach(svc => {
      const price = parseFloat(svc.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
      opts += `<option value="${svc.id}">${escapeHtml(svc.name)} (₱${price})</option>`;
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

// ================= RENDER SUMMARY KPI COUNTERS =================
function renderSummaryCounters() {
  const todayCountEl = document.getElementById('summaryCountToday');
  const pendingCountEl = document.getElementById('summaryCountPending');
  const confirmedCountEl = document.getElementById('summaryCountConfirmed');
  const completedCountEl = document.getElementById('summaryCountCompleted');
  const cancelledCountEl = document.getElementById('summaryCountCancelled');

  if (todayCountEl) todayCountEl.textContent = summaryMetrics.today ?? 0;
  if (pendingCountEl) pendingCountEl.textContent = summaryMetrics.pending ?? 0;
  if (confirmedCountEl) confirmedCountEl.textContent = summaryMetrics.confirmed ?? 0;
  if (completedCountEl) completedCountEl.textContent = summaryMetrics.completed ?? 0;
  if (cancelledCountEl) cancelledCountEl.textContent = summaryMetrics.cancelled ?? 0;
}

// Update sidebar badges based on live appointments
function updateSidebarBadges() {
  const apptBadge = document.getElementById('sidebarAppointmentsBadge');
  if (apptBadge) {
    const pendingCount = summaryMetrics.pending || 0;
    if (pendingCount > 0) {
      apptBadge.textContent = pendingCount;
      apptBadge.classList.remove('hidden');
    } else {
      apptBadge.classList.add('hidden');
    }
  }

  fetch('../api/dashboard/stats', {
    method: 'GET',
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(res => {
    if (res.success && res.data && res.data.badges) {
      const badges = res.data.badges;
      const notifBadge = document.getElementById('sidebarNotificationsBadge');
      if (notifBadge) {
        if (badges.unread_notifications > 0) {
          notifBadge.textContent = badges.unread_notifications;
          notifBadge.classList.remove('hidden');
        } else {
          notifBadge.classList.add('hidden');
        }
      }
      const msgBadge = document.getElementById('sidebarMessagesBadge');
      if (msgBadge) {
        if (badges.unread_messages > 0) {
          msgBadge.textContent = badges.unread_messages;
          msgBadge.classList.remove('hidden');
        } else {
          msgBadge.classList.add('hidden');
        }
      }
    }
  })
  .catch(() => {});
}

// ================= FILTER & SEARCH LOGIC =================
function handleSearchInput(e) {
  filterState.search = e.target.value.toLowerCase().trim();
  paginationState.currentPage = 1;
  renderAppointmentsTable();
}

function handleDateFilter(val) {
  filterState.date = val;
  const customContainer = document.getElementById('customDateContainer');
  if (val === 'custom') {
    if (customContainer) customContainer.classList.remove('hidden');
  } else {
    if (customContainer) customContainer.classList.add('hidden');
    filterState.customDate = "";
  }
  paginationState.currentPage = 1;
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
  const statusSelect = document.getElementById('filterStatus');
  const dateSelect = document.getElementById('filterDate');

  if (statusType === 'today') {
    filterState.date = 'today';
    filterState.status = 'all';
    if (dateSelect) dateSelect.value = 'today';
    if (statusSelect) statusSelect.value = 'all';
  } else {
    filterState.status = statusType;
    filterState.date = 'all';
    if (statusSelect) statusSelect.value = statusType;
    if (dateSelect) dateSelect.value = 'all';
  }

  paginationState.currentPage = 1;
  renderAppointmentsTable();
  showToast(`Filtered table by: ${statusType.toUpperCase()}`, 'info');
}

function resetAllFilters() {
  filterState = {
    search: "",
    date: "all",
    status: "all",
    staff: "all",
    service: "all",
    customDate: ""
  };
  paginationState.currentPage = 1;

  const searchInput = document.getElementById('searchAppointmentsInput');
  const filterDate = document.getElementById('filterDate');
  const filterStatus = document.getElementById('filterStatus');
  const filterStaff = document.getElementById('filterStaff');
  const filterService = document.getElementById('filterService');
  const customDateContainer = document.getElementById('customDateContainer');
  const customDateInput = document.getElementById('customDateInput');

  if (searchInput) searchInput.value = "";
  if (filterDate) filterDate.value = "all";
  if (filterStatus) filterStatus.value = "all";
  if (filterStaff) filterStaff.value = "all";
  if (filterService) filterService.value = "all";
  if (customDateContainer) customDateContainer.classList.add('hidden');
  if (customDateInput) customDateInput.value = "";

  renderAppointmentsTable();
  showToast("All filters have been reset.", "info");
}

// ================= RENDER APPOINTMENTS TABLE =================
function renderAppointmentsTable() {
  const tbody = document.getElementById('appointmentsTableBody');
  const emptyState = document.getElementById('appointmentsEmptyState');
  const resultsCount = document.getElementById('tableResultsCount');
  const paginationContainer = document.getElementById('appointmentsPaginationContainer');

  if (!tbody) return;

  const todayStr = getLocalDateString(new Date());

  // Filter the appointments array
  const filtered = appointmentsData.filter(appt => {
    // 1. Search Query
    if (filterState.search) {
      const q = filterState.search;
      const matchCustomer = appt.customer.toLowerCase().includes(q);
      const matchRef = appt.displayId.toLowerCase().includes(q);
      const matchPhone = (appt.phone || '').toLowerCase().includes(q);
      const matchService = appt.service.toLowerCase().includes(q);
      const matchStaff = appt.staff.toLowerCase().includes(q);
      if (!matchCustomer && !matchRef && !matchPhone && !matchService && !matchStaff) return false;
    }

    // 2. Date Filter
    if (filterState.date === 'today') {
      if (appt.date !== todayStr) return false;
    } else if (filterState.date === 'tomorrow') {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      if (appt.date !== getLocalDateString(tom)) return false;
    } else if (filterState.date === 'this_week') {
      const now = new Date();
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1));
      const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 7));
      const apptDate = new Date(appt.date);
      if (apptDate < firstDay || apptDate > lastDay) return false;
    } else if (filterState.date === 'custom') {
      if (filterState.customDate && appt.date !== filterState.customDate) return false;
    }

    // 3. Status Filter
    if (filterState.status !== 'all') {
      if (appt.status !== filterState.status) return false;
    }

    // 4. Staff Filter
    if (filterState.staff !== 'all') {
      if (appt.staff !== filterState.staff) return false;
    }

    // 5. Service Filter
    if (filterState.service !== 'all') {
      if (appt.service !== filterState.service) return false;
    }

    return true;
  });

  // Update Results Count
  if (resultsCount) {
    resultsCount.textContent = `Showing ${filtered.length} appointment${filtered.length === 1 ? '' : 's'}`;
  }

  // Handle Empty State
  if (filtered.length === 0) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.classList.remove('hidden');
    if (paginationContainer) paginationContainer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (paginationContainer) paginationContainer.classList.remove('hidden');

  // Pagination calculation
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

  // Render Table Rows
  tbody.innerHTML = pageItems.map(appt => {
    // Status Badge Styling
    let statusClass = "bg-amber-50 text-amber-900 border-amber-300";
    let statusIcon = "fa-clock";
    let statusLabel = "Pending";

    if (appt.status === 'confirmed') {
      statusClass = "bg-blue-50 text-blue-900 border-blue-300";
      statusIcon = "fa-circle-check";
      statusLabel = "Confirmed";
    } else if (appt.status === 'completed') {
      statusClass = "bg-emerald-50 text-emerald-900 border-emerald-300";
      statusIcon = "fa-check-double";
      statusLabel = "Completed";
    } else if (appt.status === 'cancelled' || appt.status === 'no_show') {
      statusClass = "bg-rose-50 text-rose-900 border-rose-300";
      statusIcon = "fa-ban";
      statusLabel = appt.status === 'no_show' ? 'No Show' : 'Cancelled';
    }

    // Customer Initials
    const parts = appt.customer.split(' ').filter(Boolean);
    const initials = parts.length > 1 
      ? (parts[0][0] + parts[1][0]).toUpperCase() 
      : (appt.customer.substring(0, 2)).toUpperCase();

    return `
      <tr class="hover:bg-[#FAF6F0]/60 transition-colors group">
        <!-- Reference & Customer -->
        <td class="py-4 px-4 whitespace-nowrap">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-[#FAF6F0] text-[#810B38] border border-[#DCC3AA] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              ${escapeHtml(initials)}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-[#541A1A]">${escapeHtml(appt.customer)}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF6F0] text-[#810B38] border border-[#DCC3AA]/50 font-semibold">${escapeHtml(appt.displayId)}</span>
              </div>
              <span class="text-[11px] text-[#735e5e] block font-mono mt-0.5">${escapeHtml(appt.phone)}</span>
            </div>
          </div>
        </td>

        <!-- Service & Price -->
        <td class="py-4 px-4 whitespace-nowrap">
          <span class="text-xs font-bold text-[#541A1A] block">${escapeHtml(appt.service)}</span>
          <span class="text-[11px] font-bold text-[#810B38] block font-mono mt-0.5">${escapeHtml(appt.priceFormatted)}</span>
        </td>

        <!-- Schedule Time -->
        <td class="py-4 px-4 whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            <i class="fa-regular fa-calendar text-[#810B38] text-xs"></i>
            <span class="text-xs font-bold text-[#541A1A]">${escapeHtml(appt.dateFormatted)}</span>
          </div>
          <span class="text-[11px] text-[#735e5e] block font-mono pl-4">${escapeHtml(appt.time)}</span>
        </td>

        <!-- Stylist / Staff -->
        <td class="py-4 px-4 whitespace-nowrap">
          <span class="text-xs font-medium text-[#541A1A] flex items-center gap-1.5">
            <i class="fa-solid fa-user-tie text-[#DCC3AA] text-[11px]"></i>
            ${escapeHtml(appt.staff)}
          </span>
        </td>

        <!-- Status -->
        <td class="py-4 px-4 whitespace-nowrap">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusClass}">
            <i class="fa-solid ${statusIcon} text-[9px]"></i>
            <span>${statusLabel}</span>
          </span>
        </td>

        <!-- Payment -->
        <td class="py-4 px-4 whitespace-nowrap">
          <span class="text-xs font-semibold ${appt.paymentStatus === 'Paid' ? 'text-emerald-700 font-bold' : 'text-amber-800'} block">
            ${escapeHtml(appt.paymentStatus)}
          </span>
          <span class="text-[10px] text-[#735e5e] block uppercase">${escapeHtml(appt.paymentMethod)}</span>
        </td>

        <!-- Quick Actions & Kebab Menu -->
        <td class="py-4 px-4 whitespace-nowrap text-right relative">
          <div class="flex items-center justify-end gap-1.5">
            ${appt.status === 'pending' ? `
              <button 
                type="button" 
                onclick="confirmAppointment(${appt.id})"
                title="Quick Confirm Appointment"
                class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] transition-colors inline-flex items-center gap-1">
                <i class="fa-solid fa-check text-[10px]"></i>
                <span>Confirm</span>
              </button>
            ` : ''}

            <button 
              type="button" 
              onclick="openViewDetailsModal(${appt.id})"
              class="w-7 h-7 rounded-lg bg-[#FAF6F0] hover:bg-[#810B38] text-[#541A1A] hover:text-white border border-[#DCC3AA] flex items-center justify-center text-xs transition-colors"
              title="View Full Details">
              <i class="fa-regular fa-eye"></i>
            </button>

            <!-- Kebab Dropdown Menu -->
            <div class="relative inline-block text-left">
              <button 
                type="button" 
                onclick="toggleRowKebabMenu(${appt.id}, event)"
                class="w-7 h-7 rounded-lg bg-[#FAF6F0] hover:bg-[#F1E2D1] text-[#541A1A] border border-[#DCC3AA] flex items-center justify-center text-xs transition-colors"
                title="More Actions">
                <i class="fa-solid fa-ellipsis-vertical"></i>
              </button>

              <div id="rowMenu-${appt.id}" class="hidden fixed w-44 rounded-2xl bg-white shadow-xl border border-[#DCC3AA] py-1.5 z-50 text-left text-xs">
                <button type="button" onclick="openEditModal(${appt.id})" class="w-full px-3.5 py-2 text-left hover:bg-[#FAF6F0] text-[#541A1A] flex items-center gap-2 font-medium">
                  <i class="fa-solid fa-pen text-[11px] text-[#810B38]"></i>
                  <span>Edit Appointment</span>
                </button>
                <button type="button" onclick="openRescheduleModal(${appt.id})" class="w-full px-3.5 py-2 text-left hover:bg-[#FAF6F0] text-[#541A1A] flex items-center gap-2 font-medium">
                  <i class="fa-regular fa-calendar-days text-[11px] text-[#810B38]"></i>
                  <span>Reschedule</span>
                </button>
                <div class="my-1 border-t border-[#F1E2D1]"></div>
                ${appt.status !== 'cancelled' ? `
                  <button type="button" onclick="openCancelModal(${appt.id})" class="w-full px-3.5 py-2 text-left hover:bg-amber-50 text-amber-900 flex items-center gap-2 font-medium">
                    <i class="fa-solid fa-ban text-[11px] text-amber-700"></i>
                    <span>Cancel Booking</span>
                  </button>
                ` : ''}
                <button type="button" onclick="openDeleteModal(${appt.id})" class="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-800 flex items-center gap-2 font-medium">
                  <i class="fa-regular fa-trash-can text-[11px] text-rose-600"></i>
                  <span>Delete Record</span>
                </button>
              </div>
            </div>

          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Render Pagination Controls
  renderPaginationControls(totalItems, totalPages, startIndex, endIndex);
}

// ================= PAGINATION CONTROLS =================
function renderPaginationControls(totalItems, totalPages, startIndex, endIndex) {
  const startEl = document.getElementById('paginationStartCount');
  const endEl = document.getElementById('paginationEndCount');
  const totalEl = document.getElementById('paginationTotalCount');
  const controlsEl = document.getElementById('paginationControls');

  if (startEl) startEl.textContent = totalItems > 0 ? startIndex + 1 : 0;
  if (endEl) endEl.textContent = endIndex;
  if (totalEl) totalEl.textContent = totalItems;

  if (!controlsEl) return;

  let btnsHtml = `
    <button 
      type="button" 
      onclick="changePage(${paginationState.currentPage - 1})"
      ${paginationState.currentPage <= 1 ? 'disabled' : ''}
      class="px-3 py-1.5 rounded-xl border border-[#DCC3AA] bg-white text-xs font-bold text-[#541A1A] hover:bg-[#FAF6F0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      &larr; Prev
    </button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= paginationState.currentPage - 1 && p <= paginationState.currentPage + 1)) {
      btnsHtml += `
        <button 
          type="button" 
          onclick="changePage(${p})"
          class="w-7 h-7 rounded-xl text-xs font-bold transition-colors ${p === paginationState.currentPage ? 'bg-[#810B38] text-white' : 'bg-white text-[#541A1A] border border-[#DCC3AA] hover:bg-[#FAF6F0]'}">
          ${p}
        </button>
      `;
    } else if (p === paginationState.currentPage - 2 || p === paginationState.currentPage + 2) {
      btnsHtml += `<span class="px-1 text-[#735e5e] text-xs">...</span>`;
    }
  }

  btnsHtml += `
    <button 
      type="button" 
      onclick="changePage(${paginationState.currentPage + 1})"
      ${paginationState.currentPage >= totalPages ? 'disabled' : ''}
      class="px-3 py-1.5 rounded-xl border border-[#DCC3AA] bg-white text-xs font-bold text-[#541A1A] hover:bg-[#FAF6F0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      Next &rarr;
    </button>
  `;

  controlsEl.innerHTML = btnsHtml;
}

function changePage(page) {
  paginationState.currentPage = page;
  renderAppointmentsTable();
  const tableContainer = document.querySelector('table');
  if (tableContainer) {
    tableContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Toggle Row Action Menu
function toggleRowKebabMenu(id, event) {
  if (event) event.stopPropagation();
  const currentMenu = document.getElementById(`rowMenu-${id}`);
  
  // Close all other open kebab menus
  document.querySelectorAll('[id^="rowMenu-"]').forEach(menu => {
    if (menu !== currentMenu) menu.classList.add('hidden');
  });

  if (!currentMenu) return;

  if (currentMenu.classList.contains('hidden')) {
    currentMenu.classList.remove('hidden');
    if (event && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      currentMenu.style.top = `${rect.bottom + 4}px`;
      currentMenu.style.left = `${Math.max(10, rect.right - 176)}px`;
    }
  } else {
    currentMenu.classList.add('hidden');
  }
}

// Close dropdowns on outside click
function setupEventListeners() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[id^="rowMenu-"]')) {
      document.querySelectorAll('[id^="rowMenu-"]').forEach(menu => menu.classList.add('hidden'));
    }
  });

  window.addEventListener('scroll', () => {
    document.querySelectorAll('[id^="rowMenu-"]').forEach(menu => menu.classList.add('hidden'));
  }, { passive: true });
}

// ================= MODAL 1: VIEW DETAILS MODAL =================
function openViewDetailsModal(id) {
  const appt = appointmentsData.find(a => a.id === id);
  if (!appt) return;

  currentActionAppointmentId = id;
  const modal = document.getElementById('appointmentDetailsModal');
  if (!modal) return;

  document.getElementById('detailCustomerName').textContent = appt.customer;
  document.getElementById('detailCustomerPhone').textContent = appt.phone;
  document.getElementById('detailDateTime').textContent = `${appt.dateFormatted} at ${appt.time}`;
  document.getElementById('detailService').textContent = appt.service;
  document.getElementById('detailPrice').textContent = appt.priceFormatted;
  document.getElementById('detailStaff').textContent = appt.staff;
  document.getElementById('detailPayment').textContent = `${appt.paymentStatus} (${appt.paymentMethod})`;
  document.getElementById('detailNotes').textContent = appt.notes ? appt.notes : "No special notes recorded.";

  // Status Badge in modal
  const badgeEl = document.getElementById('detailStatusBadge');
  if (badgeEl) {
    let statusClass = "bg-amber-100 text-amber-900 border-amber-300";
    let statusLabel = "Pending";
    if (appt.status === 'confirmed') {
      statusClass = "bg-blue-100 text-blue-900 border-blue-300";
      statusLabel = "Confirmed";
    } else if (appt.status === 'completed') {
      statusClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
      statusLabel = "Completed";
    } else if (appt.status === 'cancelled' || appt.status === 'no_show') {
      statusClass = "bg-rose-100 text-rose-900 border-rose-300";
      statusLabel = appt.status === 'no_show' ? 'No Show' : 'Cancelled';
    }
    badgeEl.className = `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusClass}`;
    badgeEl.textContent = statusLabel;
  }

  modal.showModal();
}

function closeViewDetailsModal() {
  const modal = document.getElementById('appointmentDetailsModal');
  if (modal) modal.close();
}

function openEditFromDetails() {
  closeViewDetailsModal();
  if (currentActionAppointmentId) {
    openEditModal(currentActionAppointmentId);
  }
}

// ================= MODAL 2: ADD APPOINTMENT =================
function openAddAppointmentModal() {
  const modal = document.getElementById('addAppointmentModal');
  if (!modal) return;

  const dateInput = document.getElementById('addDateInput');
  if (dateInput) {
    dateInput.value = getLocalDateString(new Date());
  }

  const newCustFields = document.getElementById('newCustomerFields');
  if (newCustFields) newCustFields.classList.add('hidden');

  modal.showModal();
}

function closeAddAppointmentModal() {
  const modal = document.getElementById('addAppointmentModal');
  if (modal) modal.close();
}

function toggleNewCustomerSection() {
  const fields = document.getElementById('newCustomerFields');
  const btn = document.getElementById('btnToggleNewCustomer');
  const select = document.getElementById('addCustomerSelect');

  if (fields) {
    fields.classList.toggle('hidden');
    const isVisible = !fields.classList.contains('hidden');
    if (btn) btn.textContent = isVisible ? "Use Existing Patron" : "+ Add New Customer";
    if (select) {
      if (isVisible) select.value = "";
    }
  }
}

async function handleCreateAppointment(e) {
  if (e) e.preventDefault();

  const isNewCust = !document.getElementById('newCustomerFields')?.classList.contains('hidden');
  let customerId = document.getElementById('addCustomerSelect')?.value;
  let newName = document.getElementById('newCustomerName')?.value.trim();
  let newPhone = document.getElementById('newCustomerPhone')?.value.trim();

  const serviceId = document.getElementById('addServiceSelect')?.value;
  const staffId = document.getElementById('addStaffSelect')?.value;
  const dateVal = document.getElementById('addDateInput')?.value;
  const timeVal = document.getElementById('addTimeSelect')?.value;
  const notesVal = document.getElementById('addNotesInput')?.value.trim();
  const paymentStatus = document.getElementById('addPaymentSelect')?.value || 'paid';

  if (isNewCust) {
    if (!newName) {
      showToast("Please enter customer full name.", "error");
      return;
    }
  } else {
    if (!customerId) {
      showToast("Please select a customer or add a new patron.", "error");
      return;
    }
  }

  if (!serviceId) {
    showToast("Please select a service.", "error");
    return;
  }

  const payload = {
    customer_id: isNewCust ? null : parseInt(customerId, 10),
    customer_name: isNewCust ? newName : null,
    customer_phone: isNewCust ? newPhone : null,
    service_id: parseInt(serviceId, 10),
    staff_id: staffId ? parseInt(staffId, 10) : null,
    booking_date: dateVal,
    booking_time: timeVal,
    notes: notesVal,
    payment_status: paymentStatus,
    payment_method: 'cash',
    source: 'admin'
  };

  try {
    const res = await fetch('../api/bookings', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      showToast('Appointment created successfully!', 'success');
      closeAddAppointmentModal();
      document.querySelector('#addAppointmentModal form')?.reset();
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to create appointment.', 'error');
    }
  } catch (err) {
    console.error('Error creating booking:', err);
    showToast('Network error while creating appointment.', 'error');
  }
}

// ================= MODAL 3: EDIT APPOINTMENT =================
function openEditModal(id) {
  const appt = appointmentsData.find(a => a.id === id);
  if (!appt) return;

  currentActionAppointmentId = id;
  const modal = document.getElementById('editAppointmentModal');
  if (!modal) return;

  // Fill in form values
  const idDisplay = document.getElementById('editApptIdDisplay');
  if (idDisplay) idDisplay.textContent = appt.displayId;

  const nameEl = document.getElementById('editCustomerName');
  if (nameEl) nameEl.textContent = appt.customer;

  const phoneEl = document.getElementById('editCustomerPhone');
  if (phoneEl) phoneEl.textContent = appt.phone;

  const serviceSelect = document.getElementById('editServiceSelect');
  if (serviceSelect && appt.service_id) serviceSelect.value = appt.service_id;

  const staffSelect = document.getElementById('editStaffSelect');
  if (staffSelect) staffSelect.value = appt.staff_id || "";

  const dateInput = document.getElementById('editDateInput');
  if (dateInput) dateInput.value = appt.date;

  const timeSelect = document.getElementById('editTimeSelect');
  if (timeSelect) {
    timeSelect.value = appt.rawTime || "09:00:00";
  }

  const statusSelect = document.getElementById('editStatusSelect');
  if (statusSelect) statusSelect.value = appt.status;

  const paymentSelect = document.getElementById('editPaymentSelect');
  if (paymentSelect) paymentSelect.value = appt.paymentStatus.toLowerCase();

  const notesInput = document.getElementById('editNotesInput');
  if (notesInput) notesInput.value = appt.notes;

  modal.showModal();
}

function closeEditModal() {
  const modal = document.getElementById('editAppointmentModal');
  if (modal) modal.close();
}

async function handleSaveEdit(e) {
  if (e) e.preventDefault();
  if (!currentActionAppointmentId) return;

  const serviceId = document.getElementById('editServiceSelect')?.value;
  const staffId = document.getElementById('editStaffSelect')?.value;
  const dateVal = document.getElementById('editDateInput')?.value;
  const timeVal = document.getElementById('editTimeSelect')?.value;
  const statusVal = document.getElementById('editStatusSelect')?.value;
  const paymentVal = document.getElementById('editPaymentSelect')?.value;
  const notesVal = document.getElementById('editNotesInput')?.value.trim();

  const payload = {
    service_id: serviceId ? parseInt(serviceId, 10) : undefined,
    staff_id: staffId ? parseInt(staffId, 10) : null,
    booking_date: dateVal,
    booking_time: timeVal,
    status: statusVal,
    payment_status: paymentVal,
    notes: notesVal
  };

  try {
    const res = await fetch(`../api/bookings/${currentActionAppointmentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      showToast('Appointment updated successfully!', 'success');
      closeEditModal();
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to update appointment.', 'error');
    }
  } catch (err) {
    console.error('Error updating appointment:', err);
    showToast('Network error while updating appointment.', 'error');
  }
}

// Quick Confirm Handler
async function confirmAppointment(id) {
  try {
    const res = await fetch(`../api/bookings/${id}/status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'confirmed' })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Appointment has been CONFIRMED!', 'success');
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to confirm appointment.', 'error');
    }
  } catch (err) {
    console.error('Error confirming booking:', err);
    showToast('Network error while confirming appointment.', 'error');
  }
}

// ================= MODAL 4: RESCHEDULE MODAL =================
function openRescheduleModal(id) {
  const appt = appointmentsData.find(a => a.id === id);
  if (!appt) return;

  currentActionAppointmentId = id;
  const modal = document.getElementById('rescheduleModal');
  if (!modal) return;

  document.getElementById('rescheduleCurrentCustomer').textContent = appt.customer;
  document.getElementById('rescheduleCurrentService').textContent = appt.service;
  document.getElementById('rescheduleCurrentSlot').textContent = `${appt.dateFormatted} at ${appt.time}`;

  const dateInput = document.getElementById('rescheduleNewDate');
  if (dateInput) dateInput.value = appt.date;

  const timeSelect = document.getElementById('rescheduleNewTime');
  if (timeSelect) timeSelect.value = appt.rawTime || "09:00:00";

  modal.showModal();
}

function closeRescheduleModal() {
  const modal = document.getElementById('rescheduleModal');
  if (modal) modal.close();
}

async function handleConfirmReschedule(e) {
  if (e) e.preventDefault();
  if (!currentActionAppointmentId) return;

  const newDate = document.getElementById('rescheduleNewDate')?.value;
  const newTime = document.getElementById('rescheduleNewTime')?.value;

  if (!newDate || !newTime) {
    showToast('Please select a valid date and time.', 'error');
    return;
  }

  try {
    const res = await fetch(`../api/bookings/${currentActionAppointmentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        booking_date: newDate,
        booking_time: newTime
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast(`Appointment rescheduled to ${formatDateString(newDate)}!`, 'success');
      closeRescheduleModal();
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to reschedule appointment.', 'error');
    }
  } catch (err) {
    console.error('Error rescheduling booking:', err);
    showToast('Network error while rescheduling appointment.', 'error');
  }
}

// ================= MODAL 5: CANCEL MODAL =================
function openCancelModal(id) {
  const appt = appointmentsData.find(a => a.id === id);
  if (!appt) return;

  currentActionAppointmentId = id;
  const modal = document.getElementById('cancelAppointmentModal');
  if (!modal) return;

  const refEl = document.getElementById('cancelModalRef');
  if (refEl) refEl.textContent = appt.displayId;

  modal.showModal();
}

function closeCancelModal() {
  const modal = document.getElementById('cancelAppointmentModal');
  if (modal) modal.close();
}

async function handleConfirmCancellation() {
  if (!currentActionAppointmentId) return;

  try {
    const res = await fetch(`../api/bookings/${currentActionAppointmentId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason: 'Admin dashboard cancellation' })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Appointment has been cancelled.', 'warning');
      closeCancelModal();
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to cancel appointment.', 'error');
    }
  } catch (err) {
    console.error('Error cancelling booking:', err);
    showToast('Network error while cancelling appointment.', 'error');
  }
}

// ================= MODAL 6: DELETE MODAL =================
function openDeleteModal(id) {
  const appt = appointmentsData.find(a => a.id === id);
  if (!appt) return;

  currentActionAppointmentId = id;
  const modal = document.getElementById('deleteAppointmentModal');
  if (!modal) return;

  const refEl = document.getElementById('deleteModalRef');
  if (refEl) refEl.textContent = appt.displayId;

  modal.showModal();
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteAppointmentModal');
  if (modal) modal.close();
}

async function handleConfirmDeletion() {
  if (!currentActionAppointmentId) return;

  try {
    const res = await fetch(`../api/bookings/${currentActionAppointmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const result = await res.json();
    if (result.success) {
      showToast('Appointment record deleted permanently.', 'info');
      closeDeleteModal();
      fetchAppointments();
    } else {
      showToast(result.message || 'Failed to delete appointment.', 'error');
    }
  } catch (err) {
    console.error('Error deleting booking:', err);
    showToast('Network error while deleting appointment.', 'error');
  }
}

// ================= SCROLL LOCK PREVENT JITTER ON DIALOGS =================
function onPreventApptBackgroundWheel(e) {
  const target = e.target;
  if (!target.closest('dialog[open]')) {
    e.preventDefault();
  }
}

function onPreventApptBackgroundTouch(e) {
  const target = e.target;
  if (!target.closest('dialog[open]')) {
    e.preventDefault();
  }
}

function onPreventApptBackgroundKeys(e) {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
    const target = e.target;
    if (!target.closest('dialog[open]') || ['input', 'textarea'].includes(target.tagName.toLowerCase())) {
      if (!target.closest('dialog[open]')) e.preventDefault();
    }
  }
}

function lockBodyScroll() {
  if (isApptModalScrollLocked) return;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflowY = 'scroll';
  document.body.dataset.savedScrollY = scrollY.toString();

  window.addEventListener('wheel', onPreventApptBackgroundWheel, { passive: false });
  window.addEventListener('touchmove', onPreventApptBackgroundTouch, { passive: false });
  window.addEventListener('keydown', onPreventApptBackgroundKeys, { passive: false });
  isApptModalScrollLocked = true;
}

function unlockBodyScroll() {
  if (!isApptModalScrollLocked) return;
  const savedScrollY = parseInt(document.body.dataset.savedScrollY || '0', 10);
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflowY = '';
  delete document.body.dataset.savedScrollY;

  window.removeEventListener('wheel', onPreventApptBackgroundWheel);
  window.removeEventListener('touchmove', onPreventApptBackgroundTouch);
  window.removeEventListener('keydown', onPreventApptBackgroundKeys);
  isApptModalScrollLocked = false;
  window.scrollTo(0, savedScrollY);
}

function setupDialogSteadyListeners() {
  const allDialogs = document.querySelectorAll('dialog');
  allDialogs.forEach(dlg => {
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
      }
    });

    const observer = new MutationObserver(() => {
      const hasOpenDialog = Array.from(allDialogs).some(d => d.open);
      if (hasOpenDialog) {
        lockBodyScroll();
      } else {
        unlockBodyScroll();
      }
    });
    observer.observe(dlg, { attributes: true, attributeFilter: ['open'] });
  });
}

// Sidebar Mobile Toggle
function toggleMobileSidebar(open = null) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');

  if (open === null) {
    open = sidebar.classList.contains('-translate-x-full');
  }

  if (open) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
    backdrop.classList.add('opacity-100');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
    backdrop.classList.remove('opacity-100');
  }
}

// Logout Modal
function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.showModal();
}

function handleLogout() {
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  localStorage.removeItem(APPOINTMENTS_CACHE_KEY);
  window.location.replace('../login.html');
}

// Global Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-800 text-white border-emerald-900',
    error: 'bg-rose-900 text-white border-rose-950',
    warning: 'bg-amber-800 text-white border-amber-900',
    info: 'bg-[#541A1A] text-white border-[#810B38]'
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold transform transition-all duration-300 translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-sm"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// HTML Entity Escaper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
