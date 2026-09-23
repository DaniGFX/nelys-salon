/**
 * Nely's Salon — Admin Services Controller
 * Manages the salon service catalog, pricing, duration, active/inactive states,
 * search & category filtering, and modal CRUD operations.
 */

// ================= GLOBAL STATE & INITIAL MOCK DATA =================
const SERVICES_STORAGE_KEY = 'nelys_admin_services_data';

// 13 Actual Salon Services matching user specification
const DEFAULT_SERVICES = [
  {
    id: 'srv-rebonding',
    name: 'Rebonding',
    category: 'hair',
    categoryLabel: 'Hair Care',
    price: null, // Note: Rebonding has no price yet, displayed as "Price not set"
    duration: 180, // in minutes
    durationLabel: '180 mins (3 hrs)',
    description: 'Permanent thermal smoothing system that relaxes curly or unruly hair bonds into pin-straight, ultra-glossy locks.',
    status: 'Active',
    icon: 'fa-star'
  },
  {
    id: 'srv-brazilian',
    name: 'Brazilian',
    category: 'hair',
    categoryLabel: 'Hair Care',
    price: 1999,
    duration: 120,
    durationLabel: '120 mins (2 hrs)',
    description: 'Professional Brazilian hair treatment that infuses hydrolysed keratin deep into the cuticle for sleek, frizz-free hair.',
    status: 'Active',
    icon: 'fa-wand-magic-sparkles'
  },
  {
    id: 'srv-hair-dye',
    name: 'Hair Dye',
    category: 'hair',
    categoryLabel: 'Hair Care',
    price: 699,
    duration: 90,
    durationLabel: '90 mins',
    description: 'Premium salon-grade hair coloring tailored to your preferred shade with rich, multidimensional color vibrancy.',
    status: 'Active',
    icon: 'fa-paintbrush'
  },
  {
    id: 'srv-power-dose',
    name: 'Power Dose',
    category: 'hair',
    categoryLabel: 'Hair Care',
    price: 499,
    duration: 45,
    durationLabel: '45 mins',
    description: 'Targeted molecular shot that instantly replenishes lost lipids and moisture in weakened, dry, or color-treated hair.',
    status: 'Active',
    icon: 'fa-bolt'
  },
  {
    id: 'srv-cold-wave',
    name: 'Cold Wave',
    category: 'hair',
    categoryLabel: 'Hair Care',
    price: 699,
    duration: 120,
    durationLabel: '120 mins',
    description: 'Classic salon perming technique creating long-lasting, bouncy curls, volume, and natural body.',
    status: 'Active',
    icon: 'fa-wind'
  },
  {
    id: 'srv-bonacure',
    name: 'Bonacure',
    category: 'hair',
    categoryLabel: 'Hair Care',
    price: 499,
    duration: 60,
    durationLabel: '60 mins',
    description: 'Cellular peptide hair therapy that repairs cuticular damage from within, sealing in moisture.',
    status: 'Active',
    icon: 'fa-shield-heart'
  },
  {
    id: 'srv-keratine-treatment',
    name: 'Keratine Treatment',
    category: 'hair',
    categoryLabel: 'Hair Care',
    price: 499,
    duration: 90,
    durationLabel: '90 mins',
    description: 'Deep conditioning restorative protein therapy that seals the outer cuticle layer for frizz defense.',
    status: 'Active',
    icon: 'fa-feather-pointed'
  },
  {
    id: 'srv-footspa',
    name: 'Footspa',
    category: 'foot-care',
    categoryLabel: 'Foot Care',
    price: 199,
    duration: 45,
    durationLabel: '45 mins',
    description: 'Invigorating aromatherapy foot soak, dead-skin scrub, calming moisturizing balm, and gentle massage.',
    status: 'Active',
    icon: 'fa-spa'
  },
  {
    id: 'srv-manicure',
    name: 'Manicure',
    category: 'nails',
    categoryLabel: 'Nails',
    price: 149,
    duration: 35,
    durationLabel: '35 mins',
    description: 'Professional nail filing, gentle cuticle grooming, light hand massage, and regular salon lacquer polish.',
    status: 'Active',
    icon: 'fa-hand-sparkles'
  },
  {
    id: 'srv-pedicure',
    name: 'Pedicure',
    category: 'nails',
    categoryLabel: 'Nails',
    price: 149,
    duration: 40,
    durationLabel: '40 mins',
    description: 'Complete toenail care, shape refinement, gentle cuticle grooming, and vibrant polish application.',
    status: 'Active',
    icon: 'fa-socks'
  },
  {
    id: 'srv-trim',
    name: 'Trim',
    category: 'hair',
    categoryLabel: 'Hair Care',
    price: 149,
    duration: 30,
    durationLabel: '30 mins',
    description: 'Precision haircut and split-end cleanup for clean lines, healthy shape, and everyday elegance.',
    status: 'Active',
    icon: 'fa-scissors'
  },
  {
    id: 'srv-gel-manicure',
    name: 'Gel Manicure',
    category: 'nails',
    categoryLabel: 'Nails',
    price: 499,
    duration: 50,
    durationLabel: '50 mins',
    description: 'Long-wearing chip-free gel polish cured under high-performance LED light, lasting 3+ weeks with high gloss.',
    status: 'Active',
    icon: 'fa-gem'
  },
  {
    id: 'srv-gel-pedicure',
    name: 'Gel Pedicure',
    category: 'nails',
    categoryLabel: 'Nails',
    price: 499,
    duration: 55,
    durationLabel: '55 mins',
    description: 'Long-lasting salon gel pedicure with chip-resistant high-gloss finish and restorative cuticle care.',
    status: 'Active',
    icon: 'fa-sparkles'
  }
];

// In-memory state
let services = [];
let activeService = null;

// Filter and search state
let currentSearch = '';
let currentCategoryFilter = 'all';
let currentStatusFilter = 'all';
let currentSort = 'default';

// ================= STORAGE HELPERS =================
function loadServices() {
  try {
    const raw = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (raw) {
      services = JSON.parse(raw);
    } else {
      services = JSON.parse(JSON.stringify(DEFAULT_SERVICES));
      saveServices();
    }
  } catch (err) {
    console.error('Error loading services from localStorage:', err);
    services = JSON.parse(JSON.stringify(DEFAULT_SERVICES));
  }
}

function saveServices() {
  try {
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
  } catch (err) {
    console.error('Error saving services to localStorage:', err);
  }
}

// ================= DOM INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  loadServices();
  renderSummaryCards();
  applyFiltersAndRender();
  setupEventListeners();
  setupModalSteadyListeners();
  updateTimeBadge();
});

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('serviceSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    });
  }

  // Category filter
  const catFilter = document.getElementById('categoryFilter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      currentCategoryFilter = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Status filter
  const statFilter = document.getElementById('statusFilter');
  if (statFilter) {
    statFilter.addEventListener('change', (e) => {
      currentStatusFilter = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
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

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// ================= RENDER SUMMARY CARDS =================
function renderSummaryCards() {
  const total = services.length;
  const active = services.filter(s => s.status === 'Active').length;
  const inactive = services.filter(s => s.status === 'Inactive').length;

  const totalEl = document.getElementById('statTotalServices');
  const activeEl = document.getElementById('statActiveServices');
  const inactiveEl = document.getElementById('statInactiveServices');

  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;
  if (inactiveEl) inactiveEl.textContent = inactive;
}

// ================= FILTER & RENDER LOGIC =================
function applyFiltersAndRender() {
  let filtered = [...services];

  // 1. Search (Name, Description, Category)
  if (currentSearch) {
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(currentSearch) ||
      (s.description && s.description.toLowerCase().includes(currentSearch)) ||
      s.categoryLabel.toLowerCase().includes(currentSearch)
    );
  }

  // 2. Category
  if (currentCategoryFilter !== 'all') {
    filtered = filtered.filter(s => s.category.toLowerCase() === currentCategoryFilter.toLowerCase());
  }

  // 3. Status
  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(s => s.status.toLowerCase() === currentStatusFilter.toLowerCase());
  }

  // 4. Sort
  if (currentSort === 'price_asc') {
    filtered.sort((a, b) => {
      const pA = a.price === null ? 999999 : a.price;
      const pB = b.price === null ? 999999 : b.price;
      return pA - pB;
    });
  } else if (currentSort === 'price_desc') {
    filtered.sort((a, b) => {
      const pA = a.price === null ? -1 : a.price;
      const pB = b.price === null ? -1 : b.price;
      return pB - pA;
    });
  } else if (currentSort === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSort === 'duration') {
    filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  renderServiceCards(filtered);
}

// Reset filters
function resetFilters() {
  currentSearch = '';
  currentCategoryFilter = 'all';
  currentStatusFilter = 'all';
  currentSort = 'default';

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
    currentStatusFilter = 'all';
    const stFilter = document.getElementById('statusFilter');
    if (stFilter) stFilter.value = 'all';
  } else if (filterType === 'active') {
    currentStatusFilter = 'Active';
    const stFilter = document.getElementById('statusFilter');
    if (stFilter) stFilter.value = 'Active';
  } else if (filterType === 'inactive') {
    currentStatusFilter = 'Inactive';
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
    // Pricing display logic: If Rebonding or price is null, display "Price not set"
    const isPriceNotSet = s.price === null || s.price === undefined || s.price === '';
    const priceDisplay = isPriceNotSet
      ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200">
           <i class="fa-solid fa-clock text-[10px] text-amber-500"></i>
           Price not set
         </span>`
      : `<span class="font-serif text-2xl font-bold text-[#810B38] tracking-tight">
           ₱${s.price.toLocaleString()}
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
    const categoryBadge = s.category === 'hair'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : s.category === 'nails'
      ? 'bg-pink-50 text-pink-800 border-pink-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200';

    return `
      <div class="bg-white rounded-3xl border border-[#DCC3AA]/70 p-6 flex flex-col justify-between hover:shadow-xl hover:border-[#810B38] transition-all duration-300 group shadow-xs relative">
        
        <div>
          <!-- Card Top: Category & Status -->
          <div class="flex items-center justify-between gap-2 mb-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${categoryBadge}">
              <i class="fa-solid ${s.icon || 'fa-sparkles'} text-[9px]"></i>
              ${s.categoryLabel}
            </span>
            ${statusBadge}
          </div>

          <!-- Service Name & Price (Matching User Specification) -->
          <div class="mb-3">
            <h3 class="font-serif text-xl font-bold text-[#541A1A] group-hover:text-[#810B38] transition-colors leading-tight">
              ${s.name}
            </h3>
            <div class="mt-2 flex items-baseline gap-2">
              ${priceDisplay}
            </div>
          </div>

          <!-- Description -->
          <p class="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">
            ${s.description || 'Professional beauty treatment at Nely’s Salon.'}
          </p>

          <!-- Duration Pill -->
          <div class="inline-flex items-center gap-1.5 text-xs text-stone-600 font-medium px-3 py-1 bg-[#FAF6F0] rounded-xl border border-[#DCC3AA]/50 mb-4">
            <i class="fa-regular fa-clock text-[#810B38] text-[11px]"></i>
            <span>${s.durationLabel || `${s.duration} mins`}</span>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="pt-4 border-t border-stone-100 flex items-center justify-between gap-2 mt-2">
          
          <!-- Toggle Active/Inactive Quick Action -->
          <button 
            type="button" 
            onclick="toggleServiceStatus('${s.id}')"
            class="text-[11px] font-bold ${isActive ? 'text-stone-500 hover:text-stone-800' : 'text-emerald-700 hover:text-emerald-800'} transition-colors flex items-center gap-1">
            <i class="fa-solid ${isActive ? 'fa-toggle-on text-emerald-600 text-sm' : 'fa-toggle-off text-stone-400 text-sm'}"></i>
            <span>${isActive ? 'Active' : 'Enable'}</span>
          </button>

          <!-- Action Buttons: Edit & Delete -->
          <div class="flex items-center gap-1.5">
            <button 
              type="button" 
              onclick="openEditServiceModal('${s.id}')"
              class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-[#810B38] hover:text-white text-stone-700 transition-colors flex items-center justify-center text-xs shadow-2xs"
              title="Edit Service">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button 
              type="button" 
              onclick="openDeleteServiceModal('${s.id}')"
              class="w-8 h-8 rounded-xl bg-stone-100 hover:bg-rose-600 hover:text-white text-stone-700 transition-colors flex items-center justify-center text-xs shadow-2xs"
              title="Delete Service">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

// ================= TOGGLE STATUS =================
function toggleServiceStatus(serviceId) {
  const service = services.find(s => s.id === serviceId);
  if (!service) return;

  service.status = service.status === 'Active' ? 'Inactive' : 'Active';
  saveServices();
  renderSummaryCards();
  applyFiltersAndRender();

  showToast(`${service.name} status updated to ${service.status}`, 'info');
}

// ================= STEADY MODAL SCROLL LOCK SYSTEM =================
// Completely freezes background scrolling without altering document scroll position,
// preventing any sidebar shifts or viewport jumps.
let isModalScrollLocked = false;

function onPreventBackgroundWheel(e) {
  // Check if target is inside an internally scrollable container within the active modal
  const scrollable = e.target.closest('#serviceForm, .overflow-y-auto');
  if (scrollable) {
    const isScrollingDown = e.deltaY > 0;
    const canScrollDown = scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 1;
    const canScrollUp = scrollable.scrollTop > 0;

    // Allow scrolling within the modal if there is remaining scrollable content
    if ((isScrollingDown && canScrollDown) || (!isScrollingDown && canScrollUp)) {
      return;
    }
  }

  // Prevent background scroll bleed
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
  const anyOpen = document.querySelector('.fixed.inset-0.z-50.flex, dialog[open]');
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

  if (titleEl) titleEl.textContent = 'Add New Service';
  if (subEl) subEl.textContent = 'Register a new beauty service in the salon catalog';

  if (priceInput) {
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
  const service = services.find(s => s.id === serviceId);
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
  if (categorySelect) categorySelect.value = service.category;
  if (durationInput) durationInput.value = service.duration || 60;
  if (descInput) descInput.value = service.description || '';
  if (statusSelect) statusSelect.value = service.status || 'Active';

  // Handle Price not set logic (e.g. Rebonding)
  if (service.price === null || service.price === undefined || service.price === '') {
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

function handleSaveService(event) {
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
  const category = categorySelect ? categorySelect.value : 'hair';
  const categoryLabels = {
    'hair': 'Hair Care',
    'nails': 'Nails',
    'foot-care': 'Foot Care'
  };
  const categoryIcons = {
    'hair': 'fa-scissors',
    'nails': 'fa-hand-sparkles',
    'foot-care': 'fa-spa'
  };

  const isPriceNotSet = priceNotSetCheckbox && priceNotSetCheckbox.checked;
  let finalPrice = null;
  if (!isPriceNotSet && priceInput && priceInput.value.trim() !== '') {
    finalPrice = parseFloat(priceInput.value.trim());
  }

  const duration = durationInput ? parseInt(durationInput.value, 10) : 60;
  const durationLabel = `${duration} mins`;
  const description = descInput ? descInput.value.trim() : '';
  const status = statusSelect ? statusSelect.value : 'Active';

  if (activeService) {
    // Edit existing service
    activeService.name = name;
    activeService.category = category;
    activeService.categoryLabel = categoryLabels[category] || 'Hair Care';
    activeService.price = finalPrice;
    activeService.duration = duration;
    activeService.durationLabel = durationLabel;
    activeService.description = description;
    activeService.status = status;

    const idx = services.findIndex(s => s.id === activeService.id);
    if (idx !== -1) {
      services[idx] = activeService;
      saveServices();
    }
    showToast(`Service "${name}" updated successfully!`, 'success');
  } else {
    // Create new service
    const newId = 'srv-' + Date.now();
    const newServiceObj = {
      id: newId,
      name: name,
      category: category,
      categoryLabel: categoryLabels[category] || 'Hair Care',
      price: finalPrice,
      duration: duration,
      durationLabel: durationLabel,
      description: description,
      status: status,
      icon: categoryIcons[category] || 'fa-sparkles'
    };

    services.unshift(newServiceObj);
    saveServices();
    showToast(`Service "${name}" registered successfully!`, 'success');
  }

  renderSummaryCards();
  applyFiltersAndRender();
  closeServiceModal();
}

// ================= DELETE SERVICE MODAL =================
function openDeleteServiceModal(serviceId) {
  const service = services.find(s => s.id === serviceId);
  if (!service) return;

  activeService = service;

  const targetName = document.getElementById('deleteServiceNameTarget');
  if (targetName) targetName.textContent = service.name;

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

function handleConfirmDeleteService() {
  if (!activeService) return;

  const name = activeService.name;
  services = services.filter(s => s.id !== activeService.id);
  saveServices();

  renderSummaryCards();
  applyFiltersAndRender();
  closeDeleteServiceModal();

  showToast(`Service "${name}" has been removed.`, 'info');
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

// Setup backdrop click and escape key to close modals steadily
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
