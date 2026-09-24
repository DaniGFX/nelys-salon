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
    customerName: 'Maria Theresa Santos',
    phone: '09178821432',
    email: 'm.santos@gmail.com',
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
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    if (!dateInput.value) {
      dateInput.value = today;
    }
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
    const time = document.getElementById('bookingTime')?.value;
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
        document.getElementById('confirmDateTime').textContent = `${date} at ${time}`;
        document.getElementById('confirmType').textContent = serviceType === 'home-service' ? 'Home Service' : 'Salon Visit (Lagro QC)';
        document.getElementById('confirmAmount').textContent = selectedService.id === 'rebonding' 
          ? 'Price to be confirmed (Consultation)' 
          : `₱${totalPrice.toLocaleString()} (${paymentMethod})`;
        document.getElementById('confirmClientPhone').textContent = phone;
      }

      showToast(`Appointment confirmed! Reference ID: ${referenceCode}`, 'success');
      form.reset();

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
  initBookingForm();
  initMobileMenu();
  initDialogBackdropDismiss();
});
