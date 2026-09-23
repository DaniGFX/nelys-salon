/**
 * Nely's Salon — Admin Reports Controller
 * Manages comprehensive business analytics, revenue timeline chart, appointment distribution,
 * popular services, customer growth statistics, staff performance, full service revenue breakdown,
 * and multi-format PDF/Excel export.
 */

// ================= MASTER REPORT DATASETS =================

// Date range datasets
const REPORT_DATASETS = {
  'this_month': {
    label: 'This Month (September 2026)',
    totalRevenue: 52680,
    revenueGrowth: '+12.5%',
    totalAppointments: 186,
    appointmentGrowth: '+8.2%',
    totalCustomers: 248,
    newCustomers: 18,
    completedServices: 164,
    completionRate: '88.2%',
    avgDailyRevenue: 7525,
    chartPoints: [
      { day: 'Mon', amount: 4200 },
      { day: 'Tue', amount: 5100 },
      { day: 'Wed', amount: 6800 },
      { day: 'Thu', amount: 5600 },
      { day: 'Fri', amount: 8450 },
      { day: 'Sat', amount: 10200 },
      { day: 'Sun', amount: 7500 }
    ],
    appointments: {
      total: 186,
      completed: 164,
      confirmed: 12,
      pending: 6,
      cancelled: 4
    }
  },
  'today': {
    label: 'Today (September 23, 2026)',
    totalRevenue: 8450,
    revenueGrowth: '+5.4%',
    totalAppointments: 12,
    appointmentGrowth: '+4.0%',
    totalCustomers: 248,
    newCustomers: 3,
    completedServices: 7,
    completionRate: '58.3%',
    avgDailyRevenue: 8450,
    chartPoints: [
      { day: '9 AM', amount: 1200 },
      { day: '11 AM', amount: 1999 },
      { day: '1 PM', amount: 1450 },
      { day: '3 PM', amount: 2200 },
      { day: '5 PM', amount: 1601 }
    ],
    appointments: {
      total: 12,
      completed: 7,
      confirmed: 3,
      pending: 2,
      cancelled: 0
    }
  },
  'this_week': {
    label: 'This Week (Sept 20 – Sept 26, 2026)',
    totalRevenue: 47850,
    revenueGrowth: '+9.8%',
    totalAppointments: 68,
    appointmentGrowth: '+6.1%',
    totalCustomers: 248,
    newCustomers: 7,
    completedServices: 58,
    completionRate: '85.3%',
    avgDailyRevenue: 6835,
    chartPoints: [
      { day: 'Mon', amount: 4200 },
      { day: 'Tue', amount: 5100 },
      { day: 'Wed', amount: 6800 },
      { day: 'Thu', amount: 5600 },
      { day: 'Fri', amount: 8450 },
      { day: 'Sat', amount: 10200 },
      { day: 'Sun', amount: 7500 }
    ],
    appointments: {
      total: 68,
      completed: 58,
      confirmed: 6,
      pending: 3,
      cancelled: 1
    }
  },
  'last_month': {
    label: 'Last Month (August 2026)',
    totalRevenue: 46800,
    revenueGrowth: '+11.0%',
    totalAppointments: 172,
    appointmentGrowth: '+7.5%',
    totalCustomers: 230,
    newCustomers: 14,
    completedServices: 151,
    completionRate: '87.7%',
    avgDailyRevenue: 6685,
    chartPoints: [
      { day: 'Wk 1', amount: 10800 },
      { day: 'Wk 2', amount: 11400 },
      { day: 'Wk 3', amount: 12100 },
      { day: 'Wk 4', amount: 12500 }
    ],
    appointments: {
      total: 172,
      completed: 151,
      confirmed: 0,
      pending: 0,
      cancelled: 21
    }
  },
  'this_year': {
    label: 'This Year (2026 YTD)',
    totalRevenue: 412500,
    revenueGrowth: '+22.4%',
    totalAppointments: 1420,
    appointmentGrowth: '+18.0%',
    totalCustomers: 248,
    newCustomers: 248,
    completedServices: 1280,
    completionRate: '90.1%',
    avgDailyRevenue: 7200,
    chartPoints: [
      { day: 'Jan', amount: 38200 },
      { day: 'Feb', amount: 41500 },
      { day: 'Mar', amount: 44800 },
      { day: 'Apr', amount: 46200 },
      { day: 'May', amount: 49800 },
      { day: 'Jun', amount: 51200 },
      { day: 'Jul', amount: 53400 },
      { day: 'Aug', amount: 46800 },
      { day: 'Sep', amount: 52680 }
    ],
    appointments: {
      total: 1420,
      completed: 1280,
      confirmed: 65,
      pending: 25,
      cancelled: 50
    }
  }
};

// Popular Services (matching user specification)
const POPULAR_SERVICES = [
  { rank: 1, service: 'Brazilian', category: 'Hair Care', bookings: 32, revenue: 63968 },
  { rank: 2, service: 'Hair Dye', category: 'Hair Care', bookings: 28, revenue: 19572 },
  { rank: 3, service: 'Manicure', category: 'Nails', bookings: 24, revenue: 3576 },
  { rank: 4, service: 'Gel Manicure', category: 'Nails', bookings: 21, revenue: 10479 },
  { rank: 5, service: 'Pedicure', category: 'Nails', bookings: 19, revenue: 2831 }
];

// Customer Growth (Jan – Sep 2026)
const CUSTOMER_GROWTH = [
  { month: 'Jan', count: 45, barPercent: 35 },
  { month: 'Feb', count: 72, barPercent: 48 },
  { month: 'Mar', count: 105, barPercent: 60 },
  { month: 'Apr', count: 138, barPercent: 72 },
  { month: 'May', count: 174, barPercent: 82 },
  { month: 'Jun', count: 202, barPercent: 90 },
  { month: 'Jul', count: 218, barPercent: 93 },
  { month: 'Aug', count: 230, barPercent: 96 },
  { month: 'Sep', count: 248, barPercent: 100 }
];

// Staff Performance
const STAFF_PERFORMANCE = [
  { staff: 'Nely', role: 'Master Stylist', appointments: 42, completed: 38, revenue: 18450 },
  { staff: 'Ana', role: 'Senior Nail Artist', appointments: 35, completed: 32, revenue: 14800 },
  { staff: 'Elena', role: 'Spa Specialist', appointments: 29, completed: 26, revenue: 11200 },
  { staff: 'Grace', role: 'Junior Colorist', appointments: 22, completed: 20, revenue: 7850 },
  { staff: 'Joy', role: 'Texture Specialist', appointments: 20, completed: 18, revenue: 8350 }
];

// Complete Service Revenue Report (All 13 catalog services)
const SERVICE_REVENUE_REPORT = [
  { service: 'Brazilian', price: 1999, priceDisplay: '₱1,999', bookings: 32, revenue: 63968 },
  { service: 'Hair Dye', price: 699, priceDisplay: '₱699', bookings: 28, revenue: 19572 },
  { service: 'Power Dose', price: 499, priceDisplay: '₱499', bookings: 15, revenue: 7485 },
  { service: 'Cold Wave', price: 699, priceDisplay: '₱699', bookings: 12, revenue: 8388 },
  { service: 'Bonacure', price: 499, priceDisplay: '₱499', bookings: 10, revenue: 4990 },
  { service: 'Keratine Treatment', price: 499, priceDisplay: '₱499', bookings: 14, revenue: 6986 },
  { service: 'Footspa', price: 199, priceDisplay: '₱199', bookings: 9, revenue: 1791 },
  { service: 'Manicure', price: 149, priceDisplay: '₱149', bookings: 24, revenue: 3576 },
  { service: 'Pedicure', price: 149, priceDisplay: '₱149', bookings: 19, revenue: 2831 },
  { service: 'Trim', price: 149, priceDisplay: '₱149', bookings: 16, revenue: 2384 },
  { service: 'Gel Manicure', price: 499, priceDisplay: '₱499', bookings: 21, revenue: 10479 },
  { service: 'Gel Pedicure', price: 499, priceDisplay: '₱499', bookings: 17, revenue: 8483 },
  { service: 'Rebonding', price: null, priceDisplay: 'Price not set', bookings: 5, revenue: 'Price not set' }
];

let currentDateRange = 'this_month';

// ================= DOM INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  renderActiveDataset();
  renderPopularServices();
  renderCustomerGrowth();
  renderStaffPerformance();
  renderServiceRevenueBreakdown();
  setupEventListeners();
  updateTimeBadge();
});

function setupEventListeners() {
  const rangeSelect = document.getElementById('reportDateRangeSelect');
  if (rangeSelect) {
    rangeSelect.addEventListener('change', (e) => {
      currentDateRange = e.target.value;
      renderActiveDataset();
      showToast(`Showing reports for: ${REPORT_DATASETS[currentDateRange].label}`, 'info');
    });
  }

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// ================= RENDER DATASET ACCORDING TO TIMEFRAME =================
function renderActiveDataset() {
  const data = REPORT_DATASETS[currentDateRange] || REPORT_DATASETS['this_month'];

  // 1. KPI Cards
  const totalRevEl = document.getElementById('statTotalRevenue');
  const revGrowthEl = document.getElementById('statRevenueGrowth');
  const totalApptEl = document.getElementById('statTotalAppointments');
  const apptGrowthEl = document.getElementById('statAppointmentGrowth');
  const totalCustEl = document.getElementById('statTotalCustomers');
  const newCustEl = document.getElementById('statNewCustomers');
  const compServEl = document.getElementById('statCompletedServices');
  const compRateEl = document.getElementById('statCompletionRate');

  if (totalRevEl) totalRevEl.textContent = `₱${data.totalRevenue.toLocaleString()}`;
  if (revGrowthEl) revGrowthEl.textContent = `${data.revenueGrowth} from previous period`;
  if (totalApptEl) totalApptEl.textContent = data.totalAppointments;
  if (apptGrowthEl) apptGrowthEl.textContent = `${data.appointmentGrowth} from previous period`;
  if (totalCustEl) totalCustEl.textContent = data.totalCustomers;
  if (newCustEl) newCustEl.textContent = `${data.newCustomers} new customers`;
  if (compServEl) compServEl.textContent = data.completedServices;
  if (compRateEl) compRateEl.textContent = `${data.completionRate} completion rate`;

  // 2. Revenue Overview Section
  const revTotalEl = document.getElementById('chartRevenueTotal');
  const revAvgEl = document.getElementById('chartRevenueAverage');
  if (revTotalEl) revTotalEl.textContent = `₱${data.totalRevenue.toLocaleString()}`;
  if (revAvgEl) revAvgEl.textContent = `₱${data.avgDailyRevenue.toLocaleString()}`;

  renderRevenueChart(data.chartPoints);

  // 3. Appointment Overview Section
  renderAppointmentDonut(data.appointments);
}

// ================= REVENUE CHART =================
function renderRevenueChart(points) {
  const container = document.getElementById('revenueChartBars');
  if (!container) return;

  const maxVal = Math.max(...points.map(p => p.amount), 1);

  container.innerHTML = points.map(pt => {
    const heightPercent = Math.round((pt.amount / maxVal) * 100);
    const isPeak = pt.amount === maxVal;
    const barBg = isPeak ? 'bg-[#810B38]' : 'bg-[#DCC3AA] group-hover:bg-[#810B38]/80';

    return `
      <div class="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
        <!-- Amount Tooltip on hover -->
        <div class="opacity-0 group-hover:opacity-100 transition-opacity bg-[#541A1A] text-[#F1E2D1] text-[10px] font-bold px-2 py-1 rounded-md shadow-md pointer-events-none whitespace-nowrap mb-1">
          ₱${pt.amount.toLocaleString()}
        </div>

        <!-- Visual Bar -->
        <div class="w-full max-w-[36px] bg-stone-100 rounded-t-xl overflow-hidden h-40 flex items-end">
          <div 
            style="height: ${heightPercent}%;" 
            class="w-full ${barBg} rounded-t-xl transition-all duration-500 ease-out group-hover:scale-y-105 origin-bottom">
          </div>
        </div>

        <!-- Day Label -->
        <div class="text-center mt-1">
          <span class="block text-xs font-bold text-stone-700">${pt.day}</span>
          <span class="block text-[10px] text-stone-400 font-mono">₱${(pt.amount / 1000).toFixed(1)}k</span>
        </div>
      </div>
    `;
  }).join('');
}

// ================= APPOINTMENT DONUT / PROGRESS RINGS =================
function renderAppointmentDonut(appts) {
  const total = appts.total || 1;
  const completedPct = Math.round((appts.completed / total) * 100);
  const confirmedPct = Math.round((appts.confirmed / total) * 100);
  const pendingPct = Math.round((appts.pending / total) * 100);
  const cancelledPct = Math.round((appts.cancelled / total) * 100);

  // Values in DOM
  const tTotal = document.getElementById('apptDonutTotal');
  const cComp = document.getElementById('apptCountCompleted');
  const cConf = document.getElementById('apptCountConfirmed');
  const cPend = document.getElementById('apptCountPending');
  const cCanc = document.getElementById('apptCountCancelled');

  const pComp = document.getElementById('apptPctCompleted');
  const pConf = document.getElementById('apptPctConfirmed');
  const pPend = document.getElementById('apptPctPending');
  const pCanc = document.getElementById('apptPctCancelled');

  if (tTotal) tTotal.textContent = appts.total;
  if (cComp) cComp.textContent = appts.completed;
  if (cConf) cConf.textContent = appts.confirmed;
  if (cPend) cPend.textContent = appts.pending;
  if (cCanc) cCanc.textContent = appts.cancelled;

  if (pComp) pComp.textContent = `${completedPct}%`;
  if (pConf) pConf.textContent = `${confirmedPct}%`;
  if (pPend) pPend.textContent = `${pendingPct}%`;
  if (pCanc) pCanc.textContent = `${cancelledPct}%`;

  // Multi-segment progress bar
  const barCompleted = document.getElementById('apptBarCompleted');
  const barConfirmed = document.getElementById('apptBarConfirmed');
  const barPending = document.getElementById('apptBarPending');
  const barCancelled = document.getElementById('apptBarCancelled');

  if (barCompleted) barCompleted.style.width = `${completedPct}%`;
  if (barConfirmed) barConfirmed.style.width = `${confirmedPct}%`;
  if (barPending) barPending.style.width = `${pendingPct}%`;
  if (barCancelled) barCancelled.style.width = `${cancelledPct}%`;
}

// ================= POPULAR SERVICES TABLE =================
function renderPopularServices() {
  const container = document.getElementById('popularServicesTableBody');
  if (!container) return;

  container.innerHTML = POPULAR_SERVICES.map(s => `
    <tr class="border-b border-stone-100 hover:bg-[#FAF6F0]/60 transition-colors text-xs">
      <td class="px-5 py-3.5 font-bold text-stone-800 flex items-center gap-2">
        <span class="w-5 h-5 rounded-full bg-[#FAF6F0] border border-[#DCC3AA] text-[#810B38] font-bold text-[10px] flex items-center justify-center shrink-0">
          ${s.rank}
        </span>
        <span class="font-serif text-sm font-bold text-[#541A1A]">${s.service}</span>
      </td>
      <td class="px-5 py-3.5 text-stone-600">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF6F0] border border-[#DCC3AA]/60 text-[#810B38]">
          <i class="fa-solid fa-scissors text-[9px]"></i>
          ${s.bookings} bookings
        </span>
      </td>
      <td class="px-5 py-3.5 font-mono font-bold text-stone-800 text-right">
        ₱${s.revenue.toLocaleString()}
      </td>
    </tr>
  `).join('');
}

// ================= CUSTOMER GROWTH BARS =================
function renderCustomerGrowth() {
  const container = document.getElementById('customerGrowthBars');
  if (!container) return;

  container.innerHTML = CUSTOMER_GROWTH.map(g => `
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-stone-700">${g.month}</span>
        <span class="font-mono text-stone-500 font-semibold">${g.count} clients</span>
      </div>
      <div class="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
        <div 
          style="width: ${g.barPercent}%;" 
          class="h-full bg-gradient-to-r from-[#DCC3AA] to-[#810B38] rounded-full transition-all duration-700">
        </div>
      </div>
    </div>
  `).join('');
}

// ================= STAFF PERFORMANCE TABLE =================
function renderStaffPerformance() {
  const container = document.getElementById('staffPerformanceTableBody');
  if (!container) return;

  container.innerHTML = STAFF_PERFORMANCE.map(st => `
    <tr class="border-b border-stone-100 hover:bg-[#FAF6F0]/60 transition-colors text-xs">
      <td class="px-5 py-3.5">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#810B38] to-[#541A1A] text-[#F1E2D1] flex items-center justify-center font-bold text-xs shrink-0">
            ${st.staff[0]}
          </div>
          <div>
            <span class="font-serif font-bold text-sm text-[#541A1A] block">${st.staff}</span>
            <span class="text-[10px] text-stone-400 block">${st.role}</span>
          </div>
        </div>
      </td>
      <td class="px-5 py-3.5 text-stone-700 font-semibold">${st.appointments}</td>
      <td class="px-5 py-3.5">
        <span class="inline-flex items-center gap-1 text-emerald-700 font-bold">
          <i class="fa-solid fa-check text-[10px]"></i>
          ${st.completed}
        </span>
      </td>
      <td class="px-5 py-3.5 font-mono font-bold text-stone-800 text-right">
        ₱${st.revenue.toLocaleString()}
      </td>
    </tr>
  `).join('');
}

// ================= COMPLETE SERVICE REVENUE REPORT =================
function renderServiceRevenueBreakdown() {
  const container = document.getElementById('serviceRevenueTableBody');
  if (!container) return;

  container.innerHTML = SERVICE_REVENUE_REPORT.map(sr => {
    const isPriceNotSet = sr.price === null;
    const pricePill = isPriceNotSet
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Price not set</span>`
      : `<span class="font-mono font-semibold text-stone-800">${sr.priceDisplay}</span>`;

    const revenuePill = isPriceNotSet
      ? `<span class="text-stone-400 italic text-[11px]">Consultation</span>`
      : `<span class="font-mono font-bold text-[#810B38]">₱${sr.revenue.toLocaleString()}</span>`;

    return `
      <tr class="border-b border-stone-100 hover:bg-[#FAF6F0]/60 transition-colors text-xs">
        <td class="px-5 py-3 font-bold text-stone-800 flex items-center gap-2">
          <i class="fa-solid fa-scissors text-[10px] text-[#DCC3AA]"></i>
          <span class="font-medium">${sr.service}</span>
        </td>
        <td class="px-5 py-3">
          ${pricePill}
        </td>
        <td class="px-5 py-3 font-semibold text-stone-700">
          ${sr.bookings} bookings
        </td>
        <td class="px-5 py-3 text-right">
          ${revenuePill}
        </td>
      </tr>
    `;
  }).join('');
}

// ================= EXPORT REPORT MODAL & DOWNLOAD =================
function openExportModal() {
  const modal = document.getElementById('exportReportModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeExportModal() {
  const modal = document.getElementById('exportReportModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// Export PDF / Print Statement
function handleExportPDF() {
  const reportType = document.getElementById('exportReportType') ? document.getElementById('exportReportType').value : 'Complete Salon Report';
  closeExportModal();
  showToast(`Preparing ${reportType} for PDF printing...`, 'info');
  setTimeout(() => {
    window.print();
  }, 500);
}

// Export Excel / CSV spreadsheet
function handleExportExcel() {
  const reportType = document.getElementById('exportReportType') ? document.getElementById('exportReportType').value : 'Complete Salon Report';
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "NELY'S SALON MANAGEMENT SYSTEM - OFFICIAL REPORT\n";
  csvContent += `Generated Date: September 23, 2026\n`;
  csvContent += `Report Type: ${reportType}\n\n`;

  if (reportType === 'Service Report' || reportType === 'Complete Salon Report') {
    csvContent += "SERVICE REVENUE BREAKDOWN\n";
    csvContent += "Service,Price,Bookings,Total Revenue\n";
    SERVICE_REVENUE_REPORT.forEach(row => {
      csvContent += `"${row.service}","${row.priceDisplay}","${row.bookings}","${row.revenue}"\n`;
    });
    csvContent += "\n";
  }

  if (reportType === 'Staff Report' || reportType === 'Complete Salon Report') {
    csvContent += "STAFF PERFORMANCE\n";
    csvContent += "Staff,Role,Appointments,Completed,Revenue (PHP)\n";
    STAFF_PERFORMANCE.forEach(row => {
      csvContent += `"${row.staff}","${row.role}","${row.appointments}","${row.completed}","${row.revenue}"\n`;
    });
    csvContent += "\n";
  }

  if (reportType === 'Customer Report' || reportType === 'Complete Salon Report') {
    csvContent += "CUSTOMER STATISTICS\n";
    csvContent += "Total Customers,248\n";
    csvContent += "New Customers,18\n";
    csvContent += "Returning Customers,86\n";
    csvContent += "Inactive Customers,24\n\n";
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Nelys_Salon_${reportType.replace(/\s+/g, '_')}_Sept_2026.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  closeExportModal();
  showToast(`Excel CSV downloaded: ${reportType}`, 'success');
}

// ================= MODAL HELPERS & NAV =================
function closeAllModals() {
  const modalIds = ['exportReportModal', 'logoutModal'];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });
}

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
    modal.classList.remove('hidden');
    modal.classList.add('flex');
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
