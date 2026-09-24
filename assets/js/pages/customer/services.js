/**
 * Nely's Salon — Customer Services Directory Controller
 * Directly connected to backend services API (GET /api/services)
 * Features live catalog sync, real-time search, category filtering,
 * service details modal, appointment booking redirects, and live sidebar badges.
 */

// Global State
let servicesCatalog = [];
let currentCategory = 'all';
let searchQuery = '';
let currentUser = null;

// Fallback catalog in case backend is unreachable during offline state
const defaultServicesCatalog = [
  {
    id: 1,
    code: 'brazilian',
    name: 'Brazilian Treatment',
    category: 'hair',
    categoryLabel: 'Hair Services',
    price: 1999,
    priceFormatted: '₱1,999',
    description: 'Transformative keratin smoothing treatment eliminating frizz with mirror-like shine.',
    fullDescription: 'Our signature professional Brazilian hair treatment infuses hydrolysed keratin deep into the hair cuticles, eliminating up to 95% of frizz while restoring luminous gloss, silkiness, and effortless manageability for up to 3-4 months.',
    availableFor: 'Salon / Home Service',
    duration: '120 mins',
    icon: 'fa-solid fa-wand-magic-sparkles',
    badge: 'Signature Care',
    isInquiry: false
  },
  {
    id: 2,
    code: 'hair-dye',
    name: 'Hair Dye',
    category: 'hair',
    categoryLabel: 'Hair Services',
    price: 699,
    priceFormatted: '₱699',
    description: 'Full rich dimensional coloration or grey coverage customized to your skin tone.',
    fullDescription: 'Premium salon-grade hair coloring tailored to your preferred shade. Offers rich, multidimensional color vibrancy or complete root/grey coverage using ammonia-gentle conditioning dyes.',
    availableFor: 'Salon / Home Service',
    duration: '90 mins',
    icon: 'fa-solid fa-paintbrush',
    badge: 'Popular Color',
    isInquiry: false
  },
  {
    id: 3,
    code: 'power-dose',
    name: 'Power Dose',
    category: 'hair',
    categoryLabel: 'Hair Services',
    price: 499,
    priceFormatted: '₱499',
    description: 'Instant high-potency restorative ampoule treatment reviving brittle, lifeless ends.',
    fullDescription: 'Targeted molecular shot that instantly replenishes lost lipids and moisture in weakened hair fibers, providing an instant transformation from brittle to silky softness in just one wash cycle.',
    availableFor: 'Salon / Home Service',
    duration: '45 mins',
    icon: 'fa-solid fa-bolt',
    badge: 'Intensive Shot',
    isInquiry: false
  },
  {
    id: 4,
    code: 'cold-wave',
    name: 'Cold Wave Perm',
    category: 'hair',
    categoryLabel: 'Hair Services',
    price: 799,
    priceFormatted: '₱799',
    description: 'Volumizing texture wave or defined bounce curls with lasting curl retention.',
    fullDescription: 'Time-tested salon perming technique designed to create bouncy, well-defined curls, volume, and permanent natural movement without high thermal heat damage.',
    availableFor: 'Salon Visit',
    duration: '90 mins',
    icon: 'fa-solid fa-wind',
    badge: 'Classic Perm',
    isInquiry: false
  },
  {
    id: 5,
    code: 'bonacure',
    name: 'Bonacure Repair',
    category: 'hair',
    categoryLabel: 'Hair Services',
    price: 899,
    priceFormatted: '₱899',
    description: 'Advanced cellular hair repair infusion rebuilding elasticity and keratin bonds.',
    fullDescription: 'Cellular hair therapy powered by biomimetic peptides and ceramides that repairs cuticular damage from within, sealing in moisture and preventing recurring breakage.',
    availableFor: 'Salon / Home Service',
    duration: '60 mins',
    icon: 'fa-solid fa-shield-heart',
    badge: 'Peptide Therapy',
    isInquiry: false
  },
  {
    id: 6,
    code: 'keratine-treatment',
    name: 'Keratine Treatment',
    category: 'hair',
    categoryLabel: 'Hair Services',
    price: 499,
    priceFormatted: '₱499',
    description: 'Intensive protein replacement therapy delivering silky softness and strength.',
    fullDescription: 'Deep conditioning restorative protein therapy that seals the outer cuticle layer, leaving hair smooth, lustrous, and immune to high humidity frizz.',
    availableFor: 'Salon / Home Service',
    duration: '60 mins',
    icon: 'fa-solid fa-feather-pointed',
    badge: 'Frizz Defense',
    isInquiry: false
  },
  {
    id: 7,
    code: 'trim',
    name: 'Haircut & Trim',
    category: 'hair',
    categoryLabel: 'Hair Services',
    price: 150,
    priceFormatted: '₱150',
    description: 'Precision aesthetic trim and styling tailored to your face silhouette.',
    fullDescription: 'Quick precision perimeter shear cut and split-end elimination to maintain shape, foster healthy length retention, and keep hair tidy.',
    availableFor: 'Salon / Home Service',
    duration: '30 mins',
    icon: 'fa-solid fa-scissors',
    badge: 'Everyday Essential',
    isInquiry: false
  },
  {
    id: 8,
    code: 'rebonding',
    name: 'Hair Rebonding',
    category: 'hair',
    categoryLabel: 'Hair Services',
    price: 1499,
    priceFormatted: '₱1,499',
    description: 'Pin-straight permanent thermal rebonding therapy with glossy silk finish.',
    fullDescription: 'Permanent thermal smoothing system that relaxes curly or unruly hair bonds into pin-straight, ultra-glossy, fluid locks. Price may vary based on hair length upon consultation.',
    availableFor: 'Salon Visit',
    duration: '180 mins',
    icon: 'fa-solid fa-star',
    badge: 'Thermal Straightening',
    isInquiry: false
  },
  {
    id: 9,
    code: 'footspa',
    name: 'Footspa with Scrub',
    category: 'foot-care',
    categoryLabel: 'Foot Care',
    price: 350,
    priceFormatted: '₱350',
    description: 'Aromatic sea-salt soak, exfoliating callus buffing, and warm soothing massage.',
    fullDescription: 'Invigorating aromatherapy foot soak followed by pumice dead-skin exfoliation, calming moisturizing balm massage, and foot softening treatment.',
    availableFor: 'Salon / Home Service',
    duration: '45 mins',
    icon: 'fa-solid fa-spa',
    badge: 'Relaxation',
    isInquiry: false
  },
  {
    id: 10,
    code: 'manicure',
    name: 'Classic Manicure',
    category: 'nails',
    categoryLabel: 'Nails',
    price: 150,
    priceFormatted: '₱150',
    description: 'Full cuticle grooming, nail shaping, and regular lacquer polish of your choice.',
    fullDescription: 'Deluxe hand soak, nail shaping, cuticles cleanup, buffing, and chip-resistant regular nail lacquer coating.',
    availableFor: 'Salon / Home Service',
    duration: '30 mins',
    icon: 'fa-solid fa-hand-sparkles',
    badge: 'Classic Care',
    isInquiry: false
  },
  {
    id: 11,
    code: 'pedicure',
    name: 'Classic Pedicure',
    category: 'foot-care',
    categoryLabel: 'Foot Care',
    price: 180,
    priceFormatted: '₱180',
    description: 'Rejuvenating foot bath, cut and file grooming, and vibrant color coating.',
    fullDescription: 'Revitalizing warm foot soak, toenail shaping, cuticle trimming, gentle buff, and chip-resistant regular nail lacquer coating.',
    availableFor: 'Salon / Home Service',
    duration: '40 mins',
    icon: 'fa-solid fa-socks',
    badge: 'Foot Hygiene',
    isInquiry: false
  },
  {
    id: 12,
    code: 'gel-manicure',
    name: 'Gel Manicure',
    category: 'nails',
    categoryLabel: 'Nails',
    price: 499,
    priceFormatted: '₱499',
    description: 'Long-lasting chip-free UV LED gel polish with meticulous nail bed preparation.',
    fullDescription: 'Deluxe manicure finished with high-performance UV-cured gel polish that resists chipping, scratching, and dullness for up to 3 full weeks.',
    availableFor: 'Salon / Home Service',
    duration: '60 mins',
    icon: 'fa-solid fa-spray-can-sparkles',
    badge: 'Long Lasting',
    isInquiry: false
  },
  {
    id: 13,
    code: 'gel-pedicure',
    name: 'Gel Pedicure',
    category: 'foot-care',
    categoryLabel: 'Foot Care',
    price: 549,
    priceFormatted: '₱549',
    description: 'Durable high-gloss gel lacquer application with cuticle renewal care.',
    fullDescription: 'Full pedicure combined with resilient UV LED gel polish coating that dries instantly and withstands water, shoes, and active days without peeling.',
    availableFor: 'Salon / Home Service',
    duration: '60 mins',
    icon: 'fa-solid fa-circle-check',
    badge: 'Long Lasting',
    isInquiry: false
  }
];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initPatronProfile();
  loadServicesFromBackend();
  loadLiveBadges();
  setupDialogBackdropDismissals();
});

// 1. Initialize Patron Profile in Sidebar and Profile Modal
function initPatronProfile() {
  const savedUserJson = localStorage.getItem('nelys_user');
  if (!savedUserJson) {
    currentUser = { id: 'guest', full_name: 'Client Patron', email: '' };
    return;
  }

  try {
    currentUser = JSON.parse(savedUserJson);
    const displayName = currentUser.full_name || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Client');

    const sidebarName = document.getElementById('customerSidebarName');
    if (sidebarName) {
      sidebarName.textContent = displayName;
    }

    const avatarEl = document.getElementById('customerAvatarInitials');
    if (avatarEl) {
      const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      if (initials) avatarEl.textContent = initials;
    }

    const modalName = document.getElementById('profileModalName');
    if (modalName) modalName.value = displayName;

    const modalPhone = document.getElementById('profileModalPhone');
    if (modalPhone) modalPhone.value = currentUser.phone || '';

    const modalAddr = document.getElementById('profileModalAddress');
    if (modalAddr) modalAddr.value = currentUser.address || currentUser.home_address || 'Lagro, Quezon City';
  } catch (e) {
    console.warn('Error reading saved user in services:', e);
    currentUser = { id: 'guest', full_name: 'Client Patron', email: '' };
  }
}

// 2. Fetch Live Services from Backend API
async function loadServicesFromBackend() {
  try {
    const res = await fetch('../api/services');
    if (res.ok) {
      const result = await res.json();
      if ((result.success || result.status === 'success') && Array.isArray(result.data) && result.data.length > 0) {
        // Filter active services and map to UI schema
        const activeServices = result.data.filter(s => s.is_active === 1 || s.is_active === '1' || s.is_active === true);
        servicesCatalog = activeServices.map(item => mapBackendService(item));
      } else {
        servicesCatalog = [...defaultServicesCatalog];
      }
    } else {
      servicesCatalog = [...defaultServicesCatalog];
    }
  } catch (e) {
    console.warn('Backend services API unreachable, using local catalog:', e);
    servicesCatalog = [...defaultServicesCatalog];
  } finally {
    renderServices();
    updateCategoryCounts();
  }
}

// 3. Map Backend Service to Display Object
function mapBackendService(item) {
  const code = (item.code || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const catDb = (item.category || '').toLowerCase();

  let category = 'hair';
  let categoryLabel = 'Hair Services';

  // Accurate Category Classification
  if (code.includes('foot') || code.includes('pedicure') || name.includes('foot') || name.includes('pedicure') || name.includes('scrub')) {
    category = 'foot-care';
    categoryLabel = 'Foot Care';
  } else if (code.includes('manicure') || name.includes('manicure') || code.includes('nail') || name.includes('nail')) {
    category = 'nails';
    categoryLabel = 'Nails';
  } else if (catDb.includes('foot') || catDb.includes('pedicure')) {
    category = 'foot-care';
    categoryLabel = 'Foot Care';
  } else if (catDb.includes('nail') || catDb.includes('manicure')) {
    category = 'nails';
    categoryLabel = 'Nails';
  }

  const priceNum = parseFloat(item.price || 0);
  const formattedPrice = priceNum > 0
    ? `₱${priceNum.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : 'Price upon request';

  const durationMin = parseInt(item.duration_minutes, 10);
  const durationStr = durationMin > 0 ? `${durationMin} mins` : '60 mins';

  return {
    rawId: item.id,
    id: item.code || `svc-${item.id}`,
    code: item.code || `svc-${item.id}`,
    name: item.name,
    category,
    categoryLabel,
    price: priceNum,
    priceFormatted: formattedPrice,
    description: item.description || 'Professional salon care tailored for you.',
    fullDescription: item.description || 'Professional salon treatment using salon-grade products administered by seasoned specialists.',
    availableFor: (code === 'rebonding' || code === 'cold-wave') ? 'Salon Visit' : 'Salon / Home Service',
    duration: durationStr,
    icon: getServiceIcon(category, item.name, item.code),
    badge: getServiceBadge(category, item.name, item.code),
    isInquiry: priceNum === 0
  };
}

// Dynamic Icon Matching
function getServiceIcon(category, name = '', code = '') {
  const n = (name + ' ' + code).toLowerCase();
  if (n.includes('brazilian') || n.includes('keratin')) return 'fa-solid fa-wand-magic-sparkles';
  if (n.includes('color') || n.includes('dye')) return 'fa-solid fa-paintbrush';
  if (n.includes('dose')) return 'fa-solid fa-bolt';
  if (n.includes('perm') || n.includes('wave')) return 'fa-solid fa-wind';
  if (n.includes('bonacure') || n.includes('repair')) return 'fa-solid fa-shield-heart';
  if (n.includes('cut') || n.includes('trim')) return 'fa-solid fa-scissors';
  if (n.includes('rebond')) return 'fa-solid fa-star';
  if (n.includes('foot') || n.includes('spa')) return 'fa-solid fa-spa';
  if (n.includes('pedicure')) return 'fa-solid fa-socks';
  if (n.includes('gel-manicure')) return 'fa-solid fa-spray-can-sparkles';
  if (n.includes('manicure') || n.includes('nail')) return 'fa-solid fa-hand-sparkles';
  return 'fa-solid fa-sparkles';
}

// Dynamic Badge Matching
function getServiceBadge(category, name = '', code = '') {
  const n = (name + ' ' + code).toLowerCase();
  if (n.includes('brazilian')) return 'Signature Care';
  if (n.includes('dye') || n.includes('color')) return 'Popular Color';
  if (n.includes('dose')) return 'Intensive Shot';
  if (n.includes('perm') || n.includes('wave')) return 'Classic Perm';
  if (n.includes('bonacure')) return 'Peptide Therapy';
  if (n.includes('keratine')) return 'Frizz Defense';
  if (n.includes('rebond')) return 'Thermal Straightening';
  if (n.includes('gel')) return 'Long Lasting';
  if (n.includes('footspa')) return 'Relaxation';
  if (n.includes('pedicure')) return 'Foot Hygiene';
  if (n.includes('manicure')) return 'Classic Care';
  if (n.includes('trim')) return 'Everyday Essential';
  return 'Salon Treatment';
}

// 4. Update Dynamic Category Counts
function updateCategoryCounts() {
  const countAll = servicesCatalog.length;
  const countHair = servicesCatalog.filter(s => s.category === 'hair').length;
  const countNails = servicesCatalog.filter(s => s.category === 'nails').length;
  const countFootCare = servicesCatalog.filter(s => s.category === 'foot-care').length;

  const elAll = document.getElementById('count-all');
  const elHair = document.getElementById('count-hair');
  const elNails = document.getElementById('count-nails');
  const elFoot = document.getElementById('count-foot-care');

  if (elAll) elAll.textContent = countAll;
  if (elHair) elHair.textContent = countHair;
  if (elNails) elNails.textContent = countNails;
  if (elFoot) elFoot.textContent = countFootCare;
}

// 5. Category Filter Switcher
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

// 6. Real-time Search Handler
function handleSearch(val) {
  searchQuery = (val || '').toLowerCase().trim();
  renderServices();
}

// 7. Render Services Grid
function renderServices() {
  const container = document.getElementById('servicesGridContainer');
  const emptyState = document.getElementById('emptyServicesState');
  if (!container) return;

  const filtered = servicesCatalog.filter(item => {
    // 1. Category Filter
    if (currentCategory !== 'all' && item.category !== currentCategory) {
      return false;
    }

    // 2. Search Query Filter
    if (searchQuery) {
      const matchName = (item.name || '').toLowerCase().includes(searchQuery);
      const matchDesc = (item.description || '').toLowerCase().includes(searchQuery);
      const matchCategory = (item.categoryLabel || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchDesc && !matchCategory) {
        return false;
      }
    }

    return true;
  });

  // Handle Empty State
  if (filtered.length === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');

  let html = '';
  filtered.forEach(item => {
    const bookUrl = `booking.html?service=${encodeURIComponent(item.code || item.id)}&service_id=${item.rawId || item.id}&name=${encodeURIComponent(item.name)}`;
    const bookButtonLabel = item.isInquiry ? 'Inquire / Book' : 'Book Now';

    html += `
      <article class="bg-white rounded-3xl border border-[#DCC3AA] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between group">
        <div>
          <!-- Card Header: Badge & Category -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#810B38] bg-[#FAF6F0] px-2.5 py-1 rounded-full border border-[#DCC3AA]/50 flex items-center gap-1.5">
              <i class="${item.icon}"></i>
              ${escapeHtml(item.badge)}
            </span>
            <span class="text-[11px] font-medium text-[#735e5e]">${escapeHtml(item.categoryLabel)}</span>
          </div>

          <!-- Title -->
          <h3 
            onclick="openServiceModal('${item.id}')"
            class="font-serif text-2xl font-bold text-[#541A1A] group-hover:text-[#810B38] transition-colors cursor-pointer">
            ${escapeHtml(item.name)}
          </h3>

          <!-- Price Display -->
          <div class="mt-2 flex items-baseline gap-2">
            ${item.isInquiry ? `
              <span class="text-sm font-semibold text-[#810B38] italic">${item.priceFormatted}</span>
            ` : `
              <span class="font-serif text-2xl font-extrabold text-[#810B38]">${item.priceFormatted}</span>
            `}
          </div>

          <!-- Description -->
          <p class="text-xs text-[#735e5e] mt-2.5 leading-relaxed line-clamp-2">
            ${escapeHtml(item.description)}
          </p>

          <!-- Duration Pill -->
          <div class="mt-3 flex items-center gap-1.5 text-[11px] text-[#735e5e]">
            <i class="fa-regular fa-clock text-[#810B38]"></i>
            <span>${escapeHtml(item.duration)}</span>
          </div>
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
            href="${bookUrl}"
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

// 8. Open Service Details Modal
function openServiceModal(serviceId) {
  const item = servicesCatalog.find(s => s.id === serviceId || s.code === serviceId);
  if (!item) return;

  const nameEl = document.getElementById('modalServiceName');
  const catEl = document.getElementById('modalServiceCategory');
  const priceEl = document.getElementById('modalServicePrice');
  const descEl = document.getElementById('modalServiceDescription');
  const availEl = document.getElementById('modalServiceAvailable');
  const durEl = document.getElementById('modalServiceDuration');

  if (nameEl) nameEl.textContent = item.name;
  if (catEl) catEl.textContent = item.categoryLabel;
  if (priceEl) priceEl.textContent = item.priceFormatted;
  if (descEl) descEl.textContent = item.fullDescription || item.description;
  if (availEl) availEl.textContent = item.availableFor;
  if (durEl) durEl.textContent = item.duration;

  const bookBtn = document.getElementById('modalBookServiceBtn');
  if (bookBtn) {
    bookBtn.href = `booking.html?service=${encodeURIComponent(item.code || item.id)}&service_id=${item.rawId || item.id}&name=${encodeURIComponent(item.name)}`;
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
  if (modal && typeof modal.close === 'function') {
    modal.close();
  }
}

// 9. Clear Search Helper
function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = '';
    handleSearch('');
  }
}

// 10. Load Live Badges for Sidebar & Mobile Header
async function loadLiveBadges() {
  const token = localStorage.getItem('nelys_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  // A. Appointments Badge
  try {
    const res = await fetch('../api/bookings', { headers });
    if (res.ok) {
      const json = await res.json();
      if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
        const activeCount = json.data.filter(b => {
          const st = (b.status || '').toLowerCase();
          return st === 'pending' || st === 'confirmed';
        }).length;

        const badge = document.getElementById('sidebarAppointmentsBadge');
        if (badge) {
          if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not load bookings badge:', e);
  }

  // B. Notifications Badge
  try {
    const res = await fetch('../api/notifications', { headers });
    let unreadCount = 0;
    let readSet = new Set();
    try {
      const storedRead = localStorage.getItem('nelys_read_notifications');
      if (storedRead) readSet = new Set(JSON.parse(storedRead));
    } catch (_) {}

    if (res.ok) {
      const json = await res.json();
      if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
        unreadCount = json.data.filter(n => !n.is_read && !readSet.has(n.id)).length;
      }
    }

    const badge = document.getElementById('sidebarNotificationsBadge');
    const mobileDot = document.getElementById('mobileNotifDot');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
    if (mobileDot) {
      if (unreadCount > 0) {
        mobileDot.classList.remove('hidden');
      } else {
        mobileDot.classList.add('hidden');
      }
    }
  } catch (e) {
    console.warn('Could not load notifications badge:', e);
  }

  // C. Messages Badge
  try {
    let unreadMsgs = 0;
    if (token) {
      const msgRes = await fetch('../api/messages/unread-count', { headers });
      if (msgRes.ok) {
        const msgJson = await msgRes.json();
        if ((msgJson.success || msgJson.status === 'success') && msgJson.data) {
          unreadMsgs = msgJson.data.unread_count || 0;
        }
      }
    } else {
      const uid = currentUser && (currentUser.id || currentUser.email) ? (currentUser.id || currentUser.email) : 'guest';
      const savedMessages = localStorage.getItem(`nelys_messages_${uid}`);
      if (savedMessages) {
        const msgs = JSON.parse(savedMessages);
        if (Array.isArray(msgs)) {
          unreadMsgs = msgs.filter(m => m.sender === 'salon' && m.status !== 'read').length;
        }
      }
    }

    const msgBadge = document.getElementById('sidebarMessagesBadge');
    if (msgBadge) {
      if (unreadMsgs > 0) {
        msgBadge.textContent = unreadMsgs;
        msgBadge.classList.remove('hidden');
      } else {
        msgBadge.classList.add('hidden');
      }
    }
  } catch (_) {}
}

// 11. Mobile Sidebar Controls
function toggleMobileSidebar(force = null) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!sidebar) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  const shouldOpen = typeof force === 'boolean' ? force : isClosed;

  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    if (backdrop) {
      backdrop.classList.remove('opacity-0', 'pointer-events-none');
      backdrop.classList.add('opacity-100');
    }
    document.body.classList.add('overflow-hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) {
      backdrop.classList.remove('opacity-100');
      backdrop.classList.add('opacity-0', 'pointer-events-none');
    }
    document.body.classList.remove('overflow-hidden');
  }
}

// 12. Dialog Outside Click Dismissal
function setupDialogBackdropDismissals() {
  [document.getElementById('serviceDetailsModal'), document.getElementById('profileModal')].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        const rect = modal.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width
        );
        if (!isInDialog && typeof modal.close === 'function') {
          modal.close();
        }
      });
    }
  });
}

// 13. Logout Handler
function handleLogout(e) {
  if (confirm("Are you sure you want to log out of Nely's Salon?")) {
    localStorage.removeItem('nelys_token');
    localStorage.removeItem('nelys_user');
    showToast('Logging out...', 'info');
    return true;
  }
  if (e) e.preventDefault();
  return false;
}

// 14. Toast Notification Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-rose-900 border-rose-700' : 'bg-[#541A1A] border-[#DCC3AA]';
  const iconClass = type === 'error' ? 'fa-circle-exclamation text-rose-300' : 'fa-circle-check text-emerald-400';

  toast.className = `${bgClass} text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs border animate-slide-up pointer-events-auto`;
  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span class="font-medium">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utility: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
