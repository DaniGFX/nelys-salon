/**
 * Nely's Salon — Customer Appointments Management Script
 * Handles tab switching, dynamic appointment filtering, modal views,
 * appointment cancellation, and re-booking workflows.
 */

// Global appointments data state
let appointmentsData = [
  {
    id: "NS-20260925-0814",
    status: "upcoming", // upcoming (confirmed)
    service: "Brazilian Treatment",
    price: 1999,
    priceFormatted: "₱1,999",
    date: "September 25, 2026",
    time: "10:00 AM",
    customerName: "Maria Santos",
    contactNumber: "0917 888 9999",
    visitType: "Salon Visit",
    address: "BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City",
    paymentMethod: "GCash",
    paymentStatus: "Paid / Verified",
    cancellationReason: null,
    slug: "brazilian"
  },
  {
    id: "NS-20260928-1420",
    status: "pending",
    service: "Hair Dye",
    price: 699,
    priceFormatted: "₱699",
    date: "September 28, 2026",
    time: "2:00 PM",
    customerName: "Maria Santos",
    contactNumber: "0917 888 9999",
    visitType: "Salon Visit",
    address: "BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City",
    paymentMethod: "Cash",
    paymentStatus: "Unpaid (Pay on Visit)",
    cancellationReason: null,
    slug: "hair-dye"
  },
  {
    id: "NS-20260910-1100",
    status: "completed",
    service: "Gel Manicure",
    price: 499,
    priceFormatted: "₱499",
    date: "September 10, 2026",
    time: "11:00 AM",
    customerName: "Maria Santos",
    contactNumber: "0917 888 9999",
    visitType: "Salon Visit",
    address: "BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City",
    paymentMethod: "GCash",
    paymentStatus: "Completed",
    cancellationReason: null,
    slug: "gel-manicure"
  },
  {
    id: "NS-20260820-1330",
    status: "completed",
    service: "Keratine Treatment",
    price: 499,
    priceFormatted: "₱499",
    date: "August 20, 2026",
    time: "1:30 PM",
    customerName: "Maria Santos",
    contactNumber: "0917 888 9999",
    visitType: "Salon Visit",
    address: "BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City",
    paymentMethod: "Cash",
    paymentStatus: "Completed",
    cancellationReason: null,
    slug: "keratine-treatment"
  },
  {
    id: "NS-20260902-1500",
    status: "cancelled",
    service: "Cold Wave & Trim",
    price: 848,
    priceFormatted: "₱848",
    date: "September 02, 2026",
    time: "3:00 PM",
    customerName: "Maria Santos",
    contactNumber: "0917 888 9999",
    visitType: "Salon Visit",
    address: "BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City",
    paymentMethod: "Cash",
    paymentStatus: "Cancelled (No charge)",
    cancellationReason: "Change of schedule",
    cancelledAt: "August 31, 2026",
    slug: "cold-wave"
  }
];

let activeTab = 'upcoming';
let currentSelectedAppointmentId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderAppointments();
  updateTabCounters();
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

  const serviceSlug = item.slug || 'brazilian';
  const actionButtons = `
    <button 
      type="button" 
      onclick="openDetailsModal('${item.id}')"
      class="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#FAF6F0] hover:bg-[#F1E2D1] text-[#541A1A] border border-[#DCC3AA] text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2">
      <i class="fa-solid fa-circle-info text-xs"></i>
      <span>Details</span>
    </button>
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
              ${item.address.includes('Lagro') ? "Nely's Salon (Lagro)" : "Home Service"}
            </span>
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
let currentRebookAppointment = null;

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

function handleQuickRebookSubmit(event) {
  event.preventDefault();
  if (!currentRebookAppointment) return;

  const dateVal = document.getElementById('rebookDateInput').value;
  const timeVal = document.getElementById('rebookTimeSelected').value;

  // Format date nicely (e.g. September 28, 2026)
  const [yyyy, mm, dd] = dateVal.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const formattedDate = `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}, ${yyyy}`;

  // Generate new booking ID
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const newBookingId = `NS-2026${mm}${dd}-${randNum}`;

  const newAppointment = {
    id: newBookingId,
    status: 'upcoming',
    service: currentRebookAppointment.service,
    price: currentRebookAppointment.price,
    priceFormatted: currentRebookAppointment.priceFormatted,
    date: formattedDate,
    time: timeVal,
    customerName: currentRebookAppointment.customerName,
    contactNumber: currentRebookAppointment.contactNumber,
    visitType: currentRebookAppointment.visitType,
    address: currentRebookAppointment.address,
    paymentMethod: currentRebookAppointment.paymentMethod,
    paymentStatus: currentRebookAppointment.paymentMethod === 'Cash' ? 'Pay on Visit' : 'Paid / Verified',
    cancellationReason: null,
    slug: currentRebookAppointment.slug || 'brazilian'
  };

  // Add new appointment to list
  appointmentsData.unshift(newAppointment);

  closeQuickRebookModal();

  // Switch to upcoming tab and refresh UI
  switchTab('upcoming');

  showToast(`${currentRebookAppointment.service} successfully re-booked for ${formattedDate} at ${timeVal}!`, 'success');
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

// 8. Confirm Cancellation Logic
function handleConfirmCancellation(event) {
  event.preventDefault();

  const reasonSelect = document.getElementById('cancelReasonSelect');
  const otherNotes = document.getElementById('cancelReasonOther');

  let finalReason = reasonSelect ? reasonSelect.value : 'Personal reason';
  if (finalReason === 'Other' && otherNotes && otherNotes.value.trim()) {
    finalReason = otherNotes.value.trim();
  }

  const appointment = appointmentsData.find(a => a.id === currentSelectedAppointmentId);
  if (appointment) {
    appointment.status = 'cancelled';
    appointment.cancellationReason = finalReason;
    appointment.cancelledAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    closeCancelModal();
    updateTabCounters();

    // Automatically switch to Cancelled tab to demonstrate the updated status!
    switchTab('cancelled');

    showToast(`Appointment ${appointment.id} has been cancelled.`, 'warning');
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
