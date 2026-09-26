// Seamless 0ms Cache Preload
const SERVICES_CACHE_KEY = 'nelys_admin_services_cache';
let lastRendered_services_Hash = '';
/**
 * Nely's Salon — Admin Services Controller
 * Directly connected to backend database API (/api/services)
 * Manages service catalog, live pricing & duration, active/inactive toggles,
 * real-time search & category filtering, modal Add/Edit/Delete, and sidebar badge updates.
 */

// ================= GLOBAL STATE =================
let servicesData = [];
let summaryMetrics = {
  total: 0,
  active: 0,
  inactive: 0
};

// Filter & Sort State
let filterState = {
  search: '',
  category: 'all',
  status: 'all',
  sortBy: 'default'
};

// Active service context for modals
let activeService = null;
let isModalScrollLocked = false;

// ================= INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupEventListeners();
  setupModalSteadyListeners();
  updateTimeBadge();
  fetchServicesData();
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
      console.warn('Error parsing admin user:', e);
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

// ================= FETCH DATA FROM DATABASE =================
async function fetchServicesData() {
  try {
    const res = await fetch('../api/services?all=true', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('Admin session expired or unauthenticated.');
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch services data`);
    }

    const json = await res.json();
    let rawServices = [];
    if (json.data) {
      if (Array.isArray(json.data)) {
        rawServices = json.data;
      } else if (json.data.services && Array.isArray(json.data.services)) {
        rawServices = json.data.services;
        if (json.data.metrics) {
          summaryMetrics = json.data.metrics;
        }
      }
    }

    // Map raw database rows to UI schema
    servicesData = rawServices.map(mapServiceRecord);

    // Compute metrics if not returned from backend
    computeSummaryMetrics();

    // Render stats & UI
    renderSummaryCards();
    applyFiltersAndRender();

  } catch (err) {
    console.error('Error fetching services from backend:', err);
    showToast('Failed to load services from server. Please refresh.', 'error');
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

// Map service record from DB to normalized object
function mapServiceRecord(item) {
  const categoryRaw = item.category || 'Hair Services';
  const categoryNormalized = categoryRaw.trim();
  
  let icon = 'fa-sparkles';
  const lowerCat = categoryNormalized.toLowerCase();
  if (lowerCat.includes('hair')) {
    icon = 'fa-scissors';
  } else if (lowerCat.includes('nail') || lowerCat.includes('foot') || lowerCat.includes('mani') || lowerCat.includes('pedi')) {
    icon = lowerCat.includes('foot') ? 'fa-spa' : 'fa-hand-sparkles';
  } else if (lowerCat.includes('spa') || lowerCat.includes('massage')) {
    icon = 'fa-spa';
  }

  const durationMin = parseInt(item.duration_minutes || 60, 10);
  let durationLabel = `${durationMin} mins`;
  if (durationMin >= 60) {
    const hrs = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    durationLabel = mins > 0 ? `${hrs} hr ${mins} mins` : `${hrs} hr${hrs > 1 ? 's' : ''}`;
  }

  const isPriceNotSet = item.price === null || item.price === undefined || item.price === '' || String(item.price).trim() === '';
  const numericPrice = isPriceNotSet ? null : parseFloat(item.price);

  const isActive = item.is_active === 1 || item.is_active === '1' || item.is_active === true || item.is_active === 'active';

  return {
    id: parseInt(item.id, 10),
    code: item.code || '',
    name: item.name || 'Untitled Service',
    category: categoryNormalized,
    categoryLabel: categoryNormalized,
    price: numericPrice,
    isPriceNotSet: isPriceNotSet,
    duration: durationMin,
    durationLabel: durationLabel,
    description: item.description || '',
    status: isActive ? 'Active' : 'Inactive',
    is_active: isActive ? 1 : 0,
    icon: icon
  };
}

function computeSummaryMetrics() {
  summaryMetrics.total = servicesData.length;
  summaryMetrics.active = servicesData.filter(s => s.status === 'Active').length;
  summaryMetrics.inactive = servicesData.filter(s => s.status === 'Inactive').length;
}

// ================= RENDER SUMMARY CARDS =================
function renderSummaryCards() {
  const totalEl = document.getElementById('statTotalServices');
  const activeEl = document.getElementById('statActiveServices');
  const inactiveEl = document.getElementById('statInactiveServices');
  const sidebarBadge = document.getElementById('sidebarServicesBadge');

  if (totalEl) totalEl.textContent = summaryMetrics.total;
  if (activeEl) activeEl.textContent = summaryMetrics.active;
  if (inactiveEl) inactiveEl.textContent = summaryMetrics.inactive;
  if (sidebarBadge) sidebarBadge.textContent = summaryMetrics.total;
}

// ================= SETUP EVENT LISTENERS =================
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('serviceSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterState.search = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    });
  }

  // Category filter
  const catFilter = document.getElementById('categoryFilter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      filterState.category = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Status filter
  const statFilter = document.getElementById('statusFilter');
  if (statFilter) {
    statFilter.addEventListener('change', (e) => {
      filterState.status = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      filterState.sortBy = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Price not set checkbox in Add/Edit modal
  const priceNotSetCheckbox = document.getElementById('servicePriceNotSet');
  const priceInputField = document.getElementById('servicePrice');
  if (priceNotSetCheckbox && priceInputField) {
    priceNotSetCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        priceInputField.value = '';
        priceInputField.disabled = true;
        priceInputField.placeholder = 'Price not set';
      } else {
        priceInputField.disabled = false;
        priceInputField.placeholder = 'Enter price (e.g. 499)';
        priceInputField.focus();
      }
    });
  }
}

// ================= FILTER & RENDER LOGIC =================
function applyFiltersAndRender() {
  let filtered = [...servicesData];

  // 1. Search (Name, Description, Category)
  if (filterState.search) {
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(filterState.search) ||
      (s.description && s.description.toLowerCase().includes(filterState.search)) ||
      s.categoryLabel.toLowerCase().includes(filterState.search) ||
      (s.code && s.code.toLowerCase().includes(filterState.search))
    );
  }

  // 2. Category
  if (filterState.category !== 'all') {
    const targetCat = filterState.category.toLowerCase();
    filtered = filtered.filter(s => {
      const sCat = s.category.toLowerCase();
      if (targetCat === 'hair' || targetCat.includes('hair')) {
        return sCat.includes('hair');
      }
      if (targetCat === 'nails' || targetCat.includes('nail')) {
        return sCat.includes('nail') || sCat.includes('mani') || sCat.includes('pedi');
      }
      if (targetCat === 'foot-care' || targetCat.includes('foot')) {
        return sCat.includes('foot') || sCat.includes('spa');
      }
      if (targetCat.includes('spa')) {
        return sCat.includes('spa');
      }
      return sCat === targetCat;
    });
  }

  // 3. Status
  if (filterState.status !== 'all') {
    filtered = filtered.filter(s => s.status.toLowerCase() === filterState.status.toLowerCase());
  }

  // 4. Sort
  if (filterState.sortBy === 'price_asc') {
    filtered.sort((a, b) => {
      const pA = a.price === null ? 999999 : a.price;
      const pB = b.price === null ? 999999 : b.price;
      return pA - pB;
    });
  } else if (filterState.sortBy === 'price_desc') {
    filtered.sort((a, b) => {
      const pA = a.price === null ? -1 : a.price;
      const pB = b.price === null ? -1 : b.price;
      return pB - pA;
    });
  } else if (filterState.sortBy === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (filterState.sortBy === 'duration') {
    filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  renderServiceCards(filtered);
}

// Reset filters
function resetFilters() {
  filterState.search = '';
  filterState.category = 'all';
  filterState.status = 'all';
  filterState.sortBy = 'default';

  const sInput = document.getElementById('serviceSearchInput');
  if (sInput) sInput.value = '';

  const cFilter = document.getElementById('categoryFilter');
  if (cFilter) cFilter.value = 'all';

  const stFilter = document.getElementById('statusFilter');
  if (stFilter) stFilter.value = 'all';

  const sSelect = document.getElementById('sortSelect');
  if (sSelect) sSelect.value = 'default';

  applyFiltersAndRender();
  showToast('Service filters have been reset', 'info');
}

// Quick filter by summary card
function filterBySummaryCard(filterType) {
  if (filterType === 'all') {
    filterState.status = 'all';
    const stFilter = document.getElementById('statusFilter');
    if (stFilter) stFilter.value = 'all';
  } else if (filterType === 'active') {
    filterState.status = 'Active';
    const stFilter = document.getElementById('statusFilter');
    if (stFilter) stFilter.value = 'Active';
  } else if (filterType === 'inactive') {
    filterState.status = 'Inactive';
    const stFilter = document.getElementById('statusFilter');
    if (stFilter) stFilter.value = 'Inactive';
  }
  applyFiltersAndRender();
}

// ================= RENDER SERVICE CARDS =================
function renderServiceCards(items) {
  const container = document.getElementById('serviceCardsGrid');
  const emptyState = document.getElementById('servicesEmptyState');
  const resultCount = document.getElementById('servicesResultCount');

  if (resultCount) {
    resultCount.textContent = `Showing ${items.length} service${items.length === 1 ? '' : 's'}`;
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
    // Pricing display logic: If price is null / not set, display "Price not set" badge
    const priceDisplay = s.isPriceNotSet || s.price === null
      ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200">
           <i class="fa-solid fa-clock text-[10px] text-amber-500"></i>
           Price not set
         </span>`
      : `<span class="font-serif text-2xl font-bold text-[#810B38] tracking-tight">
           ₱${parseFloat(s.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
         </span>`;

    // Status Badge & toggle state
    const isActive = s.status === 'Active';
    const statusBadge = isActive
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
           <i class="fa-solid fa-circle text-[8px] text-emerald-500 animate-pulse"></i>
           Active
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">
           <i class="fa-solid fa-circle text-[8px] text-stone-400"></i>
           Inactive
         </span>`;

    // Category styling
    const catLower = s.category.toLowerCase();
    const categoryBadge = catLower.includes('hair')
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : (catLower.includes('nail') || catLower.includes('mani') || catLower.includes('pedi'))
      ? 'bg-pink-50 text-pink-800 border-pink-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200';

    return `
      <div class="bg-white rounded-3xl border border-[#DCC3AA]/70 p-6 flex flex-col justify-between hover:shadow-xl hover:border-[#810B38] transition-all duration-300 group shadow-xs relative">
        
        <div>
          <!-- Card Top: Category & Status -->
          <div class="flex items-center justify-between gap-2 mb-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${categoryBadge}">
              <i class="fa-solid ${s.icon || 'fa-sparkles'} text-[9px]"></i>
              ${escapeHtml(s.categoryLabel)}
            </span>
            ${statusBadge}
          </div>

          <!-- Service Name & Price -->
          <div class="mb-3">
            <h3 class="font-serif text-xl font-bold text-[#541A1A] group-hover:text-[#810B38] transition-colors leading-tight">
              ${escapeHtml(s.name)}
            </h3>
            <div class="mt-2 flex items-baseline gap-2">
              ${priceDisplay}
            </div>
          </div>

          <!-- Description -->
          <p class="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">
            ${escapeHtml(s.description || 'Professional beauty treatment at Nely’s Salon.')}
          </p>

          <!-- Duration Pill -->
          <div class="inline-flex items-center gap-1.5 text-xs text-stone-600 font-medium px-3 py-1 bg-[#FAF6F0] rounded-xl border border-[#DCC3AA]/50 mb-4">
            <i class="fa-regular fa-clock text-[#810B38] text-[11px]"></i>
            <span>${escapeHtml(s.durationLabel || `${s.duration} mins`)}</span>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="pt-4 border-t border-stone-100 flex items-center justify-between gap-2 mt-2">
          
          <!-- Toggle Active/Inactive Quick Action -->
          <button 
            type="button" 
            onclick="toggleServiceStatus(${s.id})"
            class="text-[11px] font-bold ${isActive ? 'text-stone-500 hover:text-stone-800' : 'text-emerald-700 hover:text-emerald-800'} transition-colors flex items-center gap-1 cursor-pointer">
            <i class="fa-solid ${isActive ? 'fa-toggle-on text-emerald-600 text-sm' : 'fa-toggle-off text-stone-400 text-sm'}"></i>
            <span>${isActive ? 'Active' : 'Enable'}</span>
          </button>

          <!-- Action Buttons: Edit & Delete -->
          <div class="flex items-center gap-1.5">
            <button 
              type="button" 
              onclick="openEditServiceModal(${s.id})"
              class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-700 transition-colors flex items-center justify-center text-xs shadow-2xs cursor-pointer"
              title="Edit Service">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button 
              type="button" 
              onclick="openDeleteServiceModal(${s.id})"
              class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-rose-600 hover:text-white text-stone-700 transition-colors flex items-center justify-center text-xs shadow-2xs cursor-pointer"
              title="Delete Service">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

// ================= TOGGLE STATUS VIA API =================
async function toggleServiceStatus(serviceId) {
  const service = servicesData.find(s => s.id === serviceId);
  if (!service) return;

  try {
    const res = await fetch(`../api/services/${serviceId}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || 'Failed to update service status');
    }

    const json = await res.json();
    const updatedStatus = json.data && json.data.is_active ? 'Active' : 'Inactive';
    
    // Update local state
    service.status = updatedStatus;
    service.is_active = updatedStatus === 'Active' ? 1 : 0;
    
    computeSummaryMetrics();
    renderSummaryCards();
    applyFiltersAndRender();

    showToast(`${service.name} status updated to ${updatedStatus}`, 'info');

  } catch (err) {
    console.error('Error toggling service status:', err);
    showToast(err.message || 'Failed to update service status', 'error');
  }
}

// ================= STEADY MODAL SCROLL LOCK SYSTEM =================
function onPreventBackgroundWheel(e) {
  const scrollable = e.target.closest('#serviceForm, .overflow-y-auto');
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
  const scrollable = e.target.closest('#serviceForm, .overflow-y-auto');
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

// ================= ADD / EDIT SERVICE MODALS =================
function openAddServiceModal() {
  activeService = null;

  const form = document.getElementById('serviceForm');
  if (form) form.reset();

  const titleEl = document.getElementById('serviceModalTitle');
  const subEl = document.getElementById('serviceModalSubtitle');
  const priceInput = document.getElementById('servicePrice');
  const priceNotSetCheckbox = document.getElementById('servicePriceNotSet');
  const durationInput = document.getElementById('serviceDuration');
  const statusSelect = document.getElementById('serviceStatus');

  if (titleEl) titleEl.textContent = 'Add New Service';
  if (subEl) subEl.textContent = 'Register a new beauty service in the salon catalog';

  if (durationInput) durationInput.value = 60;
  if (statusSelect) statusSelect.value = 'Active';

  if (priceInput) {
    priceInput.value = '';
    priceInput.disabled = false;
    priceInput.placeholder = 'Enter price (e.g. 499)';
  }
  if (priceNotSetCheckbox) {
    priceNotSetCheckbox.checked = false;
  }

  const modal = document.getElementById('serviceModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockBodyScroll();
  }
}

function openEditServiceModal(serviceId) {
  const service = servicesData.find(s => s.id === serviceId);
  if (!service) return;

  activeService = service;

  const titleEl = document.getElementById('serviceModalTitle');
  const subEl = document.getElementById('serviceModalSubtitle');
  const nameInput = document.getElementById('serviceName');
  const categorySelect = document.getElementById('serviceCategory');
  const priceInput = document.getElementById('servicePrice');
  const priceNotSetCheckbox = document.getElementById('servicePriceNotSet');
  const durationInput = document.getElementById('serviceDuration');
  const descInput = document.getElementById('serviceDescription');
  const statusSelect = document.getElementById('serviceStatus');

  if (titleEl) titleEl.textContent = `Edit Service: ${service.name}`;
  if (subEl) subEl.textContent = 'Update salon service pricing, duration, and details';

  if (nameInput) nameInput.value = service.name;
  
  if (categorySelect) {
    // Select matching category option or default
    let found = false;
    for (let opt of categorySelect.options) {
      if (opt.value.toLowerCase() === service.category.toLowerCase()) {
        categorySelect.value = opt.value;
        found = true;
        break;
      }
    }
    if (!found && categorySelect.options.length > 0) {
      categorySelect.value = categorySelect.options[0].value;
    }
  }

  if (durationInput) durationInput.value = service.duration || 60;
  if (descInput) descInput.value = service.description || '';
  if (statusSelect) statusSelect.value = service.status || 'Active';

  // Handle Price not set logic
  if (service.isPriceNotSet || service.price === null || service.price === undefined) {
    if (priceNotSetCheckbox) priceNotSetCheckbox.checked = true;
    if (priceInput) {
      priceInput.value = '';
      priceInput.disabled = true;
      priceInput.placeholder = 'Price not set';
    }
  } else {
    if (priceNotSetCheckbox) priceNotSetCheckbox.checked = false;
    if (priceInput) {
      priceInput.value = service.price;
      priceInput.disabled = false;
      priceInput.placeholder = 'Enter price (e.g. 499)';
    }
  }

  const modal = document.getElementById('serviceModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockBodyScroll();
  }
}

function closeServiceModal() {
  const modal = document.getElementById('serviceModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  unlockBodyScroll();
  activeService = null;
}

async function handleSaveService(event) {
  event.preventDefault();

  const nameInput = document.getElementById('serviceName');
  const categorySelect = document.getElementById('serviceCategory');
  const priceInput = document.getElementById('servicePrice');
  const priceNotSetCheckbox = document.getElementById('servicePriceNotSet');
  const durationInput = document.getElementById('serviceDuration');
  const descInput = document.getElementById('serviceDescription');
  const statusSelect = document.getElementById('serviceStatus');

  if (!nameInput || !nameInput.value.trim()) {
    showToast('Please enter the service name.', 'error');
    return;
  }

  const name = nameInput.value.trim();
  const category = categorySelect ? categorySelect.value : 'Hair Services';

  const isPriceNotSet = priceNotSetCheckbox && priceNotSetCheckbox.checked;
  let finalPrice = null;
  if (!isPriceNotSet && priceInput && priceInput.value.trim() !== '') {
    const p = parseFloat(priceInput.value.trim());
    if (isNaN(p) || p < 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }
    finalPrice = p;
  }

  const duration = durationInput ? parseInt(durationInput.value, 10) : 60;
  const description = descInput ? descInput.value.trim() : '';
  const status = statusSelect ? statusSelect.value : 'Active';
  const isActive = status === 'Active' ? 1 : 0;

  const payload = {
    name: name,
    category: category,
    price: finalPrice,
    duration_minutes: duration,
    description: description,
    is_active: isActive
  };

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : 'Save Service';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    let url = '../api/services';
    let method = 'POST';

    if (activeService) {
      url = `../api/services/${activeService.id}`;
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
      throw new Error(json.message || 'Failed to save service.');
    }

    showToast(activeService ? `Service "${name}" updated successfully!` : `Service "${name}" registered successfully!`, 'success');
    closeServiceModal();
    await fetchServicesData();

  } catch (err) {
    console.error('Error saving service:', err);
    showToast(err.message || 'Error saving service.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

// ================= DELETE SERVICE MODAL =================
function openDeleteServiceModal(serviceId) {
  const service = servicesData.find(s => s.id === serviceId);
  if (!service) return;

  activeService = service;

  const targetName = document.getElementById('deleteServiceNameTarget');
  if (targetName) targetName.textContent = `"${service.name}"`;

  const modal = document.getElementById('deleteServiceModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lockBodyScroll();
  }
}

function closeDeleteServiceModal() {
  const modal = document.getElementById('deleteServiceModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  unlockBodyScroll();
  activeService = null;
}

async function handleConfirmDeleteService() {
  if (!activeService) return;

  const serviceId = activeService.id;
  const serviceName = activeService.name;

  try {
    const res = await fetch(`../api/services/${serviceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete service.');
    }

    showToast(`Service "${serviceName}" removed successfully.`, 'info');
    closeDeleteServiceModal();
    await fetchServicesData();

  } catch (err) {
    console.error('Error deleting service:', err);
    showToast(err.message || 'Failed to delete service.', 'error');
  }
}

// ================= MODAL HELPERS =================
function closeAllModals() {
  const modalIds = ['serviceModal', 'deleteServiceModal', 'logoutModal'];
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
  const modals = ['serviceModal', 'deleteServiceModal', 'logoutModal'];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          if (id === 'serviceModal') closeServiceModal();
          else if (id === 'deleteServiceModal') closeDeleteServiceModal();
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
