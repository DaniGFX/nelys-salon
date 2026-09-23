/**
 * Nely's Salon — Customer Profile Management Script
 * Handles profile editing, password changes, saved home service addresses,
 * account statistics, activity timeline, and logout confirmation.
 */

// Profile State
let profileData = {
  fullName: "Maria Santos",
  email: "maria@email.com",
  phone: "0917 888 9999",
  address: "Lagro, Quezon City",
  homeAddresses: [
    {
      id: "ADDR-01",
      tag: "Default Address",
      line1: "Blk 10 Lot 5, Lagro, Quezon City",
      landmark: "Near Lagro Elementary School / Ascension Road",
      isDefault: true
    }
  ],
  stats: {
    totalAppointments: 12,
    completed: 9,
    cancelled: 3,
    totalSpent: "₱6,490"
  },
  activities: [
    {
      icon: "fa-solid fa-circle-check",
      iconColor: "text-emerald-600 bg-emerald-50",
      title: "Completed Brazilian Treatment",
      date: "September 10, 2026",
      note: "Service completed by Stylist Elena"
    },
    {
      icon: "fa-solid fa-calendar-plus",
      iconColor: "text-[#810B38] bg-[#FAF6F0]",
      title: "Booked Gel Manicure",
      date: "September 18, 2026",
      note: "Appointment ref: NS-20260918-024"
    },
    {
      icon: "fa-solid fa-credit-card",
      iconColor: "text-blue-600 bg-blue-50",
      title: "Payment verified",
      date: "September 18, 2026",
      note: "GCash payment of ₱499 confirmed"
    }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  renderProfileInfo();
  renderSavedAddresses();
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

// 2. Render Personal Information
function renderProfileInfo() {
  // Update header and info card
  const displayNames = document.querySelectorAll('.profile-display-name');
  displayNames.forEach(el => el.textContent = profileData.fullName);

  const displayEmails = document.querySelectorAll('.profile-display-email');
  displayEmails.forEach(el => el.textContent = profileData.email);

  const displayPhones = document.querySelectorAll('.profile-display-phone');
  displayPhones.forEach(el => el.textContent = profileData.phone);

  const displayAddrs = document.querySelectorAll('.profile-display-address');
  displayAddrs.forEach(el => el.textContent = profileData.address);

  // Update initials
  const initials = profileData.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarInitials = document.querySelectorAll('.profile-avatar-initials');
  avatarInitials.forEach(el => el.textContent = initials);
}

// 3. Render Saved Addresses
function renderSavedAddresses() {
  const container = document.getElementById('savedAddressList');
  if (!container) return;

  let html = '';
  profileData.homeAddresses.forEach((addr, idx) => {
    html += `
      <div class="p-4 rounded-2xl bg-[#FAF6F0] border border-[#DCC3AA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#810B38] bg-white px-2 py-0.5 rounded-full border border-[#DCC3AA]">
              ${escapeHtml(addr.tag)}
            </span>
          </div>
          <p class="text-xs sm:text-sm font-semibold text-[#541A1A]">
            ${escapeHtml(addr.line1)}
          </p>
          <p class="text-[11px] text-[#735e5e] flex items-center gap-1.5">
            <i class="fa-solid fa-location-dot text-[#810B38]"></i>
            ${escapeHtml(addr.landmark)}
          </p>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button 
            type="button" 
            onclick="openEditAddressModal(${idx})"
            class="px-3.5 py-1.5 rounded-xl bg-white border border-[#DCC3AA] hover:bg-[#F1E2D1] text-[#541A1A] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-pen text-[10px]"></i>
            <span>Edit</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// 4. Edit Profile Modal
function openEditProfileModal() {
  document.getElementById('inputFullName').value = profileData.fullName;
  document.getElementById('inputEmail').value = profileData.email;
  document.getElementById('inputPhone').value = profileData.phone;
  document.getElementById('inputAddress').value = profileData.address;

  const modal = document.getElementById('editProfileModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) modal.close();
}

function handleSaveProfile(event) {
  event.preventDefault();

  const nameVal = document.getElementById('inputFullName').value.trim();
  const emailVal = document.getElementById('inputEmail').value.trim();
  const phoneVal = document.getElementById('inputPhone').value.trim();
  const addrVal = document.getElementById('inputAddress').value.trim();

  if (!nameVal || !emailVal || !phoneVal) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  profileData.fullName = nameVal;
  profileData.email = emailVal;
  profileData.phone = phoneVal;
  if (addrVal) profileData.address = addrVal;

  renderProfileInfo();
  closeEditProfileModal();
  showToast("Personal information updated successfully!", "success");
}

// 5. Change Password Modal & Handlers
function openChangePasswordModal() {
  const currentEl = document.getElementById('modalCurrentPassword');
  const newEl = document.getElementById('modalNewPassword');
  const confirmEl = document.getElementById('modalConfirmPassword');

  if (currentEl) currentEl.value = '';
  if (newEl) newEl.value = '';
  if (confirmEl) confirmEl.value = '';

  const modal = document.getElementById('changePasswordModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.close();
}

function handleModalUpdatePassword(event) {
  event.preventDefault();

  const currentPass = document.getElementById('modalCurrentPassword').value;
  const newPass = document.getElementById('modalNewPassword').value;
  const confirmPass = document.getElementById('modalConfirmPassword').value;

  if (!currentPass) {
    showToast("Please enter your current password.", "error");
    return;
  }

  if (newPass.length < 6) {
    showToast("New password must be at least 6 characters long.", "error");
    return;
  }

  if (newPass !== confirmPass) {
    showToast("New passwords do not match.", "error");
    return;
  }

  closeChangePasswordModal();
  showToast("Password updated successfully!", "success");
}

function handleUpdatePassword(event) {
  event.preventDefault();

  const currentPass = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;

  if (!currentPass) {
    showToast("Please enter your current password.", "error");
    return;
  }

  if (newPass.length < 6) {
    showToast("New password must be at least 6 characters long.", "error");
    return;
  }

  if (newPass !== confirmPass) {
    showToast("New passwords do not match.", "error");
    return;
  }

  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';

  showToast("Password updated successfully!", "success");
}

// 6. Address Modal (Add / Edit)
let currentEditingAddressIndex = null;

function openAddAddressModal() {
  currentEditingAddressIndex = null;
  document.getElementById('addressModalTitle').textContent = "Add New Address";
  document.getElementById('inputAddressTag').value = "Home Service Address";
  document.getElementById('inputAddressLine').value = "";
  document.getElementById('inputAddressLandmark').value = "";

  const modal = document.getElementById('addressModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function openEditAddressModal(index) {
  currentEditingAddressIndex = index;
  const addr = profileData.homeAddresses[index];
  if (!addr) return;

  document.getElementById('addressModalTitle').textContent = "Edit Home Address";
  document.getElementById('inputAddressTag').value = addr.tag;
  document.getElementById('inputAddressLine').value = addr.line1;
  document.getElementById('inputAddressLandmark').value = addr.landmark;

  const modal = document.getElementById('addressModal');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeAddressModal() {
  const modal = document.getElementById('addressModal');
  if (modal) modal.close();
}

function handleSaveAddress(event) {
  event.preventDefault();

  const tagVal = document.getElementById('inputAddressTag').value.trim() || "Saved Address";
  const lineVal = document.getElementById('inputAddressLine').value.trim();
  const landmarkVal = document.getElementById('inputAddressLandmark').value.trim();

  if (!lineVal) {
    showToast("Please enter your full address.", "error");
    return;
  }

  if (currentEditingAddressIndex !== null && profileData.homeAddresses[currentEditingAddressIndex]) {
    profileData.homeAddresses[currentEditingAddressIndex].tag = tagVal;
    profileData.homeAddresses[currentEditingAddressIndex].line1 = lineVal;
    profileData.homeAddresses[currentEditingAddressIndex].landmark = landmarkVal;
    showToast("Address updated successfully!", "success");
  } else {
    profileData.homeAddresses.push({
      id: "ADDR-" + Date.now(),
      tag: tagVal,
      line1: lineVal,
      landmark: landmarkVal,
      isDefault: profileData.homeAddresses.length === 0
    });
    showToast("New home service address added!", "success");
  }

  renderSavedAddresses();
  closeAddressModal();
}

// 7. Logout Modal Controls
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
  showToast("Logging out...", "info");
  setTimeout(() => {
    window.location.href = "../login.html";
  }, 400);
}

// 8. Toggle Password Visibility
function togglePasswordVisibility(fieldId, iconBtn) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  const isPassword = field.type === 'password';
  field.type = isPassword ? 'text' : 'password';

  const icon = iconBtn.querySelector('i');
  if (icon) {
    if (isPassword) {
      icon.className = 'fa-solid fa-eye-slash text-xs text-[#810B38]';
    } else {
      icon.className = 'fa-solid fa-eye text-xs text-[#735e5e]';
    }
  }
}

// 9. Toast System
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
