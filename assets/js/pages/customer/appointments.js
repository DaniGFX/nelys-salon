/**
 * Nely's Salon — Customer Appointments Management Script
 * Fully connected to backend MySQL database APIs:
 * - GET ../api/bookings (Live customer appointments)
 * - POST ../api/bookings/{ref}/cancel (Authoritative cancellation in MySQL)
 * - POST ../api/bookings (Express re-booking in MySQL)
 * - GET ../api/notifications, ../api/messages (Live badge counters)
 * Zero-glitch SWR pre-hydration & steady dialog management.
 */

const CUST_APPTS_CACHE_KEY = 'nelys_customer_appointments_cache';
let lastRendered_cust_appts_Hash = '';

// Global appointments state
let appointmentsData = [];
let activeTab = 'upcoming';
let currentSelectedAppointmentId = null;
let currentRebookAppointment = null;

// Immediate Hydration & Initialization
function hydrateCustomerAppointmentsFromCache() {
  initPatronProfile();
  
  let preloaded = window.__PRELOADED_CUSTOMER_APPTS__;
  if (!preloaded) {
    try {
      const raw = localStorage.getItem(CUST_APPTS_CACHE_KEY);
      if (raw) preloaded = JSON.parse(raw);
    } catch (e) {}
  }

  if (Array.isArray(preloaded) && preloaded.length > 0) {
    try {
      appointmentsData = preloaded.map(mapBookingToAppointment);
      lastRendered_cust_appts_Hash = JSON.stringify(preloaded);
      updateTabCounters();
      renderAppointments();
    } catch (e) {
      console.warn('Appointments cache hydration error:', e);
    }
  }
}

// Lifecycle Bootstrapping
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomerAppointments);
} else {
  initCustomerAppointments();
}

function initCustomerAppointments() {
  hydrateCustomerAppointmentsFromCache();
  setupDialogSteadyListeners();
  loadCustomerAppointments();
  loadSidebarBadgeCounters();
}

function initPatronProfile() {
  const savedUserJson = localStorage.getItem('nelys_user');
  if (!savedUserJson) return;

  try {
    const user = JSON.parse(savedUserJson);
    const displayName = user.full_name || user.name || (user.email ? user.email.split('@')[0] : 'Client Patron');

    const sidebarName = document.getElementById('customerSidebarName') || document.querySelector('aside .truncate');
    if (sidebarName) {
      sidebarName.textContent = displayName;
    }

    const avatarEl = document.getElementById('customerAvatarInitials') || document.querySelector('aside .w-10.h-10.rounded-full');
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
    if (modalName) modalName.value = user.full_name || user.name || '';

    const modalPhone = document.getElementById('profileModalPhone');
    if (modalPhone) modalPhone.value = user.phone || '';

    const modalAddress = document.getElementById('profileModalAddress');
    if (modalAddress && user.address) modalAddress.value = user.address;
  } catch (e) {
    console.warn('Error reading saved user:', e);
  }
}

// 1. Fetch appointments from live database API
async function loadCustomerAppointments() {
  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch('../api/bookings', { headers });
    const result = await res.json();

    if (res.ok && (result.status === 'success' || result.success) && Array.isArray(result.data)) {
      const newHash = JSON.stringify(result.data);
      if (newHash !== lastRendered_cust_appts_Hash || appointmentsData.length === 0) {
        lastRendered_cust_appts_Hash = newHash;
        appointmentsData = result.data.map(mapBookingToAppointment);
        try {
          localStorage.setItem(CUST_APPTS_CACHE_KEY, newHash);
        } catch (e) {}
        updateTabCounters();
        renderAppointments();
      }
    } else {
      if (lastRendered_cust_appts_Hash !== '[]') {
        lastRendered_cust_appts_Hash = '[]';
        appointmentsData = [];
        try {
          localStorage.setItem(CUST_APPTS_CACHE_KEY, '[]');
        } catch (e) {}
        updateTabCounters();
        renderAppointments();
      }
    }
  } catch (err) {
    console.error('Error loading customer appointments from server:', err);
    if (!appointmentsData || appointmentsData.length === 0) {
      updateTabCounters();
      renderAppointments();
    }
  }
}

function mapBookingToAppointment(b) {
  const isPaid = b.payment_status === 'paid';
  const rawMethod = (b.payment_method || 'cash').toLowerCase();
  const methodLabel = rawMethod.includes('gcash') ? 'GCash' : (rawMethod.includes('bank') ? 'Bank Transfer' : 'Cash');
  const statusLabel = isPaid ? 'Paid / Verified' : (rawMethod.includes('cash') ? 'Pay on Visit' : 'Pending');
  const rawStatus = (b.status || 'pending').toLowerCase();
  const isConfirmed = rawStatus === 'confirmed' || rawStatus === 'approved';

  return {
    id: b.reference_no,
    dbId: b.id,
    status: isConfirmed ? 'upcoming' : rawStatus,
    dbStatus: b.status,
    service: b.service_name || 'Salon Service',
    serviceId: b.service_id,
    staffId: b.staff_id || null,
    staffName: b.staff_name || null,
    price: parseFloat(b.total_price || 0),
    priceFormatted: `₱${parseFloat(b.total_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    date: formatDisplayDate(b.booking_date),
    rawDate: b.booking_date,
    time: formatDisplayTime(b.booking_time),
    rawTime: b.booking_time,
    customerName: b.customer_name || 'Valued Patron',
    contactNumber: b.customer_phone || '',
    visitType: b.visit_type === 'home' ? 'Home Service' : 'Salon Visit',
    address: b.visit_type === 'home' 
      ? (b.home_address || 'Customer Registered Address')
      : "BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City",
    paymentMethod: methodLabel,
    paymentStatus: statusLabel,
    cancellationReason: b.cancel_reason || b.cancellation_reason || null,
    cancelledAt: b.updated_at ? formatDisplayDate(b.updated_at.split(' ')[0]) : null,
    slug: b.service_code || 'brazilian'
  };
}

// 2. Tab Navigation Switcher
function switchTab(tabName) {
  activeTab = tabName;

  const tabs = ['upcoming', 'pending', 'completed', 'cancelled'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn-${t}`);
    if (!btn) return;

    if (t === tabName) {
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

  renderAppointments();
}

// 3. Update Badge Counters for Each Tab
function updateTabCounters() {
  const counts = {
    upcoming: appointmentsData.filter(a => a.status === 'upcoming').length,
    pending: appointmentsData.filter(a => a.status === 'pending').length,
    completed: appointmentsData.filter(a => a.status === 'completed').length,
    cancelled: appointmentsData.filter(a => a.status === 'cancelled').length
  };

  for (const [key, val] of Object.entries(counts)) {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = val;
  }

  // Update sidebar counter for active appointments
  const asideAppointmentsBadge = document.getElementById('sidebarAppointmentsBadge');
  if (asideAppointmentsBadge) {
    const totalActive = counts.upcoming + counts.pending;
    if (totalActive > 0) {
      asideAppointmentsBadge.textContent = totalActive;
      asideAppointmentsBadge.classList.remove('hidden');
    } else {
      asideAppointmentsBadge.classList.add('hidden');
    }
  }
}

// 4. Render Appointment Cards
function renderAppointments() {
  const container = document.getElementById('appointmentsListContainer');
  const emptyState = document.getElementById('emptyStateContainer');
  if (!container || !emptyState) return;

  const filtered = appointmentsData.filter(a => a.status === activeTab);

  if (filtered.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');

    const emptyTitle = document.getElementById('emptyStateTitle');
    const emptyDesc = document.getElementById('emptyStateDesc');

    if (activeTab === 'upcoming') {
      emptyTitle.textContent = 'No upcoming appointments';
      emptyDesc.textContent = 'You have no active confirmed visits right now. Book a session to pamper yourself!';
    } else if (activeTab === 'pending') {
      emptyTitle.textContent = 'No pending bookings';
      emptyDesc.textContent = 'All your bookings have been reviewed and processed by our team.';
    } else if (activeTab === 'completed') {
      emptyTitle.textContent = 'No completed appointments yet';
      emptyDesc.textContent = 'Your finished salon sessions will be recorded here for easy re-booking.';
    } else if (activeTab === 'cancelled') {
      emptyTitle.textContent = 'No cancelled appointments';
      emptyDesc.textContent = 'You have no cancelled appointments on record.';
    }
    return;
  }

  container.classList.remove('hidden');
  emptyState.classList.add('hidden');

  let html = '';
  filtered.forEach(item => {
    html += buildAppointmentCardHtml(item);
  });

  container.innerHTML = html;
}

// 5. Generate Card HTML for Each Type
function buildAppointmentCardHtml(item) {
  let statusBadge = '';
  let noteHtml = '';

  let actionButtons = `
    <button 
      type="button" 
      onclick="openDetailsModal('${item.id}')"
      class="px-4 py-2 rounded-xl border border-[#DCC3AA] bg-white hover:bg-[#FAF6F0] text-[#541A1A] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
      <i class="fa-solid fa-eye text-[#810B38]"></i>
      <span>View Details</span>
    </button>
  `;

  if (item.status === 'upcoming') {
    statusBadge = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
        <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
        Confirmed & Upcoming
      </span>
    `;

    actionButtons += `
      <button 
        type="button" 
        onclick="openCancelModal('${item.id}')"
        class="px-4 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
        <i class="fa-solid fa-ban text-rose-500"></i>
        <span>Cancel</span>
      </button>
    `;
  } else if (item.status === 'pending') {
    statusBadge = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
        <span class="w-2 h-2 rounded-full bg-amber-600"></span>
        Awaiting Confirmation
      </span>
    `;

    noteHtml = `
      <div class="mt-4 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
        <i class="fa-solid fa-hourglass-half text-amber-700 mt-0.5 text-sm shrink-0"></i>
        <div>
          <span class="font-bold">Pending Salon Approval:</span> 
          Our head receptionist is verifying slot availability. You will receive an SMS confirmation shortly.
        </div>
      </div>
    `;

    actionButtons += `
      <button 
        type="button" 
        onclick="openCancelModal('${item.id}')"
        class="px-4 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
        <i class="fa-solid fa-xmark text-rose-500"></i>
        <span>Cancel Booking</span>
      </button>
    `;
  } else if (item.status === 'completed') {
    statusBadge = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#810B38]/10 text-[#810B38] border border-[#810B38]/30">
        <i class="fa-solid fa-circle-check text-[#810B38]"></i>
        Completed
      </span>
    `;

    actionButtons += `
      <button 
        type="button" 
        onclick="openQuickRebookModal('${item.id}')"
        class="px-4 py-2 rounded-xl bg-[#810B38] text-white hover:bg-[#62082b] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
        <i class="fa-solid fa-rotate-right"></i>
        <span>Re-book This Service</span>
      </button>
    `;
  } else if (item.status === 'cancelled') {
    statusBadge = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-300">
        <i class="fa-solid fa-ban text-zinc-500"></i>
        Cancelled
      </span>
    `;

    if (item.cancellationReason) {
      noteHtml = `
        <div class="mt-4 p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 flex items-start gap-2.5">
          <i class="fa-solid fa-circle-info text-rose-600 mt-0.5 text-sm shrink-0"></i>
          <div>
            <span class="font-bold">Cancellation Reason:</span> 
            ${escapeHtml(item.cancellationReason)}
          </div>
        </div>
      `;
    }

    actionButtons += `
      <button 
        type="button" 
        onclick="openQuickRebookModal('${item.id}')"
        class="px-4 py-2 rounded-xl bg-[#810B38] text-white hover:bg-[#62082b] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
        <i class="fa-solid fa-arrow-rotate-right"></i>
        <span>Book Again</span>
      </button>
    `;
  }

  return `
    <article class="bg-white p-5 sm:p-6 rounded-3xl border border-[#DCC3AA]/60 shadow-sm hover:shadow-md transition-all">
      
      <!-- Top meta row -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F1E2D1]">
        <div class="flex items-center gap-3">
          ${statusBadge}
          <span class="text-xs font-bold text-[#735e5e] uppercase tracking-wider">
            ${item.visitType}
          </span>
        </div>
        <span class="text-xs font-mono font-semibold text-[#810B38] bg-[#FAF6F0] px-2.5 py-1 rounded-lg border border-[#DCC3AA]/50">
          ID: ${item.id}
        </span>
      </div>

      <!-- Main appointment info row -->
      <div class="py-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h3 class="font-serif text-2xl sm:text-3xl font-bold text-[#541A1A]">
            ${escapeHtml(item.service)}
          </h3>
          <div class="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-[#735e5e] mt-2">
            <span class="flex items-center gap-1.5 font-medium text-[#2b1d1d]">
              <i class="fa-regular fa-calendar text-[#810B38]"></i>
              ${item.date}
            </span>
            <span class="flex items-center gap-1.5 font-bold text-[#810B38]">
              <i class="fa-regular fa-clock text-[#810B38]"></i>
              ${item.time}
            </span>
            <span class="flex items-center gap-1.5 text-[#541A1A]">
              <i class="fa-solid fa-location-dot text-[#810B38]"></i>
              ${item.visitType === 'Home Service' ? 'Home Service' : "Nely's Salon (Lagro)"}
            </span>
            ${item.staffName ? `
            <span class="flex items-center gap-1.5 text-[#541A1A] font-semibold bg-[#FAF6F0] px-2 py-0.5 rounded-md border border-[#DCC3AA]">
              <i class="fa-solid fa-scissors text-[#810B38]"></i>
              Stylist: ${escapeHtml(item.staffName)}
            </span>
            ` : ''}
          </div>
        </div>

        <!-- Price display -->
        <div class="md:text-right shrink-0">
          <span class="block text-[11px] uppercase tracking-wider text-[#735e5e] font-semibold">Total Amount</span>
          <span class="font-serif text-2xl sm:text-3xl font-extrabold text-[#810B38]">
            ${item.priceFormatted}
          </span>
          <span class="block text-[11px] text-[#735e5e] mt-0.5">
            Payment: <strong class="text-[#541A1A]">${escapeHtml(item.paymentMethod)}</strong>
          </span>
        </div>
      </div>

      <!-- Note / Status Banner if any -->
      ${noteHtml}

      <!-- Bottom action row -->
      <div class="pt-4 border-t border-[#F1E2D1] flex flex-wrap items-center justify-end gap-3">
        ${actionButtons}
      </div>

    </article>
  `;
}

// 6. Open Appointment Details Modal (Fixed all element IDs)
function openDetailsModal(bookingId) {
  const item = appointmentsData.find(a => a.id === bookingId);
  if (!item) return;

  currentSelectedAppointmentId = bookingId;

  // Set reference ID
  const idEl = document.getElementById('modalDetailId');
  if (idEl) idEl.textContent = `Ref: ${item.id}`;

  // Set Service name
  const serviceEl = document.getElementById('modalDetailService');
  if (serviceEl) serviceEl.textContent = item.service;

  // Set Date & Time
  const dateTimeEl = document.getElementById('modalDetailDateTime');
  if (dateTimeEl) dateTimeEl.textContent = `${item.date} at ${item.time}`;

  // Set Stylist
  const staffEl = document.getElementById('modalDetailStaff');
  if (staffEl) staffEl.textContent = item.staffName || 'Any Available Stylist';

  // Set Customer Name
  const customerEl = document.getElementById('modalDetailCustomer');
  if (customerEl) customerEl.textContent = item.customerName || 'Valued Patron';

  // Set Phone
  const phoneEl = document.getElementById('modalDetailPhone');
  if (phoneEl) phoneEl.textContent = item.contactNumber || '—';

  // Set Visit Type
  const visitTypeEl = document.getElementById('modalDetailVisitType');
  if (visitTypeEl) visitTypeEl.textContent = item.visitType;

  // Set Address
  const addressEl = document.getElementById('modalDetailAddress');
  if (addressEl) addressEl.textContent = item.address;

  // Set Payment
  const paymentEl = document.getElementById('modalDetailPayment');
  if (paymentEl) paymentEl.textContent = `${item.paymentMethod} (${item.paymentStatus})`;

  // Set Total
  const totalEl = document.getElementById('modalDetailTotal');
  if (totalEl) totalEl.textContent = item.priceFormatted;

  // Set Status Badge
  const statusEl = document.getElementById('modalDetailStatus');
  if (statusEl) {
    if (item.status === 'upcoming') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Confirmed</span>`;
    } else if (item.status === 'pending') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300"><span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Pending Review</span>`;
    } else if (item.status === 'completed') {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-[#810B38]/10 text-[#810B38] border border-[#810B38]/30"><i class="fa-solid fa-circle-check"></i> Completed</span>`;
    } else {
      statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-zinc-100 text-zinc-700 border border-zinc-300"><i class="fa-solid fa-ban"></i> Cancelled</span>`;
    }
  }

  const modal = document.getElementById('detailsModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('detailsModal');
  if (modal && typeof modal.close === 'function') {
    modal.close();
  }
}

function openQuickRebookFromModal() {
  if (currentSelectedAppointmentId) {
    openQuickRebookModal(currentSelectedAppointmentId);
  }
}

// 7. Quick Re-book Modal
function openQuickRebookModal(bookingId = null) {
  const targetId = bookingId || currentSelectedAppointmentId;
  const item = appointmentsData.find(a => a.id === targetId);
  if (!item) return;

  currentRebookAppointment = item;
  closeDetailsModal();

  const nameEl = document.getElementById('rebookServiceName');
  if (nameEl) nameEl.textContent = item.service;

  const infoEl = document.getElementById('rebookVisitInfo');
  if (infoEl) infoEl.textContent = `${item.visitType} · ${item.staffName ? 'Stylist: ' + item.staffName : 'Any Available Stylist'}`;

  const priceEl = document.getElementById('rebookServicePrice');
  if (priceEl) priceEl.textContent = item.priceFormatted;

  // Set minimum date to tomorrow
  const dateInput = document.getElementById('rebookDateInput');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const modal = document.getElementById('quickRebookModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeQuickRebookModal() {
  const modal = document.getElementById('quickRebookModal');
  if (modal && typeof modal.close === 'function') {
    modal.close();
  }
}

function selectRebookTime(timeStr, btn) {
  const hiddenInput = document.getElementById('rebookTimeSelected');
  if (hiddenInput) hiddenInput.value = timeStr;

  document.querySelectorAll('.rebook-time-btn').forEach(b => {
    b.className = 'rebook-time-btn py-2 px-3 rounded-xl border border-[#DCC3AA] bg-[#FAF6F0] text-[#541A1A] hover:bg-[#F1E2D1] text-xs font-bold transition-all text-center';
  });

  if (btn) {
    btn.className = 'rebook-time-btn py-2 px-3 rounded-xl border border-[#810B38] bg-[#810B38] text-white text-xs font-bold transition-all text-center';
  }
}

async function handleQuickRebookSubmit(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (!currentRebookAppointment) return;

  const dateInput = document.getElementById('rebookDateInput');
  const timeInput = document.getElementById('rebookTimeSelected');

  const dateVal = dateInput ? dateInput.value : '';
  const timeVal = timeInput ? timeInput.value : '10:00 AM';

  if (!dateVal || !timeVal) {
    showToast('Please select your preferred date and time slot.', 'warning');
    return;
  }

  const submitBtn = document.querySelector('#quickRebookModal button[type="submit"]');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> <span>Booking...</span>';
  }

  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const payload = {
    service_id: currentRebookAppointment.serviceId || 1,
    staff_id: currentRebookAppointment.staffId || null,
    booking_date: dateVal,
    booking_time: timeVal,
    visit_type: currentRebookAppointment.visitType === 'Home Service' ? 'home' : 'salon',
    home_address: currentRebookAppointment.visitType === 'Home Service' ? currentRebookAppointment.address : null,
    payment_method: currentRebookAppointment.paymentMethod.toLowerCase().includes('gcash') ? 'gcash' : 'cash',
    notes: currentRebookAppointment.id ? `Re-booked from Ref: ${currentRebookAppointment.id}` : 'Re-booked appointment'
  };

  try {
    const res = await fetch('../api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.ok && (result.status === 'success' || result.success)) {
      closeQuickRebookModal();
      showToast(`${currentRebookAppointment.service} successfully re-booked!`, 'success');
      await loadCustomerAppointments();
      switchTab('pending');
    } else {
      const msg = result.message || 'Failed to complete re-booking.';
      showToast(msg, 'error');
    }
  } catch (err) {
    console.error('Rebook network error:', err);
    showToast('Failed to connect to booking server.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }
  }
}

// 8. Open Cancel Modal
function openCancelModal(bookingId = null) {
  if (bookingId) {
    currentSelectedAppointmentId = bookingId;
  }
  closeDetailsModal();

  const item = appointmentsData.find(a => a.id === currentSelectedAppointmentId);
  if (item) {
    const cancelRefEl = document.getElementById('cancelModalRef');
    if (cancelRefEl) cancelRefEl.textContent = `Ref: ${item.id} — ${item.service}`;
  }

  const otherContainer = document.getElementById('otherReasonContainer');
  const otherInput = document.getElementById('cancelReasonOther');
  if (otherContainer) otherContainer.classList.add('hidden');
  if (otherInput) otherInput.value = '';

  const reasonSelect = document.getElementById('cancelReasonSelect');
  if (reasonSelect) reasonSelect.value = 'Change of schedule';

  const modal = document.getElementById('cancelModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeCancelModal() {
  const modal = document.getElementById('cancelModal');
  if (modal && typeof modal.close === 'function') {
    modal.close();
  }
}

async function handleConfirmCancellation(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const reasonSelect = document.getElementById('cancelReasonSelect');
  const otherNotes = document.getElementById('cancelReasonOther');

  let finalReason = reasonSelect ? reasonSelect.value : 'Personal reason';
  if (finalReason === 'Other' && otherNotes && otherNotes.value.trim()) {
    finalReason = otherNotes.value.trim();
  }

  const ref = currentSelectedAppointmentId;
  if (!ref) {
    closeCancelModal();
    return;
  }

  const submitBtn = document.querySelector('#cancelModal button[type="submit"]');
  const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> <span>Cancelling...</span>';
  }

  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch(`../api/bookings/${encodeURIComponent(ref)}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: finalReason })
    });

    const result = await res.json();

    if (res.ok && (result.status === 'success' || result.success)) {
      closeCancelModal();
      showToast(`Appointment ${ref} has been cancelled in database.`, 'warning');
      await loadCustomerAppointments();
      switchTab('cancelled');
    } else {
      const errMsg = result.message || 'Could not cancel appointment.';
      showToast(errMsg, 'error');
    }
  } catch (err) {
    console.error('Cancellation error:', err);
    showToast('Server connection failed.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }
  }
}

// 9. Load Sidebar Badge Counters
async function loadSidebarBadgeCounters() {
  const token = localStorage.getItem('nelys_token');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  // Notifications
  try {
    const res = await fetch('../api/notifications', { headers });
    if (res.ok) {
      const json = await res.json();
      if ((json.success || json.status === 'success') && Array.isArray(json.data)) {
        const unreadCount = json.data.filter(n => !n.is_read).length;
        const notifBadge = document.getElementById('sidebarNotificationsBadge');
        if (notifBadge) {
          if (unreadCount > 0) {
            notifBadge.textContent = unreadCount;
            notifBadge.classList.remove('hidden');
          } else {
            notifBadge.classList.add('hidden');
          }
        }
      }
    }
  } catch (_) {}

  // Messages
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

// 10. Contact Salon Modal
function openContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal && typeof modal.close === 'function') {
    modal.close();
  }
}

// 11. Copy text helper
function copyToClipboard(text, message = 'Copied to clipboard!') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(message, 'success');
    });
  } else {
    showToast(message, 'info');
  }
}

// 12. Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    info: 'bg-[#541A1A] text-[#F1E2D1] border-[#810B38]',
    success: 'bg-emerald-800 text-white border-emerald-500',
    warning: 'bg-amber-800 text-white border-amber-500',
    error: 'bg-rose-900 text-white border-rose-500'
  };

  const icons = {
    info: 'fa-solid fa-circle-info text-[#DCC3AA]',
    success: 'fa-solid fa-circle-check text-emerald-300',
    warning: 'fa-solid fa-triangle-exclamation text-amber-300',
    error: 'fa-solid fa-circle-xmark text-rose-300'
  };

  toast.className = `p-4 rounded-2xl shadow-2xl border text-xs font-medium flex items-center gap-3 transition-all duration-300 transform translate-y-3 opacity-0 pointer-events-auto max-w-sm ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info} text-base shrink-0"></i>
    <span class="flex-1">${escapeHtml(message)}</span>
    <button type="button" onclick="this.parentElement.remove()" class="w-5 h-5 rounded-md hover:bg-white/20 flex items-center justify-center text-xs opacity-75 hover:opacity-100">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 13. Mobile Sidebar Drawer Controls
function toggleMobileSidebar(open = null) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!sidebar || !backdrop) return;

  const isOpen = !sidebar.classList.contains('-translate-x-full');
  const shouldOpen = open !== null ? open : !isOpen;

  if (shouldOpen) {
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

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yyyy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const dd = parseInt(parts[2], 10);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[mm - 1]} ${dd}, ${yyyy}`;
  }
  return dateStr;
}

function formatDisplayTime(timeStr) {
  if (!timeStr) return 'Time TBD';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const min = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${min} ${ampm}`;
  }
  return timeStr;
}

// Logout Modal Handlers
function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal && typeof modal.close === 'function') {
    modal.close();
  }
}

function confirmLogout() {
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  sessionStorage.clear();
  showToast('Logging out...', 'info');
  window.location.href = '../login.html';
}

function handleLogout(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  openLogoutModal();
  return false;
}

// Global window bindings for HTML attributes
window.toggleMobileSidebar = toggleMobileSidebar;
window.switchTab = switchTab;
window.openDetailsModal = openDetailsModal;
window.closeDetailsModal = closeDetailsModal;
window.openQuickRebookModal = openQuickRebookModal;
window.openQuickRebookFromModal = openQuickRebookFromModal;
window.closeQuickRebookModal = closeQuickRebookModal;
window.selectRebookTime = selectRebookTime;
window.handleQuickRebookSubmit = handleQuickRebookSubmit;
window.openCancelModal = openCancelModal;
window.closeCancelModal = closeCancelModal;
window.handleConfirmCancellation = handleConfirmCancellation;
window.openContactModal = openContactModal;
window.closeContactModal = closeContactModal;
window.copyToClipboard = copyToClipboard;
window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.handleLogout = handleLogout;
