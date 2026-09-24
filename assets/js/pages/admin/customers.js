/**
 * Nely's Salon — Admin Customers Controller
 * Connected directly to the backend database API (/api/customers, /api/bookings)
 * Manages customer directory, real-time search & multi-filtering, sorting,
 * customer profile detail view with live appointment history & notes,
 * add customer modal, edit customer, quick appointment booking, and deletion.
 */

// ================= GLOBAL STATE =================
let customersData = [];
let servicesList = [];
let staffList = [];
let summaryMetrics = {
  total: 0,
  newThisMonth: 0,
  withUpcoming: 0,
  returning: 0
};

// Filter & Sort State
let filterState = {
  search: '',
  status: 'all',
  gender: 'all',
  date: 'all',
  sortBy: 'newest',
  summaryFilter: 'all'
};

// Active customer context for modals
let activeCustomer = null;
let isCustomerModalScrollLocked = false;

// ================= INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupClickOutside();
  setupModalDismissListeners();
  fetchCustomersData();
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
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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

// ================= FETCH LIVE CUSTOMERS FROM BACKEND =================
async function fetchCustomersData() {
  const tbody = document.getElementById('customersTableBody');
  if (tbody && customersData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-[#735e5e]">
          <div class="inline-flex items-center gap-2 font-semibold">
            <i class="fa-solid fa-spinner fa-spin text-[#810B38]"></i>
            <span>Loading live customer records from database...</span>
          </div>
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('../api/customers', {
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
      customersData = result.data.customers || [];
      summaryMetrics = result.data.summary || summaryMetrics;
      servicesList = result.data.services || [];
      staffList = result.data.staff || [];

      renderSummaryCards();
      renderCustomersTable();
      populateBookingDropdowns();
      updateSidebarBadges();
    } else {
      showToast(result.message || 'Failed to load customer records.', 'error');
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
    showToast('Failed to connect to backend server. Please verify MySQL/Apache are active.', 'error');
  }
}

// ================= RENDER SUMMARY CARDS & SIDEBAR BADGES =================
function renderSummaryCards() {
  const statTotal = document.getElementById('statTotalCustomers');
  const statNew = document.getElementById('statNewThisMonth');
  const statUpcoming = document.getElementById('statUpcoming');
  const statReturning = document.getElementById('statReturning');

  if (statTotal) statTotal.textContent = summaryMetrics.total !== undefined ? summaryMetrics.total : customersData.length;
  if (statNew) statNew.textContent = summaryMetrics.newThisMonth !== undefined ? summaryMetrics.newThisMonth : 0;
  if (statUpcoming) statUpcoming.textContent = summaryMetrics.withUpcoming !== undefined ? summaryMetrics.withUpcoming : 0;
  if (statReturning) statReturning.textContent = summaryMetrics.returning !== undefined ? summaryMetrics.returning : 0;
}

function updateSidebarBadges() {
  const custBadge = document.getElementById('sidebarCustomersBadge');
  if (custBadge) {
    custBadge.textContent = customersData.length;
  }
  const svcBadge = document.getElementById('sidebarServicesBadge');
  if (svcBadge && servicesList.length) {
    svcBadge.textContent = servicesList.length;
  }
  const staffBadge = document.getElementById('sidebarStaffBadge');
  if (staffBadge && staffList.length) {
    staffBadge.textContent = staffList.length;
  }
}

function populateBookingDropdowns() {
  const bookForService = document.getElementById('bookForService');
  if (bookForService) {
    let opts = '<option value="" disabled selected>Select service...</option>';
    servicesList.forEach(svc => {
      opts += `<option value="${svc.id}" data-price="${svc.price}" data-name="${escapeHtml(svc.name)}">${escapeHtml(svc.name)} (₱${Number(svc.price).toLocaleString()})</option>`;
    });
    bookForService.innerHTML = opts;
  }

  const bookForStaff = document.getElementById('bookForStaff');
  if (bookForStaff) {
    let opts = '<option value="">Any Available Staff</option>';
    staffList.forEach(st => {
      opts += `<option value="${st.id}">${escapeHtml(st.name)} (${escapeHtml(st.role || 'Stylist')})</option>`;
    });
    bookForStaff.innerHTML = opts;
  }
}

// ================= RENDER CUSTOMERS TABLE =================
function renderCustomersTable() {
  const tbody = document.getElementById('customersTableBody');
  const emptyState = document.getElementById('customersEmptyState');
  const resultCount = document.getElementById('customersResultCount');
  if (!tbody) return;

  const currentMonthPrefix = getLocalDateString().substring(0, 7);

  // Filter
  let filtered = customersData.filter(cust => {
    // 1. Search filter
    if (filterState.search) {
      const q = filterState.search.toLowerCase();
      const notesText = Array.isArray(cust.notes) ? cust.notes.map(n => n.text || '').join(' ') : (cust.notes || '');
      const match = (cust.name && cust.name.toLowerCase().includes(q)) ||
        (cust.phone && cust.phone.toLowerCase().includes(q)) ||
        (cust.email && cust.email.toLowerCase().includes(q)) ||
        (cust.address && cust.address.toLowerCase().includes(q)) ||
        (cust.city && cust.city.toLowerCase().includes(q)) ||
        (cust.id && cust.id.toLowerCase().includes(q)) ||
        notesText.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 2. Status filter
    if (filterState.status !== 'all') {
      if (cust.status.toLowerCase() !== filterState.status.toLowerCase()) return false;
    }

    // 3. Gender filter
    if (filterState.gender !== 'all') {
      if (cust.gender.toLowerCase() !== filterState.gender.toLowerCase()) return false;
    }

    // 4. Date Joined filter
    if (filterState.date === 'this_month') {
      if (!cust.joinedTimestamp || !cust.joinedTimestamp.startsWith(currentMonthPrefix)) return false;
    } else if (filterState.date === 'this_year') {
      const yearPrefix = currentMonthPrefix.substring(0, 4);
      if (!cust.joinedTimestamp || !cust.joinedTimestamp.startsWith(yearPrefix)) return false;
    }

    // 5. Summary Card Click filter
    if (filterState.summaryFilter === 'new_month') {
      if (!cust.joinedTimestamp || !cust.joinedTimestamp.startsWith(currentMonthPrefix)) return false;
    } else if (filterState.summaryFilter === 'upcoming') {
      if ((cust.pendingAppointments || 0) <= 0) return false;
    } else if (filterState.summaryFilter === 'returning') {
      if ((cust.totalAppointments || 0) <= 1) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (filterState.sortBy === 'newest') {
      return (b.userId || 0) - (a.userId || 0);
    } else if (filterState.sortBy === 'oldest') {
      return (a.userId || 0) - (b.userId || 0);
    } else if (filterState.sortBy === 'name_asc') {
      return a.name.localeCompare(b.name);
    } else if (filterState.sortBy === 'most_appointments') {
      return (b.totalAppointments || 0) - (a.totalAppointments || 0);
    }
    return 0;
  });

  if (resultCount) {
    resultCount.textContent = `Showing ${filtered.length} registered patron${filtered.length === 1 ? '' : 's'}`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  tbody.innerHTML = filtered.map(cust => {
    // Generate initials
    const nameParts = cust.name.trim().split(' ').filter(Boolean);
    const initials = nameParts.length > 1 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : (cust.name.substring(0, 2)).toUpperCase();

    const isActive = cust.status.toLowerCase() === 'active';
    const statusPill = isActive
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
           <span class="w-1.5 h-1.5 rounded-full bg-stone-400"></span> Inactive
         </span>`;

    const genderColor = cust.gender.toLowerCase() === 'female' 
      ? 'bg-rose-50 text-rose-700 border-rose-200' 
      : (cust.gender.toLowerCase() === 'male' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200');

    return `
      <tr 
        onclick="openCustomerProfileModal(${cust.userId})"
        class="hover:bg-[#FAF6F0]/50 transition-colors cursor-pointer group">
        
        <!-- Customer Column -->
        <td class="px-5 py-4 whitespace-nowrap">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF6F0] border border-[#DCC3AA] text-[#541A1A] font-serif font-bold text-sm flex items-center justify-center shrink-0 group-hover:border-[#810B38] transition-colors">
              ${initials}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-[#541A1A] group-hover:text-[#810B38] transition-colors">
                  ${escapeHtml(cust.name)}
                </span>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md border ${genderColor}">
                  ${escapeHtml(cust.gender)}
                </span>
              </div>
              <span class="text-[11px] text-[#735e5e] flex items-center gap-1 mt-0.5">
                <i class="fa-solid fa-location-dot text-[9px] text-[#810B38]"></i>
                ${escapeHtml(cust.city || cust.address || 'Lagro, Quezon City')}
              </span>
            </div>
          </div>
        </td>

        <!-- Contact Column -->
        <td class="px-5 py-4 whitespace-nowrap text-xs">
          <div class="font-semibold text-stone-800">
            <a href="tel:${escapeHtml(cust.phone)}" onclick="event.stopPropagation()" class="hover:underline flex items-center gap-1.5 text-stone-800">
              <i class="fa-solid fa-phone text-[10px] text-[#810B38]"></i>
              ${escapeHtml(cust.phone)}
            </a>
          </div>
          ${cust.email ? `
            <div class="text-[11px] text-stone-400 mt-0.5">
              <a href="mailto:${escapeHtml(cust.email)}" onclick="event.stopPropagation()" class="hover:underline font-mono text-stone-500">
                ${escapeHtml(cust.email)}
              </a>
            </div>
          ` : '<span class="text-[11px] text-stone-300">No email registered</span>'}
        </td>

        <!-- Appointments Stats Column -->
        <td class="px-5 py-4 whitespace-nowrap text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-[#541A1A]">${cust.totalAppointments} total</span>
            <span class="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              ${cust.completedAppointments} completed
            </span>
          </div>
          <span class="text-[10px] text-[#810B38] font-bold block mt-0.5">
            Total Spent: ${cust.totalSpentFormatted}
          </span>
        </td>

        <!-- Last Visit Column -->
        <td class="px-5 py-4 whitespace-nowrap text-xs text-stone-600">
          <div class="font-semibold text-stone-800 flex items-center gap-1.5">
            <i class="fa-regular fa-calendar-check text-[#810B38] text-[10px]"></i>
            <span>${escapeHtml(cust.lastVisit)}</span>
          </div>
          <span class="text-[10px] text-stone-400 block mt-0.5">
            Joined ${escapeHtml(cust.joinedDate)}
          </span>
        </td>

        <!-- Status Column -->
        <td class="px-5 py-4 whitespace-nowrap">
          ${statusPill}
        </td>

        <!-- Action Column (Kebab Menu) -->
        <td class="px-5 py-4 whitespace-nowrap text-right text-xs relative" onclick="event.stopPropagation()">
          <div class="inline-block text-left">
            <button 
              type="button" 
              onclick="toggleRowKebabMenu(${cust.userId}, event)"
              class="w-8 h-8 rounded-xl bg-[#FAF6F0] hover:bg-[#810B38] text-[#541A1A] hover:text-white border border-[#DCC3AA] flex items-center justify-center transition-colors shadow-2xs focus:outline-none"
              title="Actions for ${escapeHtml(cust.name)}">
              <i class="fa-solid fa-ellipsis-vertical text-sm"></i>
            </button>

            <!-- Dropdown Menu -->
            <div 
              id="kebabMenu-${cust.userId}" 
              class="kebab-dropdown-menu hidden absolute right-5 mt-1 w-48 rounded-2xl bg-white border border-[#DCC3AA] shadow-2xl py-1.5 z-30 text-left">
              
              <!-- 1. View Profile -->
              <button 
                type="button" 
                onclick="openCustomerProfileModal(${cust.userId})"
                class="w-full px-4 py-2 text-xs font-semibold text-[#541A1A] hover:bg-[#FAF6F0] flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-id-card text-[#810B38] w-4 text-center"></i>
                <span>View Profile</span>
              </button>

              <!-- 2. Edit Record -->
              <button 
                type="button" 
                onclick="openEditCustomerModal(${cust.userId})"
                class="w-full px-4 py-2 text-xs font-semibold text-[#541A1A] hover:bg-[#FAF6F0] flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-pen-to-square text-[#810B38] w-4 text-center"></i>
                <span>Edit Customer</span>
              </button>

              <!-- 3. Book Appointment -->
              <button 
                type="button" 
                onclick="openBookForCustomerModal(${cust.userId})"
                class="w-full px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-calendar-plus text-emerald-600 w-4 text-center"></i>
                <span>Book Appointment</span>
              </button>

              <div class="border-t border-[#F1E2D1] my-1"></div>

              <!-- 4. Delete Record -->
              <button 
                type="button" 
                onclick="openDeleteCustomerModal(${cust.userId})"
                class="w-full px-4 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 flex items-center gap-2.5 transition-colors">
                <i class="fa-solid fa-trash-can text-rose-600 w-4 text-center"></i>
                <span>Delete Record</span>
              </button>

            </div>
          </div>
        </td>

      </tr>
    `;
  }).join('');
}

// ================= SEARCH, FILTER, SORT HANDLERS =================
const searchInputEl = document.getElementById('customerSearchInput');
if (searchInputEl) {
  searchInputEl.addEventListener('input', (e) => {
    filterState.search = e.target.value.trim();
    renderCustomersTable();
  });
}

const statusFilterEl = document.getElementById('statusFilter');
if (statusFilterEl) {
  statusFilterEl.addEventListener('change', (e) => {
    filterState.status = e.target.value;
    renderCustomersTable();
  });
}

const genderFilterEl = document.getElementById('genderFilter');
if (genderFilterEl) {
  genderFilterEl.addEventListener('change', (e) => {
    filterState.gender = e.target.value;
    renderCustomersTable();
  });
}

const dateFilterEl = document.getElementById('dateFilter');
if (dateFilterEl) {
  dateFilterEl.addEventListener('change', (e) => {
    filterState.date = e.target.value;
    renderCustomersTable();
  });
}

const sortSelectEl = document.getElementById('sortSelect');
if (sortSelectEl) {
  sortSelectEl.addEventListener('change', (e) => {
    filterState.sortBy = e.target.value;
    renderCustomersTable();
  });
}

function filterBySummaryCard(type) {
  filterState.summaryFilter = type;
  renderCustomersTable();
  showToast(`Filtered customers by: ${type.toUpperCase()}`, 'info');
}

function resetFilters() {
  filterState = {
    search: '',
    status: 'all',
    gender: 'all',
    date: 'all',
    sortBy: 'newest',
    summaryFilter: 'all'
  };

  if (searchInputEl) searchInputEl.value = '';
  if (statusFilterEl) statusFilterEl.value = 'all';
  if (genderFilterEl) genderFilterEl.value = 'all';
  if (dateFilterEl) dateFilterEl.value = 'all';
  if (sortSelectEl) sortSelectEl.value = 'newest';

  renderCustomersTable();
  showToast('All filters have been reset.', 'info');
}

// ================= KEBAB MENU HANDLER =================
function toggleRowKebabMenu(userId, event) {
  event.stopPropagation();
  const allMenus = document.querySelectorAll('.kebab-dropdown-menu');
  const targetMenu = document.getElementById(`kebabMenu-${userId}`);

  allMenus.forEach(menu => {
    if (menu !== targetMenu) menu.classList.add('hidden');
  });

  if (targetMenu) {
    targetMenu.classList.toggle('hidden');
  }
}

function setupClickOutside() {
  document.addEventListener('click', () => {
    const allMenus = document.querySelectorAll('.kebab-dropdown-menu');
    allMenus.forEach(menu => menu.classList.add('hidden'));
  });
}

// ================= MODAL 1: CUSTOMER PROFILE & HISTORY MODAL =================
async function openCustomerProfileModal(userId) {
  let cust = customersData.find(c => c.userId === userId || c.id === userId);
  if (!cust) return;

  activeCustomer = cust;
  lockCustomerBodyScroll();

  const modal = document.getElementById('customerProfileModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  // Populate immediate details
  renderProfileModalData(cust);

  // Fetch detailed history & notes from server
  try {
    const res = await fetch(`../api/customers/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success && result.data) {
      activeCustomer = result.data;
      renderProfileModalData(result.data);
    }
  } catch (error) {
    console.warn('Could not fetch full history for customer:', error);
  }
}

function renderProfileModalData(cust) {
  const nameParts = (cust.name || 'Customer').trim().split(' ').filter(Boolean);
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (cust.name.substring(0, 2)).toUpperCase();

  const avatarEl = document.getElementById('profileModalAvatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('profileModalCustomerName');
  if (nameEl) nameEl.textContent = cust.name;

  const phoneEl = document.getElementById('profileModalPhone');
  if (phoneEl) phoneEl.textContent = cust.phone;

  const emailEl = document.getElementById('profileModalEmail');
  if (emailEl) {
    emailEl.textContent = cust.email || 'No email registered';
    emailEl.href = cust.email ? `mailto:${cust.email}` : '#';
  }

  const addressEl = document.getElementById('profileModalAddress');
  if (addressEl) addressEl.textContent = cust.address || cust.city || 'Lagro, Quezon City';

  const sinceEl = document.getElementById('profileModalSince');
  if (sinceEl) sinceEl.textContent = `Customer since: ${cust.joinedDate || 'Recently'}`;

  // Status badge
  const statusBadgeEl = document.getElementById('profileModalStatusBadge');
  if (statusBadgeEl) {
    const isActive = (cust.status || 'active').toLowerCase() === 'active';
    statusBadgeEl.innerHTML = isActive
      ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">Active</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-stone-300 border border-white/30">Inactive</span>`;
  }

  // 5 Stats
  const statTotal = document.getElementById('profileModalStatTotal');
  const statCompleted = document.getElementById('profileModalStatCompleted');
  const statCancelled = document.getElementById('profileModalStatCancelled');
  const statPending = document.getElementById('profileModalStatPending');
  const statSpent = document.getElementById('profileModalStatSpent');

  if (statTotal) statTotal.textContent = cust.totalAppointments || 0;
  if (statCompleted) statCompleted.textContent = cust.completedAppointments || 0;
  if (statCancelled) statCancelled.textContent = cust.cancelledAppointments || 0;
  if (statPending) statPending.textContent = cust.pendingAppointments || 0;
  if (statSpent) statSpent.textContent = cust.totalSpentFormatted || `₱${Number(cust.totalSpent || 0).toLocaleString()}`;

  // History table
  const historyTbody = document.getElementById('profileHistoryTableBody');
  if (historyTbody) {
    const historyList = cust.history || [];
    if (historyList.length === 0) {
      historyTbody.innerHTML = `
        <tr>
          <td colspan="5" class="px-4 py-6 text-center text-stone-400 text-xs italic">
            No past appointment sessions recorded for this customer yet.
          </td>
        </tr>
      `;
    } else {
      historyTbody.innerHTML = historyList.map(h => {
        let statusBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">${escapeHtml(h.status)}</span>`;
        if (h.status.toLowerCase() === 'completed') {
          statusBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Completed</span>`;
        } else if (h.status.toLowerCase() === 'confirmed') {
          statusBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmed</span>`;
        } else if (h.status.toLowerCase() === 'pending') {
          statusBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>`;
        } else if (h.status.toLowerCase() === 'cancelled') {
          statusBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>`;
        }

        return `
          <tr class="hover:bg-stone-50/60 text-xs">
            <td class="px-4 py-2.5 font-semibold text-stone-800 whitespace-nowrap">${escapeHtml(h.date)}</td>
            <td class="px-4 py-2.5 font-bold text-[#810B38] whitespace-nowrap">${escapeHtml(h.service)}</td>
            <td class="px-4 py-2.5 text-stone-600 whitespace-nowrap">${escapeHtml(h.staff || 'Unassigned')}</td>
            <td class="px-4 py-2.5 font-serif font-bold text-stone-800 whitespace-nowrap">${h.amountFormatted || ('₱' + Number(h.amount || 0).toLocaleString())}</td>
            <td class="px-4 py-2.5 whitespace-nowrap">${statusBadge}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Internal Notes List
  renderProfileNotes(cust.notes || []);
}

function renderProfileNotes(notes) {
  const container = document.getElementById('profileNotesList');
  if (!container) return;

  const notesList = Array.isArray(notes) ? notes : [];
  if (notesList.length === 0) {
    container.innerHTML = `
      <p class="text-xs text-stone-400 italic p-3 bg-stone-50 rounded-xl border border-stone-200">
        No internal staff notes on file. Click "+ Add Note" to record customer preferences.
      </p>
    `;
    return;
  }

  container.innerHTML = notesList.map(n => `
    <div class="p-3 bg-stone-50 rounded-xl border border-[#DCC3AA]/50 text-xs space-y-1">
      <div class="flex items-center justify-between text-[11px] text-stone-400 font-medium">
        <span class="font-bold text-[#810B38]">${escapeHtml(n.author || 'Admin')}</span>
        <span>${escapeHtml(n.date || 'Recently')}</span>
      </div>
      <p class="text-stone-700 leading-relaxed">${escapeHtml(n.text)}</p>
    </div>
  `).join('');
}

function closeCustomerProfileModal() {
  const modal = document.getElementById('customerProfileModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  toggleAddNoteInput(false);
  unlockCustomerBodyScroll();
}

function toggleAddNoteInput(show) {
  const form = document.getElementById('addNoteInlineForm');
  const input = document.getElementById('newNoteInputText');
  if (!form) return;

  if (show) {
    form.classList.remove('hidden');
    if (input) {
      input.value = '';
      input.focus();
    }
  } else {
    form.classList.add('hidden');
  }
}

async function saveCustomerNote() {
  if (!activeCustomer) return;
  const input = document.getElementById('newNoteInputText');
  const text = input ? input.value.trim() : '';
  if (!text) {
    showToast('Please enter a note.', 'error');
    return;
  }

  try {
    const res = await fetch(`../api/customers/${activeCustomer.userId}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ note: text }),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      toggleAddNoteInput(false);
      showToast('Note added successfully!', 'success');
      activeCustomer.notes = result.data || [];
      renderProfileNotes(result.data);
      fetchCustomersData();
    } else {
      showToast(result.message || 'Failed to add note.', 'error');
    }
  } catch (error) {
    console.error('Error saving note:', error);
    showToast('Network error while saving note.', 'error');
  }
}

// ================= MODAL 2: ADD CUSTOMER =================
function openAddCustomerModal() {
  document.getElementById('addCustName').value = '';
  document.getElementById('addCustPhone').value = '';
  document.getElementById('addCustEmail').value = '';
  document.getElementById('addCustDob').value = '';
  document.getElementById('addCustGender').value = 'Female';
  document.getElementById('addCustAddress').value = '';
  document.getElementById('addCustNotes').value = '';

  const modal = document.getElementById('addCustomerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockCustomerBodyScroll();
  }
}

function closeAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    unlockCustomerBodyScroll();
  }
}

async function handleSaveCustomer(e) {
  e.preventDefault();

  const name = document.getElementById('addCustName').value.trim();
  const phone = document.getElementById('addCustPhone').value.trim();
  const email = document.getElementById('addCustEmail').value.trim();
  const dob = document.getElementById('addCustDob').value;
  const gender = document.getElementById('addCustGender').value;
  const address = document.getElementById('addCustAddress').value.trim();
  const notes = document.getElementById('addCustNotes').value.trim();

  if (!name || !phone) {
    showToast('Customer full name and phone are required.', 'error');
    return;
  }

  const payload = {
    name,
    phone,
    email,
    dob,
    gender,
    address,
    notes,
    status: 'Active'
  };

  try {
    const res = await fetch('../api/customers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeAddCustomerModal();
      showToast(`Customer "${name}" registered successfully!`, 'success');
      fetchCustomersData();
    } else {
      showToast(result.message || 'Failed to register customer.', 'error');
    }
  } catch (error) {
    console.error('Error adding customer:', error);
    showToast('Network error while registering customer.', 'error');
  }
}

// ================= MODAL 3: EDIT CUSTOMER =================
function openEditCustomerModal(userId) {
  let cust = customersData.find(c => c.userId === userId || c.id === userId);
  if (!cust && activeCustomer) cust = activeCustomer;
  if (!cust) return;

  activeCustomer = cust;
  closeCustomerProfileModal();

  document.getElementById('editCustId').value = cust.userId;
  document.getElementById('editCustName').value = cust.name;
  document.getElementById('editCustPhone').value = cust.phone === 'N/A' ? '' : cust.phone;
  document.getElementById('editCustEmail').value = cust.email || '';
  document.getElementById('editCustDob').value = cust.dob || '';
  document.getElementById('editCustGender').value = cust.gender || 'Female';
  document.getElementById('editCustAddress').value = cust.address || '';
  document.getElementById('editCustStatus').value = cust.status || 'Active';

  const modal = document.getElementById('editCustomerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockCustomerBodyScroll();
  }
}

function closeEditCustomerModal() {
  const modal = document.getElementById('editCustomerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    unlockCustomerBodyScroll();
  }
}

async function handleSaveEditCustomer(e) {
  e.preventDefault();
  const userId = document.getElementById('editCustId').value;
  if (!userId) return;

  const name = document.getElementById('editCustName').value.trim();
  const phone = document.getElementById('editCustPhone').value.trim();
  const email = document.getElementById('editCustEmail').value.trim();
  const dob = document.getElementById('editCustDob').value;
  const gender = document.getElementById('editCustGender').value;
  const address = document.getElementById('editCustAddress').value.trim();
  const status = document.getElementById('editCustStatus').value;

  const payload = {
    name,
    phone,
    email,
    dob,
    gender,
    address,
    status
  };

  try {
    const res = await fetch(`../api/customers/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeEditCustomerModal();
      showToast(`Customer record for "${name}" updated!`, 'success');
      fetchCustomersData();
    } else {
      showToast(result.message || 'Failed to update customer.', 'error');
    }
  } catch (error) {
    console.error('Error updating customer:', error);
    showToast('Network error while updating customer.', 'error');
  }
}

// ================= MODAL 4: BOOK APPOINTMENT FOR CUSTOMER =================
function openBookForCustomerModal(userId) {
  let cust = customersData.find(c => c.userId === userId || c.id === userId);
  if (!cust && activeCustomer) cust = activeCustomer;
  if (!cust) return;

  activeCustomer = cust;
  closeCustomerProfileModal();

  document.getElementById('bookForCustomerName').textContent = cust.name;
  document.getElementById('bookForCustomerPhone').textContent = cust.phone;
  document.getElementById('bookForDate').value = getLocalDateString();
  document.getElementById('bookForTime').value = '09:00:00';

  const bookForService = document.getElementById('bookForService');
  if (bookForService && bookForService.options.length > 1) {
    bookForService.selectedIndex = 1;
  }

  const modal = document.getElementById('bookForCustomerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockCustomerBodyScroll();
  }
}

function closeBookForCustomerModal() {
  const modal = document.getElementById('bookForCustomerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    unlockCustomerBodyScroll();
  }
}

async function handleConfirmBookForCustomer(e) {
  e.preventDefault();
  if (!activeCustomer) return;

  const serviceId = document.getElementById('bookForService').value;
  if (!serviceId) {
    showToast('Please select a service.', 'error');
    return;
  }

  const staffIdVal = document.getElementById('bookForStaff').value;
  const staffId = staffIdVal ? parseInt(staffIdVal, 10) : null;
  const date = document.getElementById('bookForDate').value;
  const time = document.getElementById('bookForTime').value;

  const payload = {
    customer_id: activeCustomer.userId,
    service_id: parseInt(serviceId, 10),
    staff_id: staffId,
    booking_date: date,
    booking_time: time,
    payment_method: 'cash',
    payment_status: 'paid',
    status: 'confirmed',
    notes: `Scheduled by admin for customer ${activeCustomer.name}`,
    visit_type: 'salon'
  };

  try {
    const res = await fetch('../api/bookings', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeBookForCustomerModal();
      showToast(`Appointment booked successfully for ${activeCustomer.name}!`, 'success');
      fetchCustomersData();
    } else {
      showToast(result.message || 'Failed to book appointment.', 'error');
    }
  } catch (error) {
    console.error('Error booking appointment:', error);
    showToast('Network error while booking appointment.', 'error');
  }
}

// ================= MODAL 5: DELETE CUSTOMER =================
function openDeleteCustomerModal(userId) {
  let cust = customersData.find(c => c.userId === userId || c.id === userId);
  if (!cust && activeCustomer) cust = activeCustomer;
  if (!cust) return;

  activeCustomer = cust;
  closeCustomerProfileModal();

  const targetNameEl = document.getElementById('deleteCustomerNameTarget');
  if (targetNameEl) targetNameEl.textContent = `"${cust.name}"`;

  const modal = document.getElementById('deleteCustomerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockCustomerBodyScroll();
  }
}

function closeDeleteCustomerModal() {
  const modal = document.getElementById('deleteCustomerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    unlockCustomerBodyScroll();
  }
}

async function handleConfirmDeleteCustomer() {
  if (!activeCustomer) return;

  try {
    const res = await fetch(`../api/customers/${activeCustomer.userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const result = await res.json();
    if (result.success) {
      closeDeleteCustomerModal();
      showToast(`Customer record deleted permanently.`, 'info');
      fetchCustomersData();
    } else {
      showToast(result.message || 'Failed to delete customer record.', 'error');
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    showToast('Network error while deleting customer.', 'error');
  }
}

// ================= MODAL 6: LOGOUT =================
function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockCustomerBodyScroll();
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    unlockCustomerBodyScroll();
  }
}

function handleConfirmLogout() {
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  window.location.href = '../login.html';
}

// ================= MOBILE SIDEBAR DRAWER =================
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

// ================= SCROLL LOCK & MODAL DISMISS =================
function lockCustomerBodyScroll() {
  if (isCustomerModalScrollLocked) return;
  isCustomerModalScrollLocked = true;
  document.body.classList.add('modal-open');
}

function unlockCustomerBodyScroll() {
  const anyOpen = document.querySelector('.fixed.inset-0.z-50.flex:not(.hidden)');
  if (anyOpen) return;

  isCustomerModalScrollLocked = false;
  document.body.classList.remove('modal-open');
}

function setupModalDismissListeners() {
  const backdropModals = [
    'customerProfileModal',
    'addCustomerModal',
    'editCustomerModal',
    'bookForCustomerModal',
    'deleteCustomerModal',
    'logoutModal'
  ];

  backdropModals.forEach(id => {
    const modalEl = document.getElementById(id);
    if (!modalEl) return;

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        modalEl.classList.add('hidden');
        modalEl.classList.remove('flex');
        unlockCustomerBodyScroll();
      }
    });
  });
}

// ================= TOAST HELPER =================
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
