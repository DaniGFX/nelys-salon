/**
 * Nely's Salon — Admin Settings Controller
 * Handles general salon configuration:
 * 1. Salon Information (Name, Address, Phone, Email, Description)
 * 2. Business Hours (7 Days, Status, Opening & Closing time pickers)
 * 3. Appointment Settings (Duration, Advance Booking, Min Notice, Max per slot, Auto-confirm, Cancellation)
 * 4. Payment Settings (Cash, GCash, Bank Transfer, Other)
 * 5. Notification Preferences (New Appt, Cancel, Reschedule, Payment, Customer, System Updates)
 * 6. Account & Security (Admin Name, Email, Change Password modal with visibility toggles)
 * 7. System Preferences (Language, Currency, Timezone, Date Format)
 * 8. Danger Zone (Deactivate Salon System confirmation modal, Delete Account confirmation modal)
 */

// ================= STORAGE KEYS =================
const SETTINGS_STORAGE_KEY = 'nelys_admin_settings_data';

// ================= DEFAULT SETTINGS DATA =================
const DEFAULT_SETTINGS = {
  salonInfo: {
    name: "Nely's Salon",
    address: "BLK 42 Lot 12, Sacred Heart Village, Greater Lagro, Novaliches, Quezon City, Metro Manila",
    phone: "0917 888 9999",
    email: "nelyssalon@email.com",
    description: "15 years of providing quality salon services to our customers."
  },
  businessHours: [
    { day: "Monday", open: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Tuesday", open: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Wednesday", open: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Thursday", open: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Friday", open: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Saturday", open: true, openTime: "09:00", closeTime: "18:00" },
    { day: "Sunday", open: false, openTime: "", closeTime: "" }
  ],
  appointmentSettings: {
    duration: "30",
    advanceDays: 30,
    minNoticeHours: 2,
    maxPerSlot: 3,
    autoConfirm: false,
    allowCancellation: true,
    cancelNoticeHours: 2
  },
  paymentSettings: {
    cash: true,
    gcash: true,
    bankTransfer: false,
    other: false,
    gcashNumber: "0917 888 9999",
    gcashName: "Nely D."
  },
  notifications: {
    newAppt: true,
    apptCancel: true,
    apptResched: true,
    payReceived: true,
    newCustomer: true,
    systemUpdates: true
  },
  account: {
    name: "Admin",
    email: "admin@nelyssalon.com",
    password: "password123"
  },
  systemPreferences: {
    language: "English",
    currency: "PHP (₱)",
    timezone: "Asia/Manila",
    dateFormat: "MM/DD/YYYY"
  },
  isDeactivated: false
};

// In-memory state
let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

// ================= STORAGE INITIALIZATION =================
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with default to guarantee all nested structures exist
      settings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        salonInfo: { ...DEFAULT_SETTINGS.salonInfo, ...(parsed.salonInfo || {}) },
        appointmentSettings: { ...DEFAULT_SETTINGS.appointmentSettings, ...(parsed.appointmentSettings || {}) },
        paymentSettings: { ...DEFAULT_SETTINGS.paymentSettings, ...(parsed.paymentSettings || {}) },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
        account: { ...DEFAULT_SETTINGS.account, ...(parsed.account || {}) },
        systemPreferences: { ...DEFAULT_SETTINGS.systemPreferences, ...(parsed.systemPreferences || {}) },
        businessHours: (parsed.businessHours && parsed.businessHours.length === 7) 
          ? parsed.businessHours 
          : DEFAULT_SETTINGS.businessHours
      };
    } else {
      settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      saveSettings(false);
    }
  } catch (err) {
    console.error('Failed to parse settings from storage:', err);
    settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

function saveSettings(notify = true, message = 'Settings updated successfully!') {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    if (notify) {
      showToast(message, 'success');
    }
  } catch (err) {
    console.error('Failed to write settings to storage:', err);
    if (notify) {
      showToast('Error saving settings.', 'error');
    }
  }
}

// ================= DOM CONTENT LOADED =================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  populateSalonInfo();
  renderBusinessHoursTable();
  populateAppointmentSettings();
  populatePaymentSettings();
  populateNotificationPreferences();
  populateAccountSettings();
  populateSystemPreferences();
  updateSystemDeactivatedUI();
  updateTimeBadge();
});

// ================= 2. SALON INFORMATION =================
function populateSalonInfo() {
  const info = settings.salonInfo;
  const nameEl = document.getElementById('settingSalonName');
  const addressEl = document.getElementById('settingSalonAddress');
  const phoneEl = document.getElementById('settingSalonPhone');
  const emailEl = document.getElementById('settingSalonEmail');
  const descEl = document.getElementById('settingSalonDesc');

  if (nameEl) nameEl.value = info.name || '';
  if (addressEl) addressEl.value = info.address || '';
  if (phoneEl) phoneEl.value = info.phone || '';
  if (emailEl) emailEl.value = info.email || '';
  if (descEl) descEl.value = info.description || '';
}

function handleSaveSalonInfo(event) {
  if (event) event.preventDefault();

  const name = document.getElementById('settingSalonName')?.value.trim();
  const address = document.getElementById('settingSalonAddress')?.value.trim();
  const phone = document.getElementById('settingSalonPhone')?.value.trim();
  const email = document.getElementById('settingSalonEmail')?.value.trim();
  const desc = document.getElementById('settingSalonDesc')?.value.trim();

  if (!name) {
    showToast('Please enter a valid Salon Name.', 'error');
    return;
  }

  settings.salonInfo = {
    name: name || DEFAULT_SETTINGS.salonInfo.name,
    address: address || DEFAULT_SETTINGS.salonInfo.address,
    phone: phone || DEFAULT_SETTINGS.salonInfo.phone,
    email: email || DEFAULT_SETTINGS.salonInfo.email,
    description: desc || DEFAULT_SETTINGS.salonInfo.description
  };

  saveSettings(true, 'Salon information saved successfully!');
}

// ================= 3. BUSINESS HOURS =================
function renderBusinessHoursTable() {
  const container = document.getElementById('businessHoursTbody');
  if (!container) return;

  container.innerHTML = settings.businessHours.map((bh, idx) => {
    const isOpen = bh.open;
    const statusBadge = isOpen
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
           Open
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
           <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
           Closed
         </span>`;

    return `
      <tr class="border-b border-stone-100 hover:bg-[#FAF6F0]/40 transition-colors">
        <!-- Day -->
        <td class="py-3.5 px-4 font-serif font-bold text-sm text-[#541A1A]">
          ${bh.day}
        </td>

        <!-- Status Toggle -->
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-3">
            <button 
              type="button" 
              onclick="toggleDayOpen(${idx})"
              class="w-11 h-6 rounded-full transition-colors relative focus:outline-none ${isOpen ? 'bg-[#810B38]' : 'bg-stone-300'}"
              role="switch" 
              aria-checked="${isOpen}"
              title="Toggle ${bh.day} Open/Closed">
              <span class="block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${isOpen ? 'translate-x-5' : 'translate-x-0.5'} top-0.5 relative"></span>
            </button>
            ${statusBadge}
          </div>
        </td>

        <!-- Opening Time -->
        <td class="py-3.5 px-4">
          ${isOpen ? `
            <input 
              type="time" 
              value="${bh.openTime || '09:00'}" 
              onchange="updateDayHours(${idx}, 'openTime', this.value)"
              class="px-3 py-1.5 rounded-xl border border-[#DCC3AA] text-xs font-mono text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#810B38] bg-white">
          ` : `
            <span class="text-xs text-stone-400 font-mono italic">—</span>
          `}
        </td>

        <!-- Closing Time -->
        <td class="py-3.5 px-4">
          ${isOpen ? `
            <input 
              type="time" 
              value="${bh.closeTime || '18:00'}" 
              onchange="updateDayHours(${idx}, 'closeTime', this.value)"
              class="px-3 py-1.5 rounded-xl border border-[#DCC3AA] text-xs font-mono text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#810B38] bg-white">
          ` : `
            <span class="text-xs text-stone-400 font-mono italic">—</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

function toggleDayOpen(idx) {
  if (settings.businessHours[idx]) {
    const willOpen = !settings.businessHours[idx].open;
    settings.businessHours[idx].open = willOpen;
    if (willOpen && !settings.businessHours[idx].openTime) {
      settings.businessHours[idx].openTime = "09:00";
      settings.businessHours[idx].closeTime = "18:00";
    }
    renderBusinessHoursTable();
  }
}

function updateDayHours(idx, field, val) {
  if (settings.businessHours[idx]) {
    settings.businessHours[idx][field] = val;
  }
}

function handleSaveBusinessHours(event) {
  if (event) event.preventDefault();
  saveSettings(true, 'Business hours schedule updated successfully!');
}

// ================= 4. APPOINTMENT SETTINGS =================
function populateAppointmentSettings() {
  const appt = settings.appointmentSettings;

  const durationEl = document.getElementById('settingApptDuration');
  const advanceEl = document.getElementById('settingAdvanceBooking');
  const noticeEl = document.getElementById('settingMinNotice');
  const maxSlotEl = document.getElementById('settingMaxPerSlot');
  const autoConfEl = document.getElementById('settingAutoConfirm');
  const cancelAllowEl = document.getElementById('settingAllowCancel');
  const cancelNoticeEl = document.getElementById('settingCancelNotice');

  if (durationEl) durationEl.value = appt.duration || '30';
  if (advanceEl) advanceEl.value = appt.advanceDays || 30;
  if (noticeEl) noticeEl.value = appt.minNoticeHours || 2;
  if (maxSlotEl) maxSlotEl.value = appt.maxPerSlot || 3;
  if (autoConfEl) autoConfEl.checked = !!appt.autoConfirm;
  if (cancelAllowEl) cancelAllowEl.checked = !!appt.allowCancellation;
  if (cancelNoticeEl) cancelNoticeEl.value = appt.cancelNoticeHours || 2;
}

function handleSaveAppointmentSettings(event) {
  if (event) event.preventDefault();

  settings.appointmentSettings = {
    duration: document.getElementById('settingApptDuration')?.value || '30',
    advanceDays: parseInt(document.getElementById('settingAdvanceBooking')?.value, 10) || 30,
    minNoticeHours: parseInt(document.getElementById('settingMinNotice')?.value, 10) || 2,
    maxPerSlot: parseInt(document.getElementById('settingMaxPerSlot')?.value, 10) || 3,
    autoConfirm: !!document.getElementById('settingAutoConfirm')?.checked,
    allowCancellation: !!document.getElementById('settingAllowCancel')?.checked,
    cancelNoticeHours: parseInt(document.getElementById('settingCancelNotice')?.value, 10) || 2
  };

  saveSettings(true, 'Appointment rules & policies saved successfully!');
}

// ================= 5. PAYMENT SETTINGS =================
function populatePaymentSettings() {
  const pay = settings.paymentSettings;

  const cashEl = document.getElementById('settingPayCash');
  const gcashEl = document.getElementById('settingPayGcash');
  const bankEl = document.getElementById('settingPayBank');
  const otherEl = document.getElementById('settingPayOther');
  const gcashNumEl = document.getElementById('settingGcashNumber');
  const gcashNameEl = document.getElementById('settingGcashName');

  if (cashEl) cashEl.checked = !!pay.cash;
  if (gcashEl) gcashEl.checked = !!pay.gcash;
  if (bankEl) bankEl.checked = !!pay.bankTransfer;
  if (otherEl) otherEl.checked = !!pay.other;
  if (gcashNumEl) gcashNumEl.value = pay.gcashNumber || '';
  if (gcashNameEl) gcashNameEl.value = pay.gcashName || '';
}

function handleSavePaymentSettings(event) {
  if (event) event.preventDefault();

  settings.paymentSettings = {
    cash: !!document.getElementById('settingPayCash')?.checked,
    gcash: !!document.getElementById('settingPayGcash')?.checked,
    bankTransfer: !!document.getElementById('settingPayBank')?.checked,
    other: !!document.getElementById('settingPayOther')?.checked,
    gcashNumber: document.getElementById('settingGcashNumber')?.value.trim() || '0917 888 9999',
    gcashName: document.getElementById('settingGcashName')?.value.trim() || 'Nely D.'
  };

  saveSettings(true, 'Payment methods and details saved successfully!');
}

// ================= 6. NOTIFICATION PREFERENCES =================
function populateNotificationPreferences() {
  const notif = settings.notifications;

  const newApptEl = document.getElementById('prefNewAppt');
  const cancelEl = document.getElementById('prefApptCancel');
  const reschedEl = document.getElementById('prefApptResched');
  const payRecEl = document.getElementById('prefPayReceived');
  const newCustEl = document.getElementById('prefNewCustomer');
  const sysUpdatesEl = document.getElementById('prefSystemUpdates');

  if (newApptEl) newApptEl.checked = !!notif.newAppt;
  if (cancelEl) cancelEl.checked = !!notif.apptCancel;
  if (reschedEl) reschedEl.checked = !!notif.apptResched;
  if (payRecEl) payRecEl.checked = !!notif.payReceived;
  if (newCustEl) newCustEl.checked = !!notif.newCustomer;
  if (sysUpdatesEl) sysUpdatesEl.checked = !!notif.systemUpdates;
}

function handleSaveNotificationPreferences(event) {
  if (event) event.preventDefault();

  settings.notifications = {
    newAppt: !!document.getElementById('prefNewAppt')?.checked,
    apptCancel: !!document.getElementById('prefApptCancel')?.checked,
    apptResched: !!document.getElementById('prefApptResched')?.checked,
    payReceived: !!document.getElementById('prefPayReceived')?.checked,
    newCustomer: !!document.getElementById('prefNewCustomer')?.checked,
    systemUpdates: !!document.getElementById('prefSystemUpdates')?.checked
  };

  saveSettings(true, 'Notification preferences updated!');
}

// ================= 7. ACCOUNT & SECURITY =================
function populateAccountSettings() {
  const acc = settings.account;
  const nameEl = document.getElementById('settingAccountName');
  const emailEl = document.getElementById('settingAccountEmail');

  if (nameEl) nameEl.value = acc.name || 'Admin';
  if (emailEl) emailEl.value = acc.email || 'admin@nelyssalon.com';
}

function handleSaveAccountSettings(event) {
  if (event) event.preventDefault();

  const name = document.getElementById('settingAccountName')?.value.trim();
  const email = document.getElementById('settingAccountEmail')?.value.trim();

  if (!name || !email) {
    showToast('Name and Email are required.', 'error');
    return;
  }

  settings.account.name = name;
  settings.account.email = email;

  saveSettings(true, 'Admin profile details saved!');
}

// Password Form & Modal
function openChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) {
    // Clear inputs
    const curr = document.getElementById('modalCurrentPassword');
    const newP = document.getElementById('modalNewPassword');
    const confP = document.getElementById('modalConfirmPassword');
    if (curr) curr.value = '';
    if (newP) newP.value = '';
    if (confP) confP.value = '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function togglePasswordVisibility(fieldId, iconId) {
  const input = document.getElementById(fieldId);
  const icon = document.getElementById(iconId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (icon) {
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    }
  } else {
    input.type = 'password';
    if (icon) {
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }
}

function handleUpdatePassword(event) {
  if (event) event.preventDefault();

  const curr = document.getElementById('modalCurrentPassword')?.value || '';
  const newP = document.getElementById('modalNewPassword')?.value || '';
  const confP = document.getElementById('modalConfirmPassword')?.value || '';

  if (!curr) {
    showToast('Please enter your current password.', 'error');
    return;
  }

  if (newP.length < 6) {
    showToast('New password must be at least 6 characters.', 'error');
    return;
  }

  if (newP !== confP) {
    showToast('New password and confirmation do not match.', 'error');
    return;
  }

  // Save new password
  settings.account.password = newP;
  saveSettings(false);
  closeChangePasswordModal();
  showToast('Password updated successfully!', 'success');
}

// ================= 8. SYSTEM PREFERENCES =================
function populateSystemPreferences() {
  const pref = settings.systemPreferences;

  const langEl = document.getElementById('settingSysLanguage');
  const currEl = document.getElementById('settingSysCurrency');
  const tzEl = document.getElementById('settingSysTimezone');
  const dateFmtEl = document.getElementById('settingSysDateFormat');

  if (langEl) langEl.value = pref.language || 'English';
  if (currEl) currEl.value = pref.currency || 'PHP (₱)';
  if (tzEl) tzEl.value = pref.timezone || 'Asia/Manila';
  if (dateFmtEl) dateFmtEl.value = pref.dateFormat || 'MM/DD/YYYY';
}

function handleSaveSystemPreferences(event) {
  if (event) event.preventDefault();

  settings.systemPreferences = {
    language: document.getElementById('settingSysLanguage')?.value || 'English',
    currency: document.getElementById('settingSysCurrency')?.value || 'PHP (₱)',
    timezone: document.getElementById('settingSysTimezone')?.value || 'Asia/Manila',
    dateFormat: document.getElementById('settingSysDateFormat')?.value || 'MM/DD/YYYY'
  };

  saveSettings(true, 'System regional & localization preferences saved!');
}

// ================= 9. DANGER ZONE =================
function openDeactivateModal() {
  const modal = document.getElementById('deactivateSystemModal');
  if (modal) {
    const confirmInput = document.getElementById('deactivateConfirmInput');
    if (confirmInput) confirmInput.value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDeactivateModal() {
  const modal = document.getElementById('deactivateSystemModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleConfirmDeactivate() {
  const input = document.getElementById('deactivateConfirmInput')?.value.trim();
  if (input !== 'DEACTIVATE') {
    showToast('Please type DEACTIVATE to confirm.', 'error');
    return;
  }

  settings.isDeactivated = true;
  saveSettings(false);
  closeDeactivateModal();
  updateSystemDeactivatedUI();
  showToast('Salon booking system has been deactivated.', 'info');
}

function handleReactivateSystem() {
  settings.isDeactivated = false;
  saveSettings(false);
  updateSystemDeactivatedUI();
  showToast('Salon booking system is now active and accepting appointments!', 'success');
}

function updateSystemDeactivatedUI() {
  const banner = document.getElementById('deactivatedBanner');
  const statusBadge = document.getElementById('systemStatusBadge');

  if (settings.isDeactivated) {
    if (banner) banner.classList.remove('hidden');
    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
          Maintenance Mode
        </span>
      `;
    }
  } else {
    if (banner) banner.classList.add('hidden');
    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          System Operational
        </span>
      `;
    }
  }
}

function openDeleteAccountModal() {
  const modal = document.getElementById('deleteAccountModal');
  if (modal) {
    const input = document.getElementById('deleteConfirmInput');
    if (input) input.value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeDeleteAccountModal() {
  const modal = document.getElementById('deleteAccountModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleConfirmDeleteAccount() {
  const input = document.getElementById('deleteConfirmInput')?.value.trim();
  if (input !== 'DELETE') {
    showToast('Please type DELETE to confirm.', 'error');
    return;
  }

  // Clear demo data
  localStorage.clear();
  showToast('Account data reset. Redirecting to login...', 'info');

  setTimeout(() => {
    window.location.href = '../login.html';
  }, 1200);
}

// ================= GLOBAL HELPERS & MOBILE NAV =================
function toggleMobileSidebar(show) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  if (!sidebar || !backdrop) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  const shouldOpen = typeof show === 'boolean' ? show : isClosed;

  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('pointer-events-none', 'opacity-0');
    backdrop.classList.add('opacity-100');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('pointer-events-none', 'opacity-0');
    backdrop.classList.remove('opacity-100');
  }
}

function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleConfirmLogout() {
  window.location.href = '../login.html';
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('adminToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'adminToastContainer';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const icon = type === 'success' 
    ? 'fa-circle-check text-emerald-400' 
    : type === 'error' 
    ? 'fa-circle-exclamation text-rose-400' 
    : 'fa-circle-info text-[#DCC3AA]';

  const borderColor = type === 'success'
    ? 'border-emerald-500/50'
    : type === 'error'
    ? 'border-rose-500/50'
    : 'border-[#DCC3AA]/50';

  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 bg-[#541A1A] text-[#F1E2D1] border ${borderColor} rounded-xl shadow-2xl text-xs font-medium animate-fadeIn transition-all duration-300`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-base shrink-0"></i>
    <span class="flex-1">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function updateTimeBadge() {
  const clockEl = document.getElementById('topClockDisplay');
  if (!clockEl) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  clockEl.textContent = `${dateStr} · ${timeStr}`;

  setTimeout(updateTimeBadge, 1000);
}
