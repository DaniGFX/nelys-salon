/**
 * Nely's Salon — Customer Services Directory Script
 * Handles real-time search, category filtering (All, Hair, Nails, Foot Care),
 * service details modal, and seamless quick-booking redirects with pre-selected service query parameter.
 */

const servicesCatalog = [
  // 1. Hair Services
  {
    id: "brazilian",
    name: "Brazilian",
    category: "hair",
    categoryLabel: "Hair Services",
    price: 1999,
    priceFormatted: "₱1,999",
    description: "Professional Brazilian hair treatment for smoother, more manageable hair.",
    fullDescription: "Our signature professional Brazilian hair treatment infuses hydrolysed keratin deep into the hair cuticles, eliminating up to 95% of frizz while restoring luminous gloss, silkiness, and effortless manageability for up to 3-4 months.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-wand-magic-sparkles",
    badge: "Signature Care",
    isInquiry: false
  },
  {
    id: "hair-dye",
    name: "Hair Dye",
    category: "hair",
    categoryLabel: "Hair Services",
    price: 699,
    priceFormatted: "₱699",
    description: "Refresh your look with your preferred hair color.",
    fullDescription: "Premium salon-grade hair coloring tailored to your preferred shade. Offers rich, multidimensional color vibrancy or complete root/grey coverage using ammonia-gentle conditioning dyes.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-paintbrush",
    badge: "Popular Color",
    isInquiry: false
  },
  {
    id: "power-dose",
    name: "Power Dose",
    category: "hair",
    categoryLabel: "Hair Services",
    price: 499,
    priceFormatted: "₱499",
    description: "Intensive instant nourishment shot for damaged, dry, or color-treated hair.",
    fullDescription: "Targeted molecular shot that instantly replenishes lost lipids and moisture in weakened hair fibers, providing an instant transformation from brittle to silky softness in just one wash cycle.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-bolt",
    badge: "Intensive Shot",
    isInquiry: false
  },
  {
    id: "cold-wave",
    name: "Cold Wave",
    category: "hair",
    categoryLabel: "Hair Services",
    price: 699,
    priceFormatted: "₱699",
    description: "Classic salon perming technique creating long-lasting, bouncy curls and body.",
    fullDescription: "Time-tested salon perming technique designed to create bouncy, well-defined curls, volume, and permanent natural movement without high thermal heat damage.",
    availableFor: "Salon Visit",
    duration: "To be configured by admin",
    icon: "fa-solid fa-wind",
    badge: "Classic Perm",
    isInquiry: false
  },
  {
    id: "bonacure",
    name: "Bonacure",
    category: "hair",
    categoryLabel: "Hair Services",
    price: 499,
    priceFormatted: "₱499",
    description: "Advanced restorative peptide hair therapy for structural hair rebuilding.",
    fullDescription: "Cellular hair therapy powered by biomimetic peptides and ceramides that repairs cuticular damage from within, sealing in moisture and preventing recurring breakage.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-shield-heart",
    badge: "Peptide Therapy",
    isInquiry: false
  },
  {
    id: "keratine-treatment",
    name: "Keratine Treatment",
    category: "hair",
    categoryLabel: "Hair Services",
    price: 499,
    priceFormatted: "₱499",
    description: "Deep keratin infusion for frizz elimination, shine, and silky smoothness.",
    fullDescription: "Deep conditioning restorative protein therapy that seals the outer cuticle layer, leaving hair smooth, lustrous, and immune to high humidity frizz.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-feather-pointed",
    badge: "Frizz Defense",
    isInquiry: false
  },
  {
    id: "trim",
    name: "Trim",
    category: "hair",
    categoryLabel: "Hair Services",
    price: 149,
    priceFormatted: "₱149",
    description: "Precision haircut and split-end cleanup for tidy, healthy styling.",
    fullDescription: "Quick precision perimeter shear cut and split-end elimination to maintain shape, foster healthy length retention, and keep hair tidy.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-scissors",
    badge: "Everyday Essential",
    isInquiry: false
  },
  {
    id: "rebonding",
    name: "Rebonding",
    category: "hair",
    categoryLabel: "Hair Services",
    price: null,
    priceFormatted: "Price to be confirmed",
    description: "Permanent hair straightening for sleek, mirror-shine straight locks.",
    fullDescription: "Permanent thermal smoothing system that relaxes curly or unruly hair bonds into pin-straight, ultra-glossy, fluid locks. Price is determined based on individual hair length and volume upon consultation.",
    availableFor: "Salon Visit",
    duration: "To be configured by admin",
    icon: "fa-solid fa-star",
    badge: "Thermal Straightening",
    isInquiry: true
  },

  // 2. Nail & Foot Care Services
  {
    id: "footspa",
    name: "Footspa",
    category: "foot-care",
    categoryLabel: "Foot Care",
    price: 199,
    priceFormatted: "₱199",
    description: "Relaxing foot bath, exfoliating dead skin scrub, and revitalizing massage.",
    fullDescription: "Invigorating aromatherapy foot soak followed by pumice dead-skin exfoliation, calming moisturizing balm massage, and foot softening treatment.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-spa",
    badge: "Relaxation",
    isInquiry: false
  },
  {
    id: "manicure",
    name: "Manicure",
    category: "nails",
    categoryLabel: "Nails",
    price: 149,
    priceFormatted: "₱149",
    description: "Professional nail shaping, cuticle cleanup, and nourishing polish.",
    fullDescription: "Complete hand grooming including nail filing, gentle cuticle cleaning, gentle hand massage, and regular salon lacquer polish in your choice of color.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-hand-sparkles",
    badge: "Nail Care",
    isInquiry: false
  },
  {
    id: "pedicure",
    name: "Pedicure",
    category: "nails",
    categoryLabel: "Nails & Foot Care",
    price: 149,
    priceFormatted: "₱149",
    description: "Complete toe nail care, cuticle treatment, and polish coating.",
    fullDescription: "Hygienic foot nail trimming, shape contouring, cuticle care, gentle foot buffer treatment, and fresh regular polish application.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-gem",
    badge: "Nail Care",
    isInquiry: false
  },
  {
    id: "gel-manicure",
    name: "Gel Manicure",
    category: "nails",
    categoryLabel: "Nails",
    price: 499,
    priceFormatted: "₱499",
    description: "Long-lasting UV-cured gel polish with high-gloss durability.",
    fullDescription: "Deluxe manicure finished with high-performance UV-cured gel polish that resists chipping, scratching, and dullness for up to 3 full weeks.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-spray-can-sparkles",
    badge: "Long Lasting",
    isInquiry: false
  },
  {
    id: "gel-pedicure",
    name: "Gel Pedicure",
    category: "foot-care",
    categoryLabel: "Foot Care & Nails",
    price: 499,
    priceFormatted: "₱499",
    description: "Durable, chip-resistant UV gel coating and foot nail beautification.",
    fullDescription: "Full pedicure combined with resilient UV LED gel polish coating that dries instantly and withstands water, shoes, and active days without peeling.",
    availableFor: "Salon / Home Service",
    duration: "To be configured by admin",
    icon: "fa-solid fa-circle-check",
    badge: "Long Lasting",
    isInquiry: false
  }
];

let currentCategory = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  renderServices();
  updateCategoryCounts();
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

// 2. Category Filter Switcher (with zero layout shifting)
function filterCategory(cat) {
  currentCategory = cat;

  const categories = ['all', 'hair', 'nails', 'foot-care'];
  categories.forEach(c => {
    const btn = document.getElementById(`tabBtn-${c}`);
    if (!btn) return;

    if (c === cat) {
      btn.className = "tab-btn px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors duration-150 flex items-center gap-2 shrink-0 select-none border border-[#810B38] bg-[#810B38] text-white shadow-sm focus:outline-none";
      const counter = btn.querySelector('.tab-counter');
      if (counter) {
        counter.className = "tab-counter px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#DCC3AA] bg-[#DCC3AA] text-[#541A1A] min-w-[20px] text-center inline-block";
      }
    } else {
      btn.className = "tab-btn px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors duration-150 flex items-center gap-2 shrink-0 select-none border border-[#DCC3AA]/60 bg-white/80 hover:bg-[#FAF6F0] text-[#541A1A] shadow-sm focus:outline-none";
      const counter = btn.querySelector('.tab-counter');
      if (counter) {
        counter.className = "tab-counter px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#DCC3AA]/60 bg-[#FAF6F0] text-[#735e5e] min-w-[20px] text-center inline-block";
      }
    }
  });

  renderServices();
}

// 3. Search Field Handler
function handleSearch(query) {
  searchQuery = query.toLowerCase().trim();
  renderServices();
}

// 4. Update Category Counts
function updateCategoryCounts() {
  const counts = {
    all: servicesCatalog.length,
    hair: servicesCatalog.filter(s => s.category === 'hair').length,
    nails: servicesCatalog.filter(s => s.category === 'nails').length,
    'foot-care': servicesCatalog.filter(s => s.category === 'foot-care').length
  };

  for (const [key, val] of Object.entries(counts)) {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = val;
  }
}

// 5. Render Services Grid
function renderServices() {
  const container = document.getElementById('servicesGridContainer');
  const emptyState = document.getElementById('emptyServicesState');
  if (!container || !emptyState) return;

  const filtered = servicesCatalog.filter(item => {
    const matchesCat = currentCategory === 'all' || item.category === currentCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery) || 
      item.description.toLowerCase().includes(searchQuery) ||
      item.categoryLabel.toLowerCase().includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  emptyState.classList.add('hidden');

  let html = '';
  filtered.forEach(item => {
    const bookButtonLabel = item.isInquiry ? 'Inquire' : 'Book Now';
    const bookButtonHref = `booking.html?service=${item.id}`;
    
    html += `
      <article class="bg-white rounded-3xl border border-[#DCC3AA] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between group">
        <div>
          <!-- Card Top Bar: Badge & Category -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#810B38] bg-[#FAF6F0] px-2.5 py-1 rounded-full border border-[#DCC3AA]/50 flex items-center gap-1.5">
              <i class="${item.icon}"></i>
              ${escapeHtml(item.badge)}
            </span>
            <span class="text-[11px] font-medium text-[#735e5e]">
              ${escapeHtml(item.categoryLabel)}
            </span>
          </div>

          <!-- Service Title -->
          <h3 
            onclick="openServiceModal('${item.id}')"
            class="font-serif text-2xl font-bold text-[#541A1A] group-hover:text-[#810B38] transition-colors cursor-pointer">
            ${escapeHtml(item.name)}
          </h3>

          <!-- Price -->
          <div class="mt-2 flex items-baseline gap-2">
            <span class="font-serif text-2xl font-extrabold text-[#810B38]">
              ${escapeHtml(item.priceFormatted)}
            </span>
          </div>

          <!-- Short Description -->
          <p class="text-xs text-[#735e5e] mt-2.5 leading-relaxed line-clamp-2">
            ${escapeHtml(item.description)}
          </p>
        </div>

        <!-- Card Footer: Actions -->
        <div class="mt-5 pt-4 border-t border-[#F1E2D1] flex items-center gap-2.5">
          <button 
            type="button" 
            onclick="openServiceModal('${item.id}')"
            class="flex-1 py-2.5 rounded-xl bg-[#FAF6F0] hover:bg-[#F1E2D1] text-[#541A1A] border border-[#DCC3AA] text-xs font-bold transition-colors">
            Details
          </button>
          
          <a 
            href="${bookButtonHref}"
            class="flex-1 py-2.5 rounded-xl bg-[#810B38] hover:bg-[#62082b] text-white text-xs font-bold uppercase tracking-wider text-center transition-colors shadow-sm flex items-center justify-center gap-1.5">
            <span>${bookButtonLabel}</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </a>
        </div>
      </article>
    `;
  });

  container.innerHTML = html;
}

// 6. Open Service Details Modal
function openServiceModal(serviceId) {
  const item = servicesCatalog.find(s => s.id === serviceId);
  if (!item) return;

  document.getElementById('modalServiceName').textContent = item.name;
  document.getElementById('modalServiceCategory').textContent = item.categoryLabel;
  document.getElementById('modalServicePrice').textContent = item.priceFormatted;
  document.getElementById('modalServiceDescription').textContent = item.fullDescription || item.description;
  document.getElementById('modalServiceAvailable').textContent = item.availableFor;
  document.getElementById('modalServiceDuration').textContent = item.duration;

  const bookBtn = document.getElementById('modalBookServiceBtn');
  if (bookBtn) {
    bookBtn.href = `booking.html?service=${item.id}`;
    bookBtn.innerHTML = `
      <i class="fa-solid fa-calendar-plus text-xs"></i>
      <span>${item.isInquiry ? 'Inquire / Book Service' : 'Book This Service'}</span>
    `;
  }

  const modal = document.getElementById('serviceDetailsModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeServiceModal() {
  const modal = document.getElementById('serviceDetailsModal');
  if (modal) modal.close();
}

// 7. Clear search helper
function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = '';
    handleSearch('');
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
