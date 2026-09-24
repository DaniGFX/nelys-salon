/**
 * Nely's Salon — Customer Appointments Management Script
 * Handles tab switching, dynamic appointment filtering, modal views,
 * appointment cancellation, and re-booking workflows.
 */

// Global appointments data state
let appointmentsData = [];
let activeTab = 'upcoming';
let currentSelectedAppointmentId = null;
let currentRebookAppointment = null;

document.addEventListener('DOMContentLoaded', () => {
  initPatronProfile();
  setupDialogSteadyListeners();
  loadCustomerAppointments();
});

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

// 1. Fetch appointments from live database
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
      appointmentsData = result.data.map(mapBookingToAppointment);
      updateTabCounters();
      renderAppointments();
    } else {
      console.warn('No active appointments returned from server:', result);
      appointmentsData = [];
      updateTabCounters();
      renderAppointments();
    }
  } catch (err) {
    console.error('Error loading customer appointments from server:', err);
    appointmentsData = [];
    updateTabCounters();
    renderAppointments();
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
    staffName: b.staff_name || null,
    cancellationReason: b.cancellation_reason || null,
    cancelledAt: b.updated_at ? formatDisplayDate(b.updated_at.split(' ')[0]) : null,
    slug: b.service_code || 'brazilian'
  };
}

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

// 2. Tab Navigation Switcher
function switchTab(tabName) {
  activeTab = tabName;

  // Update tab buttons appearance (identical layout dimensions, borders, and font weight to eliminate shifting)
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
      class="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#FAF6F0] hover:bg-[#F1E2D1] text-[#541A1A] border border-[#DCC3AA] text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2">
      <i class="fa-solid fa-circle-info text-xs"></i>
      <span>Details</span>
    </button>
  `;

  if (item.status === 'upcoming' || item.status === 'pending') {
    actionButtons += `
      <button 
        type="button" 
        onclick="openCancelModal('${item.id}')" 
        class="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2">
        <i class="fa-solid fa-calendar-xmark text-xs"></i>
        <span>Cancel</span>
      </button>
    `;
  }

  actionButtons += `
    <button 
      type="button" 
      onclick="openQuickRebookModal('${item.id}')" 
      class="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#810B38] hover:bg-[#62082b] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2">
      <i class="fa-solid fa-repeat text-xs"></i>
      <span>Re-book</span>
    </button>
  `;

  if (item.status === 'upcoming') {
    statusBadge = `
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold tracking-wide">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <i class="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
        <span>CONFIRMED</span>
      </div>
    `;
  } else if (item.status === 'pending') {
    statusBadge = `
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold tracking-wide">
        <i class="fa-solid fa-clock text-amber-600 text-xs"></i>
        <span>PENDING</span>
      </div>
    `;
    noteHtml = `
      <div class="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2 mb-4">
        <i class="fa-solid fa-hourglass-half text-amber-600 shrink-0"></i>
        <span>Waiting for salon confirmation. We will notify you via SMS / Email once approved.</span>
      </div>
    `;
  } else if (item.status === 'completed') {
    statusBadge = `
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold tracking-wide">
        <i class="fa-solid fa-check-double text-blue-600 text-xs"></i>
        <span>COMPLETED</span>
      </div>
    `;
  } else if (item.status === 'cancelled') {
    statusBadge = `
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold tracking-wide">
        <i class="fa-solid fa-ban text-rose-600 text-xs"></i>
        <span>CANCELLED</span>
      </div>
    `;
    if (item.cancellationReason) {
      noteHtml = `
        <div class="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 mb-4">
          <i class="fa-solid fa-circle-exclamation text-rose-600 shrink-0 mt-0.5"></i>
          <div>
            <span class="font-bold">Cancellation Reason:</span> ${escapeHtml(item.cancellationReason)}
            ${item.cancelledAt ? `<span class="block text-[11px] text-rose-700/80 mt-0.5">Cancelled on ${item.cancelledAt}</span>` : ''}
          </div>
        </div>
      `;
    }
  }

  return `
    <article class="bg-white rounded-3xl border border-[#DCC3AA] shadow-sm hover:shadow-md transition-all p-6 sm:p-7 relative overflow-hidden">
      
      <!-- Top header line: Badge & Reference -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F1E2D1]">
        ${statusBadge}
        <span class="text-xs font-mono text-[#735e5e] bg-[#FAF6F0] px-3 py-1 rounded-lg border border-[#E8D9CA]">
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

// 6. Open Appointment Details Modal
function openDetailsModal(bookingId) {
  const item = appointmentsData.find(a => a.id === bookingId);
  if (!item) return;

  currentSelectedAppointmentId = bookingId;

  // Populate modal fields
  document.getElementById('modalDetailId').textContent = item.id;
  document.getElementById('modalDetailService').textContent = item.service;
  document.getElementById('modalDetailDateTime').textContent = `${item.date} at ${item.time}`;
  document.getElementById('modalDetailCustomer').textContent = item.customerName;
  document.getElementById('modalDetailPhone').textContent = item.contactNumber;
  document.getElementById('modalDetailVisitType').textContent = item.visitType;
  document.getElementById('modalDetailAddress').textContent = item.address;
  document.getElementById('modalDetailPayment').textContent = `${item.paymentMethod} (${item.paymentStatus})`;
  document.getElementById('modalDetailTotal').textContent = item.priceFormatted;

  // Stylist row in modal
  const staffRow = document.getElementById('modalDetailStaffRow');
  const staffEl = document.getElementById('modalDetailStaff');
  if (staffRow && staffEl) {
    if (item.staffName) {
      staffEl.textContent = item.staffName;
      staffRow.classList.remove('hidden');
    } else {
      staffRow.classList.add('hidden');
    }
  }

  // Status Badge in modal
  const statusEl = document.getElementById('modalDetailStatus');
  if (statusEl) {
    if (item.status === 'upcoming') {
      statusEl.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800";
      statusEl.innerHTML = `<i class="fa-solid fa-circle-check text-xs text-emerald-600"></i> Confirmed`;
    } else if (item.status === 'pending') {
      statusEl.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800";
      statusEl.innerHTML = `<i class="fa-solid fa-clock text-xs text-amber-600"></i> Pending Review`;
    } else if (item.status === 'completed') {
      statusEl.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800";
      statusEl.innerHTML = `<i class="fa-solid fa-check-double text-xs text-blue-600"></i> Completed`;
    } else if (item.status === 'cancelled') {
      statusEl.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800";
      statusEl.innerHTML = `<i class="fa-solid fa-ban text-xs text-rose-600"></i> Cancelled`;
    }
  }

  const modal = document.getElementById('detailsModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('detailsModal');
  if (modal) modal.close();
}

// 7. Express 1-Step Quick Re-booking System (Without going through steps 1-5)
function openQuickRebookModal(bookingId) {
  const item = appointmentsData.find(a => a.id === bookingId);
  if (!item) return;

  currentRebookAppointment = item;
  closeDetailsModal();

  // Populate quick re-book info
  const nameEl = document.getElementById('rebookServiceName');
  const infoEl = document.getElementById('rebookVisitInfo');
  const priceEl = document.getElementById('rebookServicePrice');
  const dateInput = document.getElementById('rebookDateInput');

  if (nameEl) nameEl.textContent = item.service;
  if (infoEl) infoEl.textContent = `${item.visitType} · Pay via ${item.paymentMethod}`;
  if (priceEl) priceEl.textContent = item.priceFormatted;

  // Set default date to tomorrow in YYYY-MM-DD format
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  // Reset time slot selection
  selectRebookTime('10:00 AM');

  const modal = document.getElementById('quickRebookModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function openQuickRebookFromModal() {
  if (currentSelectedAppointmentId) {
    openQuickRebookModal(currentSelectedAppointmentId);
  }
}

function closeQuickRebookModal() {
  const modal = document.getElementById('quickRebookModal');
  if (modal) modal.close();
}

function selectRebookTime(time, btn = null) {
  const input = document.getElementById('rebookTimeSelected');
  if (input) input.value = time;

  const buttons = document.querySelectorAll('.rebook-time-btn');
  buttons.forEach(b => {
    if (b.textContent.trim() === time) {
      b.className = 'rebook-time-btn py-2 px-3 rounded-xl border border-[#810B38] bg-[#810B38] text-white text-xs font-bold transition-all text-center';
    } else {
      b.className = 'rebook-time-btn py-2 px-3 rounded-xl border border-[#DCC3AA] bg-[#FAF6F0] text-[#541A1A] hover:bg-[#F1E2D1] text-xs font-bold transition-all text-center';
    }
  });
}

async function handleQuickRebookSubmit(event) {
  event.preventDefault();
  if (!currentRebookAppointment) return;

  const dateVal = document.getElementById('rebookDateInput').value;
  const timeVal = document.getElementById('rebookTimeSelected').value;

  // Convert "10:00 AM" to "10:00:00"
  let formattedTime = '10:00:00';
  if (timeVal) {
    const [t, meridiem] = timeVal.split(' ');
    let [hh, mm] = t.split(':');
    let h = parseInt(hh, 10);
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    formattedTime = `${String(h).padStart(2, '0')}:${mm || '00'}:00`;
  }

  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const payload = {
    service_id: currentRebookAppointment.serviceId || 1,
    booking_date: dateVal,
    booking_time: formattedTime,
    visit_type: currentRebookAppointment.visitType === 'Home Service' ? 'home' : 'salon',
    payment_method: currentRebookAppointment.paymentMethod.toLowerCase().includes('gcash') ? 'gcash' : 'cash'
  };

  try {
    const res = await fetch('../api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.ok && result.status === 'success') {
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
  }
}

// 8. Open Cancel Modal
function openCancelModal(bookingId = null) {
  if (bookingId) {
    currentSelectedAppointmentId = bookingId;
  }

  // If details modal was open, close it
  closeDetailsModal();

  const item = appointmentsData.find(a => a.id === currentSelectedAppointmentId);
  const titleRef = document.getElementById('cancelModalRef');
  if (titleRef && item) {
    titleRef.textContent = `Ref: ${item.id} — ${item.service}`;
  }

  const modal = document.getElementById('cancelModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeCancelModal() {
  const modal = document.getElementById('cancelModal');
  if (modal) modal.close();
}

// 8. Confirm Cancellation Logic (Connected to DB API)
async function handleConfirmCancellation(event) {
  event.preventDefault();

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

  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch(`../api/bookings/${ref}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: finalReason })
    });

    const result = await res.json();

    if (res.ok && result.status === 'success') {
      closeCancelModal();
      showToast(`Appointment ${ref} has been cancelled.`, 'warning');
      await loadCustomerAppointments();
      switchTab('cancelled');
    } else {
      const errMsg = result.message || 'Could not cancel appointment.';
      showToast(errMsg, 'error');
    }
  } catch (err) {
    console.error('Cancellation error:', err);
    showToast('Server connection failed.', 'error');
  }
}

// 9. Contact Salon Modal
function openContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal) modal.close();
}

// 10. Copy text helper
function copyToClipboard(text, message = 'Copied to clipboard!') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(message, 'success');
    });
  } else {
    showToast(message, 'info');
  }
}

// 11. Toast System
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
