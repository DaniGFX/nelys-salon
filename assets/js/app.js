/**
 * Nely's Salon - Core Frontend Application
 * Handles services catalog, filtering, booking workflow, cancellation,
 * and modal management. Clean icons with Font Awesome / SVG (no emojis).
 */

// Official Services & Prices
const SALON_SERVICES = [
  // Hair Services
  {
    id: 'brazilian',
    name: 'Brazilian Blowout',
    category: 'hair',
    price: 1999,
    priceDisplay: '₱1,999',
    duration: '120 mins',
    popular: true,
    tag: 'Signature Care',
    description: 'Transformative keratin smoothing treatment that eliminates frizz, restores moisture balance, and locks in mirror-like shine for months.'
  },
  {
    id: 'hair-dye',
    name: 'Hair Dye & Color',
    category: 'hair',
    price: 699,
    priceDisplay: '₱699',
    duration: '90 mins',
    popular: false,
    tag: 'Custom Blend',
    description: 'Full rich dimensional coloration, grey coverage, or gloss customized to your skin tone using gentle, nourishing formulas.'
  },
  {
    id: 'power-dose',
    name: 'Power Dose Repair',
    category: 'hair',
    price: 499,
    priceDisplay: '₱499',
    duration: '45 mins',
    popular: false,
    tag: 'Intensive Care',
    description: 'Concentrated micro-molecular shot that deeply penetrates weakened cuticles to restore structural elasticity and softness.'
  },
  {
    id: 'cold-wave',
    name: 'Cold Wave Perm',
    category: 'hair',
    price: 699,
    priceDisplay: '₱699',
    duration: '120 mins',
    popular: false,
    tag: 'Natural Bounce',
    description: 'Bouncy, defined curls or textured waves crafted with precision rolling technique and protective perming lotion.'
  },
  {
    id: 'bonacure',
    name: 'Bonacure Deep Conditioning',
    category: 'hair',
    price: 499,
    priceDisplay: '₱499',
    duration: '50 mins',
    popular: false,
    tag: 'Cellular Care',
    description: 'Cellular restorative treatment hydrating parched locks and sealing damaged split ends with peptide bond repair.'
  },
  {
    id: 'keratine-treatment',
    name: 'Keratine Treatment',
    category: 'hair',
    price: 499,
    priceDisplay: '₱499',
    duration: '60 mins',
    popular: true,
    tag: 'Deep Restoration',
    description: 'Infusion of pure botanical keratin that relaxes unruly strands, restores silkiness, and leaves lasting radiance.'
  },
  {
    id: 'trim',
    name: 'Precision Trim',
    category: 'hair',
    price: 149,
    priceDisplay: '₱149',
    duration: '30 mins',
    popular: false,
    tag: 'Shape & Clean',
    description: 'Clean split-end elimination and contouring haircut customized to maintain your natural bounce and style.'
  },
  {
    id: 'rebonding',
    name: 'Hair Rebonding',
    category: 'hair',
    price: 1499,
    priceDisplay: 'Price to be confirmed',
    duration: '180 mins',
    popular: true,
    tag: 'Silk Smooth',
    description: 'Permanent smoothing ritual providing silky straight elegance with restorative moisture-lock barrier. Free consultation.'
  },

  // Nail & Foot Care
  {
    id: 'footspa',
    name: 'Botanical Footspa',
    category: 'nails',
    price: 199,
    priceDisplay: '₱199',
    duration: '45 mins',
    popular: true,
    tag: 'Relaxation',
    description: 'Detoxifying aromatic foot soak, dead skin exfoliation, softening mask, and soothing acupressure massage.'
  },
  {
    id: 'manicure',
    name: 'Classic Manicure',
    category: 'nails',
    price: 149,
    priceDisplay: '₱149',
    duration: '35 mins',
    popular: false,
    tag: 'Essential Care',
    description: 'Essential hand ritual: nail shaping, delicate cuticle refinement, buffing, and high-shine regular polish.'
  },
  {
    id: 'pedicure',
    name: 'Classic Pedicure',
    category: 'nails',
    price: 149,
    priceDisplay: '₱149',
    duration: '40 mins',
    popular: false,
    tag: 'Essential Care',
    description: 'Relaxing foot treatment with warm herbal soak, cuticle care, heel smoothing, and vibrant polish.'
  },
  {
    id: 'gel-manicure',
    name: 'Gel Manicure',
    category: 'nails',
    price: 499,
    priceDisplay: '₱499',
    duration: '50 mins',
    popular: true,
    tag: 'Long Lasting',
    description: 'Chip-resistant UV gel polish with organic cuticle cleanup, precision nail shaping, and botanical massage.'
  },
  {
    id: 'gel-pedicure',
    name: 'Gel Pedicure',
    category: 'nails',
    price: 499,
    priceDisplay: '₱499',
    duration: '60 mins',
    popular: false,
    tag: 'High Shine',
    description: 'Ultra-durable gel pedicure including warm foot soak, heel buffing, nail shaping, and rich hydration balm.'
  }
];

// Sample Initial Bookings for Demo / Tracking
const DEFAULT_BOOKINGS = [
  {
    id: 'NS-7821',
    customerName: 'Angela Marie Cruz',
    phone: '09178821432',
    email: 'angela.cruz@gmail.com',
    serviceId: 'brazilian',
    serviceName: 'Brazilian Blowout',
    price: 1999,
    serviceType: 'in-salon',
    date: '2026-09-25',
    time: '14:00',
    paymentMethod: 'GCash',
    address: 'Blk 42 Lot 59 Ascension Rd, Lagro, QC (Salon Visit)',
    status: 'Confirmed',
    createdAt: '2026-09-21T10:30:00'
  },
  {
    id: 'NS-6419',
    customerName: 'Carla De Guzman',
    phone: '09285514210',
    email: 'carla.deguzman@yahoo.com',
    serviceId: 'rebonding',
    serviceName: 'Hair Rebonding',
    price: 1499,
    serviceType: 'home-service',
    date: '2026-09-26',
    time: '10:00',
    paymentMethod: 'Cash',
    address: 'Fairview, Quezon City',
    status: 'Confirmed',
    createdAt: '2026-09-22T08:15:00'
  }
];

// Local Storage Helper
function getStoredBookings() {
  const data = localStorage.getItem('nelys_salon_bookings');
  if (!data) {
    localStorage.setItem('nelys_salon_bookings', JSON.stringify(DEFAULT_BOOKINGS));
    return DEFAULT_BOOKINGS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_BOOKINGS;
  }
}

function saveBookings(bookings) {
  localStorage.setItem('nelys_salon_bookings', JSON.stringify(bookings));
}

// Render Services in Landing Page
function renderServices(filter = 'all') {
  const container = document.getElementById('servicesGrid');
  if (!container) return;

  const filtered = filter === 'all' 
    ? SALON_SERVICES 
    : SALON_SERVICES.filter(s => s.category === filter);

  container.innerHTML = filtered.map(service => `
    <div class="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-[#FAF6F0] border border-[#E8D9CA] hover:border-[#810B38] transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div>
        <div class="flex items-start justify-between gap-4 mb-2">
          <h3 class="font-serif text-xl sm:text-2xl text-[#541A1A] font-semibold leading-tight group-hover:text-[#810B38] transition-colors">
            ${service.name}
          </h3>
          <span class="shrink-0 font-serif text-lg sm:text-xl font-bold text-[#810B38] tracking-tight">
            ${service.priceDisplay}
          </span>
        </div>

        <div class="mb-3">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#F1E2D1] text-[#810B38]">
            ${service.category === 'hair' ? 'Hair Services' : 'Nail & Foot Care'}
          </span>
        </div>

        <p class="text-xs sm:text-sm text-[#6c5858] leading-relaxed mb-6 font-normal">
          ${service.description}
        </p>
      </div>

      <div class="pt-4 border-t border-[#eedfc9] flex items-center justify-between text-xs text-[#735e5e]">
        <div class="flex items-center gap-1.5 font-medium">
          <i class="fa-regular fa-clock text-[#810B38]"></i>
          <span>${service.duration}</span>
        </div>

        <button 
          type="button" 
          onclick="openBookingModal('${service.id}')"
          class="inline-flex items-center gap-1.5 font-semibold text-[#810B38] hover:text-[#541A1A] transition-colors group-hover:translate-x-0.5">
          <span>Book Ritual</span>
          <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// Service Filter Tabs Controller
function initServiceFilters() {
  const tabs = document.querySelectorAll('.service-filter-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('bg-[#810B38]', 'text-white', 'shadow-sm');
        t.classList.add('bg-transparent', 'text-[#541A1A]', 'hover:bg-[#eedfc9]/50');
      });
      btn.classList.remove('bg-transparent', 'text-[#541A1A]', 'hover:bg-[#eedfc9]/50');
      btn.classList.add('bg-[#810B38]', 'text-white', 'shadow-sm');
      
      const filter = btn.getAttribute('data-filter') || 'all';
      renderServices(filter);
    });
  });
}

// Populate Services dropdown in Booking Modal
function populateBookingServicesDropdown(selectedId = '') {
  const select = document.getElementById('bookingServiceSelect');
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>— Select your beauty service —</option>' + 
    SALON_SERVICES.map(s => `
      <option value="${s.id}" data-price="${s.price}" ${s.id === selectedId ? 'selected' : ''}>
        ${s.name} — ${s.priceDisplay} (${s.duration})
      </option>
    `).join('');

  updateBookingPriceSummary();
}

// Update Price Summary in Booking Form
function updateBookingPriceSummary() {
  const select = document.getElementById('bookingServiceSelect');
  const serviceType = document.querySelector('input[name="serviceType"]:checked')?.value || 'in-salon';
  const priceDisplay = document.getElementById('bookingTotalPrice');
  const serviceTypeNote = document.getElementById('bookingTypeFeeNote');

  if (!select) return;

  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption || !selectedOption.value) {
    if (priceDisplay) priceDisplay.textContent = '₱0';
    return;
  }

  const selectedService = SALON_SERVICES.find(s => s.id === selectedOption.value);
  if (selectedService && selectedService.id === 'rebonding') {
    if (priceDisplay) priceDisplay.textContent = 'Consultation';
    if (serviceTypeNote) serviceTypeNote.textContent = 'Final price evaluated based on hair length and density';
    return;
  }

  const basePrice = parseInt(selectedOption.getAttribute('data-price') || '0', 10);
  const homeServiceFee = (serviceType === 'home-service') ? 150 : 0;
  const total = basePrice + homeServiceFee;

  if (priceDisplay) {
    priceDisplay.textContent = `₱${total.toLocaleString()}`;
  }

  if (serviceTypeNote) {
    serviceTypeNote.textContent = serviceType === 'home-service'
      ? '+ ₱150 Lagro / QC doorstep convenience & travel fee included'
      : 'Salon Visit at Ascension Rd, Lagro (No extra service fee)';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Landing Page Staff & Availability State
let landingActiveStaffList = [];
let landingSelectedStaff = {
  id: null,
  name: 'Any Available Stylist',
  role: 'Salon Team'
};
let landingSelectedTime = '13:00';
let landingAvailabilityData = null;

const LANDING_TIME_SLOTS = [
  { value: '09:00', timeDb: '09:00:00', label: '09:00 AM' },
  { value: '10:00', timeDb: '10:00:00', label: '10:00 AM' },
  { value: '11:00', timeDb: '11:00:00', label: '11:00 AM' },
  { value: '13:00', timeDb: '13:00:00', label: '01:00 PM' },
  { value: '14:00', timeDb: '14:00:00', label: '02:00 PM' },
  { value: '15:00', timeDb: '15:00:00', label: '03:00 PM' },
  { value: '16:00', timeDb: '16:00:00', label: '04:00 PM' },
  { value: '17:00', timeDb: '17:00:00', label: '05:00 PM' },
  { value: '18:00', timeDb: '18:00:00', label: '06:00 PM' }
];

async function loadLandingStaff() {
  try {
    const res = await fetch('api/staff');
    if (res.ok) {
      const json = await res.json();
      let staffData = [];
      if (json.data) {
        if (Array.isArray(json.data.staff)) {
          staffData = json.data.staff;
        } else if (Array.isArray(json.data)) {
          staffData = json.data;
        }
      }
      if (staffData.length > 0) {
        const active = staffData.filter(s => s.is_active === 1 || s.is_active === '1' || s.is_active === true || s.status === 'Active');
        landingActiveStaffList = active.map(mapLandingStaffItem);
      }
    }
  } catch (err) {
    console.warn('Landing staff fetch notice:', err);
  }
  renderLandingStaffCards();
}

function resolveLandingStaffAvatar(avatar, staffName = '') {
  if (!avatar && !staffName) return 'assets/images/logo.jfif';
  const av = String(avatar || staffName).trim();
  if (av.startsWith('http://') || av.startsWith('https://') || av.startsWith('data:')) {
    return av;
  }
  if (av.startsWith('assets/')) {
    return av;
  }
  const clean = av.toLowerCase().replace(/[\s_]+/g, '-');
  if (clean.includes('staff-1') || clean.includes('director') || clean.includes('nely') || clean === '1') {
    return 'assets/images/team/director.jpg';
  }
  if (clean.includes('staff-2') || clean.includes('sculptor') || clean.includes('ana') || clean === '2') {
    return 'assets/images/team/sculptor.jpg';
  }
  if (clean.includes('staff-3') || clean.includes('spa-specialist') || clean.includes('elena') || clean === '3') {
    return 'assets/images/team/spa-specialist.jpg';
  }
  if (av.includes('team/')) {
    return `assets/images/${av}`;
  }
  return `assets/images/team/${av}`;
}

function mapLandingStaffItem(item) {
  const avatarUrl = resolveLandingStaffAvatar(item.avatar, item.name);

  return {
    id: parseInt(item.id),
    name: item.name || 'Stylist',
    role: item.role || item.position || 'Stylist & Specialist',
    avatar: avatarUrl,
    specialties: item.specialties || '',
    availability: item.availability || 'Available',
    status: item.status || 'Active'
  };
}

function renderLandingStaffCards() {
  const container = document.getElementById('modalStaffSelectionGrid');
  if (!container) return;

  const isAnySelected = !landingSelectedStaff.id;
  const anyBorder = isAnySelected ? 'border-[#810B38] ring-2 ring-[#810B38]/30 shadow-md bg-[#FAF6F0]' : 'border-[#DCC3AA] bg-white';
  const anyCheck = isAnySelected ? 'bg-[#810B38] text-white' : 'bg-gray-100 text-transparent';

  let html = `
    <!-- Option 0: Any Available Stylist -->
    <div onclick="selectLandingStaff(null, 'Any Available Stylist', 'Salon Team')"
      id="modalStaffCard-any"
      class="landing-staff-card p-3.5 rounded-2xl border-2 ${anyBorder} hover:border-[#810B38] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group">
      <div>
        <div class="flex items-start justify-between mb-2">
          <div class="w-9 h-9 rounded-full bg-[#810B38] text-white flex items-center justify-center text-xs shadow-sm border border-[#DCC3AA]">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <span id="modalStaffCheck-any" class="w-5 h-5 rounded-full ${anyCheck} flex items-center justify-center text-[10px] transition-colors">
            <i class="fa-solid fa-check"></i>
          </span>
        </div>
        <h4 class="font-serif text-base font-bold text-[#541A1A] group-hover:text-[#810B38] transition-colors leading-tight">
          Any Available
        </h4>
        <p class="text-[11px] text-[#810B38] font-bold mt-0.5">
          Fastest Confirmation
        </p>
        <p class="text-[10px] text-[#735e5e] mt-1 line-clamp-2">
          Match with the best available specialist for your chosen slot.
        </p>
      </div>
      <div class="mt-2.5 pt-2 border-t border-[#F1E2D1] flex items-center justify-between text-[10px]">
        <span class="font-semibold text-emerald-700 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Recommended
        </span>
        <span class="font-bold text-[#810B38] flex items-center gap-0.5">
          Select <i class="fa-solid fa-arrow-right text-[8px]"></i>
        </span>
      </div>
    </div>
  `;

  landingActiveStaffList.forEach(s => {
    const isSelected = landingSelectedStaff.id === s.id;
    const staffAvail = landingAvailabilityData?.staff?.find(x => x.id === s.id);
    let isUnavailable = false;
    let badgeHtml = '';
    let reasonMessage = '';

    if (staffAvail) {
      if (!staffAvail.is_working_today) {
        isUnavailable = true;
        badgeHtml = `<span class="font-semibold text-amber-700 flex items-center gap-1"><i class="fa-solid fa-ban text-[10px] text-amber-600"></i> ${escapeHtml(staffAvail.schedule_today || 'Day Off')}</span>`;
        reasonMessage = `${s.name} is off-duty / scheduled off on this date.`;
      } else {
        const selectedSlotDb = LANDING_TIME_SLOTS.find(slot => slot.value === landingSelectedTime)?.timeDb || '13:00:00';
        const isSlotBooked = (staffAvail.booked_times || []).includes(selectedSlotDb) || (staffAvail.booked_display_times || []).includes(landingSelectedTime);
        if (isSlotBooked) {
          isUnavailable = true;
          badgeHtml = `<span class="font-semibold text-rose-700 flex items-center gap-1"><i class="fa-solid fa-calendar-xmark text-[10px] text-rose-600"></i> Booked</span>`;
          reasonMessage = `${s.name} is already booked for this slot. Please select another stylist or slot.`;
        } else {
          badgeHtml = `<span class="font-semibold text-emerald-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available</span>`;
        }
      }
    } else {
      badgeHtml = `<span class="font-semibold text-emerald-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available</span>`;
    }

    let cardClass = '';
    let clickHandler = '';

    if (isUnavailable) {
      cardClass = 'landing-staff-card p-3.5 rounded-2xl border-2 border-stone-200 bg-stone-50/80 opacity-60 shadow-xs cursor-not-allowed flex flex-col justify-between select-none';
      clickHandler = `onclick="handleUnavailableStaffClick('${escapeHtml(reasonMessage)}')"` ;
    } else {
      const cardBorder = isSelected ? 'border-[#810B38] ring-2 ring-[#810B38]/30 shadow-md bg-[#FAF6F0]' : 'border-[#DCC3AA] bg-white';
      cardClass = `landing-staff-card p-3.5 rounded-2xl border-2 ${cardBorder} hover:border-[#810B38] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group`;
      clickHandler = `onclick="selectLandingStaff(${s.id}, '${escapeHtml(s.name)}', '${escapeHtml(s.role)}')"` ;
    }

    const cardCheck = isSelected && !isUnavailable ? 'bg-[#810B38] text-white' : 'bg-gray-100 text-transparent';

    html += `
      <!-- Stylist Card: ${escapeHtml(s.name)} -->
      <div ${clickHandler}
        id="modalStaffCard-${s.id}"
        class="${cardClass}"
        title="${isUnavailable ? escapeHtml(reasonMessage) : ''}">
        <div>
          <div class="flex items-start justify-between mb-2">
            <div class="relative">
              <img src="${s.avatar}" alt="${escapeHtml(s.name)}"
                onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');"
                class="w-9 h-9 rounded-full border border-[#DCC3AA] object-cover shadow-sm ${isUnavailable ? 'grayscale' : ''}">
              <div class="hidden w-9 h-9 rounded-full bg-[#810B38] text-white flex items-center justify-center font-bold text-xs border border-[#DCC3AA]">
                ${escapeHtml(s.name.substring(0, 2).toUpperCase())}
              </div>
            </div>
            <span id="modalStaffCheck-${s.id}" class="w-5 h-5 rounded-full ${cardCheck} flex items-center justify-center text-[10px] transition-colors">
              <i class="fa-solid fa-check"></i>
            </span>
          </div>
          <h4 class="font-serif text-base font-bold text-[#541A1A] ${!isUnavailable ? 'group-hover:text-[#810B38]' : ''} transition-colors leading-tight">
            ${escapeHtml(s.name)}
          </h4>
          <p class="text-[11px] text-[#810B38] font-medium mt-0.5 truncate" title="${escapeHtml(s.role)}">
            ${escapeHtml(s.role)}
          </p>
          <p class="text-[10px] text-[#735e5e] mt-1 line-clamp-2">
            ${escapeHtml(s.specialties || 'Dedicated salon beauty & styling specialist.')}
          </p>
        </div>
        <div class="mt-2.5 pt-2 border-t border-[#F1E2D1] flex items-center justify-between text-[10px]">
          ${badgeHtml}
          ${isUnavailable 
            ? '<span class="font-semibold text-stone-400 flex items-center gap-0.5"><i class="fa-solid fa-lock text-[8px]"></i> Busy</span>'
            : '<span class="font-bold text-[#810B38] flex items-center gap-0.5">Select <i class="fa-solid fa-arrow-right text-[8px]"></i></span>'
          }
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.handleUnavailableStaffClick = function(message) {
  showToast(message || 'This stylist is unavailable for the selected slot. Please select another stylist or slot.', 'warning');
};

window.selectLandingStaff = function(id, name, role) {
  const staffId = id ? parseInt(id) : null;
  const staffName = name || 'Any Available Stylist';
  const staffRole = role || 'Salon Team';

  if (staffId && landingAvailabilityData) {
    const staffInfo = landingAvailabilityData.staff?.find(x => x.id === staffId);
    if (staffInfo && !staffInfo.is_working_today) {
      showToast(`${staffName} is off-duty on this date (${staffInfo.schedule_today || 'Day Off'}). Please choose another stylist or date.`, 'warning');
      return;
    }
  }

  landingSelectedStaff = {
    id: staffId,
    name: staffName,
    role: staffRole
  };

  const hiddenInput = document.getElementById('bookingStaffId');
  if (hiddenInput) hiddenInput.value = staffId || '';

  renderLandingStaffCards();
  renderLandingTimeSlots();
};

async function loadLandingAvailability(dateIso) {
  if (!dateIso) return;
  try {
    const res = await fetch(`api/availability?date=${dateIso}`);
    if (res.ok) {
      const json = await res.json();
      if ((json.status === 'success' || json.success) && json.data) {
        landingAvailabilityData = json.data;
      }
    }
  } catch (err) {
    console.warn('Availability fetch notice:', err);
  }
  renderLandingStaffCards();
  renderLandingTimeSlots();
}

function renderLandingTimeSlots() {
  const container = document.getElementById('modalTimeSlotsGrid');
  if (!container) return;

  const staffId = landingSelectedStaff.id;
  const staffAvail = staffId && landingAvailabilityData?.staff?.find(x => x.id === staffId);

  let html = '';

  LANDING_TIME_SLOTS.forEach(slot => {
    let isBooked = false;
    let disabledReason = '';

    if (staffId && staffAvail) {
      if (!staffAvail.is_working_today) {
        isBooked = true;
        disabledReason = 'Stylist off-duty';
      } else if ((staffAvail.booked_times || []).includes(slot.timeDb) || (staffAvail.booked_display_times || []).includes(slot.value)) {
        isBooked = true;
        disabledReason = 'Stylist booked';
      }
    } else if (!staffId && landingAvailabilityData?.slots) {
      const slotInfo = landingAvailabilityData.slots.find(s => s.time === slot.timeDb);
      if (slotInfo && slotInfo.is_available === false) {
        isBooked = true;
        disabledReason = 'All stylists booked';
      }
    }

    const isSelected = (landingSelectedTime === slot.value) && !isBooked;

    if (isBooked) {
      html += `
        <button type="button" disabled
          title="${escapeHtml(disabledReason)}"
          class="py-2.5 px-2 rounded-xl bg-stone-100 border border-stone-200 text-stone-400 text-xs font-semibold cursor-not-allowed opacity-60 text-center select-none flex flex-col items-center justify-center">
          <span class="line-through">${slot.label}</span>
          <span class="text-[9px] text-stone-400 font-normal">Booked</span>
        </button>
      `;
    } else if (isSelected) {
      html += `
        <button type="button" onclick="selectLandingTime('${slot.value}', '${slot.label}')"
          class="py-2.5 px-2 rounded-xl bg-[#810B38] border-2 border-[#810B38] text-white text-xs font-bold shadow-md text-center transition-all flex flex-col items-center justify-center">
          <span>${slot.label}</span>
          <span class="text-[9px] text-[#F1E2D1] font-semibold">Selected</span>
        </button>
      `;
    } else {
      html += `
        <button type="button" onclick="selectLandingTime('${slot.value}', '${slot.label}')"
          class="py-2.5 px-2 rounded-xl bg-white border border-[#DCC3AA] hover:border-[#810B38] hover:bg-[#FAF6F0] text-[#2b1d1d] text-xs font-semibold text-center transition-all flex flex-col items-center justify-center">
          <span>${slot.label}</span>
          <span class="text-[9px] text-emerald-700 font-medium">Available</span>
        </button>
      `;
    }
  });

  container.innerHTML = html;
}

window.selectLandingTime = function(timeVal, label) {
  landingSelectedTime = timeVal;
  const timeInput = document.getElementById('bookingTime');
  if (timeInput) timeInput.value = timeVal;

  const labelEl = document.getElementById('modalSelectedTimeLabel');
  if (labelEl) labelEl.textContent = label || timeVal;

  renderLandingTimeSlots();
  renderLandingStaffCards();
};

// Open Booking Modal with optional preselected service
window.openBookingModal = function(serviceId = '', preferredType = '') {
  const modal = document.getElementById('bookingModal');
  if (!modal) return;

  populateBookingServicesDropdown(serviceId);

  // If preferred type is specified (e.g. 'home-service' or 'in-salon')
  if (preferredType) {
    const radio = document.querySelector(`input[name="serviceType"][value="${preferredType}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    }
  }

  // Set min date to today
  const dateInput = document.getElementById('bookingDate');
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) {
    dateInput.min = today;
    if (!dateInput.value) {
      dateInput.value = today;
    }
  }

  const activeDate = dateInput ? dateInput.value : today;
  if (landingActiveStaffList.length === 0) {
    loadLandingStaff().then(() => {
      loadLandingAvailability(activeDate);
    });
  } else {
    loadLandingAvailability(activeDate);
  }

  // Reset form views if confirmation was shown
  const formSection = document.getElementById('bookingFormSection');
  const successSection = document.getElementById('bookingSuccessSection');
  if (formSection) formSection.classList.remove('hidden');
  if (successSection) successSection.classList.add('hidden');

  modal.showModal();
};

window.closeBookingModal = function() {
  const modal = document.getElementById('bookingModal');
  if (modal) modal.close();
};

// Open Track / Manage Booking Modal
window.openTrackModal = function(refCode = '') {
  const modal = document.getElementById('trackModal');
  if (!modal) return;

  const input = document.getElementById('trackRefInput');
  if (input && refCode) {
    input.value = refCode;
  }
  
  const resultContainer = document.getElementById('trackResultArea');
  if (resultContainer) resultContainer.classList.add('hidden');

  modal.showModal();

  if (refCode) {
    searchBookingRecord();
  }
};

window.closeTrackModal = function() {
  const modal = document.getElementById('trackModal');
  if (modal) modal.close();
};

// Open Auth / Login Modal
window.openAuthModal = function(mode = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  switchAuthTab(mode);
  modal.showModal();
};

window.closeAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) modal.close();
};

// Switch Tabs inside Auth Modal
window.switchAuthTab = function(mode) {
  const tabLogin = document.getElementById('tabAuthLogin');
  const tabSignUp = document.getElementById('tabAuthSignUp');
  const contentLogin = document.getElementById('authLoginContent');
  const contentSignUp = document.getElementById('authSignUpContent');

  if (mode === 'login') {
    tabLogin?.classList.add('border-[#810B38]', 'text-[#810B38]', 'font-bold');
    tabLogin?.classList.remove('border-transparent', 'text-[#735e5e]');
    tabSignUp?.classList.remove('border-[#810B38]', 'text-[#810B38]', 'font-bold');
    tabSignUp?.classList.add('border-transparent', 'text-[#735e5e]');

    contentLogin?.classList.remove('hidden');
    contentSignUp?.classList.add('hidden');
  } else {
    tabSignUp?.classList.add('border-[#810B38]', 'text-[#810B38]', 'font-bold');
    tabSignUp?.classList.remove('border-transparent', 'text-[#735e5e]');
    tabLogin?.classList.remove('border-[#810B38]', 'text-[#810B38]', 'font-bold');
    tabLogin?.classList.add('border-transparent', 'text-[#735e5e]');

    contentSignUp?.classList.remove('hidden');
    contentLogin?.classList.add('hidden');
  }
};

// Search Booking Record
window.searchBookingRecord = function() {
  const input = document.getElementById('trackRefInput');
  const resultArea = document.getElementById('trackResultArea');
  if (!input || !resultArea) return;

  const query = input.value.trim().toUpperCase();
  if (!query) {
    showToast('Please enter your Reference ID or Phone number', 'warning');
    return;
  }

  const bookings = getStoredBookings();
  const found = bookings.find(b => 
    b.id.toUpperCase() === query || 
    b.phone.replace(/\D/g, '') === query.replace(/\D/g, '')
  );

  resultArea.classList.remove('hidden');

  if (!found) {
    resultArea.innerHTML = `
      <div class="p-6 rounded-xl bg-red-50/70 border border-red-200 text-center">
        <p class="font-semibold text-red-800 text-sm mb-1">No Appointment Found</p>
        <p class="text-xs text-red-600">We couldn't locate any record matching "${query}". Please verify your reference number (e.g. NS-7821) or phone number.</p>
      </div>
    `;
    return;
  }

  const isCancelled = found.status === 'Cancelled';

  resultArea.innerHTML = `
    <div class="p-6 rounded-2xl bg-white border border-[#E8D9CA] shadow-sm text-left">
      <div class="flex items-center justify-between border-b border-[#F1E2D1] pb-3 mb-4">
        <div>
          <span class="text-[10px] uppercase tracking-wider text-[#735e5e] font-semibold">Reference Code</span>
          <h4 class="font-serif text-2xl font-bold text-[#810B38]">${found.id}</h4>
        </div>
        <span class="px-3 py-1 text-xs font-semibold rounded-full ${
          isCancelled 
            ? 'bg-red-100 text-red-700' 
            : 'bg-emerald-100 text-emerald-800'
        }">
          ${found.status}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm mb-5 text-[#541A1A]">
        <div>
          <span class="text-[11px] text-[#735e5e] block">Customer Name</span>
          <span class="font-medium">${found.customerName}</span>
        </div>
        <div>
          <span class="text-[11px] text-[#735e5e] block">Contact Number</span>
          <span class="font-medium">${found.phone}</span>
        </div>
        <div>
          <span class="text-[11px] text-[#735e5e] block">Scheduled Service</span>
          <span class="font-medium">${found.serviceName}</span>
        </div>
        <div>
          <span class="text-[11px] text-[#735e5e] block">Date & Time</span>
          <span class="font-medium">${found.date} at ${found.time}</span>
        </div>
        <div>
          <span class="text-[11px] text-[#735e5e] block">Service Type</span>
          <span class="font-medium capitalize">${found.serviceType === 'home-service' ? 'Home Service' : 'Salon Visit (Lagro QC)'}</span>
        </div>
        <div>
          <span class="text-[11px] text-[#735e5e] block">Total Amount & Payment</span>
          <span class="font-semibold text-[#810B38]">₱${found.price.toLocaleString()} (${found.paymentMethod})</span>
        </div>
      </div>

      ${found.serviceType === 'home-service' && found.address ? `
        <div class="p-3 bg-[#FAF6F0] rounded-xl text-xs text-[#6c5858] mb-5">
          <span class="font-semibold text-[#541A1A]">Service Address:</span> ${found.address}
        </div>
      ` : ''}

      ${!isCancelled ? `
        <div class="pt-3 border-t border-[#F1E2D1] flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-[#735e5e]">Need to reschedule or cancel? Free cancellation available anytime.</p>
          <button 
            type="button" 
            onclick="cancelBookingRecord('${found.id}')"
            class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 transition-colors">
            Cancel Appointment
          </button>
        </div>
      ` : `
        <div class="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 italic">
          This booking was cancelled. You can create a new booking anytime.
        </div>
      `}
    </div>
  `;
};

// Cancel Booking Record
window.cancelBookingRecord = function(refCode) {
  if (!confirm(`Are you sure you want to cancel appointment ${refCode}?`)) return;

  const bookings = getStoredBookings();
  const index = bookings.findIndex(b => b.id === refCode);
  if (index !== -1) {
    bookings[index].status = 'Cancelled';
    saveBookings(bookings);
    showToast(`Appointment ${refCode} has been successfully cancelled.`, 'info');
    searchBookingRecord();
  }
};

// Toast Notifications
window.showToast = function(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgStyles = type === 'success' 
    ? 'bg-[#541A1A] text-[#F1E2D1] border border-[#810B38]' 
    : type === 'warning'
    ? 'bg-amber-800 text-white'
    : 'bg-[#810B38] text-white';

  toast.className = `pointer-events-auto px-5 py-3.5 rounded-xl shadow-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all duration-300 transform translate-y-2 opacity-0 ${bgStyles}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button type="button" class="text-white/70 hover:text-white font-bold ml-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark text-xs"></i></button>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
};

// Booking Form Submission Handler
function initBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  // Toggle Home service address field
  const serviceTypeRadios = document.querySelectorAll('input[name="serviceType"]');
  const homeAddressField = document.getElementById('homeAddressContainer');

  serviceTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'home-service' && radio.checked) {
        homeAddressField?.classList.remove('hidden');
        document.getElementById('bookingAddress')?.setAttribute('required', 'true');
      } else {
        homeAddressField?.classList.add('hidden');
        document.getElementById('bookingAddress')?.removeAttribute('required');
      }
      updateBookingPriceSummary();
    });
  });

  // Service select change
  document.getElementById('bookingServiceSelect')?.addEventListener('change', updateBookingPriceSummary);

  // Date select change -> reload real-time availability
  const dateInput = document.getElementById('bookingDate');
  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      loadLandingAvailability(e.target.value);
    });
    dateInput.addEventListener('input', (e) => {
      loadLandingAvailability(e.target.value);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const serviceSelect = document.getElementById('bookingServiceSelect');
    const selectedServiceId = serviceSelect.value;
    const selectedService = SALON_SERVICES.find(s => s.id === selectedServiceId);

    if (!selectedService) {
      showToast('Please select a service', 'warning');
      return;
    }

    const serviceType = document.querySelector('input[name="serviceType"]:checked')?.value || 'in-salon';
    const customerName = document.getElementById('bookingName')?.value.trim();
    const phone = document.getElementById('bookingPhone')?.value.trim();
    const email = document.getElementById('bookingEmail')?.value.trim();
    const date = document.getElementById('bookingDate')?.value;
    const time = document.getElementById('bookingTime')?.value || landingSelectedTime || '13:00';
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'Cash';
    const address = serviceType === 'home-service' 
      ? document.getElementById('bookingAddress')?.value.trim() 
      : 'Blk 42 Lot 59 Ascension Rd, Lagro, QC (Salon Visit)';
    const notes = document.getElementById('bookingNotes')?.value.trim() || '';

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> <span>Booking...</span>';
    }

    try {
      const token = localStorage.getItem('nelys_token');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('api/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          service_id: selectedService.id,
          staff_id: landingSelectedStaff.id || null,
          booking_date: date,
          booking_time: time,
          visit_type: serviceType === 'home-service' ? 'home' : 'salon',
          home_address: serviceType === 'home-service' ? address : null,
          payment_method: paymentMethod.toLowerCase(),
          client_name: customerName,
          client_phone: phone,
          client_email: email,
          notes: notes
        })
      });

      const result = await res.json();

      if (!res.ok || result.status === 'error') {
        const errorMsg = result.message || 'Failed to submit appointment. Please try again.';
        showToast(errorMsg, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnContent;
        }
        return;
      }

      const bookingData = result.data;
      const referenceCode = bookingData.reference_no;
      const totalPrice = parseFloat(bookingData.total_price || selectedService.price);

      const newBooking = {
        id: referenceCode,
        customerName,
        phone,
        email,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        staffId: landingSelectedStaff.id || null,
        staffName: landingSelectedStaff.name || 'Any Available Stylist',
        price: totalPrice,
        serviceType,
        date,
        time,
        paymentMethod,
        address,
        notes,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      const bookings = getStoredBookings();
      bookings.unshift(newBooking);
      saveBookings(bookings);

      // Show Confirmation screen in modal
      document.getElementById('bookingFormSection')?.classList.add('hidden');
      const successSection = document.getElementById('bookingSuccessSection');
      if (successSection) {
        successSection.classList.remove('hidden');
        document.getElementById('confirmRefCode').textContent = referenceCode;
        document.getElementById('confirmService').textContent = selectedService.name;
        const confirmStaffEl = document.getElementById('confirmStaff');
        if (confirmStaffEl) confirmStaffEl.textContent = landingSelectedStaff.name || 'Any Available Stylist';
        document.getElementById('confirmDateTime').textContent = `${date} at ${time}`;
        document.getElementById('confirmType').textContent = serviceType === 'home-service' ? 'Home Service' : 'Salon Visit (Lagro QC)';
        document.getElementById('confirmAmount').textContent = selectedService.id === 'rebonding' 
          ? 'Price to be confirmed (Consultation)' 
          : `₱${totalPrice.toLocaleString()} (${paymentMethod})`;
        document.getElementById('confirmClientPhone').textContent = phone;
      }

      showToast(`Appointment confirmed! Reference ID: ${referenceCode}`, 'success');
      form.reset();

      // Reset staff selection state
      landingSelectedStaff = {
        id: null,
        name: 'Any Available Stylist',
        role: 'Salon Team'
      };
      const hiddenStaff = document.getElementById('bookingStaffId');
      if (hiddenStaff) hiddenStaff.value = '';
      renderLandingStaffCards();
      renderLandingTimeSlots();

    } catch (err) {
      console.error('Homepage booking error:', err);
      showToast('Unable to connect to the booking server.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
    }
  });
}

// Mobile Menu Drawer Controller
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuToggle');
  const menu = document.getElementById('mobileMenuDrawer');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  const closeBtn = document.getElementById('mobileMenuClose');

  if (!btn || !menu) return;

  const toggle = (show) => {
    if (show) {
      menu.classList.remove('translate-x-full');
      backdrop?.classList.remove('hidden');
    } else {
      menu.classList.add('translate-x-full');
      backdrop?.classList.add('hidden');
    }
  };

  btn.addEventListener('click', () => toggle(true));
  closeBtn?.addEventListener('click', () => toggle(false));
  backdrop?.addEventListener('click', () => toggle(false));

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggle(false));
  });
}

// Light dismiss for <dialog> tags
function initDialogBackdropDismiss() {
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        dialog.close();
      }
    });
  });
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  renderServices('all');
  initServiceFilters();
  loadLandingStaff();
  initBookingForm();
  initMobileMenu();
  initDialogBackdropDismiss();
});
