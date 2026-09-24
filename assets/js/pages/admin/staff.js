/**
 * Nely's Salon — Admin Staff Controller
 * Directly connected to backend database API (/api/staff, /api/services)
 * Manages salon staff members, specializations, assigned services,
 * working schedules, live daily availability, and CRUD operations.
 */

// ================= GLOBAL STATE =================
let staffList = [];
let servicesCatalog = [];
let summaryMetrics = {
  total: 0,
  active: 0,
  on_leave: 0,
  inactive: 0
};

// In-memory active staff context
let activeStaff = null;
let isModalScrollLocked = false;

// Filter & search criteria
let currentSearch = '';
let currentStatusFilter = 'all';
let currentServiceFilter = 'all';
let currentAvailabilityFilter = 'all';

// ================= INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupEventListeners();
  setupModalSteadyListeners();
  updateTimeBadge();
  fetchStaffData();
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

// ================= FETCH DATA FROM BACKEND =================
async function fetchStaffData() {
  try {
    const res = await fetch('../api/staff', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('Admin session expired or unauthenticated.');
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch staff data`);
    }

    const json = await res.json();
    if (json.data) {
      if (json.data.staff && Array.isArray(json.data.staff)) {
        staffList = json.data.staff.map(mapStaffRecord);
      } else if (Array.isArray(json.data)) {
        staffList = json.data.map(mapStaffRecord);
      }

      if (json.data.metrics) {
        summaryMetrics = json.data.metrics;
      } else {
        computeSummaryMetrics();
      }

      if (json.data.services && Array.isArray(json.data.services)) {
        servicesCatalog = json.data.services;
        populateServiceFilterOptions();
      }
    }

    renderSummaryCards();
    renderTodayAvailability();
    applyFiltersAndRender();

  } catch (err) {
    console.error('Error fetching staff from backend:', err);
    showToast('Failed to load staff records from server.', 'error');
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

// Map staff record from database to UI schema
function mapStaffRecord(item) {
  const specializations = item.specializations_list || [];
  const schedule = item.schedule_parsed || {
    'Monday': '9:00 AM – 6:00 PM',
    'Tuesday': '9:00 AM – 6:00 PM',
    'Wednesday': '9:00 AM – 6:00 PM',
    'Thursday': '9:00 AM – 6:00 PM',
    'Friday': '9:00 AM – 6:00 PM',
    'Saturday': '9:00 AM – 6:00 PM',
    'Sunday': 'Day Off'
  };

  const status = item.status || (item.is_active ? 'Active' : 'Inactive');
  const availability = item.availability || 'Available';

  let dateJoined = 'January 2026';
  if (item.created_at) {
    const d = new Date(item.created_at);
    if (!isNaN(d.getTime())) {
      dateJoined = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  return {
    id: parseInt(item.id, 10),
    name: item.name || 'Staff',
    fullName: item.full_name || item.name || 'Staff',
    position: item.role || 'Salon Staff',
    phone: item.phone || 'N/A',
    email: item.email || '',
    address: item.address || 'Lagro, Quezon City',
    dateJoined: dateJoined,
    status: status,
    availability: availability,
    specializations: specializations,
    schedule: schedule,
    avatar: item.avatar || 'director.jpg',
    total_appointments: parseInt(item.total_appointments || 0, 10),
    completed_appointments: parseInt(item.completed_appointments || 0, 10)
  };
}

function computeSummaryMetrics() {
  summaryMetrics.total = staffList.length;
  summaryMetrics.active = staffList.filter(s => s.status === 'Active').length;
  summaryMetrics.on_leave = staffList.filter(s => s.status === 'On Leave').length;
  summaryMetrics.inactive = staffList.filter(s => s.status === 'Inactive').length;
}

// Populate service filter dropdown dynamically
function populateServiceFilterOptions() {
  const srvFilter = document.getElementById('serviceFilter');
  if (!srvFilter || servicesCatalog.length === 0) return;

  const currentVal = srvFilter.value;
  let optionsHtml = '<option value="all">All Services</option>';
  
  servicesCatalog.forEach(svc => {
    optionsHtml += `<option value="${escapeHtml(svc.name)}">${escapeHtml(svc.name)}</option>`;
  });

  srvFilter.innerHTML = optionsHtml;
  if (currentVal) srvFilter.value = currentVal;
}

// ================= SETUP EVENT LISTENERS =================
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('staffSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
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

  // Service Filter
  const serviceFilter = document.getElementById('serviceFilter');
  if (serviceFilter) {
    serviceFilter.addEventListener('change', (e) => {
      currentServiceFilter = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Availability Filter
  const availFilter = document.getElementById('availabilityFilter');
  if (availFilter) {
    availFilter.addEventListener('change', (e) => {
      currentAvailabilityFilter = e.target.value;
      applyFiltersAndRender();
    });
  }
}

// ================= SUMMARY CARDS =================
function renderSummaryCards() {
  const totalEl = document.getElementById('statTotalStaff');
  const activeEl = document.getElementById('statActiveStaff');
  const leaveEl = document.getElementById('statOnLeaveStaff');
  const inactiveEl = document.getElementById('statInactiveStaff');
  const sidebarBadge = document.getElementById('sidebarStaffBadge');

  if (totalEl) totalEl.textContent = summaryMetrics.total;
  if (activeEl) activeEl.textContent = summaryMetrics.active;
  if (leaveEl) leaveEl.textContent = summaryMetrics.on_leave;
  if (inactiveEl) inactiveEl.textContent = summaryMetrics.inactive;
  if (sidebarBadge) sidebarBadge.textContent = summaryMetrics.total;
}

// ================= TODAY'S STAFF AVAILABILITY WIDGET =================
function renderTodayAvailability() {
  const container = document.getElementById('todayStaffContainer');
  if (!container) return;

  if (staffList.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-stone-400 col-span-3">No staff records found.</div>`;
    return;
  }

  container.innerHTML = staffList.map(s => {
    let textClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';

    if (s.availability === 'On Break') {
      textClass = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (s.availability === 'Day Off') {
      textClass = 'text-rose-700 bg-rose-50 border-rose-200';
    } else if (s.availability === 'In Service') {
      textClass = 'text-blue-700 bg-blue-50 border-blue-200';
    }

    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#DCC3AA]/50 hover:border-[#810B38] transition-colors group">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#810B38] to-[#541A1A] text-[#F1E2D1] flex items-center justify-center font-bold text-xs shrink-0">
            ${escapeHtml(s.name[0] || 'S')}
          </div>
          <div class="truncate">
            <span class="font-serif font-bold text-xs text-[#541A1A] block truncate">${escapeHtml(s.name)}</span>
            <span class="text-[10px] text-stone-400 block truncate">${escapeHtml(s.position.split('/')[0].trim())}</span>
          </div>
        </div>

        <!-- Quick Status Dropdown -->
        <div class="flex items-center gap-1.5 shrink-0">
          <select 
            onchange="updateStaffAvailability(${s.id}, this.value)"
            class="text-[11px] font-bold px-2 py-1 rounded-lg border ${textClass} focus:outline-none cursor-pointer">
            <option value="Available" ${s.availability === 'Available' ? 'selected' : ''}>Available</option>
            <option value="On Break" ${s.availability === 'On Break' ? 'selected' : ''}>On Break</option>
            <option value="In Service" ${s.availability === 'In Service' ? 'selected' : ''}>In Service</option>
            <option value="Day Off" ${s.availability === 'Day Off' ? 'selected' : ''}>Day Off</option>
          </select>
        </div>
      </div>
    `;
  }).join('');
}

// Quick availability updater from widget
async function updateStaffAvailability(staffId, newAvail) {
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) return;

  try {
    const res = await fetch(`../api/staff/${staffId}/availability`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ availability: newAvail }),
      credentials: 'include'
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || 'Failed to update availability status.');
    }

    staff.availability = newAvail;
    renderTodayAvailability();
    applyFiltersAndRender();
    showToast(`${staff.name}'s availability set to ${newAvail}`, 'info');

  } catch (err) {
    console.error('Error updating availability:', err);
    showToast(err.message || 'Failed to update availability status.', 'error');
    renderTodayAvailability();
  }
}

// ================= FILTER & RENDER LOGIC =================
function applyFiltersAndRender() {
  let filtered = [...staffList];

  // 1. Search (Name, Full name, Position, Specializations)
  if (currentSearch) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(currentSearch) ||
      (s.fullName && s.fullName.toLowerCase().includes(currentSearch)) ||
      s.position.toLowerCase().includes(currentSearch) ||
      s.specializations.some(sp => sp.toLowerCase().includes(currentSearch))
    );
  }

  // 2. Status
  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(s => s.status.toLowerCase() === currentStatusFilter.toLowerCase());
  }

  // 3. Service
  if (currentServiceFilter !== 'all') {
    filtered = filtered.filter(s => 
      s.specializations.some(sp => 
        sp.toLowerCase().includes(currentServiceFilter.toLowerCase()) ||
        currentServiceFilter.toLowerCase().includes(sp.toLowerCase())
      )
    );
  }

  // 4. Availability
  if (currentAvailabilityFilter !== 'all') {
    filtered = filtered.filter(s => s.availability.toLowerCase() === currentAvailabilityFilter.toLowerCase());
  }

  renderStaffCards(filtered);
}

// Reset filters
function resetFilters() {
  currentSearch = '';
  currentStatusFilter = 'all';
  currentServiceFilter = 'all';
  currentAvailabilityFilter = 'all';

  const sInput = document.getElementById('staffSearchInput');
  if (sInput) sInput.value = '';

  const stFilter = document.getElementById('statusFilter');
  if (stFilter) stFilter.value = 'all';

  const srvFilter = document.getElementById('serviceFilter');
  if (srvFilter) srvFilter.value = 'all';

  const avFilter = document.getElementById('availabilityFilter');
  if (avFilter) avFilter.value = 'all';

  applyFiltersAndRender();
  showToast('Filters have been reset', 'info');
}

// Summary card click shortcut
function filterBySummaryCard(filterType) {
  if (filterType === 'all') {
    currentStatusFilter = 'all';
  } else if (filterType === 'active') {
    currentStatusFilter = 'Active';
  } else if (filterType === 'on_leave') {
    currentStatusFilter = 'On Leave';
  } else if (filterType === 'inactive') {
    currentStatusFilter = 'Inactive';
  }

  const stFilter = document.getElementById('statusFilter');
  if (stFilter) stFilter.value = currentStatusFilter;

  applyFiltersAndRender();
}

// ================= RENDER STAFF CARDS =================
function renderStaffCards(items) {
  const container = document.getElementById('staffCardsContainer');
  const emptyState = document.getElementById('staffEmptyState');
  const resultCount = document.getElementById('staffResultCount');

  if (resultCount) {
    resultCount.textContent = `Showing ${items.length} staff member${items.length === 1 ? '' : 's'}`;
  }

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    container.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  container.classList.remove('hidden');

  container.innerHTML = items.map(s => {
    // Availability badge styling
    let availBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    let availDot = 'bg-emerald-500 animate-pulse';
    if (s.availability === 'On Break') {
      availBadge = 'bg-amber-50 text-amber-800 border-amber-200';
      availDot = 'bg-amber-500';
    } else if (s.availability === 'Day Off') {
      availBadge = 'bg-rose-50 text-rose-800 border-rose-200';
      availDot = 'bg-rose-500';
    } else if (s.availability === 'In Service') {
      availBadge = 'bg-blue-50 text-blue-800 border-blue-200';
      availDot = 'bg-blue-500 animate-pulse';
    }

    // Status badge styling
    const statusBadge = s.status === 'Active'
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
           <i class="fa-solid fa-circle text-[7px] text-emerald-500"></i>
           Active
         </span>`
      : s.status === 'On Leave'
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
           <i class="fa-solid fa-circle text-[7px] text-amber-500"></i>
           On Leave
         </span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">
           <i class="fa-solid fa-circle text-[7px] text-stone-400"></i>
           Inactive
         </span>`;

    // Specializations chips
    const specChips = (s.specializations && s.specializations.length > 0)
      ? s.specializations.map(spec => `
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF6F0] text-[#541A1A] border border-[#DCC3AA]/50">
            <i class="fa-solid fa-check text-[9px] text-[#810B38]"></i>
            ${escapeHtml(spec)}
          </span>
        `).join('')
      : `<span class="text-xs text-stone-400 italic">General Salon Services</span>`;

    return `
      <div class="bg-white rounded-3xl border border-[#DCC3AA]/70 p-6 flex flex-col justify-between hover:shadow-xl hover:border-[#810B38] transition-all duration-300 group shadow-xs">
        
        <div>
          <!-- Card Header: Avatar & Info -->
          <div class="flex items-start gap-3.5 mb-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#810B38] to-[#541A1A] text-[#F1E2D1] border border-[#DCC3AA] flex items-center justify-center font-serif text-xl font-bold shadow-md shrink-0">
              ${escapeHtml(s.name[0] || 'S')}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <h3 class="font-serif text-xl font-bold text-[#541A1A] group-hover:text-[#810B38] transition-colors truncate">
                  ${escapeHtml(s.name)}
                </h3>
                ${statusBadge}
              </div>
              <p class="text-xs text-stone-500 font-medium truncate mt-0.5">${escapeHtml(s.position)}</p>
              
              <!-- Contact Snippet -->
              <div class="flex items-center gap-3 text-[11px] text-stone-400 mt-1 font-mono">
                <span class="flex items-center gap-1"><i class="fa-solid fa-phone text-[9px] text-[#810B38]"></i>${escapeHtml(s.phone)}</span>
              </div>
            </div>
          </div>

          <!-- Specializations Section -->
          <div class="my-4 pt-3 border-t border-stone-100">
            <div class="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">
              <i class="fa-solid fa-scissors text-[#810B38] text-[10px]"></i>
              <span>Specializations</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${specChips}
            </div>
          </div>

          <!-- Availability Tag -->
          <div class="mt-3 flex items-center justify-between text-xs">
            <span class="text-stone-500 font-medium">Availability:</span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border ${availBadge}">
              <span class="w-2 h-2 rounded-full ${availDot}"></span>
              ${escapeHtml(s.availability)}
            </span>
          </div>
        </div>

        <!-- Card Footer Actions: View Profile & Edit -->
        <div class="pt-5 border-t border-stone-100 flex items-center justify-between gap-2 mt-4">
          <button 
            type="button" 
            onclick="openStaffProfileModal(${s.id})"
            class="flex-1 py-2 px-3 rounded-xl bg-white border border-[#DCC3AA] text-[#541A1A] hover:bg-[#FAF6F0] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
            <i class="fa-solid fa-eye text-[#810B38]"></i>
            <span>View Profile</span>
          </button>
          
          <button 
            type="button" 
            onclick="openEditStaffModal(${s.id})"
            class="py-2 px-3 rounded-xl bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Edit</span>
          </button>

          <button 
            type="button" 
            onclick="openDeleteStaffModal(${s.id})"
            class="w-9 h-8 rounded-xl bg-stone-100 hover:bg-rose-600 hover:text-white text-stone-600 font-semibold text-xs transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
            title="Delete Staff">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

      </div>
    `;
  }).join('');
}

// ================= STAFF PROFILE MODAL =================
async function openStaffProfileModal(staffId) {
  try {
    const res = await fetch(`../api/staff/${staffId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Failed to load staff details.');
    }

    const json = await res.json();
    const staff = json.data;
    activeStaff = mapStaffRecord(staff);

    // Header info
    const nameEl = document.getElementById('staffProfileName');
    const avatarEl = document.getElementById('staffProfileAvatar');
    const posEl = document.getElementById('staffProfilePosition');
    const statusBadgeEl = document.getElementById('staffProfileStatusBadge');
    const availBadgeEl = document.getElementById('staffProfileAvailBadge');

    if (nameEl) nameEl.textContent = activeStaff.name;
    if (avatarEl) avatarEl.textContent = activeStaff.name[0] || 'S';
    if (posEl) posEl.textContent = activeStaff.position;

    if (statusBadgeEl) {
      statusBadgeEl.innerHTML = activeStaff.status === 'Active'
        ? `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Active</span>`
        : activeStaff.status === 'On Leave'
          ? `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">On Leave</span>`
          : `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">Inactive</span>`;
    }

    if (availBadgeEl) {
      availBadgeEl.textContent = activeStaff.availability;
    }

    // Contact info
    const phoneEl = document.getElementById('staffProfilePhone');
    const emailEl = document.getElementById('staffProfileEmail');
    const addrEl = document.getElementById('staffProfileAddress');
    const joinedEl = document.getElementById('staffProfileJoined');

    if (phoneEl) phoneEl.textContent = activeStaff.phone || 'N/A';
    if (emailEl) {
      emailEl.textContent = activeStaff.email || 'N/A';
      emailEl.href = activeStaff.email ? `mailto:${activeStaff.email}` : '#';
    }
    if (addrEl) addrEl.textContent = activeStaff.address || 'Lagro, Quezon City';
    if (joinedEl) joinedEl.textContent = activeStaff.dateJoined;

    // Services Assigned Table
    const servicesTbody = document.getElementById('staffProfileServicesBody');
    if (servicesTbody) {
      const assigned = staff.assigned_services || [];
      if (assigned.length > 0) {
        servicesTbody.innerHTML = assigned.map(svc => `
          <tr class="hover:bg-[#FAF6F0]/40 transition-colors text-xs">
            <td class="px-4 py-2.5 font-medium text-stone-800">
              ${escapeHtml(svc.name)}
              <span class="text-[10px] text-stone-400 block">${escapeHtml(svc.category)} · ${svc.duration} mins</span>
            </td>
            <td class="px-4 py-2.5 font-mono font-bold text-[#810B38]">
              ${svc.price ? `₱${parseFloat(svc.price).toLocaleString()}` : '<span class="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">Price not set</span>'}
            </td>
          </tr>
        `).join('');
      } else if (activeStaff.specializations.length > 0) {
        servicesTbody.innerHTML = activeStaff.specializations.map(spec => `
          <tr class="hover:bg-[#FAF6F0]/40 transition-colors text-xs">
            <td class="px-4 py-2.5 font-medium text-stone-800">${escapeHtml(spec)}</td>
            <td class="px-4 py-2.5 text-stone-500">Custom Salon Rates</td>
          </tr>
        `).join('');
      } else {
        servicesTbody.innerHTML = `
          <tr>
            <td colspan="2" class="px-4 py-3 text-center text-xs text-stone-400">All General Salon Services</td>
          </tr>
        `;
      }
    }

    // Schedule Table
    const scheduleTbody = document.getElementById('staffProfileScheduleBody');
    if (scheduleTbody) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      scheduleTbody.innerHTML = days.map(day => {
        const shift = activeStaff.schedule[day] || (day === 'Sunday' ? 'Day Off' : '9:00 AM – 6:00 PM');
        const isOff = shift.toLowerCase().includes('off');
        return `
          <tr class="hover:bg-[#FAF6F0]/40 transition-colors text-xs">
            <td class="px-4 py-2 font-medium text-stone-700">${day}</td>
            <td class="px-4 py-2 ${isOff ? 'text-stone-400 italic' : 'font-mono font-semibold text-stone-800'}">
              ${escapeHtml(shift)}
            </td>
          </tr>
        `;
      }).join('');
    }

    const modal = document.getElementById('staffProfileModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      lockBodyScroll();
    }

  } catch (err) {
    console.error('Error opening staff profile:', err);
    showToast('Unable to load staff profile details.', 'error');
  }
}

function closeStaffProfileModal() {
  const modal = document.getElementById('staffProfileModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  unlockBodyScroll();
  activeStaff = null;
}

// ================= ADD / EDIT STAFF MODAL =================
function renderServiceCheckboxes(selectedSpecs = []) {
  const container = document.getElementById('staffServiceCheckboxes');
  if (!container) return;

  if (servicesCatalog.length === 0) {
    container.innerHTML = '<span class="text-xs text-stone-400 p-2">Loading salon services catalog...</span>';
    return;
  }

  container.innerHTML = servicesCatalog.map(svc => {
    const isChecked = selectedSpecs.some(s => 
      s.toLowerCase().includes(svc.name.toLowerCase()) || 
      svc.name.toLowerCase().includes(s.toLowerCase())
    );

    return `
      <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer text-xs">
        <input 
          type="checkbox" 
          name="staffServices" 
          value="${escapeHtml(svc.name)}" 
          ${isChecked ? 'checked' : ''}
          class="rounded border-[#DCC3AA] text-[#810B38] focus:ring-[#810B38]">
        <span class="text-stone-700 truncate">${escapeHtml(svc.name)}</span>
      </label>
    `;
  }).join('');
}

function openAddStaffModal() {
  activeStaff = null;

  const form = document.getElementById('staffForm');
  if (form) form.reset();

  const titleEl = document.getElementById('staffModalTitle');
  const subEl = document.getElementById('staffModalSubtitle');
  if (titleEl) titleEl.textContent = 'Add New Staff';
  if (subEl) subEl.textContent = 'Register a new team member and assign services & schedule';

  renderServiceCheckboxes([]);

  const modal = document.getElementById('staffModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockBodyScroll();
  }
}

async function openEditStaffModal(staffId) {
  closeStaffProfileModal();

  const staff = staffList.find(s => s.id === staffId);
  if (!staff) return;

  activeStaff = staff;

  const titleEl = document.getElementById('staffModalTitle');
  const subEl = document.getElementById('staffModalSubtitle');
  if (titleEl) titleEl.textContent = `Edit Staff: ${staff.name}`;
  if (subEl) subEl.textContent = 'Update team member information, assigned services, and schedule';

  const nameInput = document.getElementById('staffName');
  const fullNameInput = document.getElementById('staffFullName');
  const phoneInput = document.getElementById('staffPhone');
  const emailInput = document.getElementById('staffEmail');
  const addressInput = document.getElementById('staffAddress');
  const posInput = document.getElementById('staffPosition');
  const statusSelect = document.getElementById('staffStatus');
  const availSelect = document.getElementById('staffAvailability');

  if (nameInput) nameInput.value = staff.name;
  if (fullNameInput) fullNameInput.value = staff.fullName;
  if (phoneInput) phoneInput.value = staff.phone;
  if (emailInput) emailInput.value = staff.email;
  if (addressInput) addressInput.value = staff.address;
  if (posInput) posInput.value = staff.position;
  if (statusSelect) statusSelect.value = staff.status;
  if (availSelect) availSelect.value = staff.availability;

  renderServiceCheckboxes(staff.specializations);

  const modal = document.getElementById('staffModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockBodyScroll();
  }
}

function closeStaffModal() {
  const modal = document.getElementById('staffModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  unlockBodyScroll();
  activeStaff = null;
}

async function handleSaveStaff(event) {
  event.preventDefault();

  const nameInput = document.getElementById('staffName');
  const fullNameInput = document.getElementById('staffFullName');
  const phoneInput = document.getElementById('staffPhone');
  const emailInput = document.getElementById('staffEmail');
  const addressInput = document.getElementById('staffAddress');
  const posInput = document.getElementById('staffPosition');
  const statusSelect = document.getElementById('staffStatus');
  const availSelect = document.getElementById('staffAvailability');
  const startSelect = document.getElementById('staffStartTime');
  const endSelect = document.getElementById('staffEndTime');

  if (!nameInput || !nameInput.value.trim()) {
    showToast('Please enter the staff member name.', 'error');
    return;
  }
  if (!phoneInput || !phoneInput.value.trim()) {
    showToast('Please enter the phone number.', 'error');
    return;
  }

  // Selected services
  const checkedBoxes = document.querySelectorAll('input[name="staffServices"]:checked');
  const selectedServices = Array.from(checkedBoxes).map(cb => cb.value);

  const startTime = startSelect ? startSelect.value : '9:00 AM';
  const endTime = endSelect ? endSelect.value : '6:00 PM';
  const shift = `${startTime} – ${endTime}`;

  const scheduleObj = {
    'Monday': shift,
    'Tuesday': shift,
    'Wednesday': shift,
    'Thursday': shift,
    'Friday': shift,
    'Saturday': shift,
    'Sunday': 'Day Off'
  };

  const payload = {
    name: nameInput.value.trim(),
    full_name: fullNameInput ? fullNameInput.value.trim() : nameInput.value.trim(),
    role: posInput ? posInput.value.trim() : 'Salon Staff',
    phone: phoneInput.value.trim(),
    email: emailInput ? emailInput.value.trim() : '',
    address: addressInput ? addressInput.value.trim() : '',
    status: statusSelect ? statusSelect.value : 'Active',
    availability: availSelect ? availSelect.value : 'Available',
    specialties: selectedServices,
    schedule: scheduleObj
  };

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : 'Save Staff';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    let url = '../api/staff';
    let method = 'POST';

    if (activeStaff) {
      url = `../api/staff/${activeStaff.id}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method: method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to save staff member.');
    }

    showToast(activeStaff ? `Staff member "${payload.name}" updated successfully!` : `Staff member "${payload.name}" registered successfully!`, 'success');
    closeStaffModal();
    await fetchStaffData();

  } catch (err) {
    console.error('Error saving staff member:', err);
    showToast(err.message || 'Error saving staff member.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

// ================= DELETE STAFF MODAL =================
function openDeleteStaffModal(staffId) {
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) return;

  activeStaff = staff;

  const targetName = document.getElementById('deleteStaffNameTarget');
  if (targetName) targetName.textContent = `"${staff.name}"`;

  const modal = document.getElementById('deleteStaffModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockBodyScroll();
  }
}

function closeDeleteStaffModal() {
  const modal = document.getElementById('deleteStaffModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  unlockBodyScroll();
  activeStaff = null;
}

async function handleConfirmDeleteStaff() {
  if (!activeStaff) return;

  const staffId = activeStaff.id;
  const staffName = activeStaff.name;

  try {
    const res = await fetch(`../api/staff/${staffId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to remove staff member.');
    }

    showToast(`Staff member "${staffName}" removed successfully.`, 'info');
    closeDeleteStaffModal();
    await fetchStaffData();

  } catch (err) {
    console.error('Error removing staff member:', err);
    showToast(err.message || 'Failed to remove staff member.', 'error');
  }
}

// ================= MODAL HELPERS & STEADY SCROLL =================
function closeAllModals() {
  const modalIds = ['staffProfileModal', 'staffModal', 'deleteStaffModal', 'logoutModal'];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
  unlockBodyScroll();
}

function setupModalSteadyListeners() {
  const modals = ['staffProfileModal', 'staffModal', 'deleteStaffModal', 'logoutModal'];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          if (id === 'staffProfileModal') closeStaffProfileModal();
          else if (id === 'staffModal') closeStaffModal();
          else if (id === 'deleteStaffModal') closeDeleteStaffModal();
          else if (id === 'logoutModal') closeLogoutModal();
        }
      });
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

function onPreventBackgroundWheel(e) {
  const scrollable = e.target.closest('#staffForm, #staffProfileModal .overflow-y-auto, .overflow-y-auto');
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

function onPreventBackgroundTouch(e) {
  const scrollable = e.target.closest('#staffForm, #staffProfileModal .overflow-y-auto, .overflow-y-auto');
  if (!scrollable) {
    e.preventDefault();
  }
}

function onPreventBackgroundKeys(e) {
  const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (scrollKeys.includes(e.key)) {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (!isInput) {
      e.preventDefault();
    }
  }
}

function lockBodyScroll() {
  if (isModalScrollLocked) return;
  isModalScrollLocked = true;
  document.body.classList.add('modal-open');
  window.addEventListener('wheel', onPreventBackgroundWheel, { passive: false });
  window.addEventListener('touchmove', onPreventBackgroundTouch, { passive: false });
  window.addEventListener('keydown', onPreventBackgroundKeys, { passive: false });
}

function unlockBodyScroll() {
  const anyOpen = document.querySelector('.fixed.inset-0.z-50.flex:not(.hidden), dialog[open]');
  if (anyOpen) return;

  isModalScrollLocked = false;
  document.body.classList.remove('modal-open');
  window.removeEventListener('wheel', onPreventBackgroundWheel);
  window.removeEventListener('touchmove', onPreventBackgroundTouch);
  window.removeEventListener('keydown', onPreventBackgroundKeys);
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
    lockBodyScroll();
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  unlockBodyScroll();
}

function handleConfirmLogout() {
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  window.location.href = '../login.html';
}

// Toast notification helper
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
    <span class="flex-1 leading-snug">${escapeHtml(message)}</span>
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

// Utility: HTML escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
