/**
 * Nely's Salon - Multi-Step Online Booking Wizard
 * Fully connected to backend MySQL APIs:
 * - GET ../api/services (Live services catalog)
 * - GET ../api/staff (Live salon stylists & specialists roster)
 * - GET ../api/availability?date=... (Live slot capacity & booking availability)
 * - GET ../api/customers/profile (Patron autofill)
 * - POST ../api/bookings (Authoritative booking creation with staff_id in MySQL)
 * - GET ../api/notifications, ../api/messages, ../api/bookings (Live sidebar badges)
 */

const SERVICES_CACHE_KEY = 'nelys_booking_services_cache';
const STAFF_CACHE_KEY = 'nelys_booking_staff_cache';

// Application Booking State
const bookingState = {
  step: 1,
  service: {
    id: null,
    code: 'brazilian',
    name: 'Brazilian',
    price: 1999,
    priceFormatted: '₱1,999',
    category: 'Hair Services',
    duration: '120 mins'
  },
  staff: {
    id: null,
    name: 'Any Available Stylist',
    role: 'Salon Team'
  },
  date: '',
  dateIso: '',
  time: '',
  visitType: 'salon', // 'salon' | 'home'
  homeAddress: {
    building: '',
    street: '',
    barangay: '',
    city: 'Quezon City',
    landmark: ''
  },
  client: {
    name: '',
    email: '',
    phone: ''
  },
  payment: {
    method: 'gcash', // 'cash' | 'gcash' | 'bank_transfer'
    referenceNumber: '',
    receiptFileName: '',
    receiptDataUrl: ''
  }
};

// Global Catalog & Slot Data
let activeServicesList = [];
let activeStaffList = [];
let availableTimeSlots = [];
let currentDayAvailability = null;

// Calendar State
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();

const calendarMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

document.addEventListener('DOMContentLoaded', async () => {
  initInitialDates();
  initPatronProfile();
  initCalendar();

  // Instant hydration from local cache to eliminate any visual pop/flash
  hydrateCachedServices();
  hydrateCachedStaff();
  updateSummary();

  // Load live backend data in parallel from MySQL
  await Promise.allSettled([
    fetchFreshPatronProfile(),
    loadLiveServices(),
    loadLiveStaff(),
    loadSidebarBadgeCounters(),
    fetchSlotAvailability(bookingState.dateIso)
  ]);

  checkUrlPreselectedService();
  setupDialogSteadyListeners();
  initBookingLiveSync();
});

// Time Slot & Date Past Verification Helpers
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const str = String(timeStr).trim();
  // 12-hour format e.g. "9:00 AM", "10:00 AM", "1:00 PM", "01:00 PM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  // 24-hour format e.g. "09:00", "09:00:00", "13:00", "13:00:00"
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }
  return null;
}

function isBookingTimePast(dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  let targetIso = dateStr;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      targetIso = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
    }
  }

  if (targetIso < todayIso) return true;
  if (targetIso > todayIso) return false;

  // Same day: check if slot minutes have elapsed
  const slotMinutes = parseTimeToMinutes(timeStr);
  if (slotMinutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= currentMinutes;
}

// 1. Initialize Date Defaults
function initInitialDates() {
  const now = new Date();
  currentCalYear = now.getFullYear();
  currentCalMonth = now.getMonth();

  const pad = n => String(n).padStart(2, '0');
  bookingState.dateIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  bookingState.date = `${calendarMonthNames[currentCalMonth]} ${now.getDate()}, ${currentCalYear}`;

  const standardTimes = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];
  const firstFutureSlot = standardTimes.find(t => !isBookingTimePast(bookingState.dateIso, t));
  bookingState.time = firstFutureSlot || '';

  const timeLabel = document.getElementById('step2SelectedTimeLabel');
  if (timeLabel) timeLabel.textContent = bookingState.time || 'Select a time';
}

// 2. Initialize Patron Profile from Storage
function initPatronProfile() {
  const savedUserJson = localStorage.getItem('nelys_user');
  if (!savedUserJson) return;

  try {
    const user = JSON.parse(savedUserJson);
    applyPatronToBooking(user);
  } catch (e) {
    console.warn('Error reading stored patron details:', e);
  }
}

function applyPatronToBooking(user) {
  if (!user) return;
  const fullName = user.full_name || user.name || (user.email ? user.email.split('@')[0] : '');

  if (fullName) {
    bookingState.client.name = fullName;
    const nameInput = document.getElementById('clientNameInput');
    if (nameInput) nameInput.value = fullName;

    const sidebarName = document.getElementById('customerSidebarName') || document.querySelector('aside .truncate');
    if (sidebarName) sidebarName.textContent = fullName;

    const avatarEl = document.getElementById('customerAvatarInitials') || document.querySelector('aside .w-10.h-10.rounded-full');
    if (avatarEl) {
      const initials = fullName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      if (initials) avatarEl.textContent = initials;
    }
  }

  if (user.email) {
    bookingState.client.email = user.email;
    const emailInput = document.getElementById('clientEmailInput');
    if (emailInput) emailInput.value = user.email;
  }

  if (user.phone) {
    bookingState.client.phone = user.phone;
    const phoneInput = document.getElementById('clientPhoneInput');
    if (phoneInput) phoneInput.value = user.phone;
  }

  if (user.address || user.home_address) {
    const addr = user.address || user.home_address;
    const addrInput = document.getElementById('homeBuilding');
    if (addrInput && !addrInput.value) addrInput.value = addr;
  }
}

// 3. Fetch Fresh Profile from Server API
async function fetchFreshPatronProfile() {
  const token = localStorage.getItem('nelys_token');
  if (!token) return;

  try {
    const res = await fetch('../api/customers/profile', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      const result = await res.json();
      if (result.status === 'success' && result.data) {
        const d = result.data;
        const saved = localStorage.getItem('nelys_user');
        const user = saved ? JSON.parse(saved) : {};
        if (d.full_name) user.full_name = d.full_name;
        if (d.email) user.email = d.email;
        if (d.phone) user.phone = d.phone;
        if (d.home_address) {
          user.address = d.home_address;
          user.home_address = d.home_address;
        }
        localStorage.setItem('nelys_user', JSON.stringify(user));
        applyPatronToBooking(user);
      }
    }
  } catch (e) {
    console.warn('Notice loading fresh profile in booking:', e);
  }
}

// 4. Hydrate & Load Services from Backend API
function hydrateCachedServices() {
  try {
    const cachedRaw = localStorage.getItem(SERVICES_CACHE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeServicesList = parsed.filter(s => s.is_active === 1 || s.is_active === '1' || s.is_active === true || s.is_active === undefined);
        renderBookingServices(activeServicesList);
        if (!bookingState.service.id && activeServicesList.length > 0) {
          const firstSvc = activeServicesList[0];
          selectService(firstSvc.id, firstSvc.name, firstSvc.price, firstSvc.categoryLabel, firstSvc.duration, firstSvc.code);
        }
      }
    }
  } catch (err) {
    console.warn('Cached services read notice:', err);
  }
}

let lastBookingActiveIds = '';
let bookingLiveSyncTimer = null;

async function loadLiveServices(isSilent = false) {
  try {
    const res = await fetch('../api/services?active_only=true');
    if (res.ok) {
      const result = await res.json();
      const rawList = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
      const active = rawList.filter(s => s.is_active === 1 || s.is_active === '1' || s.is_active === true);
      const newActiveIds = active.map(s => s.id).sort().join(',');

      if (newActiveIds !== lastBookingActiveIds || activeServicesList.length === 0) {
        const prevSelectedId = bookingState.service.id;
        const prevSelectedName = bookingState.service.name;
        lastBookingActiveIds = newActiveIds;

        if (active.length > 0) {
          activeServicesList = active.map(mapBackendServiceToBookingItem);
          try {
            localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(activeServicesList));
          } catch (_) {}

          // Check if previously selected service was deactivated by admin
          const stillActive = activeServicesList.find(s => s.id === prevSelectedId || s.code === bookingState.service.code);

          renderBookingServices(activeServicesList);

          if (stillActive) {
            selectService(stillActive.id, stillActive.name, stillActive.price, stillActive.categoryLabel, stillActive.duration, stillActive.code);
          } else {
            // Selected service is no longer active!
            const firstSvc = activeServicesList[0];
            selectService(firstSvc.id, firstSvc.name, firstSvc.price, firstSvc.categoryLabel, firstSvc.duration, firstSvc.code);

            if (prevSelectedId) {
              showToast(`"${prevSelectedName}" was just marked unavailable by the salon. Switched to ${firstSvc.name}.`, 'warning');
              // If patron already advanced to another step, return to Step 1
              if (bookingState.step > 1) {
                goToStep(1);
              }
            }
          }
        } else {
          // If no active services found in database
          activeServicesList = [];
          try {
            localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify([]));
          } catch (_) {}
          renderBookingServices([]);
          bookingState.service = {
            id: null,
            code: '',
            name: 'No Service Available',
            price: 0,
            priceFormatted: '₱0',
            category: 'Unavailable',
            duration: ''
          };
          updateSummary();
          if (prevSelectedId) {
            showToast('All salon services are currently unavailable.', 'warning');
            if (bookingState.step > 1) goToStep(1);
          }
        }
      }
    }
  } catch (err) {
    if (!isSilent) {
      console.warn('Live services fetch notice in booking:', err);
    }
  }
}

// Real-Time Live Sync System across tabs and devices without page refresh
function initBookingLiveSync() {
  // 1. BroadcastChannel (0ms instant response within browser)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('nelys_services_sync_channel');
      channel.onmessage = (event) => {
        loadLiveServices(true);
      };
    }
  } catch (e) {
    console.warn('BroadcastChannel notice in booking:', e);
  }

  // 2. Storage event fallback
  window.addEventListener('storage', (e) => {
    if (e.key === 'nelys_services_sync_signal' && e.newValue) {
      loadLiveServices(true);
    }
  });

  // 3. Tab visibility & focus
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadLiveServices(true);
    }
  });

  window.addEventListener('focus', () => {
    loadLiveServices(true);
  });

  // 4. Background polling timer (every 3 seconds)
  if (bookingLiveSyncTimer) clearInterval(bookingLiveSyncTimer);
  bookingLiveSyncTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadLiveServices(true);
    }
  }, 3000);
}

function mapBackendServiceToBookingItem(item) {
  const code = (item.code || `svc-${item.id}`).toLowerCase();
  const name = item.name || 'Salon Treatment';
  const cat = (item.category || 'hair').toLowerCase();
  const priceNum = parseFloat(item.price || 0);

  let categoryGroup = 'hair';
  let categoryLabel = 'Hair Services';
  let badge = 'Signature Care';

  if (cat.includes('nail') || cat.includes('foot') || name.toLowerCase().includes('manicure') || name.toLowerCase().includes('pedicure') || name.toLowerCase().includes('footspa') || name.toLowerCase().includes('scrub')) {
    categoryGroup = 'nail_foot';
    categoryLabel = 'Nail & Foot Care';
    badge = 'Nail & Foot Care';
  } else if (name.toLowerCase().includes('dye') || name.toLowerCase().includes('color')) {
    badge = 'Custom Blend';
  } else if (name.toLowerCase().includes('power') || name.toLowerCase().includes('dose')) {
    badge = 'Intensive Shot';
  } else if (name.toLowerCase().includes('perm') || name.toLowerCase().includes('wave')) {
    badge = 'Natural Bounce';
  } else if (name.toLowerCase().includes('keratin') || name.toLowerCase().includes('repair') || name.toLowerCase().includes('treatment')) {
    badge = 'Protein Therapy';
  } else if (name.toLowerCase().includes('straight') || name.toLowerCase().includes('rebond')) {
    badge = 'Straightening';
  } else if (name.toLowerCase().includes('trim') || name.toLowerCase().includes('cut')) {
    badge = 'Essential Trim';
  }

  return {
    id: parseInt(item.id),
    code: code,
    name: name,
    categoryGroup: categoryGroup,
    categoryLabel: categoryLabel,
    badge: badge,
    description: item.description || 'Professional salon care with personalized styling.',
    price: priceNum,
    priceFormatted: priceNum > 0 ? `₱${priceNum.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'Price to be confirmed',
    duration: item.duration_minutes ? `${item.duration_minutes} mins` : '60 mins',
    is_active: item.is_active === 1 || item.is_active === '1' || item.is_active === true ? 1 : 0
  };
}

function renderBookingServices(services) {
  const hairGrid = document.getElementById('hairServicesGrid');
  const nailGrid = document.getElementById('nailFootServicesGrid');

  if (!hairGrid && !nailGrid) return;

  const hairServices = (services || []).filter(s => s.categoryGroup === 'hair');
  const nailServices = (services || []).filter(s => s.categoryGroup === 'nail_foot');

  if (hairGrid) {
    if (hairServices.length > 0) {
      let hairHtml = '';
      hairServices.forEach(s => {
        const isSelected = bookingState.service.id === s.id || bookingState.service.code === s.code;
        const borderClass = isSelected ? 'border-[#810B38] ring-2 ring-[#810B38]/30 shadow-md bg-[#FAF6F0]' : 'border-[#DCC3AA] bg-white';

        hairHtml += `
          <div onclick="selectService(${s.id}, '${escapeHtml(s.name)}', ${s.price}, '${escapeHtml(s.categoryLabel)}', '${escapeHtml(s.duration)}', '${escapeHtml(s.code)}')"
            id="svcCard-${s.code}"
            class="service-card p-5 rounded-2xl border-2 ${borderClass} hover:border-[#810B38] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group">
            <div>
              <div class="flex items-start justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#810B38] bg-[#FAF6F0] px-2 py-0.5 rounded-full border border-[#DCC3AA]/50">
                  ${escapeHtml(s.badge)}
                </span>
                <span class="text-xs text-[#735e5e] flex items-center gap-1">
                  <i class="fa-solid fa-clock text-[10px]"></i> ${escapeHtml(s.duration)}
                </span>
              </div>
              <h4 class="font-serif text-xl font-bold text-[#541A1A] mt-2 group-hover:text-[#810B38] transition-colors">
                ${escapeHtml(s.name)}
              </h4>
              <p class="text-xs text-[#735e5e] mt-1 line-clamp-2">
                ${escapeHtml(s.description)}
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-[#F1E2D1] flex items-center justify-between">
              <span class="font-serif text-xl font-bold text-[#810B38]">${s.priceFormatted}</span>
              <span class="text-xs font-bold text-[#810B38] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Select <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </span>
            </div>
          </div>
        `;
      });
      hairGrid.innerHTML = hairHtml;
    } else {
      hairGrid.innerHTML = `
        <div class="col-span-full py-8 text-center text-sm text-[#735e5e] bg-stone-50 rounded-2xl border border-dashed border-[#DCC3AA]/60">
          <p class="font-medium text-stone-700">No hair services currently available for booking.</p>
          <p class="text-xs text-stone-500 mt-1">Please check back soon or consult our salon staff.</p>
        </div>
      `;
    }
  }

  if (nailGrid) {
    if (nailServices.length > 0) {
      let nailHtml = '';
      nailServices.forEach(s => {
        const isSelected = bookingState.service.id === s.id || bookingState.service.code === s.code;
        const borderClass = isSelected ? 'border-[#810B38] ring-2 ring-[#810B38]/30 shadow-md bg-[#FAF6F0]' : 'border-[#DCC3AA] bg-white';

        nailHtml += `
          <div onclick="selectService(${s.id}, '${escapeHtml(s.name)}', ${s.price}, '${escapeHtml(s.categoryLabel)}', '${escapeHtml(s.duration)}', '${escapeHtml(s.code)}')"
            id="svcCard-${s.code}"
            class="service-card p-5 rounded-2xl border-2 ${borderClass} hover:border-[#810B38] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group">
            <div>
              <div class="flex items-start justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#810B38] bg-[#FAF6F0] px-2 py-0.5 rounded-full border border-[#DCC3AA]/50">
                  ${escapeHtml(s.badge)}
                </span>
                <span class="text-xs text-[#735e5e] flex items-center gap-1">
                  <i class="fa-solid fa-clock text-[10px]"></i> ${escapeHtml(s.duration)}
                </span>
              </div>
              <h4 class="font-serif text-xl font-bold text-[#541A1A] mt-2 group-hover:text-[#810B38] transition-colors">
                ${escapeHtml(s.name)}
              </h4>
              <p class="text-xs text-[#735e5e] mt-1 line-clamp-2">
                ${escapeHtml(s.description)}
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-[#F1E2D1] flex items-center justify-between">
              <span class="font-serif text-xl font-bold text-[#810B38]">${s.priceFormatted}</span>
              <span class="text-xs font-bold text-[#810B38] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Select <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </span>
            </div>
          </div>
        `;
      });
      nailGrid.innerHTML = nailHtml;
    } else {
      nailGrid.innerHTML = `
        <div class="col-span-full py-8 text-center text-sm text-[#735e5e] bg-stone-50 rounded-2xl border border-dashed border-[#DCC3AA]/60">
          <p class="font-medium text-stone-700">No nail or foot care services currently available for booking.</p>
          <p class="text-xs text-stone-500 mt-1">Please check back soon or consult our salon staff.</p>
        </div>
      `;
    }
  }
}

function checkUrlPreselectedService() {
  const params = new URLSearchParams(window.location.search);
  const serviceParam = params.get('service');
  if (serviceParam) {
    const isAvailable = activeServicesList.some(s => s.code === serviceParam.toLowerCase() || String(s.id) === serviceParam);
    if (!isAvailable && activeServicesList.length > 0) {
      showToast('The requested service is currently unavailable for booking. An available service has been selected.', 'warning');
      return;
    }
    const targetCard = document.getElementById(`svcCard-${serviceParam}`);
    if (targetCard) {
      targetCard.click();
      setTimeout(() => {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }
}

// 5. Select Service Handler
function selectService(id, name, price, category = 'Hair Services', duration = '60 mins', code = '') {
  bookingState.service = {
    id: parseInt(id),
    code: code || String(id),
    name: name,
    price: parseFloat(price) || 0,
    priceFormatted: `₱${parseFloat(price || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    category: category,
    duration: duration
  };

  // Update card styles
  document.querySelectorAll('.service-card').forEach(c => {
    c.classList.remove('border-[#810B38]', 'ring-2', 'ring-[#810B38]/30', 'shadow-md', 'bg-[#FAF6F0]');
    c.classList.add('border-[#DCC3AA]', 'bg-white');
  });

  const activeCard = document.getElementById(`svcCard-${code || id}`) || document.querySelector(`.service-card[onclick*="'${id}'"]`);
  if (activeCard) {
    activeCard.classList.remove('border-[#DCC3AA]', 'bg-white');
    activeCard.classList.add('border-[#810B38]', 'ring-2', 'ring-[#810B38]/30', 'shadow-md', 'bg-[#FAF6F0]');
  }

  const selectedLabel = document.getElementById('step1SelectedLabel');
  if (selectedLabel) {
    selectedLabel.textContent = `${name} (${bookingState.service.priceFormatted})`;
  }

  updateSummary();
}

// 6. Hydrate & Load Staff from Backend API
function hydrateCachedStaff() {
  try {
    const cachedRaw = localStorage.getItem(STAFF_CACHE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeStaffList = parsed;
        renderBookingStaff(activeStaffList);
      }
    }
  } catch (err) {
    console.warn('Cached staff read notice:', err);
  }
}

async function loadLiveStaff() {
  try {
    const res = await fetch('../api/staff');
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
        if (active.length > 0) {
          activeStaffList = active.map(mapBackendStaffItem);
          localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(activeStaffList));
          renderBookingStaff(activeStaffList);
          return;
        }
      }
    }
  } catch (err) {
    console.warn('Live staff fetch notice:', err);
  }

  // If no staff loaded, render default "Any Available Stylist"
  if (activeStaffList.length === 0) {
    renderBookingStaff([]);
  }
}

function resolveStaffAvatar(avatar, staffName = '') {
  if (!avatar && !staffName) return '../assets/images/logo.jfif';
  const av = String(avatar || staffName).trim();
  if (av.startsWith('http://') || av.startsWith('https://') || av.startsWith('data:')) {
    return av;
  }
  if (av.startsWith('../') || av.startsWith('./')) {
    return av;
  }
  const clean = av.toLowerCase().replace(/[\s_]+/g, '-');
  if (clean.includes('staff-1') || clean.includes('director') || clean.includes('nely') || clean === '1') {
    return '../assets/images/team/director.jpg';
  }
  if (clean.includes('staff-2') || clean.includes('sculptor') || clean.includes('ana') || clean === '2') {
    return '../assets/images/team/sculptor.jpg';
  }
  if (clean.includes('staff-3') || clean.includes('spa-specialist') || clean.includes('elena') || clean === '3') {
    return '../assets/images/team/spa-specialist.jpg';
  }
  if (av.includes('team/')) {
    return `../assets/images/${av}`;
  }
  return `../assets/images/team/${av}`;
}

function mapBackendStaffItem(item) {
  const avatarUrl = resolveStaffAvatar(item.avatar, item.name);

  return {
    id: parseInt(item.id),
    name: item.name || 'Stylist',
    fullName: item.full_name || item.name || 'Salon Stylist',
    role: item.role || item.position || 'Stylist & Specialist',
    avatar: avatarUrl,
    specialties: item.specialties || '',
    availability: item.availability || 'Available',
    status: item.status || 'Active'
  };
}

function renderBookingStaff(staffList) {
  const container = document.getElementById('staffSelectionGrid');
  if (!container) return;

  const isAnySelected = !bookingState.staff.id;
  const anyBorder = isAnySelected ? 'border-[#810B38] ring-2 ring-[#810B38]/30 shadow-md bg-[#FAF6F0]' : 'border-[#DCC3AA] bg-white';
  const anyCheck = isAnySelected ? 'bg-[#810B38] text-white' : 'bg-gray-100 text-transparent';

  let html = `
    <!-- Option 0: Any Available Stylist -->
    <div onclick="selectStaff(null, 'Any Available Stylist', 'Salon Team')"
      id="staffCard-any"
      class="staff-card p-4 rounded-2xl border-2 ${anyBorder} hover:border-[#810B38] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group">
      <div>
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-full bg-[#810B38] text-white flex items-center justify-center text-base shadow-sm border border-[#DCC3AA]">
            <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
          </div>
          <span id="staffCheck-any" class="w-5 h-5 rounded-full ${anyCheck} flex items-center justify-center text-[10px] transition-colors">
            <i class="fa-solid fa-check"></i>
          </span>
        </div>
        <h4 class="font-serif text-lg font-bold text-[#541A1A] group-hover:text-[#810B38] transition-colors leading-tight">
          Any Available
        </h4>
        <p class="text-[11px] text-[#810B38] font-bold mt-0.5">
          Fastest Confirmation
        </p>
        <p class="text-[11px] text-[#735e5e] mt-1 line-clamp-2">
          Let our salon concierge match you with the best available specialist.
        </p>
      </div>
      <div class="mt-3 pt-2.5 border-t border-[#F1E2D1] flex items-center justify-between text-[11px]">
        <span class="font-semibold text-emerald-700 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Recommended
        </span>
        <span class="text-xs font-bold text-[#810B38] flex items-center gap-0.5">
          Select <i class="fa-solid fa-arrow-right text-[9px]"></i>
        </span>
      </div>
    </div>
  `;

  staffList.forEach(s => {
    const isSelected = bookingState.staff.id === s.id;
    
    // Check real-time availability from currentDayAvailability
    const staffAvail = currentDayAvailability?.staff?.find(x => x.id === s.id);
    let isUnavailable = false;
    let badgeHtml = '';
    let reasonMessage = '';

    if (staffAvail) {
      if (!staffAvail.is_working_today) {
        isUnavailable = true;
        badgeHtml = `<span class="font-semibold text-amber-700 flex items-center gap-1"><i class="fa-solid fa-ban text-[10px] text-amber-600"></i> ${escapeHtml(staffAvail.schedule_today || 'Day Off')}</span>`;
        reasonMessage = `${s.name} is off-duty / scheduled off on this date.`;
      } else if (bookingState.time && (staffAvail.booked_display_times || []).includes(bookingState.time)) {
        isUnavailable = true;
        badgeHtml = `<span class="font-semibold text-rose-700 flex items-center gap-1"><i class="fa-solid fa-calendar-xmark text-[10px] text-rose-600"></i> Booked at ${escapeHtml(bookingState.time)}</span>`;
        reasonMessage = `${s.name} is already booked for ${bookingState.time}. Please select another stylist or different time slot.`;
      } else {
        badgeHtml = `<span class="font-semibold text-emerald-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available</span>`;
      }
    } else {
      badgeHtml = `<span class="font-semibold text-emerald-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ${escapeHtml(s.availability || 'Available')}</span>`;
    }

    let cardClass = '';
    let clickHandler = '';

    if (isUnavailable) {
      cardClass = 'staff-card p-4 rounded-2xl border-2 border-stone-200 bg-stone-50/80 opacity-60 shadow-xs cursor-not-allowed flex flex-col justify-between select-none';
      clickHandler = `onclick="handleUnavailableStaffClick('${escapeHtml(reasonMessage || s.name + ' is unavailable for the chosen slot.')}')"`;
    } else {
      const cardBorder = isSelected ? 'border-[#810B38] ring-2 ring-[#810B38]/30 shadow-md bg-[#FAF6F0]' : 'border-[#DCC3AA] bg-white';
      cardClass = `staff-card p-4 rounded-2xl border-2 ${cardBorder} hover:border-[#810B38] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group`;
      clickHandler = `onclick="selectStaff(${s.id}, '${escapeHtml(s.name)}', '${escapeHtml(s.role)}')"`;
    }

    const cardCheck = isSelected && !isUnavailable ? 'bg-[#810B38] text-white' : 'bg-gray-100 text-transparent';

    html += `
      <!-- Stylist Card: ${escapeHtml(s.name)} -->
      <div ${clickHandler}
        id="staffCard-${s.id}"
        class="${cardClass}"
        title="${isUnavailable ? escapeHtml(reasonMessage) : ''}">
        <div>
          <div class="flex items-start justify-between mb-3">
            <div class="relative">
              <img src="${s.avatar}" alt="${escapeHtml(s.name)}"
                onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');"
                class="w-10 h-10 rounded-full border border-[#DCC3AA] object-cover shadow-sm ${isUnavailable ? 'grayscale' : ''}">
              <div class="hidden w-10 h-10 rounded-full bg-[#810B38] text-white flex items-center justify-center font-bold text-xs border border-[#DCC3AA]">
                ${escapeHtml(s.name.substring(0, 2).toUpperCase())}
              </div>
            </div>
            <span id="staffCheck-${s.id}" class="w-5 h-5 rounded-full ${cardCheck} flex items-center justify-center text-[10px] transition-colors">
              <i class="fa-solid fa-check"></i>
            </span>
          </div>
          <h4 class="font-serif text-lg font-bold text-[#541A1A] ${!isUnavailable ? 'group-hover:text-[#810B38]' : ''} transition-colors leading-tight">
            ${escapeHtml(s.name)}
          </h4>
          <p class="text-[11px] text-[#810B38] font-medium mt-0.5 truncate" title="${escapeHtml(s.role)}">
            ${escapeHtml(s.role)}
          </p>
          <p class="text-[11px] text-[#735e5e] mt-1 line-clamp-2">
            ${escapeHtml(s.specialties || 'Dedicated salon beauty & styling specialist.')}
          </p>
        </div>
        <div class="mt-3 pt-2.5 border-t border-[#F1E2D1] flex items-center justify-between text-[11px]">
          ${badgeHtml}
          ${isUnavailable 
            ? '<span class="text-xs font-semibold text-stone-400 flex items-center gap-0.5"><i class="fa-solid fa-lock text-[9px]"></i> Busy</span>'
            : '<span class="text-xs font-bold text-[#810B38] flex items-center gap-0.5">Select <i class="fa-solid fa-arrow-right text-[9px]"></i></span>'
          }
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function handleUnavailableStaffClick(message) {
  showToast(message || 'This stylist is unavailable for the chosen time or date. Please select another stylist or different time slot.', 'warning');
}

function selectStaff(id, name, role) {
  const staffId = id ? parseInt(id) : null;
  const staffName = name || 'Any Available Stylist';
  const staffRole = role || 'Salon Team';

  // If selecting a specific stylist, check if they are off-duty on this date
  if (staffId && currentDayAvailability) {
    const staffInfo = currentDayAvailability.staff?.find(x => x.id === staffId);
    if (staffInfo && !staffInfo.is_working_today) {
      showToast(`${staffName} is not scheduled to work on this day (${staffInfo.schedule_today || 'Day Off'}). Please choose another stylist or date.`, 'warning');
      return;
    }
  }

  bookingState.staff = {
    id: staffId,
    name: staffName,
    role: staffRole
  };

  // Update card styling
  document.querySelectorAll('.staff-card').forEach(card => {
    card.classList.remove('border-[#810B38]', 'ring-2', 'ring-[#810B38]/30', 'shadow-md', 'bg-[#FAF6F0]');
    if (!card.classList.contains('cursor-not-allowed')) {
      card.classList.add('border-[#DCC3AA]', 'bg-white');
    }
  });

  document.querySelectorAll('[id^="staffCheck-"]').forEach(chk => {
    chk.className = 'w-5 h-5 rounded-full bg-gray-100 text-transparent flex items-center justify-center text-[10px] transition-colors';
  });

  const targetCardId = staffId ? `staffCard-${staffId}` : 'staffCard-any';
  const targetCheckId = staffId ? `staffCheck-${staffId}` : 'staffCheck-any';

  const activeCard = document.getElementById(targetCardId);
  if (activeCard && !activeCard.classList.contains('cursor-not-allowed')) {
    activeCard.classList.remove('border-[#DCC3AA]', 'bg-white');
    activeCard.classList.add('border-[#810B38]', 'ring-2', 'ring-[#810B38]/30', 'shadow-md', 'bg-[#FAF6F0]');
  }

  const activeCheck = document.getElementById(targetCheckId);
  if (activeCheck) {
    activeCheck.className = 'w-5 h-5 rounded-full bg-[#810B38] text-white flex items-center justify-center text-[10px] transition-colors';
  }

  const badge = document.getElementById('selectedStaffBadge');
  if (badge) {
    badge.textContent = staffName;
  }

  updateSummary();

  // Re-render time slots to dynamically lock slots booked for this stylist
  if (availableTimeSlots && availableTimeSlots.length > 0) {
    renderTimeSlots(availableTimeSlots);
  }

  // Validate if the currently selected time slot is now invalid for this stylist
  validateSelectedSlotAndStaff();
}

// 7. Category Filter Handler
function filterServiceCategory(category) {
  const tabAll = document.getElementById('tabBtn-all');
  const tabHair = document.getElementById('tabBtn-hair');
  const tabNail = document.getElementById('tabBtn-nail_foot');
  const groupHair = document.getElementById('categoryGroup-hair');
  const groupNail = document.getElementById('categoryGroup-nail_foot');

  const activeTabClass = 'px-3 py-1.5 rounded-xl font-bold bg-[#810B38] text-white transition-all';
  const inactiveTabClass = 'px-3 py-1.5 rounded-xl font-medium text-[#735e5e] hover:text-[#541A1A] transition-all';

  if (tabAll) tabAll.className = category === 'all' ? activeTabClass : inactiveTabClass;
  if (tabHair) tabHair.className = category === 'hair' ? activeTabClass : inactiveTabClass;
  if (tabNail) tabNail.className = category === 'nail_foot' ? activeTabClass : inactiveTabClass;

  if (groupHair) {
    if (category === 'all' || category === 'hair') {
      groupHair.classList.remove('hidden');
    } else {
      groupHair.classList.add('hidden');
    }
  }

  if (groupNail) {
    if (category === 'all' || category === 'nail_foot') {
      groupNail.classList.remove('hidden');
    } else {
      groupNail.classList.add('hidden');
    }
  }
}

// 8. Interactive Calendar & Time Slots
function initCalendar() {
  renderCalendar();
}

function changeCalendarMonth(delta) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const targetMonthStart = new Date(currentCalYear, currentCalMonth + delta, 1).getTime();

  if (targetMonthStart < currentMonthStart) return;

  currentCalMonth += delta;
  if (currentCalMonth > 11) {
    currentCalMonth = 0;
    currentCalYear += 1;
  } else if (currentCalMonth < 0) {
    currentCalMonth = 11;
    currentCalYear -= 1;
  }

  renderCalendar();
}

function renderCalendar() {
  const monthTitleEl = document.getElementById('calendarMonthYear');
  const daysGridEl = document.getElementById('calendarDaysGrid');
  const prevBtn = document.getElementById('prevMonthBtn');
  if (!daysGridEl) return;

  if (monthTitleEl) {
    monthTitleEl.innerHTML = `<i class="fa-solid fa-calendar text-[#810B38] text-base"></i> <span>${calendarMonthNames[currentCalMonth]} ${currentCalYear}</span>`;
  }

  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Disable Prev button if at current month
  if (prevBtn) {
    const isCurrentMonth = currentCalYear === now.getFullYear() && currentCalMonth === now.getMonth();
    prevBtn.disabled = isCurrentMonth;
  }

  const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const totalDays = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  const pad = n => String(n).padStart(2, '0');

  let gridHtml = '';

  for (let b = 0; b < firstDayIndex; b++) {
    gridHtml += `<div class="py-2.5"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const thisDateObj = new Date(currentCalYear, currentCalMonth, day);
    const thisDateTime = thisDateObj.getTime();
    const formattedDate = `${calendarMonthNames[currentCalMonth]} ${day}, ${currentCalYear}`;
    const dateIso = `${currentCalYear}-${pad(currentCalMonth + 1)}-${pad(day)}`;
    const isPast = thisDateTime < todayZero;
    const isSelected = bookingState.date === formattedDate || bookingState.dateIso === dateIso;

    if (isPast) {
      gridHtml += `
        <button type="button" disabled class="py-2.5 rounded-xl text-stone-300 bg-transparent cursor-not-allowed text-xs font-semibold select-none">
          ${day}
        </button>
      `;
    } else if (isSelected) {
      gridHtml += `
        <button 
          type="button" 
          onclick="selectDate('${formattedDate}', '${dateIso}', this)" 
          class="date-btn py-2.5 rounded-xl bg-[#810B38] text-white font-bold shadow-md border border-[#810B38] transition-all text-xs">
          ${day}
        </button>
      `;
    } else {
      gridHtml += `
        <button 
          type="button" 
          onclick="selectDate('${formattedDate}', '${dateIso}', this)" 
          class="date-btn py-2.5 rounded-xl bg-white hover:bg-[#F1E2D1] text-[#2b1d1d] border border-[#DCC3AA] transition-all font-semibold text-xs shadow-sm">
          ${day}
        </button>
      `;
    }
  }

  daysGridEl.innerHTML = gridHtml;
}

function selectDate(formattedDate, dateIso, btn) {
  bookingState.date = formattedDate;
  bookingState.dateIso = dateIso;

  document.querySelectorAll('.date-btn').forEach(b => {
    b.className = 'date-btn py-2.5 rounded-xl bg-white hover:bg-[#F1E2D1] text-[#2b1d1d] border border-[#DCC3AA] transition-all font-semibold text-xs shadow-sm';
  });

  if (btn) {
    btn.className = 'date-btn py-2.5 rounded-xl bg-[#810B38] text-white font-bold shadow-md border border-[#810B38] transition-all text-xs';
  }

  updateSummary();
  fetchSlotAvailability(dateIso);
}

// 9. Fetch Slot Availability from Backend API
async function fetchSlotAvailability(dateIso) {
  const container = document.getElementById('timeSlotsGrid');
  if (!container || !dateIso) return;

  const defaultTimes = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

  try {
    const res = await fetch(`../api/availability?date=${encodeURIComponent(dateIso)}`);
    if (res.ok) {
      const result = await res.json();
      if (result.status === 'success' && result.data) {
        currentDayAvailability = result.data;
        availableTimeSlots = result.data.slots || [];
        renderTimeSlots(availableTimeSlots);
        renderBookingStaff(activeStaffList);
        validateSelectedSlotAndStaff();
        return;
      }
    }
  } catch (err) {
    console.warn('Slot availability fetch notice:', err);
  }

  // Fallback slots
  availableTimeSlots = defaultTimes.map(t => ({ 
    display_time: t, 
    is_available: !isBookingTimePast(dateIso, t),
    is_past: isBookingTimePast(dateIso, t)
  }));
  renderTimeSlots(availableTimeSlots);
  renderBookingStaff(activeStaffList);
  validateSelectedSlotAndStaff();
}

function renderTimeSlots(slots) {
  const container = document.getElementById('timeSlotsGrid');
  if (!container) return;

  const selectedStaffId = bookingState.staff.id;
  const staffInfo = selectedStaffId && currentDayAvailability?.staff ? currentDayAvailability.staff.find(x => x.id === selectedStaffId) : null;

  let html = '';
  slots.forEach(slot => {
    const timeDisplay = slot.display_time || slot.time || '';
    const isPast = slot.is_past === true || isBookingTimePast(bookingState.dateIso, timeDisplay);

    let isSlotDisabled = false;
    let lockReason = '';

    if (isPast) {
      isSlotDisabled = true;
      lockReason = `This time slot has already passed for today (${timeDisplay})`;
    } else if (selectedStaffId) {
      if (staffInfo && !staffInfo.is_working_today) {
        isSlotDisabled = true;
        lockReason = `${bookingState.staff.name} is scheduled off on this day (${staffInfo.schedule_today || 'Day Off'})`;
      } else if (slot.booked_staff_ids && slot.booked_staff_ids.includes(selectedStaffId)) {
        isSlotDisabled = true;
        lockReason = `${bookingState.staff.name} is already booked at ${timeDisplay}`;
      } else if (slot.is_available === false && !slot.available_staff_ids?.includes(selectedStaffId)) {
        isSlotDisabled = true;
        lockReason = `${bookingState.staff.name} is unavailable at ${timeDisplay}`;
      }
    } else {
      // Any Available Stylist
      if (slot.is_available === false) {
        isSlotDisabled = true;
        lockReason = `All stylists are fully booked at ${timeDisplay}`;
      }
    }

    const isSelected = !isSlotDisabled && bookingState.time === timeDisplay;

    if (isSlotDisabled) {
      if (isPast) {
        html += `
          <button type="button" disabled 
            class="time-btn py-2.5 px-2 rounded-xl bg-stone-100 text-stone-400 border border-stone-200 text-xs font-semibold cursor-not-allowed select-none flex flex-col items-center justify-center gap-0.5 opacity-60"
            title="${escapeHtml(lockReason)}">
            <span class="line-through">${timeDisplay}</span>
            <span class="text-[9px] uppercase tracking-wider text-stone-400 font-bold">Passed</span>
          </button>
        `;
      } else {
        html += `
          <button type="button" disabled 
            class="time-btn py-3 px-3 rounded-xl bg-stone-100 text-stone-400 border border-stone-200 text-xs font-semibold cursor-not-allowed select-none flex items-center justify-center gap-1.5 line-through opacity-70"
            title="${escapeHtml(lockReason || 'Slot unavailable')}">
            <span>${timeDisplay}</span>
            <i class="fa-solid fa-lock text-[10px]"></i>
          </button>
        `;
      }
    } else if (isSelected) {
      html += `
        <button type="button" onclick="selectTime('${timeDisplay}', this)"
          class="time-btn py-3 px-3 rounded-xl bg-[#810B38] text-white border border-[#810B38] text-xs font-bold shadow-md transition-all">
          ${timeDisplay}
        </button>
      `;
    } else {
      html += `
        <button type="button" onclick="selectTime('${timeDisplay}', this)"
          class="time-btn py-3 px-3 rounded-xl bg-white border border-[#DCC3AA] text-xs font-bold text-[#2b1d1d] hover:border-[#810B38] transition-all shadow-xs">
          ${timeDisplay}
        </button>
      `;
    }
  });

  container.innerHTML = html;
}

function selectTime(timeStr, btn) {
  if (btn && btn.disabled) return;
  if (isBookingTimePast(bookingState.dateIso, timeStr)) {
    showToast('This time slot has already passed for today. Please select an upcoming slot.', 'warning');
    return;
  }

  bookingState.time = timeStr;

  document.querySelectorAll('.time-btn').forEach(b => {
    if (!b.disabled) {
      b.className = 'time-btn py-3 px-3 rounded-xl bg-white border border-[#DCC3AA] text-xs font-bold text-[#2b1d1d] hover:border-[#810B38] transition-all shadow-xs';
    }
  });

  if (btn) {
    btn.className = 'time-btn py-3 px-3 rounded-xl bg-[#810B38] text-white border border-[#810B38] text-xs font-bold shadow-md transition-all';
  }

  const timeLabel = document.getElementById('step2SelectedTimeLabel');
  if (timeLabel) timeLabel.textContent = timeStr;

  updateSummary();

  // Re-render staff cards so stylists booked at this new time slot are disabled
  renderBookingStaff(activeStaffList);
}

function validateSelectedSlotAndStaff() {
  if (!currentDayAvailability) return;

  const selectedStaffId = bookingState.staff.id;
  if (selectedStaffId) {
    const staffInfo = currentDayAvailability.staff?.find(x => x.id === selectedStaffId);
    if (staffInfo) {
      if (!staffInfo.is_working_today) {
        showToast(`${bookingState.staff.name} is scheduled off on ${bookingState.date}. Switched to Any Available Stylist.`, 'warning');
        selectStaff(null, 'Any Available Stylist', 'Salon Team');
        return;
      }
      
      const isCurrentTimePast = bookingState.time && isBookingTimePast(bookingState.dateIso, bookingState.time);
      const isCurrentTimeBooked = bookingState.time && (staffInfo.booked_display_times || []).includes(bookingState.time);

      if (!bookingState.time || isCurrentTimePast || isCurrentTimeBooked) {
        // Find first available slot for this stylist that is NOT in the past
        const freeSlot = availableTimeSlots.find(s => 
          !isBookingTimePast(bookingState.dateIso, s.display_time || s.time) && 
          s.is_available !== false &&
          (!s.booked_staff_ids || !s.booked_staff_ids.includes(selectedStaffId))
        );
        if (freeSlot) {
          bookingState.time = freeSlot.display_time;
          const timeLabel = document.getElementById('step2SelectedTimeLabel');
          if (timeLabel) timeLabel.textContent = freeSlot.display_time;
          updateSummary();
          renderTimeSlots(availableTimeSlots);
          renderBookingStaff(activeStaffList);
          if (isCurrentTimePast) {
            showToast(`The previous slot has passed for today. Selected ${freeSlot.display_time} instead.`, 'info');
          } else if (isCurrentTimeBooked) {
            showToast(`${bookingState.staff.name} is booked at the previous time. Selected ${freeSlot.display_time} instead.`, 'info');
          }
        } else {
          // No slots available for this stylist on this day
          bookingState.time = '';
          const timeLabel = document.getElementById('step2SelectedTimeLabel');
          if (timeLabel) timeLabel.textContent = 'Select a time';
          updateSummary();
          renderTimeSlots(availableTimeSlots);
          if (isCurrentTimePast) {
            showToast('All slots for today have already passed or are unavailable.', 'warning');
          } else {
            showToast(`No open slots for ${bookingState.staff.name} on this date. Switched to Any Available Stylist.`, 'warning');
            selectStaff(null, 'Any Available Stylist', 'Salon Team');
          }
        }
      }
    }
  } else {
    // "Any Available": verify currently selected time slot is available and not past
    const isCurrentTimePast = bookingState.time && isBookingTimePast(bookingState.dateIso, bookingState.time);
    const curSlot = bookingState.time ? availableTimeSlots.find(s => (s.display_time || s.time) === bookingState.time) : null;
    const isSlotInvalid = !bookingState.time || isCurrentTimePast || (curSlot && curSlot.is_available === false);

    if (isSlotInvalid) {
      const freeSlot = availableTimeSlots.find(s => 
        !isBookingTimePast(bookingState.dateIso, s.display_time || s.time) && 
        s.is_available !== false
      );
      if (freeSlot) {
        bookingState.time = freeSlot.display_time;
        const timeLabel = document.getElementById('step2SelectedTimeLabel');
        if (timeLabel) timeLabel.textContent = freeSlot.display_time;
        updateSummary();
        renderTimeSlots(availableTimeSlots);
        if (isCurrentTimePast) {
          showToast(`The previous slot has passed for today. Selected ${freeSlot.display_time} instead.`, 'info');
        }
      } else {
        // No future available slots left today
        bookingState.time = '';
        const timeLabel = document.getElementById('step2SelectedTimeLabel');
        if (timeLabel) timeLabel.textContent = 'Select a time';
        updateSummary();
        renderTimeSlots(availableTimeSlots);
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        if (bookingState.dateIso === todayIso) {
          showToast('All appointment slots for today have already passed. Please select a future date.', 'warning');
        }
      }
    }
  }
}

// 10. Step 3: Visit Type Handler
function selectVisitType(type) {
  bookingState.visitType = type;

  const salonCard = document.getElementById('visitCard-salon');
  const homeCard = document.getElementById('visitCard-home');
  const salonBadge = document.getElementById('visitBadge-salon');
  const homeBadge = document.getElementById('visitBadge-home');
  const homeAddressForm = document.getElementById('homeAddressForm');

  if (type === 'salon') {
    if (salonCard) salonCard.className = 'p-5 rounded-2xl border-2 border-[#810B38] bg-[#FAF6F0] shadow-sm transition-all cursor-pointer space-y-3';
    if (homeCard) homeCard.className = 'p-5 rounded-2xl border-2 border-[#DCC3AA] bg-white hover:border-[#810B38] shadow-sm transition-all cursor-pointer space-y-3';
    if (salonBadge) salonBadge.className = 'w-5 h-5 rounded-full bg-[#810B38] text-white flex items-center justify-center text-[10px]';
    if (homeBadge) homeBadge.className = 'w-5 h-5 rounded-full bg-gray-200 text-transparent flex items-center justify-center text-[10px]';
    if (homeAddressForm) homeAddressForm.classList.add('hidden');
  } else {
    if (homeCard) homeCard.className = 'p-5 rounded-2xl border-2 border-[#810B38] bg-[#FAF6F0] shadow-sm transition-all cursor-pointer space-y-3';
    if (salonCard) salonCard.className = 'p-5 rounded-2xl border-2 border-[#DCC3AA] bg-white hover:border-[#810B38] shadow-sm transition-all cursor-pointer space-y-3';
    if (homeBadge) homeBadge.className = 'w-5 h-5 rounded-full bg-[#810B38] text-white flex items-center justify-center text-[10px]';
    if (salonBadge) salonBadge.className = 'w-5 h-5 rounded-full bg-gray-200 text-transparent flex items-center justify-center text-[10px]';
    if (homeAddressForm) homeAddressForm.classList.remove('hidden');
  }

  updateSummary();
}

// 11. Step 4: Payment Method Handler
function selectPaymentMethod(method) {
  bookingState.payment.method = method;

  const cardCash = document.getElementById('payCard-cash');
  const cardGcash = document.getElementById('payCard-gcash');
  const cardBank = document.getElementById('payCard-bank_transfer');
  const onlineBox = document.getElementById('onlinePaymentBox');
  const cashBox = document.getElementById('cashNoticeBox');
  const gcashSec = document.getElementById('gcashPaymentSection');
  const bankSec = document.getElementById('bankPaymentSection');
  const onlineTitle = document.getElementById('onlinePaymentTitle');
  const onlineNum = document.getElementById('onlinePaymentNumber');
  const refLabel = document.getElementById('referenceNumberLabel');
  const refInput = document.getElementById('referenceNumberInput');
  const refHint = document.getElementById('referenceNumberHint');

  const selectedClass = 'p-5 rounded-2xl border-2 border-[#810B38] bg-[#FAF6F0] shadow-md transition-all cursor-pointer text-center space-y-2';
  const defaultClass = 'p-5 rounded-2xl border-2 border-[#DCC3AA] bg-white hover:border-[#810B38] shadow-sm transition-all cursor-pointer text-center space-y-2 group';

  if (cardCash) cardCash.className = method === 'cash' ? selectedClass : defaultClass;
  if (cardGcash) cardGcash.className = method === 'gcash' ? selectedClass : defaultClass;
  if (cardBank) cardBank.className = method === 'bank_transfer' ? selectedClass : defaultClass;

  if (method === 'cash') {
    if (onlineBox) onlineBox.classList.add('hidden');
    if (cashBox) cashBox.classList.remove('hidden');
  } else if (method === 'gcash') {
    if (onlineBox) onlineBox.classList.remove('hidden');
    if (cashBox) cashBox.classList.add('hidden');
    if (gcashSec) gcashSec.classList.remove('hidden');
    if (bankSec) bankSec.classList.add('hidden');
    if (onlineTitle) onlineTitle.textContent = "Scan GCash QR Code";
    if (onlineNum) onlineNum.textContent = "0917 123 4567";
    if (refLabel) refLabel.innerHTML = 'GCash Reference Number <span class="text-[#810B38]">*</span>';
    if (refInput) refInput.placeholder = 'e.g. 1029 3847 5612';
    if (refHint) refHint.textContent = 'Found in your GCash SMS / payment receipt';
  } else if (method === 'bank_transfer') {
    if (onlineBox) onlineBox.classList.remove('hidden');
    if (cashBox) cashBox.classList.add('hidden');
    if (gcashSec) gcashSec.classList.add('hidden');
    if (bankSec) bankSec.classList.remove('hidden');
    if (onlineTitle) onlineTitle.textContent = "Bank Transfer / InstaPay";
    if (onlineNum) onlineNum.textContent = "0012 3456 7890";
    if (refLabel) refLabel.innerHTML = 'Bank Transfer Reference Number <span class="text-[#810B38]">*</span>';
    if (refInput) refInput.placeholder = 'e.g. BDO-1029384756';
    if (refHint) refHint.textContent = 'Found on your banking confirmation slip';
  }

  updateSummary();
}

function handleReceiptUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  bookingState.payment.receiptFileName = file.name;

  const previewBox = document.getElementById('receiptPreviewBox');
  const previewName = document.getElementById('receiptFileName');
  const uploadLabel = document.getElementById('uploadLabel');

  if (previewName) previewName.textContent = file.name;
  if (previewBox) previewBox.classList.remove('hidden');
  if (uploadLabel) uploadLabel.textContent = 'Change Receipt';

  const reader = new FileReader();
  reader.onload = function(evt) {
    bookingState.payment.receiptDataUrl = evt.target.result;
  };
  reader.readAsDataURL(file);

  showToast('Receipt attached successfully!', 'success');
}

function removeReceiptUpload(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  bookingState.payment.receiptFileName = '';
  bookingState.payment.receiptDataUrl = '';
  const fileInput = document.getElementById('receiptFileInput');
  if (fileInput) fileInput.value = '';
  const previewBox = document.getElementById('receiptPreviewBox');
  const uploadLabel = document.getElementById('uploadLabel');
  if (previewBox) previewBox.classList.add('hidden');
  if (uploadLabel) uploadLabel.textContent = 'Upload GCash / Bank Receipt';
}

// 12. Summary Sidebar Update
function updateSummary() {
  const sumSvc = document.getElementById('sumService');
  const sumStaff = document.getElementById('sumStaff');
  const sumDur = document.getElementById('sumDuration');
  const sumDate = document.getElementById('sumDate');
  const sumTime = document.getElementById('sumTime');
  const sumVisit = document.getElementById('sumVisitType');
  const sumPay = document.getElementById('sumPayment');
  const sumTot = document.getElementById('sumTotal');

  if (sumSvc) sumSvc.textContent = bookingState.service.name || 'Select a service';
  if (sumStaff) sumStaff.textContent = bookingState.staff.name || 'Any Available Stylist';
  if (sumDur) sumDur.textContent = bookingState.service.duration || '60 mins';
  if (sumDate) sumDate.textContent = bookingState.date || 'Date TBD';
  if (sumTime) sumTime.textContent = bookingState.time || 'Select a time';

  if (sumVisit) {
    sumVisit.innerHTML = bookingState.visitType === 'salon'
      ? `<i class="fa-solid fa-store text-[#810B38] text-[10px]"></i> Salon Visit`
      : `<i class="fa-solid fa-house text-[#810B38] text-[10px]"></i> Home Service`;
  }

  const payMap = {
    'cash': 'Cash (Pay on Visit)',
    'gcash': 'GCash',
    'bank_transfer': 'Bank Transfer'
  };
  if (sumPay) sumPay.textContent = payMap[bookingState.payment.method] || 'GCash';
  if (sumTot) sumTot.textContent = bookingState.service.priceFormatted || '₱0';

  // Sync amount due on online payment cards
  const gcashAmountDue = document.getElementById('gcashAmountDue');
  const gcashStepAmount = document.getElementById('gcashStepAmount');
  const bankAmountDue = document.getElementById('bankAmountDue');
  const priceDisplay = bookingState.service.priceFormatted || '₱0';
  if (gcashAmountDue) gcashAmountDue.textContent = priceDisplay;
  if (gcashStepAmount) gcashStepAmount.textContent = priceDisplay;
  if (bankAmountDue) bankAmountDue.textContent = priceDisplay;
}

function handleSummaryClick() {
  if (bookingState.step === 4) {
    openConfirmModal();
  } else {
    goToStep(bookingState.step + 1);
  }
}

// 13. Stepper & Section Navigation
function goToStep(targetStep) {
  if (targetStep < 1 || targetStep > 4) return;

  // Step Validations
  if (targetStep > bookingState.step) {
    if (bookingState.step === 1) {
      if (!bookingState.service.id) {
        showToast('Please select a service before proceeding.', 'error');
        return;
      }
      const isActive = activeServicesList.some(s => s.id === bookingState.service.id);
      if (!isActive) {
        showToast('The selected service is currently unavailable for booking. Please choose another service.', 'error');
        return;
      }
    }
    if (bookingState.step === 2) {
      if (!bookingState.date || !bookingState.time) {
        showToast('Please select both a date and time slot.', 'error');
        return;
      }
      if (isBookingTimePast(bookingState.dateIso, bookingState.time)) {
        showToast('The selected time slot has already passed for today. Please select an upcoming time slot.', 'error');
        return;
      }
      if (bookingState.staff.id && currentDayAvailability) {
        const staffInfo = currentDayAvailability.staff?.find(x => x.id === bookingState.staff.id);
        if (staffInfo && !staffInfo.is_working_today) {
          showToast(`${bookingState.staff.name} is scheduled off on ${bookingState.date}. Please select an available stylist or date.`, 'error');
          return;
        }
        if (staffInfo && (staffInfo.booked_display_times || []).includes(bookingState.time)) {
          showToast(`${bookingState.staff.name} is already booked at ${bookingState.time}. Please select a different time slot or stylist.`, 'error');
          return;
        }
      }
    }
    if (bookingState.step === 3) {
      const name = document.getElementById('clientNameInput')?.value.trim();
      const phone = document.getElementById('clientPhoneInput')?.value.trim();
      if (!name) {
        showToast('Please enter your full name.', 'error');
        return;
      }
      if (!phone) {
        showToast('Please enter your mobile phone number.', 'error');
        return;
      }
      if (bookingState.visitType === 'home') {
        const bldg = document.getElementById('homeBuilding')?.value.trim();
        const street = document.getElementById('homeStreet')?.value.trim();
        if (!bldg && !street) {
          showToast('Please provide your home address details.', 'error');
          return;
        }
      }
    }
  }

  bookingState.step = targetStep;

  // Toggle Sections
  for (let i = 1; i <= 4; i++) {
    const section = document.getElementById(`stepSection-${i}`);
    if (section) {
      if (i === targetStep) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    }

    const circle = document.getElementById(`stepCircle-${i}`);
    const navText = document.querySelector(`#stepNav-${i} span:last-child`);

    if (circle) {
      if (i < targetStep) {
        circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#810B38] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md transition-all border-2 border-[#DCC3AA]';
        circle.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
        if (navText) navText.className = 'text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#810B38] mt-1.5 block';
      } else if (i === targetStep) {
        circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#810B38] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md transition-all border-2 border-[#DCC3AA] ring-2 ring-[#810B38]/30';
        circle.innerHTML = `<span>${i}</span>`;
        if (navText) navText.className = 'text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#810B38] mt-1.5 block';
      } else {
        circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FAF6F0] text-[#735e5e] flex items-center justify-center font-bold text-xs sm:text-sm border border-[#DCC3AA] transition-all';
        circle.innerHTML = `<span>${i}</span>`;
        if (navText) navText.className = 'text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#735e5e] mt-1.5 block';
      }
    }
  }

  // Update Summary CTA Text
  const summaryBtnText = document.getElementById('summaryBtnText');
  if (summaryBtnText) {
    summaryBtnText.textContent = targetStep === 4 ? 'Review & Confirm' : 'Continue';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 14. Step 5 & Confirmation Modal
function openConfirmModal() {
  if (!bookingState.date || !bookingState.time) {
    showToast('Please select both a date and time slot.', 'error');
    goToStep(2);
    return;
  }
  if (isBookingTimePast(bookingState.dateIso, bookingState.time)) {
    showToast('The selected appointment time slot has already passed for today. Please select an upcoming slot.', 'error');
    goToStep(2);
    return;
  }

  updateSummary();

  const modalSvc = document.getElementById('modalService');
  const modalStaff = document.getElementById('modalStaff');
  const modalDate = document.getElementById('modalDate');
  const modalTime = document.getElementById('modalTime');
  const modalVisit = document.getElementById('modalVisit');
  const modalPayment = document.getElementById('modalPayment');
  const modalTotal = document.getElementById('modalTotal');

  if (modalSvc) modalSvc.textContent = bookingState.service.name;
  if (modalStaff) modalStaff.textContent = bookingState.staff.name || 'Any Available Stylist';
  if (modalDate) modalDate.textContent = bookingState.date;
  if (modalTime) modalTime.textContent = bookingState.time;
  if (modalVisit) modalVisit.textContent = bookingState.visitType === 'salon' ? 'Salon Visit (Lagro, QC)' : 'Home Service';

  const payMap = {
    'cash': 'Cash (Pay on Visit)',
    'gcash': 'GCash',
    'bank_transfer': 'Bank Transfer'
  };
  if (modalPayment) modalPayment.textContent = payMap[bookingState.payment.method] || 'GCash';
  if (modalTotal) modalTotal.textContent = bookingState.service.priceFormatted;

  const modal = document.getElementById('confirmModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.close();
}

// 15. Authoritative Booking Creation (POST /api/bookings)
async function finalizeBooking() {
  if (isBookingTimePast(bookingState.dateIso, bookingState.time)) {
    showToast('The selected appointment time slot has already passed for today. Please choose an upcoming time slot.', 'error');
    closeConfirmModal();
    goToStep(2);
    return;
  }

  const confirmBtn = document.querySelector('#confirmModal button[onclick="finalizeBooking()"]');
  const originalBtnContent = confirmBtn ? confirmBtn.innerHTML : '';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs mr-1.5"></i> <span>Creating Booking...</span>';
  }

  const token = localStorage.getItem('nelys_token');
  const apiBase = window.location.pathname.includes('/customer/') ? '../api' : 'api';

  // Gather client and address data
  const bldg = document.getElementById('homeBuilding')?.value.trim() || '';
  const street = document.getElementById('homeStreet')?.value.trim() || '';
  const brgy = document.getElementById('homeBarangay')?.value.trim() || '';
  const city = document.getElementById('homeCity')?.value.trim() || 'Quezon City';
  const landmark = document.getElementById('homeLandmark')?.value.trim() || '';

  const homeAddressObj = {
    building: bldg || bookingState.homeAddress.building,
    street: street || bookingState.homeAddress.street,
    barangay: brgy || bookingState.homeAddress.barangay,
    city: city || bookingState.homeAddress.city,
    landmark: landmark || bookingState.homeAddress.landmark
  };

  const refNum = document.getElementById('referenceNumberInput')?.value.trim() || bookingState.payment.referenceNumber;
  const clientName = document.getElementById('clientNameInput')?.value.trim() || bookingState.client.name;
  const clientEmail = document.getElementById('clientEmailInput')?.value.trim() || bookingState.client.email;
  const clientPhone = document.getElementById('clientPhoneInput')?.value.trim() || bookingState.client.phone;

  const payload = {
    service_id: bookingState.service.id,
    staff_id: bookingState.staff.id || null,
    booking_date: bookingState.dateIso || bookingState.date,
    booking_time: bookingState.time,
    visit_type: bookingState.visitType,
    home_address: bookingState.visitType === 'home' ? homeAddressObj : null,
    payment_method: bookingState.payment.method,
    reference_number: refNum,
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiBase}/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || result.status === 'error') {
      const errorMsg = result.message || 'Failed to confirm booking. Please try again.';
      showToast(errorMsg, 'error');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalBtnContent;
      }
      return;
    }

    const bookingData = result.data;
    const realRefCode = bookingData.reference_no;

    closeConfirmModal();

    // Hide two-column wizard layout and stepper
    const mainGrid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-12');
    if (mainGrid) mainGrid.classList.add('hidden');

    // Fill in success screen details with real database data
    const succNameEl = document.getElementById('succCustomerName');
    if (succNameEl) succNameEl.textContent = clientName || 'Valued Client';

    const succBookingEl = document.getElementById('succBookingId');
    if (succBookingEl) succBookingEl.textContent = realRefCode;

    const succSvcEl = document.getElementById('succService');
    if (succSvcEl) succSvcEl.textContent = bookingData.service_name || bookingState.service.name;

    const succStaffEl = document.getElementById('succStaff');
    if (succStaffEl) succStaffEl.textContent = bookingState.staff.name || 'Any Available Stylist';

    const succDateEl = document.getElementById('succDate');
    if (succDateEl) succDateEl.textContent = bookingState.date;

    const succTimeEl = document.getElementById('succTime');
    if (succTimeEl) succTimeEl.textContent = bookingState.time;

    const succVisitEl = document.getElementById('succVisit');
    if (succVisitEl) succVisitEl.textContent = bookingData.visit_type === 'home' ? 'Home Service' : 'Salon Visit (Lagro, QC)';

    const notifConfirmedEl = document.getElementById('succNotifConfirmed');
    if (notifConfirmedEl) {
      notifConfirmedEl.innerHTML = `<strong>Appointment Confirmed:</strong> Your ${bookingData.service_name || bookingState.service.name} appointment with ${bookingState.staff.name || 'our stylist team'} is scheduled for ${bookingState.date} at ${bookingState.time}.`;
    }

    const payMap = {
      'cash': 'Cash (Pay on Visit)',
      'gcash': 'GCash',
      'bank_transfer': 'Bank Transfer'
    };
    const succPayEl = document.getElementById('succPayment');
    if (succPayEl) succPayEl.textContent = payMap[bookingData.payment_method || bookingState.payment.method] || 'GCash';

    const succTotEl = document.getElementById('succTotal');
    if (succTotEl) {
      succTotEl.textContent = bookingData.total_price
        ? `₱${parseFloat(bookingData.total_price).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : bookingState.service.priceFormatted;
    }

    const badgeEl = document.getElementById('succPaymentBadge');
    if (badgeEl) {
      if (bookingState.payment.method === 'cash') {
        badgeEl.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300';
        badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Unpaid (Pay at salon)';
      } else {
        badgeEl.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300';
        badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Verification Pending';
      }
    }

    // Invalidate admin cache so fresh bookings appear immediately
    try {
      localStorage.removeItem('nelys_admin_appointments_cache');
      localStorage.removeItem('nelys_admin_dashboard_cache');
    } catch (_) {}

    // Show Success Screen
    const successSection = document.getElementById('successScreen');
    if (successSection) {
      successSection.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Activate Step 5 on stepper
    for (let i = 1; i <= 4; i++) {
      const circle = document.getElementById(`stepCircle-${i}`);
      if (circle) {
        circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#810B38] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md transition-all border-2 border-[#DCC3AA]';
        circle.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
      }
    }
    const circle5 = document.getElementById('stepCircle-5');
    if (circle5) {
      circle5.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md transition-all border-2 border-emerald-300';
      circle5.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
    }

    showToast(`Booking ${realRefCode} created and saved successfully!`, 'success');

  } catch (err) {
    console.error('Booking submission error:', err);
    showToast('Unable to connect to the booking server. Please try again.', 'error');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = originalBtnContent;
    }
  }
}

// 16. Load Sidebar Badge Counters
async function loadSidebarBadgeCounters() {
  const token = localStorage.getItem('nelys_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  // 1. Appointments
  try {
    const res = await fetch('../api/bookings', { headers });
    if (res.ok) {
      const json = await res.json();
      if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
        const upcomingCount = json.data.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
        const apptBadge = document.getElementById('sidebarAppointmentsBadge');
        if (apptBadge) {
          if (upcomingCount > 0) {
            apptBadge.textContent = upcomingCount;
            apptBadge.classList.remove('hidden');
          } else {
            apptBadge.classList.add('hidden');
          }
        }
      }
    }
  } catch (_) {}

  // 2. Notifications
  try {
    const res = await fetch('../api/notifications', { headers });
    if (res.ok) {
      const json = await res.json();
      if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
        const unreadCount = json.data.filter(n => !n.is_read).length;
        const notifBadge = document.getElementById('sidebarNotifBadge');
        const mobileDot = document.getElementById('mobileNotifDot');

        if (notifBadge) {
          if (unreadCount > 0) {
            notifBadge.textContent = unreadCount;
            notifBadge.classList.remove('hidden');
          } else {
            notifBadge.classList.add('hidden');
          }
        }
        if (mobileDot) {
          if (unreadCount > 0) {
            mobileDot.classList.remove('hidden');
          } else {
            mobileDot.classList.add('hidden');
          }
        }
      }
    }
  } catch (_) {}

  // 3. Messages
  if (token) {
    try {
      const res = await fetch('../api/messages', { headers });
      if (res.ok) {
        const json = await res.json();
        if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
          const unreadMsgs = json.data.filter(m => (m.sender === 'admin' || m.sender === 'salon') && !m.is_read).length;
          const msgBadge = document.getElementById('sidebarMessagesBadge');
          if (msgBadge) {
            if (unreadMsgs > 0) {
              msgBadge.textContent = unreadMsgs;
              msgBadge.classList.remove('hidden');
            } else {
              msgBadge.classList.add('hidden');
            }
          }
        }
      }
    } catch (_) {}
  }
}

// 17. Steady Dialog Dismissal & Mobile Sidebar
function setupDialogSteadyListeners() {
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('click', (e) => {
      const rect = dlg.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        dlg.close();
      }
    });
  });
}

function toggleMobileSidebar(open = null) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!sidebar || !backdrop) return;

  const isOpen = !sidebar.classList.contains('-translate-x-full');
  const targetState = open !== null ? open : !isOpen;

  if (targetState) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    document.body.classList.add('overflow-hidden', 'lg:overflow-auto');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    document.body.classList.remove('overflow-hidden', 'lg:overflow-auto');
  }
}

// Body Scroll Lock for Dialogs
function lockBodyScroll() {
  document.body.classList.add('overflow-hidden');
  window.addEventListener('touchmove', onPreventCustomerBackgroundTouch, { passive: false });
  window.addEventListener('keydown', onPreventCustomerBackgroundKeys);
}

function unlockBodyScroll() {
  const openDialogs = Array.from(document.querySelectorAll('dialog')).filter(d => d.open);
  if (openDialogs.length > 0) return;
  document.body.classList.remove('overflow-hidden');
  window.removeEventListener('touchmove', onPreventCustomerBackgroundTouch);
  window.removeEventListener('keydown', onPreventCustomerBackgroundKeys);
}

function onPreventCustomerBackgroundTouch(e) {
  const activeDialog = document.querySelector('dialog[open]');
  if (activeDialog && !activeDialog.contains(e.target)) {
    e.preventDefault();
  }
}

function onPreventCustomerBackgroundKeys(e) {
  if (['Space', 'PageUp', 'PageDown', 'End', 'Home'].includes(e.code)) {
    const activeDialog = document.querySelector('dialog[open]');
    if (activeDialog && !activeDialog.contains(e.target)) {
      e.preventDefault();
    }
  }
}

function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.showModal === 'function') {
    lockBodyScroll();
    modal.showModal();
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.close === 'function') {
    modal.close();
    unlockBodyScroll();
  }
}

function confirmLogout() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('nelys_') || key.startsWith('booking_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (e) {}
  showToast('Logging out...', 'info');
  window.location.href = '../login.html';
}

function handleLogout(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  openLogoutModal();
  return false;
}

// QR Code Zoom Modal Functions
function openQrZoomModal() {
  const modal = document.getElementById('qrZoomModal');
  if (modal && typeof modal.showModal === 'function') {
    lockBodyScroll();
    modal.showModal();
  }
}

function closeQrZoomModal() {
  const modal = document.getElementById('qrZoomModal');
  if (modal && typeof modal.close === 'function') {
    modal.close();
    unlockBodyScroll();
  }
}

function copyGcashNumber() {
  const num = '0917 123 4567';
  if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(num).then(() => {
      const btnText = document.getElementById('copyGcashBtnText');
      if (btnText) {
        btnText.textContent = 'Copied!';
        setTimeout(() => { btnText.textContent = 'Copy'; }, 2000);
      }
      showToast('GCash number (0917 123 4567) copied to clipboard!', 'success');
    }).catch(() => {
      showToast('GCash Number: 0917 123 4567', 'info');
    });
  } else {
    showToast('GCash Number: 0917 123 4567', 'info');
  }
}

// Global window bindings for HTML event attributes
window.selectService = selectService;
window.selectStaff = selectStaff;
window.selectDate = selectDate;
window.selectTime = selectTime;
window.selectVisitType = selectVisitType;
window.selectPaymentMethod = selectPaymentMethod;
window.handleReceiptUpload = handleReceiptUpload;
window.removeReceiptUpload = removeReceiptUpload;
window.openQrZoomModal = openQrZoomModal;
window.closeQrZoomModal = closeQrZoomModal;
window.copyGcashNumber = copyGcashNumber;
window.filterServiceCategory = filterServiceCategory;
window.changeCalendarMonth = changeCalendarMonth;
window.goToStep = goToStep;
window.openConfirmModal = openConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.finalizeBooking = finalizeBooking;
window.handleSummaryClick = handleSummaryClick;
window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.handleLogout = handleLogout;
window.toggleMobileSidebar = toggleMobileSidebar;

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgStyle = type === 'success'
    ? 'bg-[#541A1A] text-[#F1E2D1] border border-[#810B38]'
    : type === 'error'
      ? 'bg-[#810B38] text-white border border-[#DCC3AA]'
      : 'bg-[#541A1A] text-white border border-[#810B38]';

  const iconClass = type === 'success'
    ? 'fa-solid fa-circle-check text-[#DCC3AA]'
    : type === 'error'
      ? 'fa-solid fa-circle-exclamation text-[#F1E2D1]'
      : 'fa-solid fa-circle-info text-[#DCC3AA]';

  toast.className = `pointer-events-auto px-5 py-3.5 rounded-xl shadow-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all duration-300 transform translate-y-2 opacity-0 ${bgStyle}`;
  toast.innerHTML = `
    <div class="flex items-center gap-2.5">
      <i class="${iconClass} text-xs"></i>
      <span>${escapeHtml(message)}</span>
    </div>
    <button type="button" class="text-white/70 hover:text-white ml-2" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark text-xs"></i>
    </button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
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
