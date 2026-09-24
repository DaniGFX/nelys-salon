/**
 * Nely's Salon - Customer Dashboard JavaScript
 * Handles live database booking synchronization, interactive appointment cards,
 * cancellation modals, receipts, filters, and client profile management.
 */

let customerBookings = [];
let currentSelectedBooking = null;
let currentCancelBooking = null;

document.addEventListener('DOMContentLoaded', () => {
  initGreeting();
  initPatronProfile();
  setupDialogSteadyListeners();
  loadDashboardAppointments();
});

// 1. Dynamic Greeting based on time of day and patron name
function initGreeting() {
  const greetingEl = document.getElementById('greetingTimeOfDay');
  if (!greetingEl) return;

  const hour = new Date().getHours();
  let greeting = 'Good morning';

  if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour >= 17) {
    greeting = 'Good evening';
  }

  greetingEl.textContent = greeting;
}

function initPatronProfile() {
  const savedUserJson = localStorage.getItem('nelys_user');
  if (!savedUserJson) return;

  try {
    const user = JSON.parse(savedUserJson);
    if (user.full_name) {
      const firstName = user.full_name.split(' ')[0];
      const greetingSpan = document.getElementById('customerGreetingName');
      if (greetingSpan) {
        greetingSpan.textContent = `${firstName}!`;
      }

      const sidebarName = document.querySelector('aside .truncate');
      if (sidebarName) {
        sidebarName.textContent = user.full_name;
      }

      const avatarEl = document.querySelector('aside .w-10.h-10.rounded-full');
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

      // Pre-fill profile modal fields if present
      const profileNameInput = document.getElementById('profileFullName');
      const profilePhoneInput = document.getElementById('profilePhone');
      const profileEmailInput = document.getElementById('profileEmail');
      const profileAddrInput = document.getElementById('profileAddress');

      if (profileNameInput) profileNameInput.value = user.full_name || '';
      if (profilePhoneInput) profilePhoneInput.value = user.phone || '';
      if (profileEmailInput) profileEmailInput.value = user.email || '';
      if (profileAddrInput && user.address) profileAddrInput.value = user.address;
    }
  } catch (e) {
    console.warn('Error reading saved user in dashboard:', e);
  }
}

// 2. Load Bookings from Backend API
async function loadDashboardAppointments() {
  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch('../api/bookings', { headers });
    const result = await res.json();

    if (res.ok && result.status === 'success' && Array.isArray(result.data)) {
      customerBookings = result.data;
      updateDashboardMetrics(customerBookings);
      renderDashboardUpcoming(customerBookings);
      renderDashboardRecentTable(customerBookings);
    } else {
      console.warn('Could not load bookings from server, using local fallback state:', result);
      handleEmptyBookingState();
    }
  } catch (err) {
    console.error('Error fetching dashboard bookings:', err);
    handleEmptyBookingState();
  }
}

function handleEmptyBookingState() {
  const activeCard = document.getElementById('activeAppointmentCard');
  const emptyCard = document.getElementById('emptyAppointmentCard');
  if (activeCard) activeCard.classList.add('hidden');
  if (emptyCard) emptyCard.classList.remove('hidden');
  renderDashboardRecentTable([]);
}

// 3. Update Dashboard Metric Cards
function updateDashboardMetrics(bookings) {
  const upcomingCount = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  const totalSpent = bookings
    .filter(b => b.status === 'completed' || (b.payment_status === 'paid' && b.status !== 'cancelled'))
    .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

  const elUpcoming = document.getElementById('dashMetricUpcoming');
  const elCompleted = document.getElementById('dashMetricCompleted');
  const elCancelled = document.getElementById('dashMetricCancelled');
  const elSpent = document.getElementById('dashMetricSpent');

  if (elUpcoming) elUpcoming.textContent = upcomingCount;
  if (elCompleted) elCompleted.textContent = completedCount;
  if (elCancelled) elCancelled.textContent = cancelledCount;
  if (elSpent) elSpent.textContent = `₱${totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Update sidebar counter for appointments
  const asideAppointmentsBadge = document.querySelector('a[href="appointments.html"] span.ml-auto');
  if (asideAppointmentsBadge) {
    asideAppointmentsBadge.textContent = upcomingCount;
  }
}

// 4. Render Active Next Upcoming Appointment
function renderDashboardUpcoming(bookings) {
  const activeCard = document.getElementById('activeAppointmentCard');
  const emptyCard = document.getElementById('emptyAppointmentCard');
  if (!activeCard || !emptyCard) return;

  // Find next upcoming appointment (pending or confirmed)
  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');

  if (upcomingBookings.length === 0) {
    activeCard.classList.add('hidden');
    emptyCard.classList.remove('hidden');
    return;
  }

  // Sort upcoming chronologically ascending (soonest first)
  upcomingBookings.sort((a, b) => {
    const dtA = new Date(`${a.booking_date}T${a.booking_time || '00:00:00'}`);
    const dtB = new Date(`${b.booking_date}T${b.booking_time || '00:00:00'}`);
    return dtA - dtB;
  });

  const nextBooking = upcomingBookings[0];
  currentSelectedBooking = nextBooking;

  activeCard.classList.remove('hidden');
  emptyCard.classList.add('hidden');

  // Populate fields
  const refEl = document.getElementById('activeBookingRef');
  const statusContainer = document.getElementById('activeBookingStatusContainer');
  const serviceEl = document.getElementById('activeBookingService');
  const categoryEl = document.getElementById('activeBookingCategory');
  const descEl = document.getElementById('activeBookingDescription');
  const dateEl = document.getElementById('activeBookingDate');
  const timeEl = document.getElementById('activeBookingTime');
  const locEl = document.getElementById('activeBookingLocation');
  const paymentEl = document.getElementById('activeBookingPayment');
  const totalEl = document.getElementById('activeBookingTotal');
  const detailsBtn = document.getElementById('activeBookingDetailsBtn');
  const cancelBtn = document.getElementById('activeBookingCancelBtn');

  if (refEl) refEl.textContent = `Ref: ${nextBooking.reference_no}`;
  if (serviceEl) serviceEl.textContent = nextBooking.service_name || 'Salon Treatment';
  if (categoryEl) categoryEl.textContent = nextBooking.service_category || 'Hair & Beauty Care';
  if (descEl) {
    descEl.textContent = nextBooking.notes 
      ? `Notes: ${nextBooking.notes}` 
      : 'Transformative salon treatment with personalized styling and care.';
  }

  if (dateEl) dateEl.textContent = formatDisplayDate(nextBooking.booking_date);
  if (timeEl) timeEl.textContent = formatDisplayTime(nextBooking.booking_time);
  if (locEl) {
    const locText = nextBooking.visit_type === 'home' 
      ? 'Home Service' 
      : "Nely's Salon (Lagro)";
    locEl.textContent = locText;
    locEl.title = locText;
  }

  if (paymentEl) {
    const methodStr = formatPaymentMethod(nextBooking.payment_method);
    paymentEl.innerHTML = `<i class="fa-solid fa-${nextBooking.payment_method === 'gcash' ? 'mobile-screen-button' : 'money-bill-wave'} text-[#810B38]"></i> ${methodStr}`;
  }

  if (totalEl) {
    totalEl.textContent = `₱${parseFloat(nextBooking.total_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  if (statusContainer) {
    if (nextBooking.status === 'confirmed') {
      statusContainer.innerHTML = `
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 text-xs font-bold tracking-wide shadow-sm">
          <i class="fa-solid fa-circle-check text-emerald-300"></i>
          <span>Confirmed</span>
        </div>
      `;
    } else {
      statusContainer.innerHTML = `
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 text-xs font-bold tracking-wide shadow-sm">
          <i class="fa-solid fa-clock text-amber-300"></i>
          <span>Pending Review</span>
        </div>
      `;
    }
  }

  if (detailsBtn) {
    detailsBtn.onclick = () => openDetailsModal(nextBooking.reference_no);
  }
  if (cancelBtn) {
    cancelBtn.onclick = () => openCancelModal(nextBooking.reference_no);
  }
}

// 5. Render Recent Appointments Table & Mobile Cards
function renderDashboardRecentTable(bookings) {
  const tbody = document.getElementById('dashRecentTableBody');
  const mobileContainer = document.getElementById('dashRecentMobileContainer');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-xs text-[#735e5e] italic">
          No appointments found.
        </td>
      </tr>
    `;
    if (mobileContainer) {
      mobileContainer.innerHTML = `
        <div class="p-6 rounded-2xl bg-white border border-[#DCC3AA] text-center text-xs text-[#735e5e] italic">
          No appointments found.
        </div>
      `;
    }
    return;
  }

  let tableHtml = '';
  let mobileHtml = '';

  bookings.forEach(item => {
    const formattedDate = formatDisplayDate(item.booking_date);
    const formattedPrice = `₱${parseFloat(item.total_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const isHome = item.visit_type === 'home';
    const visitBadge = isHome
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold"><i class="fa-solid fa-house-chimney text-[9px] text-amber-600"></i> Home Service</span>`
      : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF6F0] text-[#541A1A] border border-[#DCC3AA]/60 text-[10px] font-semibold"><i class="fa-solid fa-store text-[9px] text-[#810B38]"></i> Salon</span>`;

    let statusBadge = '';
    let actionButton = '';

    if (item.status === 'confirmed') {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Confirmed</span>`;
      actionButton = `<button onclick="openDetailsModal('${item.reference_no}')" class="px-3 py-1.5 rounded-lg bg-[#541A1A] text-[#F1E2D1] hover:bg-[#810B38] hover:text-white transition-colors text-[11px] font-semibold">Details</button>`;
    } else if (item.status === 'pending') {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold"><i class="fa-solid fa-clock text-[9px]"></i> Pending</span>`;
      actionButton = `<button onclick="openDetailsModal('${item.reference_no}')" class="px-3 py-1.5 rounded-lg bg-[#541A1A] text-[#F1E2D1] hover:bg-[#810B38] hover:text-white transition-colors text-[11px] font-semibold">Details</button>`;
    } else if (item.status === 'completed') {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold"><i class="fa-solid fa-check text-[9px]"></i> Completed</span>`;
      actionButton = `<button onclick="showReceiptModal('${item.reference_no}', '${escapeHtml(item.service_name)}', '${formattedPrice}', 'Completed')" class="px-3 py-1.5 rounded-lg bg-white border border-[#DCC3AA] text-[#541A1A] hover:bg-[#FAF6F0] transition-colors text-[11px] font-semibold">Receipt</button>`;
    } else {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold"><i class="fa-solid fa-ban text-[9px]"></i> Cancelled</span>`;
      actionButton = `<button onclick="openDetailsModal('${item.reference_no}')" class="px-3 py-1.5 rounded-lg bg-white border border-[#DCC3AA] text-[#735e5e] hover:bg-[#FAF6F0] transition-colors text-[11px] font-semibold">Details</button>`;
    }

    tableHtml += `
      <tr class="hover:bg-[#FAF6F0]/60 transition-colors">
        <td class="py-4 px-6 font-bold text-[#541A1A] flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-[#FAF6F0] text-[#810B38] flex items-center justify-center text-xs shrink-0 border border-[#DCC3AA]/50">
            <i class="fa-solid fa-spa"></i>
          </div>
          <span>${escapeHtml(item.service_name || 'Salon Service')}</span>
        </td>
        <td class="py-4 px-6 text-[#2b1d1d] font-medium">${formattedDate}</td>
        <td class="py-4 px-6">${visitBadge}</td>
        <td class="py-4 px-6">${statusBadge}</td>
        <td class="py-4 px-6 font-serif font-bold text-sm text-right text-[#810B38]">${formattedPrice}</td>
        <td class="py-4 px-6 text-right">${actionButton}</td>
      </tr>
    `;

    mobileHtml += `
      <div class="p-4 rounded-2xl bg-white border border-[#DCC3AA] shadow-sm space-y-3">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#810B38]">${formattedDate}</span>
            <h4 class="font-bold text-base text-[#541A1A]">${escapeHtml(item.service_name || 'Salon Service')}</h4>
          </div>
          ${statusBadge}
        </div>
        <div class="flex items-center justify-between text-xs pt-2 border-t border-[#F1E2D1]">
          <span class="text-[#735e5e] flex items-center gap-1">
            ${isHome ? '<i class="fa-solid fa-house-chimney text-amber-600"></i> Home Service' : '<i class="fa-solid fa-store text-[#810B38]"></i> Salon Visit'}
          </span>
          <span class="font-serif font-bold text-base text-[#810B38]">${formattedPrice}</span>
        </div>
        <div class="pt-1">
          ${item.status === 'completed' 
            ? `<button type="button" onclick="showReceiptModal('${item.reference_no}', '${escapeHtml(item.service_name)}', '${formattedPrice}', 'Completed')" class="w-full py-2 rounded-xl bg-white border border-[#DCC3AA] text-[#541A1A] text-xs font-bold uppercase tracking-wider hover:bg-[#FAF6F0] transition-colors">View Receipt</button>`
            : `<button type="button" onclick="openDetailsModal('${item.reference_no}')" class="w-full py-2 rounded-xl bg-[#541A1A] text-[#F1E2D1] text-xs font-bold uppercase tracking-wider hover:bg-[#810B38] transition-colors">View Details</button>`
          }
        </div>
      </div>
    `;
  });

  tbody.innerHTML = tableHtml;
  if (mobileContainer) mobileContainer.innerHTML = mobileHtml;
}

// 6. Appointment Details Modal
function openDetailsModal(ref) {
  let booking = null;
  if (ref) {
    booking = customerBookings.find(b => b.reference_no === ref || String(b.id) === String(ref));
  }
  if (!booking) {
    booking = currentSelectedBooking;
  }
  if (!booking) return;

  currentSelectedBooking = booking;

  const refEl = document.getElementById('detailModalRef');
  const serviceEl = document.getElementById('detailModalService');
  const catEl = document.getElementById('detailModalCategory');
  const durationEl = document.getElementById('detailModalDuration');
  const dateEl = document.getElementById('detailModalDate');
  const timeEl = document.getElementById('detailModalTime');
  const locEl = document.getElementById('detailModalLocation');
  const methodEl = document.getElementById('detailModalMethod');
  const statusEl = document.getElementById('detailModalPaymentStatus');
  const totalEl = document.getElementById('detailModalTotal');
  const cancelBtn = document.getElementById('detailModalCancelBtn');

  if (refEl) refEl.textContent = `Ref: ${booking.reference_no}`;
  if (serviceEl) serviceEl.textContent = booking.service_name || 'Salon Treatment';
  if (catEl) catEl.textContent = booking.service_category || 'Hair & Beauty Care';
  if (durationEl) durationEl.textContent = '60-120 Minutes';
  if (dateEl) dateEl.textContent = formatDisplayDate(booking.booking_date);
  if (timeEl) timeEl.textContent = formatDisplayTime(booking.booking_time);
  if (locEl) {
    locEl.textContent = booking.visit_type === 'home'
      ? (booking.home_address ? `Home Service (${booking.home_address})` : 'Home Service')
      : "Nely's Salon (Lagro, QC)";
  }

  if (methodEl) {
    methodEl.textContent = formatPaymentMethod(booking.payment_method);
  }

  if (statusEl) {
    const isPaid = booking.payment_status === 'paid';
    statusEl.className = isPaid 
      ? "inline-flex items-center gap-1 text-emerald-700 font-bold" 
      : "inline-flex items-center gap-1 text-amber-700 font-bold";
    statusEl.innerHTML = isPaid 
      ? '<i class="fa-solid fa-circle-check text-[10px]"></i> Paid / Verified'
      : '<i class="fa-solid fa-clock text-[10px]"></i> Payment Pending';
  }

  if (totalEl) {
    totalEl.textContent = `₱${parseFloat(booking.total_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Adjust Cancel button visibility if completed/cancelled
  if (cancelBtn) {
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      cancelBtn.classList.add('hidden');
    } else {
      cancelBtn.classList.remove('hidden');
      cancelBtn.onclick = () => {
        closeDetailsModal();
        openCancelModal(booking.reference_no);
      };
    }
  }

  const modal = document.getElementById('detailsModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('detailsModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

// 7. Cancel Appointment Modal & Live API Cancel
function openCancelModal(ref) {
  let booking = null;
  if (ref) {
    booking = customerBookings.find(b => b.reference_no === ref || String(b.id) === String(ref));
  }
  if (!booking) {
    booking = currentSelectedBooking;
  }
  if (!booking) return;

  currentCancelBooking = booking;

  const serviceEl = document.getElementById('cancelModalService');
  const dtEl = document.getElementById('cancelModalDateTime');

  if (serviceEl) serviceEl.textContent = booking.service_name || 'Appointment';
  if (dtEl) dtEl.textContent = `${formatDisplayDate(booking.booking_date)} at ${formatDisplayTime(booking.booking_time)}`;

  const modal = document.getElementById('cancelModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeCancelModal() {
  const modal = document.getElementById('cancelModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

async function confirmCancellation() {
  if (!currentCancelBooking) {
    closeCancelModal();
    return;
  }

  const reasonSelect = document.getElementById('cancelReason');
  const selectedReason = reasonSelect ? reasonSelect.options[reasonSelect.selectedIndex].text : 'Personal Reason';
  const submitBtn = document.getElementById('cancelModalSubmitBtn');

  const ref = currentCancelBooking.reference_no;
  const originalText = submitBtn ? submitBtn.innerHTML : 'Confirm Cancel';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Cancelling...';
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
      body: JSON.stringify({ reason: selectedReason })
    });

    const result = await res.json();

    if (res.ok && result.status === 'success') {
      showToast(`Appointment (${ref}) has been cancelled successfully.`, 'info');
      closeCancelModal();
      await loadDashboardAppointments();
    } else {
      const errMsg = result.message || 'Unable to cancel appointment at this time.';
      showToast(errMsg, 'error');
    }
  } catch (err) {
    console.error('Cancellation network error:', err);
    showToast('Failed to reach server. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

// 8. Notifications Modal
function openNotificationsModal() {
  const modal = document.getElementById('notificationsModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeNotificationsModal() {
  const modal = document.getElementById('notificationsModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

// 9. Location Modal
function openLocationModal() {
  const modal = document.getElementById('locationModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeLocationModal() {
  const modal = document.getElementById('locationModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

// 10. Profile Modal & Save
function openProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
    lockBodyScroll();
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.close();
  unlockBodyScroll();
}

function handleProfileSave(e) {
  e.preventDefault();
  const name = document.getElementById('profileFullName')?.value || 'Client';
  const savedUserJson = localStorage.getItem('nelys_user');
  if (savedUserJson) {
    try {
      const user = JSON.parse(savedUserJson);
      user.full_name = name;
      user.phone = document.getElementById('profilePhone')?.value || user.phone;
      user.email = document.getElementById('profileEmail')?.value || user.email;
      user.address = document.getElementById('profileAddress')?.value || user.address;
      localStorage.setItem('nelys_user', JSON.stringify(user));
      initPatronProfile();
    } catch (err) {
      console.warn('Error updating profile in storage:', err);
    }
  }
  closeProfileModal();
  showToast(`Profile updated successfully for ${name}.`, 'success');
}

// 11. Receipt Modal
function showReceiptModal(ref, service, amount, status) {
  const modal = document.getElementById('receiptModal');
  if (!modal) return;

  const booking = customerBookings.find(b => b.reference_no === ref);

  const refEl = document.getElementById('receiptRef');
  const serviceEl = document.getElementById('receiptService');
  const amountEl = document.getElementById('receiptAmount');
  const subtotalEl = document.getElementById('receiptSubtotal');
  const statusEl = document.getElementById('receiptStatus');
  const dateEl = document.getElementById('receiptDate');
  const typeEl = document.getElementById('receiptType');
  const customerEl = document.getElementById('receiptCustomer');
  const methodEl = document.getElementById('receiptMethod');

  const savedUser = localStorage.getItem('nelys_user');
  let clientName = 'Valued Client';
  if (savedUser) {
    try { clientName = JSON.parse(savedUser).full_name || clientName; } catch (e) {}
  }

  if (customerEl) customerEl.textContent = clientName;
  if (refEl) refEl.textContent = ref || (booking ? booking.reference_no : '--');
  if (serviceEl) serviceEl.textContent = service || (booking ? booking.service_name : 'Salon Service');
  
  const formattedAmount = amount ? (amount.startsWith('₱') ? amount : `₱${amount}`) : (booking ? `₱${parseFloat(booking.total_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00');
  if (amountEl) amountEl.textContent = formattedAmount;
  if (subtotalEl) subtotalEl.textContent = formattedAmount;
  if (statusEl) statusEl.textContent = (status || (booking ? booking.status : 'COMPLETED')).toUpperCase();

  if (dateEl) {
    if (booking) {
      dateEl.textContent = `${formatDisplayDate(booking.booking_date)} · ${formatDisplayTime(booking.booking_time)}`;
    } else {
      dateEl.textContent = '--';
    }
  }

  if (typeEl) {
    if (booking) {
      typeEl.textContent = booking.visit_type === 'home' ? 'Home Service' : 'Salon Visit (Lagro, QC)';
    } else {
      typeEl.textContent = 'Salon Visit (Lagro, QC)';
    }
  }

  if (methodEl) {
    if (booking) {
      methodEl.textContent = formatPaymentMethod(booking.payment_method);
    } else {
      methodEl.textContent = 'Pay on Visit';
    }
  }

  lockBodyScroll();
  modal.showModal();
}

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (!modal) return;
  modal.close();
  unlockBodyScroll();
}

function printCustomerReceipt() {
  window.print();
}

// 12. Filter Appointments in Table
function filterAppointments(filterValue) {
  const rows = document.querySelectorAll('#recent-appointments-section table tbody tr');
  rows.forEach(row => {
    if (filterValue === 'all') {
      row.style.display = '';
    } else {
      const statusCell = row.children[3]?.textContent.toLowerCase() || '';
      if (statusCell.includes(filterValue.toLowerCase())) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
}

// 13. Helpers: Date / Time / Formatting
function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yyyy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const dd = parseInt(parts[2], 10);
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
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

function formatPaymentMethod(method) {
  if (!method) return 'Cash (Pay on Visit)';
  const m = method.toLowerCase();
  if (m.includes('gcash')) return 'GCash';
  if (m.includes('bank')) return 'Bank Transfer';
  return 'Cash (Pay on Visit)';
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

// 14. Mobile Sidebar Drawer Toggle
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
    lockBodyScroll();
  } else {
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    unlockBodyScroll();
  }
}

// 15. Steady Background Lock & Modal Listeners
let isCustomerModalScrollLocked = false;

function onPreventCustomerBackgroundWheel(e) {
  const scrollable = e.target.closest('dialog, .overflow-y-auto');
  if (scrollable) {
    const isScrollingDown = e.deltaY > 0;
    const canScrollDown = scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 1;
    const canScrollUp = scrollable.scrollTop > 0;

    if ((isScrollingDown && canScrollDown) || (!isScrollingDown && canScrollUp)) {
      return;
    }
  }
  e.preventDefault();
}

function onPreventCustomerBackgroundTouch(e) {
  const scrollable = e.target.closest('dialog, .overflow-y-auto');
  if (!scrollable) {
    e.preventDefault();
  }
}

function onPreventCustomerBackgroundKeys(e) {
  const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (scrollKeys.includes(e.key)) {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (!isInput) {
      e.preventDefault();
    }
  }
}

function lockBodyScroll() {
  if (isCustomerModalScrollLocked) return;
  isCustomerModalScrollLocked = true;
  document.body.classList.add('modal-open');
  window.addEventListener('wheel', onPreventCustomerBackgroundWheel, { passive: false });
  window.addEventListener('touchmove', onPreventCustomerBackgroundTouch, { passive: false });
  window.addEventListener('keydown', onPreventCustomerBackgroundKeys, { passive: false });
}

function unlockBodyScroll() {
  const anyOpen = document.querySelector('dialog[open], .fixed.inset-0.z-50.flex');
  if (anyOpen) return;

  isCustomerModalScrollLocked = false;
  document.body.classList.remove('modal-open');
  window.removeEventListener('wheel', onPreventCustomerBackgroundWheel);
  window.removeEventListener('touchmove', onPreventCustomerBackgroundTouch);
  window.removeEventListener('keydown', onPreventCustomerBackgroundKeys);
}

function setupDialogSteadyListeners() {
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('close', () => unlockBodyScroll());
    dlg.addEventListener('cancel', () => unlockBodyScroll());

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
        unlockBodyScroll();
      }
    });
  });
}

// 16. Logout Handler
function handleLogout(e) {
  if (confirm("Are you sure you want to log out of Nely's Salon?")) {
    localStorage.removeItem('nelys_token');
    localStorage.removeItem('nelys_user');
    showToast('Logging out...', 'info');
    return true;
  }
  e.preventDefault();
  return false;
}

// 17. Toast Notification Helper
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
