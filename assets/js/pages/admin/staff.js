/**
 * Nely's Salon — Admin Staff Controller
 * Manages salon staff members, specializations, assigned services,
 * working schedules, live daily availability, and CRUD operations.
 */

// ================= GLOBAL STATE & INITIAL MOCK DATA =================
const STAFF_STORAGE_KEY = 'nelys_admin_staff_data';

// Service price registry (matching Nely's Salon services catalog)
const SERVICE_CATALOG = {
  'Rebonding': { price: null, priceFormatted: 'Price not set', category: 'Hair Care' },
  'Brazilian': { price: 1999, priceFormatted: '₱1,999', category: 'Hair Care' },
  'Hair Dye': { price: 699, priceFormatted: '₱699', category: 'Hair Care' },
  'Power Dose': { price: 499, priceFormatted: '₱499', category: 'Hair Care' },
  'Cold Wave': { price: 699, priceFormatted: '₱699', category: 'Hair Care' },
  'Bonacure': { price: 499, priceFormatted: '₱499', category: 'Hair Care' },
  'Keratine Treatment': { price: 499, priceFormatted: '₱499', category: 'Hair Care' },
  'Trim': { price: 149, priceFormatted: '₱149', category: 'Hair Care' },
  'Manicure': { price: 149, priceFormatted: '₱149', category: 'Nails' },
  'Pedicure': { price: 149, priceFormatted: '₱149', category: 'Nails' },
  'Gel Manicure': { price: 499, priceFormatted: '₱499', category: 'Nails' },
  'Gel Pedicure': { price: 499, priceFormatted: '₱499', category: 'Nails' },
  'Footspa': { price: 199, priceFormatted: '₱199', category: 'Foot Care' }
};

// 5 Sample staff members matching user specifications
const DEFAULT_STAFF = [
  {
    id: 'staff-1',
    name: 'Nely',
    fullName: 'Nely Santos-Reyes',
    position: 'Salon Staff / Master Stylist',
    phone: '0917 111 2233',
    email: 'nely@nelyssalon.ph',
    address: 'Lagro, Quezon City',
    dateJoined: 'January 2026',
    status: 'Active',
    availability: 'Available', // Available, On Break, Day Off, In Service
    specializations: ['Rebonding', 'Brazilian', 'Hair Dye', 'Keratine Treatment', 'Trim'],
    schedule: {
      'Monday': '9:00 AM – 6:00 PM',
      'Tuesday': '9:00 AM – 6:00 PM',
      'Wednesday': '9:00 AM – 6:00 PM',
      'Thursday': '9:00 AM – 6:00 PM',
      'Friday': '9:00 AM – 6:00 PM',
      'Saturday': '9:00 AM – 6:00 PM',
      'Sunday': 'Day Off'
    }
  },
  {
    id: 'staff-2',
    name: 'Ana',
    fullName: 'Ana Marie Dela Cruz',
    position: 'Salon Staff / Senior Nail Artist',
    phone: '0928 222 3344',
    email: 'ana@nelyssalon.ph',
    address: 'Novaliches, Quezon City',
    dateJoined: 'January 2026',
    status: 'Active',
    availability: 'Available',
    specializations: ['Manicure', 'Pedicure', 'Gel Manicure', 'Gel Pedicure', 'Footspa'],
    schedule: {
      'Monday': '9:00 AM – 6:00 PM',
      'Tuesday': '9:00 AM – 6:00 PM',
      'Wednesday': '9:00 AM – 6:00 PM',
      'Thursday': '9:00 AM – 6:00 PM',
      'Friday': '9:00 AM – 6:00 PM',
      'Saturday': '9:00 AM – 6:00 PM',
      'Sunday': 'Day Off'
    }
  },
  {
    id: 'staff-3',
    name: 'Elena',
    fullName: 'Elena Gomez',
    position: 'Salon Staff / Spa Specialist',
    phone: '0919 333 4455',
    email: 'elena@nelyssalon.ph',
    address: 'Fairview, Quezon City',
    dateJoined: 'February 2026',
    status: 'Active',
    availability: 'On Break',
    specializations: ['Footspa', 'Pedicure', 'Manicure'],
    schedule: {
      'Monday': '10:00 AM – 7:00 PM',
      'Tuesday': '10:00 AM – 7:00 PM',
      'Wednesday': '10:00 AM – 7:00 PM',
      'Thursday': '10:00 AM – 7:00 PM',
      'Friday': '10:00 AM – 7:00 PM',
      'Saturday': '10:00 AM – 7:00 PM',
      'Sunday': 'Day Off'
    }
  },
  {
    id: 'staff-4',
    name: 'Grace',
    fullName: 'Grace Villanueva',
    position: 'Salon Staff / Junior Colorist',
    phone: '0995 444 5566',
    email: 'grace@nelyssalon.ph',
    address: 'San Jose del Monte, Bulacan',
    dateJoined: 'February 2026',
    status: 'Active',
    availability: 'Day Off',
    specializations: ['Hair Dye', 'Power Dose', 'Bonacure', 'Trim'],
    schedule: {
      'Monday': 'Day Off',
      'Tuesday': '9:00 AM – 6:00 PM',
      'Wednesday': '9:00 AM – 6:00 PM',
      'Thursday': '9:00 AM – 6:00 PM',
      'Friday': '9:00 AM – 6:00 PM',
      'Saturday': '9:00 AM – 6:00 PM',
      'Sunday': '9:00 AM – 5:00 PM'
    }
  },
  {
    id: 'staff-5',
    name: 'Joy',
    fullName: 'Joylyn Fernandez',
    position: 'Salon Staff / Texture Technician',
    phone: '0933 555 6677',
    email: 'joy@nelyssalon.ph',
    address: 'Greater Lagro, Quezon City',
    dateJoined: 'March 2026',
    status: 'Active',
    availability: 'Available',
    specializations: ['Cold Wave', 'Keratine Treatment', 'Brazilian', 'Power Dose'],
    schedule: {
      'Monday': '9:00 AM – 6:00 PM',
      'Tuesday': '9:00 AM – 6:00 PM',
      'Wednesday': 'Day Off',
      'Thursday': '9:00 AM – 6:00 PM',
      'Friday': '9:00 AM – 6:00 PM',
      'Saturday': '9:00 AM – 6:00 PM',
      'Sunday': '9:00 AM – 5:00 PM'
    }
  }
];

// In-memory staff list
let staffList = [];
let activeStaff = null;

// Filter & search criteria
let currentSearch = '';
let currentStatusFilter = 'all';
let currentServiceFilter = 'all';
let currentAvailabilityFilter = 'all';

// ================= STORAGE HELPERS =================
function loadStaff() {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      staffList = JSON.parse(raw);
    } else {
      staffList = JSON.parse(JSON.stringify(DEFAULT_STAFF));
      saveStaff();
    }
  } catch (err) {
    console.error('Error loading staff from storage:', err);
    staffList = JSON.parse(JSON.stringify(DEFAULT_STAFF));
  }
}

function saveStaff() {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffList));
  } catch (err) {
    console.error('Error saving staff to storage:', err);
  }
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  loadStaff();
  renderSummaryCards();
  renderTodayAvailability();
  applyFiltersAndRender();
  setupEventListeners();
  updateTimeBadge();
});

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

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// ================= SUMMARY CARDS =================
function renderSummaryCards() {
  const total = staffList.length;
  const active = staffList.filter(s => s.status === 'Active').length;
  const onLeave = staffList.filter(s => s.status === 'On Leave').length;
  const inactive = staffList.filter(s => s.status === 'Inactive').length;

  const totalEl = document.getElementById('statTotalStaff');
  const activeEl = document.getElementById('statActiveStaff');
  const leaveEl = document.getElementById('statOnLeaveStaff');
  const inactiveEl = document.getElementById('statInactiveStaff');

  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;
  if (leaveEl) leaveEl.textContent = onLeave;
  if (inactiveEl) inactiveEl.textContent = inactive;
}

// ================= TODAY'S STAFF AVAILABILITY WIDGET =================
function renderTodayAvailability() {
  const container = document.getElementById('todayStaffContainer');
  if (!container) return;

  container.innerHTML = staffList.map(s => {
    let dotClass = 'bg-emerald-500 animate-pulse';
    let textClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let availIcon = 'fa-circle-check';

    if (s.availability === 'On Break') {
      dotClass = 'bg-amber-500';
      textClass = 'text-amber-700 bg-amber-50 border-amber-200';
      availIcon = 'fa-mug-hot';
    } else if (s.availability === 'Day Off') {
      dotClass = 'bg-rose-500';
      textClass = 'text-rose-700 bg-rose-50 border-rose-200';
      availIcon = 'fa-calendar-xmark';
    } else if (s.availability === 'In Service') {
      dotClass = 'bg-blue-500 animate-pulse';
      textClass = 'text-blue-700 bg-blue-50 border-blue-200';
      availIcon = 'fa-scissors';
    }

    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#DCC3AA]/50 hover:border-[#810B38] transition-colors group">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#810B38] to-[#541A1A] text-[#F1E2D1] flex items-center justify-center font-bold text-xs shrink-0">
            ${s.name[0]}
          </div>
          <div class="truncate">
            <span class="font-serif font-bold text-xs text-[#541A1A] block truncate">${s.name}</span>
            <span class="text-[10px] text-stone-400 block truncate">${s.position.split('/')[0].trim()}</span>
          </div>
        </div>

        <!-- Quick Status Dropdown -->
        <div class="flex items-center gap-1.5 shrink-0">
          <select 
            onchange="updateStaffAvailability('${s.id}', this.value)"
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
function updateStaffAvailability(staffId, newAvail) {
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) return;

  staff.availability = newAvail;
  saveStaff();
  renderTodayAvailability();
  applyFiltersAndRender();
  showToast(`${staff.name}'s availability set to ${newAvail}`, 'info');
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
    filtered = filtered.filter(s => s.specializations.includes(currentServiceFilter));
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
    const specChips = s.specializations.map(spec => `
      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF6F0] text-[#541A1A] border border-[#DCC3AA]/50">
        <i class="fa-solid fa-check text-[9px] text-[#810B38]"></i>
        ${spec}
      </span>
    `).join('');

    return `
      <div class="bg-white rounded-3xl border border-[#DCC3AA]/70 p-6 flex flex-col justify-between hover:shadow-xl hover:border-[#810B38] transition-all duration-300 group shadow-xs">
        
        <div>
          <!-- Card Header: Avatar & Info -->
          <div class="flex items-start gap-3.5 mb-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#810B38] to-[#541A1A] text-[#F1E2D1] border border-[#DCC3AA] flex items-center justify-center font-serif text-xl font-bold shadow-md shrink-0">
              ${s.name[0]}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <h3 class="font-serif text-xl font-bold text-[#541A1A] group-hover:text-[#810B38] transition-colors truncate">
                  ${s.name}
                </h3>
                ${statusBadge}
              </div>
              <p class="text-xs text-stone-500 font-medium truncate mt-0.5">${s.position}</p>
              
              <!-- Contact Snippet -->
              <div class="flex items-center gap-3 text-[11px] text-stone-400 mt-1 font-mono">
                <span class="flex items-center gap-1"><i class="fa-solid fa-phone text-[9px] text-[#810B38]"></i>${s.phone}</span>
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
              ${s.availability}
            </span>
          </div>
        </div>

        <!-- Card Footer Actions: View Profile & Edit -->
        <div class="pt-5 border-t border-stone-100 flex items-center justify-between gap-2 mt-4">
          <button 
            type="button" 
            onclick="openStaffProfileModal('${s.id}')"
            class="flex-1 py-2 px-3 rounded-xl bg-white border border-[#DCC3AA] text-[#541A1A] hover:bg-[#FAF6F0] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
            <i class="fa-solid fa-eye text-[#810B38]"></i>
            <span>View Profile</span>
          </button>
          
          <button 
            type="button" 
            onclick="openEditStaffModal('${s.id}')"
            class="py-2 px-3 rounded-xl bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Edit</span>
          </button>

          <button 
            type="button" 
            onclick="openDeleteStaffModal('${s.id}')"
            class="w-9 h-8 rounded-xl bg-stone-100 hover:bg-rose-600 hover:text-white text-stone-600 font-semibold text-xs transition-colors flex items-center justify-center shadow-2xs"
            title="Delete Staff">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

      </div>
    `;
  }).join('');
}

// ================= STAFF PROFILE MODAL =================
function openStaffProfileModal(staffId) {
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) return;

  activeStaff = staff;

  // Header info
  const nameEl = document.getElementById('staffProfileName');
  const avatarEl = document.getElementById('staffProfileAvatar');
  const posEl = document.getElementById('staffProfilePosition');
  const statusBadgeEl = document.getElementById('staffProfileStatusBadge');
  const availBadgeEl = document.getElementById('staffProfileAvailBadge');

  if (nameEl) nameEl.textContent = staff.name;
  if (avatarEl) avatarEl.textContent = staff.name[0];
  if (posEl) posEl.textContent = staff.position;

  if (statusBadgeEl) {
    statusBadgeEl.innerHTML = staff.status === 'Active'
      ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">🟢 Active</span>`
      : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">⚪ Inactive</span>`;
  }

  if (availBadgeEl) {
    availBadgeEl.textContent = staff.availability;
  }

  // Contact info
  const phoneEl = document.getElementById('staffProfilePhone');
  const emailEl = document.getElementById('staffProfileEmail');
  const addressEl = document.getElementById('staffProfileAddress');
  const joinedEl = document.getElementById('staffProfileJoined');

  if (phoneEl) phoneEl.textContent = staff.phone;
  if (emailEl) {
    emailEl.textContent = staff.email;
    emailEl.href = `mailto:${staff.email}`;
  }
  if (addressEl) addressEl.textContent = staff.address || 'Quezon City';
  if (joinedEl) joinedEl.textContent = staff.dateJoined || 'January 2026';

  // Services Assigned Table
  renderStaffProfileServices(staff.specializations);

  // Schedule Table
  renderStaffProfileSchedule(staff.schedule);

  const modal = document.getElementById('staffProfileModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function renderStaffProfileServices(specializations) {
  const container = document.getElementById('staffProfileServicesBody');
  if (!container) return;

  container.innerHTML = specializations.map(srvName => {
    const srvData = SERVICE_CATALOG[srvName] || { priceFormatted: 'Custom', category: 'Salon Service' };
    return `
      <tr class="border-b border-stone-100 text-xs">
        <td class="px-4 py-3 font-semibold text-[#810B38] flex items-center gap-2">
          <i class="fa-solid fa-scissors text-[10px] text-[#DCC3AA]"></i>
          <span>${srvName}</span>
        </td>
        <td class="px-4 py-3 font-mono font-bold text-stone-700">${srvData.priceFormatted}</td>
      </tr>
    `;
  }).join('');
}

function renderStaffProfileSchedule(scheduleObj) {
  const container = document.getElementById('staffProfileScheduleBody');
  if (!container) return;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  container.innerHTML = days.map(day => {
    const sched = scheduleObj ? (scheduleObj[day] || '9:00 AM – 6:00 PM') : '9:00 AM – 6:00 PM';
    const isDayOff = sched.toLowerCase().includes('off');
    const badgeClass = isDayOff
      ? 'text-rose-600 bg-rose-50 border-rose-200'
      : 'text-stone-700 bg-stone-50 border-stone-200';

    return `
      <tr class="border-b border-stone-100 text-xs">
        <td class="px-4 py-2.5 font-bold text-stone-800">${day}</td>
        <td class="px-4 py-2.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded-lg border text-[11px] font-medium ${badgeClass}">
            ${sched}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function closeStaffProfileModal() {
  const modal = document.getElementById('staffProfileModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// ================= ADD / EDIT STAFF MODAL =================
function openAddStaffModal() {
  activeStaff = null;
  const form = document.getElementById('staffForm');
  if (form) form.reset();

  const titleEl = document.getElementById('staffModalTitle');
  const subEl = document.getElementById('staffModalSubtitle');
  if (titleEl) titleEl.textContent = 'Add New Staff';
  if (subEl) subEl.textContent = 'Register a new team member and assign services & schedule';

  // Populate checkboxes
  renderServiceCheckboxes([]);

  const modal = document.getElementById('staffModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function openEditStaffModal(staffId) {
  closeStaffProfileModal();
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) return;

  activeStaff = staff;

  const titleEl = document.getElementById('staffModalTitle');
  const subEl = document.getElementById('staffModalSubtitle');
  if (titleEl) titleEl.textContent = `Edit Staff: ${staff.name}`;
  if (subEl) subEl.textContent = 'Update contact info, position, assigned services, and hours';

  // Fill Inputs
  const nameInput = document.getElementById('staffName');
  const fullNameInput = document.getElementById('staffFullName');
  const phoneInput = document.getElementById('staffPhone');
  const emailInput = document.getElementById('staffEmail');
  const addressInput = document.getElementById('staffAddress');
  const posInput = document.getElementById('staffPosition');
  const statusInput = document.getElementById('staffStatus');
  const availInput = document.getElementById('staffAvailability');

  if (nameInput) nameInput.value = staff.name;
  if (fullNameInput) fullNameInput.value = staff.fullName || staff.name;
  if (phoneInput) phoneInput.value = staff.phone;
  if (emailInput) emailInput.value = staff.email;
  if (addressInput) addressInput.value = staff.address || '';
  if (posInput) posInput.value = staff.position;
  if (statusInput) statusInput.value = staff.status;
  if (availInput) availInput.value = staff.availability;

  renderServiceCheckboxes(staff.specializations);

  const modal = document.getElementById('staffModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function renderServiceCheckboxes(selectedSpecs) {
  const container = document.getElementById('staffServiceCheckboxes');
  if (!container) return;

  const services = Object.keys(SERVICE_CATALOG);
  container.innerHTML = services.map(s => {
    const isChecked = selectedSpecs.includes(s);
    return `
      <label class="flex items-center gap-2 p-2 bg-[#FAF6F0] rounded-xl border border-[#DCC3AA]/50 text-xs text-stone-800 cursor-pointer hover:bg-white transition-colors">
        <input 
          type="checkbox" 
          value="${s}" 
          name="staffServices" 
          ${isChecked ? 'checked' : ''}
          class="rounded text-[#810B38] focus:ring-[#810B38] border-[#DCC3AA]">
        <span class="font-medium">${s}</span>
      </label>
    `;
  }).join('');
}

function closeStaffModal() {
  const modal = document.getElementById('staffModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  activeStaff = null;
}

function handleSaveStaff(event) {
  event.preventDefault();

  const nameInput = document.getElementById('staffName');
  const fullNameInput = document.getElementById('staffFullName');
  const phoneInput = document.getElementById('staffPhone');
  const emailInput = document.getElementById('staffEmail');
  const addressInput = document.getElementById('staffAddress');
  const posInput = document.getElementById('staffPosition');
  const statusInput = document.getElementById('staffStatus');
  const availInput = document.getElementById('staffAvailability');

  if (!nameInput || !nameInput.value.trim()) {
    showToast('Staff display name is required.', 'error');
    return;
  }

  // Selected services
  const checkedBoxes = document.querySelectorAll('input[name="staffServices"]:checked');
  const selectedServices = Array.from(checkedBoxes).map(cb => cb.value);

  // Working Hours
  const startTime = document.getElementById('staffStartTime') ? document.getElementById('staffStartTime').value : '9:00 AM';
  const endTime = document.getElementById('staffEndTime') ? document.getElementById('staffEndTime').value : '6:00 PM';
  const defaultSchedStr = `${startTime} – ${endTime}`;

  const schedule = {
    'Monday': defaultSchedStr,
    'Tuesday': defaultSchedStr,
    'Wednesday': defaultSchedStr,
    'Thursday': defaultSchedStr,
    'Friday': defaultSchedStr,
    'Saturday': defaultSchedStr,
    'Sunday': 'Day Off'
  };

  const name = nameInput.value.trim();
  const fullName = fullNameInput && fullNameInput.value.trim() ? fullNameInput.value.trim() : name;
  const phone = phoneInput ? phoneInput.value.trim() : '09XX XXX XXXX';
  const email = emailInput ? emailInput.value.trim() : `${name.toLowerCase()}@nelyssalon.ph`;
  const address = addressInput ? addressInput.value.trim() : 'Quezon City';
  const position = posInput ? posInput.value.trim() : 'Salon Staff';
  const status = statusInput ? statusInput.value : 'Active';
  const availability = availInput ? availInput.value : 'Available';

  if (activeStaff) {
    activeStaff.name = name;
    activeStaff.fullName = fullName;
    activeStaff.phone = phone;
    activeStaff.email = email;
    activeStaff.address = address;
    activeStaff.position = position;
    activeStaff.status = status;
    activeStaff.availability = availability;
    activeStaff.specializations = selectedServices.length > 0 ? selectedServices : activeStaff.specializations;

    const idx = staffList.findIndex(s => s.id === activeStaff.id);
    if (idx !== -1) {
      staffList[idx] = activeStaff;
      saveStaff();
    }
    showToast(`Staff member ${name} updated successfully!`, 'success');
  } else {
    const newId = 'staff-' + Date.now();
    const newStaff = {
      id: newId,
      name: name,
      fullName: fullName,
      phone: phone,
      email: email,
      address: address,
      position: position,
      dateJoined: 'September 2026',
      status: status,
      availability: availability,
      specializations: selectedServices.length > 0 ? selectedServices : ['Haircut', 'Trim'],
      schedule: schedule
    };

    staffList.push(newStaff);
    saveStaff();
    showToast(`Staff member ${name} added successfully!`, 'success');
  }

  renderSummaryCards();
  renderTodayAvailability();
  applyFiltersAndRender();
  closeStaffModal();
}

// ================= DELETE STAFF MODAL =================
function openDeleteStaffModal(staffId) {
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) return;

  activeStaff = staff;

  const targetName = document.getElementById('deleteStaffNameTarget');
  if (targetName) targetName.textContent = staff.name;

  const modal = document.getElementById('deleteStaffModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDeleteStaffModal() {
  const modal = document.getElementById('deleteStaffModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  activeStaff = null;
}

function handleConfirmDeleteStaff() {
  if (!activeStaff) return;

  const name = activeStaff.name;
  staffList = staffList.filter(s => s.id !== activeStaff.id);
  saveStaff();

  renderSummaryCards();
  renderTodayAvailability();
  applyFiltersAndRender();
  closeDeleteStaffModal();

  showToast(`Staff member "${name}" removed.`, 'info');
}

// ================= HELPERS & NAVIGATION =================
function closeAllModals() {
  const modalIds = ['staffProfileModal', 'staffModal', 'deleteStaffModal', 'logoutModal'];
  modalIds.forEach(id => {
    const m = document.getElementById(id);
    if (m) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  });
}

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
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function handleConfirmLogout() {
  window.location.href = '../login.html';
}

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

function updateTimeBadge() {
  const clockEl = document.getElementById('topClockDisplay');
  if (!clockEl) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  clockEl.textContent = `${dateStr} · ${timeStr}`;

  setTimeout(updateTimeBadge, 1000);
}
