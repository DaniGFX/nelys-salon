/**
 * Nely's Salon — Admin Customers Controller
 * Manages customer directory, search & multi-filtering, sorting,
 * customer profile detail view with appointment history & notes,
 * add customer modal, edit customer, quick appointment booking, and deletion.
 */

// ================= GLOBAL STATE & INITIAL MOCK DATA =================
const CUSTOMERS_STORAGE_KEY = 'nelys_admin_customers_data';

// Default mock customers matching all specifications
const DEFAULT_CUSTOMERS = [
  {
    id: 'CUST-1001',
    name: 'Maria Santos',
    phone: '0917 888 9999',
    email: 'maria@email.com',
    dob: '1992-04-12',
    address: 'Blk 10 Lot 5, Lagro, Quezon City',
    city: 'Quezon City',
    gender: 'Female',
    joinedDate: 'January 2026',
    joinedTimestamp: '2026-01-15',
    status: 'Active',
    totalAppointments: 12,
    completedAppointments: 10,
    cancelledAppointments: 1,
    pendingAppointments: 1,
    totalSpent: 4850,
    lastVisit: 'Sept 23',
    notes: [
      {
        id: 'n1',
        text: 'Prefers afternoon appointments. Regular hair color customer.',
        date: 'Sept 10, 2026',
        author: 'Admin'
      }
    ],
    history: [
      { id: 'h1', date: 'Sept 23, 2026', service: 'Haircut', staff: 'Nely', amount: 250, status: 'Confirmed' },
      { id: 'h2', date: 'Sept 10, 2026', service: 'Hair Treatment', staff: 'Ana', amount: 600, status: 'Completed' },
      { id: 'h3', date: 'Aug 25, 2026', service: 'Hair Color', staff: 'Nely', amount: 850, status: 'Completed' },
      { id: 'h4', date: 'Aug 05, 2026', service: 'Manicure', staff: 'Ana', amount: 300, status: 'Completed' }
    ]
  },
  {
    id: 'CUST-1002',
    name: 'Angela Cruz',
    phone: '0928 777 6666',
    email: 'angela.cruz@gmail.com',
    dob: '1995-08-20',
    address: 'Ascension Avenue, Lagro, Quezon City',
    city: 'Quezon City',
    gender: 'Female',
    joinedDate: 'February 2026',
    joinedTimestamp: '2026-02-10',
    status: 'Active',
    totalAppointments: 8,
    completedAppointments: 7,
    cancelledAppointments: 0,
    pendingAppointments: 1,
    totalSpent: 3450,
    lastVisit: 'Sept 20',
    notes: [
      {
        id: 'n2',
        text: 'Sensitive scalp. Prefers natural and ammonia-free hair dyes.',
        date: 'Aug 14, 2026',
        author: 'Ana'
      }
    ],
    history: [
      { id: 'h5', date: 'Sept 20, 2026', service: 'Hair Color', staff: 'Ana', amount: 850, status: 'Completed' },
      { id: 'h6', date: 'Aug 14, 2026', service: 'Hair Treatment', staff: 'Ana', amount: 600, status: 'Completed' },
      { id: 'h7', date: 'Jul 29, 2026', service: 'Haircut', staff: 'Nely', amount: 250, status: 'Completed' }
    ]
  },
  {
    id: 'CUST-1003',
    name: 'Jamie Reyes',
    phone: '0919 555 4433',
    email: 'jamie.reyes@yahoo.com',
    dob: '1998-11-03',
    address: 'Fairview, Quezon City',
    city: 'Quezon City',
    gender: 'Female',
    joinedDate: 'March 2026',
    joinedTimestamp: '2026-03-22',
    status: 'Active',
    totalAppointments: 5,
    completedAppointments: 4,
    cancelledAppointments: 0,
    pendingAppointments: 1,
    totalSpent: 1900,
    lastVisit: 'Sept 15',
    notes: [
      {
        id: 'n3',
        text: 'Always requests gel nail art with pastel undertones.',
        date: 'Sept 15, 2026',
        author: 'Nely'
      }
    ],
    history: [
      { id: 'h8', date: 'Sept 15, 2026', service: 'Manicure', staff: 'Nely', amount: 300, status: 'Completed' },
      { id: 'h9', date: 'Aug 12, 2026', service: 'Pedicure', staff: 'Nely', amount: 350, status: 'Completed' },
      { id: 'h10', date: 'Jul 04, 2026', service: 'Foot Spa', staff: 'Elena', amount: 450, status: 'Completed' }
    ]
  },
  {
    id: 'CUST-1004',
    name: 'Carla Dela Cruz',
    phone: '0995 222 1100',
    email: 'carla.delacruz@outlook.com',
    dob: '1989-01-30',
    address: 'Neopolitan, Novaliches, Quezon City',
    city: 'Quezon City',
    gender: 'Female',
    joinedDate: 'January 2026',
    joinedTimestamp: '2026-01-05',
    status: 'Active',
    totalAppointments: 15,
    completedAppointments: 13,
    cancelledAppointments: 1,
    pendingAppointments: 1,
    totalSpent: 7200,
    lastVisit: 'Sept 22',
    notes: [
      {
        id: 'n4',
        text: 'VIP loyal regular patron. Prefers Ana for hair rejuvenation treatments.',
        date: 'Sept 22, 2026',
        author: 'Admin'
      }
    ],
    history: [
      { id: 'h11', date: 'Sept 22, 2026', service: 'Hair Treatment', staff: 'Ana', amount: 600, status: 'Confirmed' },
      { id: 'h12', date: 'Sept 08, 2026', service: 'Haircut', staff: 'Nely', amount: 250, status: 'Completed' },
      { id: 'h13', date: 'Aug 19, 2026', service: 'Hair Color', staff: 'Ana', amount: 850, status: 'Completed' }
    ]
  },
  {
    id: 'CUST-1005',
    name: 'Sophia Reyes',
    phone: '0917 444 3322',
    email: 'sophia.reyes@gmail.com',
    dob: '2001-06-18',
    address: 'Greater Lagro, Quezon City',
    city: 'Quezon City',
    gender: 'Female',
    joinedDate: 'June 2026',
    joinedTimestamp: '2026-06-18',
    status: 'Inactive',
    totalAppointments: 2,
    completedAppointments: 2,
    cancelledAppointments: 0,
    pendingAppointments: 0,
    totalSpent: 700,
    lastVisit: 'Aug 30',
    notes: [
      {
        id: 'n5',
        text: 'Needs SMS reminder calls 2 hours before scheduled salon slot.',
        date: 'Aug 30, 2026',
        author: 'Elena'
      }
    ],
    history: [
      { id: 'h14', date: 'Aug 30, 2026', service: 'Pedicure', staff: 'Nely', amount: 350, status: 'Completed' },
      { id: 'h15', date: 'Jun 25, 2026', service: 'Manicure', staff: 'Nely', amount: 350, status: 'Completed' }
    ]
  },
  {
    id: 'CUST-1006',
    name: 'Patricia Gomez',
    phone: '0920 111 4477',
    email: 'patricia.g@yahoo.com',
    dob: '1994-09-14',
    address: 'San Jose del Monte, Bulacan',
    city: 'Bulacan',
    gender: 'Female',
    joinedDate: 'September 2026',
    joinedTimestamp: '2026-09-02',
    status: 'Active',
    totalAppointments: 3,
    completedAppointments: 2,
    cancelledAppointments: 0,
    pendingAppointments: 1,
    totalSpent: 1650,
    lastVisit: 'Sept 19',
    notes: [
      {
        id: 'n6',
        text: 'Travels from SJDM. Book back-to-back hair and foot services if possible.',
        date: 'Sept 02, 2026',
        author: 'Admin'
      }
    ],
    history: [
      { id: 'h16', date: 'Sept 19, 2026', service: 'Haircut', staff: 'Nely', amount: 250, status: 'Completed' },
      { id: 'h17', date: 'Sept 02, 2026', service: 'Hair Color', staff: 'Ana', amount: 850, status: 'Completed' }
    ]
  },
  {
    id: 'CUST-1007',
    name: 'Joshua Garcia',
    phone: '0933 666 8899',
    email: 'joshua.garcia@outlook.com',
    dob: '1997-03-25',
    address: 'Fairview Park, Quezon City',
    city: 'Quezon City',
    gender: 'Male',
    joinedDate: 'September 2026',
    joinedTimestamp: '2026-09-12',
    status: 'Active',
    totalAppointments: 1,
    completedAppointments: 1,
    cancelledAppointments: 0,
    pendingAppointments: 0,
    totalSpent: 300,
    lastVisit: 'Sept 12',
    notes: [],
    history: [
      { id: 'h18', date: 'Sept 12, 2026', service: 'Men’s Fade Cut', staff: 'Nely', amount: 300, status: 'Completed' }
    ]
  },
  {
    id: 'CUST-1008',
    name: 'Katrina Halili',
    phone: '0918 999 0011',
    email: 'katrina.h@gmail.com',
    dob: '1986-12-05',
    address: 'Novaliches, Quezon City',
    city: 'Quezon City',
    gender: 'Female',
    joinedDate: 'April 2026',
    joinedTimestamp: '2026-04-18',
    status: 'Active',
    totalAppointments: 9,
    completedAppointments: 8,
    cancelledAppointments: 1,
    pendingAppointments: 0,
    totalSpent: 5350,
    lastVisit: 'Sept 14',
    notes: [
      {
        id: 'n7',
        text: 'Loves Moroccan Argan oil treatments.',
        date: 'May 04, 2026',
        author: 'Ana'
      }
    ],
    history: [
      { id: 'h19', date: 'Sept 14, 2026', service: 'Hair Treatment', staff: 'Ana', amount: 600, status: 'Completed' },
      { id: 'h20', date: 'Aug 02, 2026', service: 'Hair Color', staff: 'Nely', amount: 850, status: 'Completed' }
    ]
  }
];

// In-memory customer state
let customers = [];
let activeCustomer = null;
let activeKebabDropdown = null;

// Filter and sorting states
let currentSearch = '';
let currentStatusFilter = 'all';
let currentGenderFilter = 'all';
let currentDateFilter = 'all';
let currentSort = 'newest';

// ================= LOCAL STORAGE HELPERS =================
function loadCustomers() {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (raw) {
      customers = JSON.parse(raw);
    } else {
      customers = JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS));
      saveCustomers();
    }
  } catch (err) {
    console.error('Error loading customers from storage:', err);
    customers = JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS));
  }
}

function saveCustomers() {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  } catch (err) {
    console.error('Error saving customers to storage:', err);
  }
}

// ================= DOM INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  loadCustomers();
  renderSummaryCards();
  applyFiltersAndRender();
  setupEventListeners();
  updateTimeBadge();
});

// Setup DOM event listeners
function setupEventListeners() {
  // Global search input
  const searchInput = document.getElementById('customerSearchInput');
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

  // Gender Filter
  const genderFilter = document.getElementById('genderFilter');
  if (genderFilter) {
    genderFilter.addEventListener('change', (e) => {
      currentGenderFilter = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Date Joined Filter
  const dateFilter = document.getElementById('dateFilter');
  if (dateFilter) {
    dateFilter.addEventListener('change', (e) => {
      currentDateFilter = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Sort Dropdown
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Close kebab dropdown when clicking outside
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
  // Summary card counts: 248 total, 18 new this month, 32 upcoming, 86 returning
  // We can calculate dynamically based on full mock statistics
  const totalCountEl = document.getElementById('statTotalCustomers');
  const newMonthEl = document.getElementById('statNewThisMonth');
  const upcomingEl = document.getElementById('statUpcoming');
  const returningEl = document.getElementById('statReturning');

  if (totalCountEl) totalCountEl.textContent = '248';
  if (newMonthEl) newMonthEl.textContent = '18';
  if (upcomingEl) upcomingEl.textContent = '32';
  if (returningEl) returningEl.textContent = '86';
}

// ================= FILTERING & SORTING LOGIC =================
function applyFiltersAndRender() {
  closeAllKebabMenus();

  let filtered = [...customers];

  // 1. Search filter (Name, Phone, Email, Address, Notes)
  if (currentSearch) {
    filtered = filtered.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(currentSearch);
      const phoneMatch = c.phone.toLowerCase().includes(currentSearch);
      const emailMatch = c.email.toLowerCase().includes(currentSearch);
      const cityMatch = c.city ? c.city.toLowerCase().includes(currentSearch) : false;
      const notesMatch = c.notes.some(n => n.text.toLowerCase().includes(currentSearch));
      return nameMatch || phoneMatch || emailMatch || cityMatch || notesMatch;
    });
  }

  // 2. Status filter
  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(c => c.status.toLowerCase() === currentStatusFilter.toLowerCase());
  }

  // 3. Gender filter
  if (currentGenderFilter !== 'all') {
    filtered = filtered.filter(c => c.gender && c.gender.toLowerCase() === currentGenderFilter.toLowerCase());
  }

  // 4. Date Joined filter
  if (currentDateFilter !== 'all') {
    filtered = filtered.filter(c => {
      if (currentDateFilter === 'this_month') {
        return c.joinedTimestamp && c.joinedTimestamp.startsWith('2026-09');
      } else if (currentDateFilter === 'last_3_months') {
        return c.joinedTimestamp && (c.joinedTimestamp >= '2026-06-01');
      } else if (currentDateFilter === 'this_year') {
        return c.joinedTimestamp && c.joinedTimestamp.startsWith('2026');
      }
      return true;
    });
  }

  // 5. Sorting
  if (currentSort === 'newest') {
    filtered.sort((a, b) => (b.joinedTimestamp || '').localeCompare(a.joinedTimestamp || ''));
  } else if (currentSort === 'oldest') {
    filtered.sort((a, b) => (a.joinedTimestamp || '').localeCompare(b.joinedTimestamp || ''));
  } else if (currentSort === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSort === 'most_appointments') {
    filtered.sort((a, b) => (b.totalAppointments || 0) - (a.totalAppointments || 0));
  }

  renderCustomerTable(filtered);
}

// Reset all search and filter controls
function resetFilters() {
  currentSearch = '';
  currentStatusFilter = 'all';
  currentGenderFilter = 'all';
  currentDateFilter = 'all';
  currentSort = 'newest';

  const sInput = document.getElementById('customerSearchInput');
  if (sInput) sInput.value = '';

  const sStatus = document.getElementById('statusFilter');
  if (sStatus) sStatus.value = 'all';

  const sGender = document.getElementById('genderFilter');
  if (sGender) sGender.value = 'all';

  const sDate = document.getElementById('dateFilter');
  if (sDate) sDate.value = 'all';

  const sSort = document.getElementById('sortSelect');
  if (sSort) sSort.value = 'newest';

  applyFiltersAndRender();
  showToast('Filters have been reset', 'info');
}

// Summary card click shortcuts
function filterBySummaryCard(filterType) {
  if (filterType === 'all') {
    currentStatusFilter = 'all';
    currentDateFilter = 'all';
  } else if (filterType === 'new_month') {
    currentDateFilter = 'this_month';
    const sDate = document.getElementById('dateFilter');
    if (sDate) sDate.value = 'this_month';
  } else if (filterType === 'upcoming') {
    currentStatusFilter = 'Active';
    const sStatus = document.getElementById('statusFilter');
    if (sStatus) sStatus.value = 'Active';
  } else if (filterType === 'returning') {
    currentSort = 'most_appointments';
    const sSort = document.getElementById('sortSelect');
    if (sSort) sSort.value = 'most_appointments';
  }
  applyFiltersAndRender();
}

// ================= RENDER CUSTOMER TABLE =================
function renderCustomerTable(items) {
  const tableBody = document.getElementById('customersTableBody');
  const emptyState = document.getElementById('customersEmptyState');
  const tableContainer = document.getElementById('customersTableContainer');
  const resultsCount = document.getElementById('customersResultCount');

  if (resultsCount) {
    resultsCount.textContent = `Showing ${items.length} customer${items.length === 1 ? '' : 's'}`;
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

  tableBody.innerHTML = items.map(c => {
    // Generate initials for avatar
    const initials = c.name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0].toUpperCase())
      .slice(0, 2)
      .join('');

    // Status Badge
    const isActive = c.status === 'Active';
    const statusBadge = isActive
      ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
           <i class="fa-solid fa-circle text-[8px] text-emerald-500"></i>
           Active
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
           <i class="fa-solid fa-circle text-[8px] text-neutral-400"></i>
           Inactive
         </span>`;

    // Appointments count badge
    const apptBadgeColor = c.totalAppointments >= 10
      ? 'bg-[#810B38] text-white'
      : c.totalAppointments >= 5
        ? 'bg-[#DCC3AA] text-[#541A1A]'
        : 'bg-stone-200 text-stone-700';

    return `
      <tr class="border-b border-[#F1E2D1]/60 hover:bg-[#FAF6F0]/60 transition-colors group">
        <!-- Customer (Avatar, Name, Email) -->
        <td class="px-5 py-4">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#810B38] to-[#541A1A] text-[#F1E2D1] border border-[#DCC3AA] flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              ${initials}
            </div>
            <div>
              <button 
                type="button" 
                onclick="openCustomerProfileModal('${c.id}')"
                class="font-serif font-bold text-sm text-[#541A1A] hover:text-[#810B38] transition-colors text-left group-hover:underline">
                ${c.name}
              </button>
              <div class="text-xs text-stone-500 font-mono mt-0.5">
                ${c.email}
              </div>
            </div>
          </div>
        </td>

        <!-- Contact (Phone, City) -->
        <td class="px-5 py-4">
          <div class="text-xs font-semibold text-stone-800 font-mono flex items-center gap-1.5">
            <i class="fa-solid fa-phone text-[10px] text-[#810B38]/60"></i>
            ${c.phone}
          </div>
          <div class="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
            <i class="fa-solid fa-location-dot text-[10px] text-stone-400"></i>
            ${c.city || 'Quezon City'}
          </div>
        </td>

        <!-- Appointments -->
        <td class="px-5 py-4">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${apptBadgeColor} shadow-xs">
              ${c.totalAppointments}
            </span>
            <span class="text-xs text-stone-500">visits</span>
          </div>
        </td>

        <!-- Last Visit -->
        <td class="px-5 py-4">
          <div class="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
            <i class="fa-solid fa-calendar-day text-[11px] text-[#DCC3AA]"></i>
            ${c.lastVisit}
          </div>
          <div class="text-[11px] text-stone-400 mt-0.5">
            Spent ₱${c.totalSpent.toLocaleString()}
          </div>
        </td>

        <!-- Status -->
        <td class="px-5 py-4">
          ${statusBadge}
        </td>

        <!-- Action (Kebab ⋮ Menu) -->
        <td class="px-5 py-4 text-right">
          <div class="relative inline-block text-left kebab-menu-container">
            <button 
              type="button" 
              onclick="toggleKebabMenu(event, '${c.id}')"
              class="w-8 h-8 rounded-lg bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-600 transition-colors flex items-center justify-center text-sm shadow-xs focus:outline-none"
              aria-label="Actions for ${c.name}">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>

            <!-- Dropdown Menu -->
            <div 
              id="kebab-menu-${c.id}" 
              class="hidden absolute right-0 mt-1 w-48 bg-white border border-[#DCC3AA]/50 rounded-xl shadow-xl z-30 py-1.5 text-left text-xs divide-y divide-stone-100">
              
              <div class="py-1">
                <!-- View Profile -->
                <button 
                  type="button" 
                  onclick="openCustomerProfileModal('${c.id}')"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-[#810B38] font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-eye text-[#810B38] w-4 text-center"></i>
                  <span>View Profile</span>
                </button>

                <!-- Edit Customer -->
                <button 
                  type="button" 
                  onclick="openEditCustomerModal('${c.id}')"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-[#810B38] font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-pen-to-square text-[#810B38] w-4 text-center"></i>
                  <span>Edit Customer</span>
                </button>
              </div>

              <div class="py-1">
                <!-- Book Appointment -->
                <button 
                  type="button" 
                  onclick="openBookForCustomerModal('${c.id}')"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-emerald-700 font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-calendar-plus text-emerald-600 w-4 text-center"></i>
                  <span>Book Appointment</span>
                </button>

                <!-- View History -->
                <button 
                  type="button" 
                  onclick="openCustomerHistoryModal('${c.id}')"
                  class="w-full px-3.5 py-2 text-stone-700 hover:bg-[#FAF6F0] hover:text-indigo-700 font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-clock-rotate-left text-indigo-600 w-4 text-center"></i>
                  <span>View History</span>
                </button>
              </div>

              <div class="py-1">
                <!-- Delete Customer -->
                <button 
                  type="button" 
                  onclick="openDeleteCustomerModal('${c.id}')"
                  class="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2.5 transition-colors">
                  <i class="fa-solid fa-trash-can text-rose-600 w-4 text-center"></i>
                  <span>Delete Customer</span>
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
function toggleKebabMenu(event, customerId) {
  event.stopPropagation();
  const menu = document.getElementById(`kebab-menu-${customerId}`);
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

// ================= CUSTOMER PROFILE MODAL =================
function openCustomerProfileModal(customerId, focusHistory = false) {
  closeAllKebabMenus();
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  activeCustomer = customer;

  // Initials
  const initials = customer.name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0].toUpperCase())
    .slice(0, 2)
    .join('');

  // 1. Populate Profile Header & Contact
  const nameEl = document.getElementById('profileModalCustomerName');
  const avatarEl = document.getElementById('profileModalAvatar');
  const phoneEl = document.getElementById('profileModalPhone');
  const emailEl = document.getElementById('profileModalEmail');
  const addressEl = document.getElementById('profileModalAddress');
  const sinceEl = document.getElementById('profileModalSince');
  const statusBadgeEl = document.getElementById('profileModalStatusBadge');

  if (nameEl) nameEl.textContent = customer.name;
  if (avatarEl) avatarEl.textContent = initials;
  if (phoneEl) phoneEl.textContent = customer.phone;
  if (emailEl) {
    emailEl.textContent = customer.email;
    emailEl.href = `mailto:${customer.email}`;
  }
  if (addressEl) addressEl.textContent = customer.address || customer.city || 'Quezon City';
  if (sinceEl) sinceEl.textContent = `Customer since: ${customer.joinedDate || 'January 2026'}`;

  if (statusBadgeEl) {
    const isActive = customer.status === 'Active';
    statusBadgeEl.innerHTML = isActive
      ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
           <i class="fa-solid fa-circle text-[8px] text-emerald-500"></i>
           Active
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">
           <i class="fa-solid fa-circle text-[8px] text-stone-400"></i>
           Inactive
         </span>`;
  }

  // 2. Customer Statistics
  const statTotal = document.getElementById('profileModalStatTotal');
  const statCompleted = document.getElementById('profileModalStatCompleted');
  const statCancelled = document.getElementById('profileModalStatCancelled');
  const statPending = document.getElementById('profileModalStatPending');
  const statSpent = document.getElementById('profileModalStatSpent');

  if (statTotal) statTotal.textContent = customer.totalAppointments || customer.history.length;
  if (statCompleted) statCompleted.textContent = customer.completedAppointments || 0;
  if (statCancelled) statCancelled.textContent = customer.cancelledAppointments || 0;
  if (statPending) statPending.textContent = customer.pendingAppointments || 0;
  if (statSpent) statSpent.textContent = `₱${(customer.totalSpent || 0).toLocaleString()}`;

  // 3. Appointment History Table
  renderProfileHistory(customer.history);

  // 4. Customer Internal Notes
  renderProfileNotes(customer.notes);

  // Open Modal
  const modal = document.getElementById('customerProfileModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  if (focusHistory) {
    const historySection = document.getElementById('profileModalHistorySection');
    if (historySection) {
      historySection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// Render Appointment History Table inside Customer Profile
function renderProfileHistory(historyList) {
  const container = document.getElementById('profileHistoryTableBody');
  if (!container) return;

  if (!historyList || historyList.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-xs text-stone-400 italic">
          No appointment history recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = historyList.map(h => {
    let statusClass = 'bg-stone-100 text-stone-700 border-stone-200';
    let icon = 'fa-circle';
    if (h.status === 'Confirmed') {
      statusClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      icon = 'fa-circle-check text-emerald-500';
    } else if (h.status === 'Completed') {
      statusClass = 'bg-blue-50 text-blue-800 border-blue-200';
      icon = 'fa-check text-blue-500';
    } else if (h.status === 'Pending') {
      statusClass = 'bg-amber-50 text-amber-800 border-amber-200';
      icon = 'fa-clock text-amber-500';
    } else if (h.status === 'Cancelled') {
      statusClass = 'bg-rose-50 text-rose-800 border-rose-200';
      icon = 'fa-xmark text-rose-500';
    }

    return `
      <tr class="border-b border-stone-100 hover:bg-[#FAF6F0]/50 transition-colors text-xs">
        <td class="px-4 py-3 font-medium text-stone-800">${h.date}</td>
        <td class="px-4 py-3 font-semibold text-[#810B38]">${h.service}</td>
        <td class="px-4 py-3 text-stone-600">${h.staff}</td>
        <td class="px-4 py-3 font-mono font-bold text-stone-800">₱${h.amount.toLocaleString()}</td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusClass}">
            <i class="fa-solid ${icon} text-[9px]"></i>
            ${h.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Notes inside Customer Profile
function renderProfileNotes(notesList) {
  const container = document.getElementById('profileNotesList');
  if (!container) return;

  if (!notesList || notesList.length === 0) {
    container.innerHTML = `
      <p class="text-xs text-stone-400 italic py-2">
        No internal notes added for this customer yet.
      </p>
    `;
    return;
  }

  container.innerHTML = notesList.map(n => `
    <div class="p-3 bg-[#FAF6F0] rounded-xl border border-[#DCC3AA]/50 text-xs text-stone-800 flex items-start justify-between gap-3">
      <div class="flex items-start gap-2.5">
        <i class="fa-solid fa-note-sticky text-[#810B38] mt-0.5 text-sm shrink-0"></i>
        <div>
          <p class="leading-relaxed font-medium">${n.text}</p>
          <div class="text-[10px] text-stone-500 mt-1 flex items-center gap-2">
            <span><i class="fa-regular fa-clock mr-1"></i>${n.date}</span>
            <span>·</span>
            <span>By ${n.author || 'Admin'}</span>
          </div>
        </div>
      </div>
      <button 
        type="button" 
        onclick="deleteCustomerNote('${n.id}')"
        class="text-stone-400 hover:text-rose-600 transition-colors p-1"
        title="Delete note">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  `).join('');
}

// Shortcut to view history tab directly
function openCustomerHistoryModal(customerId) {
  openCustomerProfileModal(customerId, true);
}

// Toggle Note Input Form
function toggleAddNoteInput(show) {
  const form = document.getElementById('addNoteInlineForm');
  const btn = document.getElementById('toggleAddNoteBtn');
  const noteInput = document.getElementById('newNoteInputText');

  if (form) {
    if (show) {
      form.classList.remove('hidden');
      if (btn) btn.classList.add('hidden');
      if (noteInput) noteInput.focus();
    } else {
      form.classList.add('hidden');
      if (btn) btn.classList.remove('hidden');
      if (noteInput) noteInput.value = '';
    }
  }
}

// Save New Internal Note to Active Customer
function saveCustomerNote() {
  if (!activeCustomer) return;
  const noteInput = document.getElementById('newNoteInputText');
  if (!noteInput || !noteInput.value.trim()) {
    showToast('Please type a note before saving.', 'error');
    return;
  }

  const newNote = {
    id: 'note_' + Date.now(),
    text: noteInput.value.trim(),
    date: 'Sept 23, 2026',
    author: 'Admin'
  };

  if (!activeCustomer.notes) activeCustomer.notes = [];
  activeCustomer.notes.unshift(newNote);

  // Sync to master array and local storage
  const idx = customers.findIndex(c => c.id === activeCustomer.id);
  if (idx !== -1) {
    customers[idx] = activeCustomer;
    saveCustomers();
  }

  renderProfileNotes(activeCustomer.notes);
  toggleAddNoteInput(false);
  showToast('Customer note added successfully!', 'success');
}

// Delete Note from Active Customer
function deleteCustomerNote(noteId) {
  if (!activeCustomer || !activeCustomer.notes) return;
  activeCustomer.notes = activeCustomer.notes.filter(n => n.id !== noteId);

  const idx = customers.findIndex(c => c.id === activeCustomer.id);
  if (idx !== -1) {
    customers[idx] = activeCustomer;
    saveCustomers();
  }

  renderProfileNotes(activeCustomer.notes);
  showToast('Note removed', 'info');
}

// Close Customer Profile Modal
function closeCustomerProfileModal() {
  const modal = document.getElementById('customerProfileModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  toggleAddNoteInput(false);
}

// ================= ADD NEW CUSTOMER MODAL =================
function openAddCustomerModal() {
  closeAllKebabMenus();
  const form = document.getElementById('addCustomerForm');
  if (form) form.reset();

  const modal = document.getElementById('addCustomerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleSaveCustomer(event) {
  event.preventDefault();

  const nameInput = document.getElementById('addCustName');
  const phoneInput = document.getElementById('addCustPhone');
  const emailInput = document.getElementById('addCustEmail');
  const dobInput = document.getElementById('addCustDob');
  const addressInput = document.getElementById('addCustAddress');
  const genderInput = document.getElementById('addCustGender');
  const notesInput = document.getElementById('addCustNotes');

  if (!nameInput || !nameInput.value.trim()) {
    showToast('Please enter the customer full name.', 'error');
    return;
  }

  if (!phoneInput || !phoneInput.value.trim()) {
    showToast('Please enter a contact phone number.', 'error');
    return;
  }

  const newId = 'CUST-' + (1000 + customers.length + 1);
  const fullName = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput && emailInput.value.trim() ? emailInput.value.trim() : `${fullName.toLowerCase().replace(/\s+/g, '')}@email.com`;
  const dob = dobInput ? dobInput.value : '';
  const address = addressInput && addressInput.value.trim() ? addressInput.value.trim() : 'Quezon City';
  const gender = genderInput ? genderInput.value : 'Female';
  const notesText = notesInput ? notesInput.value.trim() : '';

  const initialNotes = notesText ? [
    {
      id: 'n_' + Date.now(),
      text: notesText,
      date: 'Sept 23, 2026',
      author: 'Admin'
    }
  ] : [];

  const newCustomerObj = {
    id: newId,
    name: fullName,
    phone: phone,
    email: email,
    dob: dob,
    address: address,
    city: 'Quezon City',
    gender: gender,
    joinedDate: 'September 2026',
    joinedTimestamp: '2026-09-23',
    status: 'Active',
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    pendingAppointments: 0,
    totalSpent: 0,
    lastVisit: 'None yet',
    notes: initialNotes,
    history: []
  };

  customers.unshift(newCustomerObj);
  saveCustomers();
  applyFiltersAndRender();
  closeAddCustomerModal();

  showToast(`Customer ${fullName} successfully registered!`, 'success');
}

// ================= EDIT CUSTOMER MODAL =================
function openEditCustomerModal(customerId) {
  closeAllKebabMenus();
  closeCustomerProfileModal();

  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  activeCustomer = customer;

  // Pre-fill inputs
  const idInput = document.getElementById('editCustId');
  const nameInput = document.getElementById('editCustName');
  const phoneInput = document.getElementById('editCustPhone');
  const emailInput = document.getElementById('editCustEmail');
  const dobInput = document.getElementById('editCustDob');
  const addressInput = document.getElementById('editCustAddress');
  const genderInput = document.getElementById('editCustGender');
  const statusInput = document.getElementById('editCustStatus');

  if (idInput) idInput.value = customer.id;
  if (nameInput) nameInput.value = customer.name;
  if (phoneInput) phoneInput.value = customer.phone;
  if (emailInput) emailInput.value = customer.email;
  if (dobInput) dobInput.value = customer.dob || '';
  if (addressInput) addressInput.value = customer.address || '';
  if (genderInput) genderInput.value = customer.gender || 'Female';
  if (statusInput) statusInput.value = customer.status || 'Active';

  const modal = document.getElementById('editCustomerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeEditCustomerModal() {
  const modal = document.getElementById('editCustomerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleSaveEditCustomer(event) {
  event.preventDefault();
  if (!activeCustomer) return;

  const nameInput = document.getElementById('editCustName');
  const phoneInput = document.getElementById('editCustPhone');
  const emailInput = document.getElementById('editCustEmail');
  const dobInput = document.getElementById('editCustDob');
  const addressInput = document.getElementById('editCustAddress');
  const genderInput = document.getElementById('editCustGender');
  const statusInput = document.getElementById('editCustStatus');

  if (!nameInput || !nameInput.value.trim()) {
    showToast('Name cannot be empty.', 'error');
    return;
  }

  activeCustomer.name = nameInput.value.trim();
  activeCustomer.phone = phoneInput ? phoneInput.value.trim() : activeCustomer.phone;
  activeCustomer.email = emailInput ? emailInput.value.trim() : activeCustomer.email;
  activeCustomer.dob = dobInput ? dobInput.value : activeCustomer.dob;
  activeCustomer.address = addressInput ? addressInput.value.trim() : activeCustomer.address;
  activeCustomer.gender = genderInput ? genderInput.value : activeCustomer.gender;
  activeCustomer.status = statusInput ? statusInput.value : activeCustomer.status;

  const idx = customers.findIndex(c => c.id === activeCustomer.id);
  if (idx !== -1) {
    customers[idx] = activeCustomer;
    saveCustomers();
  }

  applyFiltersAndRender();
  closeEditCustomerModal();
  showToast('Customer record updated successfully!', 'success');
}

// ================= BOOK APPOINTMENT FOR CUSTOMER =================
function openBookForCustomerModal(customerId) {
  closeAllKebabMenus();
  closeCustomerProfileModal();

  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  activeCustomer = customer;

  const nameEl = document.getElementById('bookForCustomerName');
  const phoneEl = document.getElementById('bookForCustomerPhone');
  const dateInput = document.getElementById('bookForDate');

  if (nameEl) nameEl.textContent = customer.name;
  if (phoneEl) phoneEl.textContent = customer.phone;
  if (dateInput) dateInput.value = '2026-09-24';

  const modal = document.getElementById('bookForCustomerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeBookForCustomerModal() {
  const modal = document.getElementById('bookForCustomerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleConfirmBookForCustomer(event) {
  event.preventDefault();
  if (!activeCustomer) return;

  const serviceSelect = document.getElementById('bookForService');
  const staffSelect = document.getElementById('bookForStaff');
  const dateInput = document.getElementById('bookForDate');
  const timeSelect = document.getElementById('bookForTime');

  const service = serviceSelect ? serviceSelect.value : 'Haircut';
  const staff = staffSelect ? staffSelect.value : 'Nely';
  const dateVal = dateInput ? dateInput.value : 'Sept 24, 2026';
  const timeVal = timeSelect ? timeSelect.value : '10:00 AM';

  const servicePrices = {
    'Haircut': 250,
    'Hair Color': 850,
    'Hair Treatment': 600,
    'Manicure': 300,
    'Pedicure': 350,
    'Foot Spa': 450
  };
  const amount = servicePrices[service] || 350;

  // Add to activeCustomer's history
  const newAppointment = {
    id: 'apt_' + Date.now(),
    date: `${dateVal}, ${timeVal}`,
    service: service,
    staff: staff,
    amount: amount,
    status: 'Confirmed'
  };

  if (!activeCustomer.history) activeCustomer.history = [];
  activeCustomer.history.unshift(newAppointment);
  activeCustomer.totalAppointments = (activeCustomer.totalAppointments || 0) + 1;
  activeCustomer.lastVisit = 'Sept 24';

  const idx = customers.findIndex(c => c.id === activeCustomer.id);
  if (idx !== -1) {
    customers[idx] = activeCustomer;
    saveCustomers();
  }

  applyFiltersAndRender();
  closeBookForCustomerModal();
  showToast(`Appointment booked for ${activeCustomer.name}!`, 'success');
}

// ================= DELETE CUSTOMER =================
function openDeleteCustomerModal(customerId) {
  closeAllKebabMenus();
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;

  activeCustomer = customer;

  const nameEl = document.getElementById('deleteCustomerNameTarget');
  if (nameEl) nameEl.textContent = customer.name;

  const modal = document.getElementById('deleteCustomerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDeleteCustomerModal() {
  const modal = document.getElementById('deleteCustomerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleConfirmDeleteCustomer() {
  if (!activeCustomer) return;

  const deletedName = activeCustomer.name;
  customers = customers.filter(c => c.id !== activeCustomer.id);
  saveCustomers();

  applyFiltersAndRender();
  closeDeleteCustomerModal();
  showToast(`Customer ${deletedName} deleted from records.`, 'info');
}

// ================= MODAL HELPERS =================
function closeAllModals() {
  const modalIds = [
    'customerProfileModal',
    'addCustomerModal',
    'editCustomerModal',
    'bookForCustomerModal',
    'deleteCustomerModal',
    'logoutModal'
  ];
  modalIds.forEach(id => {
    const m = document.getElementById(id);
    if (m) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  });
  closeAllKebabMenus();
}

// ================= MOBILE NAVIGATION =================
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

// Toast notification system
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
