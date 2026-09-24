/**
 * Nely's Salon - Multi-Step Online Booking Wizard
 * Steps: 01 Service -> 02 Schedule -> 03 Visit -> 04 Payment -> 05 Confirm
 */

// Application Booking State
const bookingState = {
  step: 1,
  service: {
    id: 'brazilian',
    name: 'Brazilian',
    price: 1999,
    priceFormatted: '₱1,999',
    category: 'Hair Services',
    duration: '120 mins'
  },
  date: 'September 25, 2026',
  time: '10:00 AM',
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
    receiptFileName: ''
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Pre-fill patron profile if logged in
  const savedUserJson = localStorage.getItem('nelys_user');
  if (savedUserJson) {
    try {
      const user = JSON.parse(savedUserJson);
      if (user.full_name) {
        bookingState.client.name = user.full_name;
        const nameInput = document.getElementById('clientNameInput');
        if (nameInput) nameInput.value = user.full_name;

        const sidebarName = document.getElementById('customerSidebarName');
        if (sidebarName) sidebarName.textContent = user.full_name;

        const avatarEl = document.getElementById('customerAvatarInitials');
        if (avatarEl) {
          const initials = user.full_name
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
      if (user.address) {
        const addrInput = document.getElementById('homeBuilding');
        if (addrInput && !addrInput.value) addrInput.value = user.address;
      }
    } catch (e) {
      console.warn('Error reading stored patron details:', e);
    }
  }

  initCalendar();
  updateSummary();

  // Check URL query parameters for pre-selected service
  const params = new URLSearchParams(window.location.search);
  const serviceParam = params.get('service');
  if (serviceParam) {
    const targetCard = document.getElementById(`svcCard-${serviceParam}`);
    if (targetCard) {
      targetCard.click();
      setTimeout(() => {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }
});

// Calendar State
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();

const calendarMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function initCalendar() {
  const now = new Date();
  currentCalYear = now.getFullYear();
  currentCalMonth = now.getMonth();

  if (!bookingState.date) {
    bookingState.date = `${calendarMonthNames[currentCalMonth]} ${now.getDate()}, ${currentCalYear}`;
  }

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

  // Sunday = 0, Monday = 1, ..., Saturday = 6
  const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const totalDays = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

  let gridHtml = '';

  // Blank leading offset cells
  for (let b = 0; b < firstDayIndex; b++) {
    gridHtml += `<div class="py-2.5"></div>`;
  }

  // Days in month
  for (let day = 1; day <= totalDays; day++) {
    const thisDateObj = new Date(currentCalYear, currentCalMonth, day);
    const thisDateTime = thisDateObj.getTime();
    const formattedDate = `${calendarMonthNames[currentCalMonth]} ${day}, ${currentCalYear}`;
    const isPast = thisDateTime < todayZero;
    const isSelected = bookingState.date === formattedDate;

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
          onclick="selectDate('${formattedDate}', this)" 
          class="date-btn py-2.5 rounded-xl bg-[#810B38] text-white font-bold shadow-md border border-[#810B38] transition-all text-xs">
          ${day}
        </button>
      `;
    } else {
      gridHtml += `
        <button 
          type="button" 
          onclick="selectDate('${formattedDate}', this)" 
          class="date-btn py-2.5 rounded-xl bg-white hover:bg-[#F1E2D1] text-[#2b1d1d] border border-[#DCC3AA] transition-all font-semibold text-xs shadow-sm">
          ${day}
        </button>
      `;
    }
  }

  daysGridEl.innerHTML = gridHtml;
}

// 1. Navigation Between Steps
function goToStep(targetStep) {
  if (targetStep < 1 || targetStep > 4) return;

  // Validation before proceeding forward
  if (targetStep > bookingState.step) {
    if (bookingState.step === 1 && !bookingState.service.id) {
      showToast('Please select a service before proceeding.', 'error');
      return;
    }
    if (bookingState.step === 2 && (!bookingState.date || !bookingState.time)) {
      showToast('Please select both a date and time slot.', 'error');
      return;
    }
    if (bookingState.step === 3 && bookingState.visitType === 'home') {
      const bldg = document.getElementById('homeBuilding')?.value.trim();
      const street = document.getElementById('homeStreet')?.value.trim();
      if (!bldg || !street) {
        showToast('Please fill in your home service address details.', 'error');
        return;
      }
    }
  }

  // Hide all steps
  for (let i = 1; i <= 4; i++) {
    const section = document.getElementById(`stepSection-${i}`);
    if (section) section.classList.add('hidden');

    const circle = document.getElementById(`stepCircle-${i}`);
    const navText = document.querySelector(`#stepNav-${i} span:last-child`);

    if (circle) {
      if (i < targetStep) {
        // Completed step
        circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#810B38] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md transition-all border-2 border-[#DCC3AA]';
        circle.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
        if (navText) navText.className = 'text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#810B38] mt-1.5 block';
      } else if (i === targetStep) {
        // Active step
        circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#810B38] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md transition-all border-2 border-[#DCC3AA] ring-2 ring-[#810B38]/30';
        circle.innerHTML = `<span>${i}</span>`;
        if (navText) navText.className = 'text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#810B38] mt-1.5 block';
      } else {
        // Future step
        circle.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FAF6F0] text-[#735e5e] flex items-center justify-center font-bold text-xs sm:text-sm border border-[#DCC3AA] transition-all';
        circle.innerHTML = `<span>${i}</span>`;
        if (navText) navText.className = 'text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#735e5e] mt-1.5 block';
      }
    }
  }

  // Show target step
  const targetSection = document.getElementById(`stepSection-${targetStep}`);
  if (targetSection) targetSection.classList.remove('hidden');

  bookingState.step = targetStep;

  // Update Summary CTA button label
  const summaryBtnText = document.getElementById('summaryBtnText');
  if (summaryBtnText) {
    if (targetStep === 4) {
      summaryBtnText.textContent = 'Confirm Appointment';
    } else {
      summaryBtnText.textContent = 'Next Step';
    }
  }

  window.scrollTo({ top: 120, behavior: 'smooth' });
}

// 2. Step 1: Select Service
function selectService(id, name, price, category, duration) {
  bookingState.service = {
    id,
    name,
    price,
    priceFormatted: price ? `₱${price.toLocaleString()}` : 'TBC',
    category,
    duration
  };

  // Update card visual styles
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('border-[#810B38]', 'bg-[#FAF6F0]', 'shadow-md');
    card.classList.add('border-[#DCC3AA]', 'bg-white');
  });

  const activeCard = document.getElementById(`svcCard-${id}`);
  if (activeCard) {
    activeCard.classList.remove('border-[#DCC3AA]', 'bg-white');
    activeCard.classList.add('border-[#810B38]', 'bg-[#FAF6F0]', 'shadow-md');
  }

  const selectedLabel = document.getElementById('step1SelectedLabel');
  if (selectedLabel) {
    selectedLabel.textContent = `${name} (${bookingState.service.priceFormatted})`;
  }

  updateSummary();
}

// Category filter in Step 1
function filterServiceCategory(cat) {
  const hairGroup = document.getElementById('categoryGroup-hair');
  const nailGroup = document.getElementById('categoryGroup-nail_foot');
  const tabAll = document.getElementById('tabBtn-all');
  const tabHair = document.getElementById('tabBtn-hair');
  const tabNail = document.getElementById('tabBtn-nail_foot');

  const activeTabClass = 'px-3 py-1.5 rounded-xl font-bold bg-[#810B38] text-white transition-all';
  const inactiveTabClass = 'px-3 py-1.5 rounded-xl font-medium text-[#735e5e] hover:text-[#541A1A] transition-all';

  tabAll.className = cat === 'all' ? activeTabClass : inactiveTabClass;
  tabHair.className = cat === 'hair' ? activeTabClass : inactiveTabClass;
  tabNail.className = cat === 'nail_foot' ? activeTabClass : inactiveTabClass;

  if (cat === 'all') {
    hairGroup?.classList.remove('hidden');
    nailGroup?.classList.remove('hidden');
  } else if (cat === 'hair') {
    hairGroup?.classList.remove('hidden');
    nailGroup?.classList.add('hidden');
  } else if (cat === 'nail_foot') {
    hairGroup?.classList.add('hidden');
    nailGroup?.classList.remove('hidden');
  }
}

// 3. Step 2: Select Date & Time
function selectDate(dateStr, btnElement) {
  bookingState.date = dateStr;

  document.querySelectorAll('.date-btn').forEach(btn => {
    btn.className = 'date-btn py-2.5 rounded-xl bg-white hover:bg-[#F1E2D1] text-[#2b1d1d] border border-[#DCC3AA] transition-all font-semibold text-xs shadow-sm';
  });

  if (btnElement) {
    btnElement.className = 'date-btn py-2.5 rounded-xl bg-[#810B38] text-white font-bold shadow-md border border-[#810B38] transition-all text-xs';
  }

  updateSummary();
}

function selectTime(timeStr, btnElement) {
  bookingState.time = timeStr;

  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.className = 'time-btn py-3 px-3 rounded-xl bg-white border border-[#DCC3AA] text-xs font-bold text-[#2b1d1d] hover:border-[#810B38] transition-all';
  });

  if (btnElement) {
    btnElement.className = 'time-btn py-3 px-3 rounded-xl bg-[#810B38] text-white border border-[#810B38] text-xs font-bold shadow-md transition-all';
  }

  const selectedTimeLabel = document.getElementById('step2SelectedTimeLabel');
  if (selectedTimeLabel) selectedTimeLabel.textContent = timeStr;

  updateSummary();
}

// 4. Step 3: Choose Visit Type & Client Details
function selectVisitType(type) {
  bookingState.visitType = type;

  const cardSalon = document.getElementById('visitCard-salon');
  const cardHome = document.getElementById('visitCard-home');
  const badgeSalon = document.getElementById('visitBadge-salon');
  const badgeHome = document.getElementById('visitBadge-home');
  const homeForm = document.getElementById('homeAddressForm');

  if (type === 'salon') {
    cardSalon.className = 'p-5 rounded-2xl border-2 border-[#810B38] bg-[#FAF6F0] shadow-sm transition-all cursor-pointer space-y-3';
    badgeSalon.className = 'w-5 h-5 rounded-full bg-[#810B38] text-white flex items-center justify-center text-[10px]';

    cardHome.className = 'p-5 rounded-2xl border-2 border-[#DCC3AA] bg-white hover:border-[#810B38] shadow-sm transition-all cursor-pointer space-y-3';
    badgeHome.className = 'w-5 h-5 rounded-full bg-gray-200 text-transparent flex items-center justify-center text-[10px]';

    homeForm?.classList.add('hidden');
  } else {
    cardHome.className = 'p-5 rounded-2xl border-2 border-[#810B38] bg-[#FAF6F0] shadow-sm transition-all cursor-pointer space-y-3';
    badgeHome.className = 'w-5 h-5 rounded-full bg-[#810B38] text-white flex items-center justify-center text-[10px]';

    cardSalon.className = 'p-5 rounded-2xl border-2 border-[#DCC3AA] bg-white hover:border-[#810B38] shadow-sm transition-all cursor-pointer space-y-3';
    badgeSalon.className = 'w-5 h-5 rounded-full bg-gray-200 text-transparent flex items-center justify-center text-[10px]';

    homeForm?.classList.remove('hidden');
  }

  updateSummary();
}

let isEditingClient = false;
function toggleCustomerEdit() {
  isEditingClient = !isEditingClient;
  const nameInput = document.getElementById('clientNameInput');
  const emailInput = document.getElementById('clientEmailInput');
  const phoneInput = document.getElementById('clientPhoneInput');
  const btn = document.getElementById('editCustomerBtn');

  if (isEditingClient) {
    nameInput.removeAttribute('readonly');
    emailInput.removeAttribute('readonly');
    phoneInput.removeAttribute('readonly');
    nameInput.focus();
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk text-[11px]"></i> <span>Save Details</span>';
  } else {
    nameInput.setAttribute('readonly', 'true');
    emailInput.setAttribute('readonly', 'true');
    phoneInput.setAttribute('readonly', 'true');
    bookingState.client.name = nameInput.value;
    bookingState.client.email = emailInput.value;
    bookingState.client.phone = phoneInput.value;
    btn.innerHTML = '<i class="fa-solid fa-pen-to-square text-[11px]"></i> <span>Edit Details</span>';
    showToast('Customer details updated.', 'success');
  }
}

// 5. Step 4: Select Payment Method & Proof
function selectPaymentMethod(method) {
  bookingState.payment.method = method;

  const cardCash = document.getElementById('payCard-cash');
  const cardGcash = document.getElementById('payCard-gcash');
  const cardBank = document.getElementById('payCard-bank_transfer');
  const onlineBox = document.getElementById('onlinePaymentBox');
  const cashNotice = document.getElementById('cashNoticeBox');
  const onlineTitle = document.getElementById('onlinePaymentTitle');
  const onlineNumber = document.getElementById('onlinePaymentNumber');

  const activeClasses = 'p-5 rounded-2xl border-2 border-[#810B38] bg-[#FAF6F0] shadow-sm transition-all cursor-pointer text-center space-y-2 group';
  const inactiveClasses = 'p-5 rounded-2xl border-2 border-[#DCC3AA] bg-white hover:border-[#810B38] shadow-sm transition-all cursor-pointer text-center space-y-2 group';

  cardCash.className = method === 'cash' ? activeClasses : inactiveClasses;
  cardGcash.className = method === 'gcash' ? activeClasses : inactiveClasses;
  cardBank.className = method === 'bank_transfer' ? activeClasses : inactiveClasses;

  if (method === 'cash') {
    onlineBox?.classList.add('hidden');
    cashNotice?.classList.remove('hidden');
  } else {
    cashNotice?.classList.add('hidden');
    onlineBox?.classList.remove('hidden');

    if (method === 'gcash') {
      onlineTitle.textContent = 'Nely’s Salon GCash';
      onlineNumber.textContent = '0917 123 4567';
    } else {
      onlineTitle.textContent = 'Nely’s Salon BDO Bank Account';
      onlineNumber.textContent = '0012 3456 7890';
    }
  }

  updateSummary();
}

function handleReceiptUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  bookingState.payment.receiptFileName = file.name;
  const previewBox = document.getElementById('receiptPreviewBox');
  const fileNameEl = document.getElementById('receiptFileName');
  const uploadLabel = document.getElementById('uploadLabel');

  if (previewBox && fileNameEl) {
    fileNameEl.textContent = file.name;
    previewBox.classList.remove('hidden');
    uploadLabel.textContent = 'Receipt Attached';
    showToast(`Receipt (${file.name}) attached successfully!`, 'success');
  }
}

// 6. Update Live Summary Panel
function updateSummary() {
  document.getElementById('sumService').textContent = bookingState.service.name;
  document.getElementById('sumDuration').textContent = bookingState.service.duration;
  document.getElementById('sumDate').textContent = bookingState.date;
  document.getElementById('sumTime').textContent = bookingState.time;

  const visitEl = document.getElementById('sumVisitType');
  if (visitEl) {
    visitEl.innerHTML = bookingState.visitType === 'salon'
      ? '<i class="fa-solid fa-store text-[#810B38] text-[10px]"></i> Salon Visit'
      : '<i class="fa-solid fa-house text-[#810B38] text-[10px]"></i> Home Service';
  }

  const payMap = {
    'cash': 'Cash (Pay at salon)',
    'gcash': 'GCash (Online)',
    'bank_transfer': 'Bank Transfer (Online)'
  };
  document.getElementById('sumPayment').textContent = payMap[bookingState.payment.method] || 'GCash';
  document.getElementById('sumTotal').textContent = bookingState.service.priceFormatted;
}

function handleSummaryClick() {
  if (bookingState.step === 4) {
    openConfirmModal();
  } else {
    goToStep(bookingState.step + 1);
  }
}

// 7. Step 5 & Confirmation Modal
function openConfirmModal() {
  updateSummary();

  document.getElementById('modalService').textContent = bookingState.service.name;
  document.getElementById('modalDate').textContent = bookingState.date;
  document.getElementById('modalTime').textContent = bookingState.time;
  document.getElementById('modalVisit').textContent = bookingState.visitType === 'salon' ? 'Salon Visit' : 'Home Service';

  const payMap = {
    'cash': 'Cash',
    'gcash': 'GCash',
    'bank_transfer': 'Bank Transfer'
  };
  document.getElementById('modalPayment').textContent = payMap[bookingState.payment.method] || 'GCash';
  document.getElementById('modalTotal').textContent = bookingState.service.priceFormatted;

  const modal = document.getElementById('confirmModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.close();
}

// 8. Finalize Booking & Show Success Screen
async function finalizeBooking() {
  const confirmBtn = document.querySelector('#confirmModal button[onclick="finalizeBooking()"]');
  const originalBtnContent = confirmBtn ? confirmBtn.innerHTML : '';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> <span>Confirming...</span>';
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
    booking_date: bookingState.date,
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

    document.getElementById('succBookingId').textContent = realRefCode;
    document.getElementById('succService').textContent = bookingData.service_name || bookingState.service.name;
    document.getElementById('succDate').textContent = bookingState.date;
    document.getElementById('succTime').textContent = bookingState.time;
    document.getElementById('succVisit').textContent = bookingData.visit_type === 'home' ? 'Home Service' : 'Salon Visit';

    const notifConfirmedEl = document.getElementById('succNotifConfirmed');
    if (notifConfirmedEl) {
      notifConfirmedEl.innerHTML = `<strong>Appointment Confirmed:</strong> Your ${bookingData.service_name || bookingState.service.name} appointment is scheduled for ${bookingState.date} at ${bookingState.time}.`;
    }

    const payMap = {
      'cash': 'Cash',
      'gcash': 'GCash',
      'bank_transfer': 'Bank Transfer'
    };
    document.getElementById('succPayment').textContent = payMap[bookingData.payment_method || bookingState.payment.method] || 'GCash';
    document.getElementById('succTotal').textContent = bookingData.total_price
      ? `₱${parseFloat(bookingData.total_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : bookingState.service.priceFormatted;

    const badgeEl = document.getElementById('succPaymentBadge');
    if (bookingState.payment.method === 'cash') {
      badgeEl.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300';
      badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Unpaid (Pay at salon)';
    } else {
      badgeEl.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300';
      badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Payment Verification Pending';
    }

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

    showToast(`Booking ${realRefCode} confirmed and saved to database!`, 'success');

  } catch (err) {
    console.error('Booking submission error:', err);
    showToast('Unable to connect to the booking server. Please check connection.', 'error');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = originalBtnContent;
    }
  }
}

// 9. Toast Notification Helper
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
      <span>${message}</span>
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

// 10. Mobile Sidebar Navigation Toggle
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

// 11. Logout Modal Handlers
function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.close();
}

function confirmLogout() {
  closeLogoutModal();
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  showToast('Signing out... Goodbye!', 'info');
  setTimeout(() => {
    window.location.href = '../login.html';
  }, 1000);
}
