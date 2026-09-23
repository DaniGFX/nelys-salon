/**
 * Nely's Salon - Customer Dashboard JavaScript
 * Handles navigation drawers, interactive appointment states,
 * cancellation modals, filter controls, and client profile management.
 */

document.addEventListener('DOMContentLoaded', () => {
  initGreeting();
  setupDialogSteadyListeners();
});

// 1. Dynamic Greeting based on time of day
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

// 2. Mobile Sidebar Drawer Toggle
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

// 3. Toggle between Active Upcoming Appointment and Empty State Demo
let isAppointmentActive = true;

function toggleAppointmentState() {
  const activeCard = document.getElementById('activeAppointmentCard');
  const emptyCard = document.getElementById('emptyAppointmentCard');
  const btnLabel = document.getElementById('toggleStateBtnLabel');

  isAppointmentActive = !isAppointmentActive;

  if (isAppointmentActive) {
    activeCard.classList.remove('hidden');
    emptyCard.classList.add('hidden');
    if (btnLabel) btnLabel.textContent = 'Toggle Empty State Demo';
    showToast('Showing active upcoming appointment view.', 'info');
  } else {
    activeCard.classList.add('hidden');
    emptyCard.classList.remove('hidden');
    if (btnLabel) btnLabel.textContent = 'Restore Upcoming Card Demo';
    showToast('Showing empty appointment state view.', 'info');
  }
}

// Steady Background Lock & Modal System
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

    // Dismiss dialog cleanly when clicking backdrop outside dialog card
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

// 4. Appointment Details Modal
function openDetailsModal() {
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

// 5. Cancel Appointment Modal
function openCancelModal() {
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

function confirmCancellation() {
  const reasonSelect = document.getElementById('cancelReason');
  const selectedReason = reasonSelect ? reasonSelect.value : 'personal';

  closeCancelModal();

  // Simulate slot release and status update
  showToast('Your appointment (Ref: NS-20260925-0814) has been cancelled.', 'info');

  // Flip to empty state to reflect the released slot
  setTimeout(() => {
    isAppointmentActive = false;
    document.getElementById('activeAppointmentCard')?.classList.add('hidden');
    document.getElementById('emptyAppointmentCard')?.classList.remove('hidden');
    const btnLabel = document.getElementById('toggleStateBtnLabel');
    if (btnLabel) btnLabel.textContent = 'Restore Upcoming Card Demo';
  }, 1000);
}

// 6. Notifications Modal
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

// 7. Location Modal
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

// 8. Profile Modal & Save
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
  closeProfileModal();
  showToast(`Profile updated successfully for ${name}.`, 'success');
}

// 9. Receipt Modal
function showReceiptModal(ref, service, amount, status) {
  const modal = document.getElementById('receiptModal');
  if (!modal) return;

  const refEl = document.getElementById('receiptRef');
  const serviceEl = document.getElementById('receiptService');
  const amountEl = document.getElementById('receiptAmount');
  const subtotalEl = document.getElementById('receiptSubtotal');
  const statusEl = document.getElementById('receiptStatus');
  const dateEl = document.getElementById('receiptDate');
  const typeEl = document.getElementById('receiptType');

  if (refEl) refEl.textContent = ref || 'NS-20260910-0321';
  if (serviceEl) serviceEl.textContent = service || 'Salon Service';
  
  const formattedAmount = amount ? (amount.startsWith('₱') ? amount : `₱${amount}`) : '₱699.00';
  if (amountEl) amountEl.textContent = formattedAmount;
  if (subtotalEl) subtotalEl.textContent = formattedAmount;
  if (statusEl) statusEl.textContent = (status || 'COMPLETED').toUpperCase();

  if (dateEl) {
    if (ref && ref.includes('0910')) {
      dateEl.textContent = 'Sept. 10, 2026 · 1:30 PM';
    } else if (ref && ref.includes('0822')) {
      dateEl.textContent = 'Aug. 22, 2026 · 3:00 PM';
    } else {
      dateEl.textContent = 'Recent Session';
    }
  }

  if (typeEl) {
    if (service && service.toLowerCase().includes('dye')) {
      typeEl.textContent = 'Home Service';
    } else {
      typeEl.textContent = 'Salon Visit (Lagro, QC)';
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

// 10. Filter Appointments
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

// 11. Smooth Scroll Helper
function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 12. Logout Handler
function handleLogout(e) {
  if (confirm("Are you sure you want to log out of Nely's Salon?")) {
    showToast('Logging out...', 'info');
    return true;
  }
  e.preventDefault();
  return false;
}

// 13. Toast Notification Helper
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
