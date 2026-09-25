// Seamless 0ms Cache Preload
const SETTINGS_CACHE_KEY = 'nelys_admin_settings_cache';
let lastRendered_settings_Hash = '';
/**
 * Nely's Salon — Admin Settings Controller
 * Directly connected to backend REST API (/api/settings, /api/dashboard/stats)
 * Handles general salon configuration:
 * 1. Salon Information (Name, Address, Phone, Email, Description)
 * 2. Business Hours (7 Days, Status, Opening & Closing time pickers)
 * 3. Appointment Settings (Duration, Advance Booking, Min Notice, Max per slot, Auto-confirm, Cancellation)
 * 4. Payment Settings (Cash, GCash, Bank Transfer, Other, GCash account details)
 * 5. Notification Preferences (New Appt, Cancel, Reschedule, Payment, Customer, System Updates)
 * 6. Account & Security (Admin Name, Email, Change Password modal with visibility toggles)
 * 7. System Preferences (Language, Currency, Timezone, Date Format)
 * 8. Danger Zone (Deactivate Salon System, Reactivate, Delete Account / Reset Data)
 */

// ================= GLOBAL STATE =================
let settings = {
  salonInfo: {
    name: "Nely's Salon",
    address: "",
    phone: "",
    email: "",
    description: ""
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
    gcashNumber: "",
    gcashName: ""
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
    phone: ""
  },
  systemPreferences: {
    language: "English",
    currency: "PHP (₱)",
    timezone: "Asia/Manila (GMT+8)",
    dateFormat: "MM/DD/YYYY"
  },
  isDeactivated: false
};

// ================= DOM CONTENT LOADED & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  fetchSettingsData();
  fetchSidebarStats();
  updateTimeBadge();
});

function checkAdminAuth() {
  const token = localStorage.getItem('nelys_token');
  const userJson = localStorage.getItem('nelys_user');

  if (!token) {
    window.location.href = '../login.html';
    return;
  }

  let displayName = 'Admin';
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      let rawName = user.full_name || user.name || (user.email ? user.email.split('@')[0] : 'Admin');
      rawName = rawName.replace(/atelier\s*/gi, '').trim();
      if (rawName && rawName.toLowerCase() !== 'admin') {
        displayName = rawName;
      }
    } catch (e) {
      console.warn('Error reading admin user:', e);
    }
  }

  const mobileBadge = document.querySelector('header .bg-\\[\\#541A1A\\]');
  if (mobileBadge) {
    const parts = displayName.split(' ').filter(Boolean);
    const initials = parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (displayName.substring(0, 2)).toUpperCase();
    mobileBadge.textContent = initials || 'AD';
  }
}

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('nelys_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ================= 1. FETCH LIVE DATA FROM SERVER =================
async function fetchSettingsData() {
  try {
    const res = await fetch('../api/settings', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('Admin session unauthenticated or expired.');
      window.location.href = '../login.html';
      return;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch settings.`);
    }

    const json = await res.json();
    if (json.data) {
      const d = json.data;

      if (d.salonInfo) settings.salonInfo = { ...settings.salonInfo, ...d.salonInfo };
      if (Array.isArray(d.businessHours) && d.businessHours.length === 7) {
        settings.businessHours = d.businessHours;
      }
      if (d.appointmentSettings) settings.appointmentSettings = { ...settings.appointmentSettings, ...d.appointmentSettings };
      if (d.paymentSettings) settings.paymentSettings = { ...settings.paymentSettings, ...d.paymentSettings };
      if (d.notifications) settings.notifications = { ...settings.notifications, ...d.notifications };
      if (d.account) settings.account = { ...settings.account, ...d.account };
      if (d.systemPreferences) settings.systemPreferences = { ...settings.systemPreferences, ...d.systemPreferences };
      if (d.isDeactivated !== undefined) settings.isDeactivated = !!d.isDeactivated;
    }

    // Populate all form sections
    populateSalonInfo();
    renderBusinessHoursTable();
    populateAppointmentSettings();
    populatePaymentSettings();
    populateNotificationPreferences();
    populateAccountSettings();
    populateSystemPreferences();
    updateSystemDeactivatedUI();

  } catch (err) {
    console.error('Error fetching settings from backend:', err);
    showToast('Failed to load settings from server.', 'error');
  }
}

// Fetch sidebar badge counts
async function fetchSidebarStats() {
  try {
    const res = await fetch('../api/dashboard/stats', {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        const d = json.data;
        const bAppt = document.getElementById('sidebarAppointmentsBadge');
        const bNotif = document.getElementById('sidebarNotificationsBadge');
        const bMsg = document.getElementById('sidebarMessagesBadge');
        const apptCount = parseInt(d.new_appointments ?? d.pending_appointments ?? d.badges?.appointments ?? 0, 10);
        const notifCount = parseInt(d.unread_notifications ?? d.badges?.notifications ?? 0, 10);
        const msgCount = parseInt(d.unread_messages ?? d.badges?.messages ?? 0, 10);

        if (bAppt) {
          if (apptCount > 0) {
            bAppt.textContent = apptCount;
            bAppt.classList.remove('hidden');
            bAppt.style.display = '';
          } else {
            bAppt.textContent = '0';
            bAppt.classList.add('hidden');
            bAppt.style.display = 'none';
          }
        }
        if (bNotif) {
          if (notifCount > 0) {
            bNotif.textContent = notifCount;
            bNotif.classList.remove('hidden');
            bNotif.style.display = '';
          } else {
            bNotif.textContent = '0';
            bNotif.classList.add('hidden');
            bNotif.style.display = 'none';
          }
        }
        if (bMsg) {
          if (msgCount > 0) {
            bMsg.textContent = msgCount;
            bMsg.classList.remove('hidden');
            bMsg.style.display = '';
          } else {
            bMsg.textContent = '0';
            bMsg.classList.add('hidden');
            bMsg.style.display = 'none';
          }
        }
      }
    }
  } catch (err) {
    // Non-critical background fetch, ignore
  }
}

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

async function handleSaveSalonInfo(event) {
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

  const payload = {
    salonInfo: {
      name: name,
      address: address,
      phone: phone,
      email: email,
      description: desc
    }
  };

  try {
    const res = await fetch('../api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok) {
      settings.salonInfo = payload.salonInfo;
      showToast(json.message || 'Salon information saved successfully!', 'success');
    } else {
      showToast(json.message || 'Failed to update salon information.', 'error');
    }
  } catch (err) {
    console.error('Error saving salon info:', err);
    showToast('Network error while saving salon info.', 'error');
  }
}

// ================= 3. BUSINESS HOURS =================
function renderBusinessHoursTable() {
  const container = document.getElementById('businessHoursTbody');
  if (!container) return;

  container.innerHTML = settings.businessHours.map((bh, idx) => {
    const isOpen = !!bh.open;
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

async function handleSaveBusinessHours(event) {
  if (event) event.preventDefault();

  const payload = {
    businessHours: settings.businessHours
  };

  try {
    const res = await fetch('../api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok) {
      showToast(json.message || 'Business hours schedule updated successfully!', 'success');
    } else {
      showToast(json.message || 'Failed to update business hours.', 'error');
    }
  } catch (err) {
    console.error('Error saving business hours:', err);
    showToast('Network error while saving business hours.', 'error');
  }
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

async function handleSaveAppointmentSettings(event) {
  if (event) event.preventDefault();

  const payload = {
    appointmentSettings: {
      duration: document.getElementById('settingApptDuration')?.value || '30',
      advanceDays: parseInt(document.getElementById('settingAdvanceBooking')?.value, 10) || 30,
      minNoticeHours: parseInt(document.getElementById('settingMinNotice')?.value, 10) || 2,
      maxPerSlot: parseInt(document.getElementById('settingMaxPerSlot')?.value, 10) || 3,
      autoConfirm: !!document.getElementById('settingAutoConfirm')?.checked,
      allowCancellation: !!document.getElementById('settingAllowCancel')?.checked,
      cancelNoticeHours: parseInt(document.getElementById('settingCancelNotice')?.value, 10) || 2
    }
  };

  try {
    const res = await fetch('../api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok) {
      settings.appointmentSettings = payload.appointmentSettings;
      showToast(json.message || 'Appointment rules & policies saved successfully!', 'success');
    } else {
      showToast(json.message || 'Failed to update appointment settings.', 'error');
    }
  } catch (err) {
    console.error('Error saving appointment settings:', err);
    showToast('Network error while saving appointment settings.', 'error');
  }
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

async function handleSavePaymentSettings(event) {
  if (event) event.preventDefault();

  const payload = {
    paymentSettings: {
      cash: !!document.getElementById('settingPayCash')?.checked,
      gcash: !!document.getElementById('settingPayGcash')?.checked,
      bankTransfer: !!document.getElementById('settingPayBank')?.checked,
      other: !!document.getElementById('settingPayOther')?.checked,
      gcashNumber: document.getElementById('settingGcashNumber')?.value.trim() || '0917 888 9999',
      gcashName: document.getElementById('settingGcashName')?.value.trim() || "Nely's Salon Atelier"
    }
  };

  try {
    const res = await fetch('../api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok) {
      settings.paymentSettings = payload.paymentSettings;
      showToast(json.message || 'Payment methods and details saved successfully!', 'success');
    } else {
      showToast(json.message || 'Failed to update payment settings.', 'error');
    }
  } catch (err) {
    console.error('Error saving payment settings:', err);
    showToast('Network error while saving payment settings.', 'error');
  }
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

async function handleSaveNotificationPreferences(event) {
  if (event) event.preventDefault();

  const payload = {
    notifications: {
      newAppt: !!document.getElementById('prefNewAppt')?.checked,
      apptCancel: !!document.getElementById('prefApptCancel')?.checked,
      apptResched: !!document.getElementById('prefApptResched')?.checked,
      payReceived: !!document.getElementById('prefPayReceived')?.checked,
      newCustomer: !!document.getElementById('prefNewCustomer')?.checked,
      systemUpdates: !!document.getElementById('prefSystemUpdates')?.checked
    }
  };

  try {
    const res = await fetch('../api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok) {
      settings.notifications = payload.notifications;
      showToast(json.message || 'Notification preferences updated successfully!', 'success');
    } else {
      showToast(json.message || 'Failed to update notification preferences.', 'error');
    }
  } catch (err) {
    console.error('Error saving notification preferences:', err);
    showToast('Network error while saving notification preferences.', 'error');
  }
}

// ================= 7. ACCOUNT & SECURITY =================
function populateAccountSettings() {
  const acc = settings.account;
  const nameEl = document.getElementById('settingAccountName');
  const emailEl = document.getElementById('settingAccountEmail');

  if (nameEl) nameEl.value = acc.name || 'Admin';
  if (emailEl) emailEl.value = acc.email || 'admin@nelyssalon.com';
}

async function handleSaveAccountSettings(event) {
  if (event) event.preventDefault();

  const name = document.getElementById('settingAccountName')?.value.trim();
  const email = document.getElementById('settingAccountEmail')?.value.trim();

  if (!name || !email) {
    showToast('Name and Email are required.', 'error');
    return;
  }

  const payload = {
    account: {
      name: name,
      email: email
    }
  };

  try {
    const res = await fetch('../api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok) {
      settings.account.name = name;
      settings.account.email = email;

      // Update cached local user
      try {
        const u = JSON.parse(localStorage.getItem('nelys_user') || '{}');
        u.name = name;
        u.email = email;
        localStorage.setItem('nelys_user', JSON.stringify(u));
      } catch (e) {}

      showToast(json.message || 'Admin profile details saved successfully!', 'success');
    } else {
      showToast(json.message || 'Failed to update admin profile.', 'error');
    }
  } catch (err) {
    console.error('Error saving account settings:', err);
    showToast('Network error while saving account settings.', 'error');
  }
}

// Password Form & Modal
function openChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) {
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

async function handleUpdatePassword(event) {
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

  try {
    const res = await fetch('../api/settings/password', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        current_password: curr,
        new_password: newP,
        confirm_password: confP
      })
    });

    const json = await res.json();
    if (res.ok) {
      closeChangePasswordModal();
      showToast(json.message || 'Password updated successfully!', 'success');
    } else {
      showToast(json.message || 'Failed to update password.', 'error');
    }
  } catch (err) {
    console.error('Error updating password:', err);
    showToast('Network error while updating password.', 'error');
  }
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
  if (tzEl) tzEl.value = pref.timezone || 'Asia/Manila (GMT+8)';
  if (dateFmtEl) dateFmtEl.value = pref.dateFormat || 'MM/DD/YYYY';
}

async function handleSaveSystemPreferences(event) {
  if (event) event.preventDefault();

  const payload = {
    systemPreferences: {
      language: document.getElementById('settingSysLanguage')?.value || 'English',
      currency: document.getElementById('settingSysCurrency')?.value || 'PHP (₱)',
      timezone: document.getElementById('settingSysTimezone')?.value || 'Asia/Manila (GMT+8)',
      dateFormat: document.getElementById('settingSysDateFormat')?.value || 'MM/DD/YYYY'
    }
  };

  try {
    const res = await fetch('../api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok) {
      settings.systemPreferences = payload.systemPreferences;
      showToast(json.message || 'System preferences saved successfully!', 'success');
    } else {
      showToast(json.message || 'Failed to update system preferences.', 'error');
    }
  } catch (err) {
    console.error('Error saving system preferences:', err);
    showToast('Network error while saving system preferences.', 'error');
  }
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

async function handleConfirmDeactivate() {
  const input = document.getElementById('deactivateConfirmInput')?.value.trim();
  if (input !== 'DEACTIVATE') {
    showToast('Please type DEACTIVATE to confirm.', 'error');
    return;
  }

  try {
    const res = await fetch('../api/settings/deactivate', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (res.ok) {
      settings.isDeactivated = true;
      closeDeactivateModal();
      updateSystemDeactivatedUI();
      showToast(json.message || 'Salon booking system has been deactivated.', 'info');
    } else {
      showToast(json.message || 'Failed to deactivate system.', 'error');
    }
  } catch (err) {
    console.error('Error deactivating system:', err);
    showToast('Network error while deactivating system.', 'error');
  }
}

async function handleReactivateSystem() {
  try {
    const res = await fetch('../api/settings/reactivate', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (res.ok) {
      settings.isDeactivated = false;
      updateSystemDeactivatedUI();
      showToast(json.message || 'Salon booking system is now active and accepting appointments!', 'success');
    } else {
      showToast(json.message || 'Failed to reactivate system.', 'error');
    }
  } catch (err) {
    console.error('Error reactivating system:', err);
    showToast('Network error while reactivating system.', 'error');
  }
}

function updateSystemDeactivatedUI() {
  const banner = document.getElementById('deactivatedBanner');
  const statusBadge = document.getElementById('systemStatusBadge');

  if (settings.isDeactivated) {
    if (banner) banner.classList.remove('hidden');
    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
          <span class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
          Maintenance Mode
        </span>
      `;
    }
  } else {
    if (banner) banner.classList.add('hidden');
    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
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

async function handleConfirmDeleteAccount() {
  const input = document.getElementById('deleteConfirmInput')?.value.trim();
  if (input !== 'DELETE') {
    showToast('Please type DELETE to confirm.', 'error');
    return;
  }

  try {
    const res = await fetch('../api/settings/delete-account', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.ok) {
      localStorage.clear();
      showToast('Admin data reset. Redirecting to login...', 'info');
      setTimeout(() => {
        window.location.href = '../login.html';
      }, 1200);
    } else {
      const json = await res.json();
      showToast(json.message || 'Failed to delete admin data.', 'error');
    }
  } catch (err) {
    console.error('Error deleting account:', err);
    showToast('Network error while resetting admin data.', 'error');
  }
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
  localStorage.removeItem('nelys_token');
  localStorage.removeItem('nelys_user');
  window.location.href = '../login.html';
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
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

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
