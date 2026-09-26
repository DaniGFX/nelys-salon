// Seamless 0ms Cache Preload
const REPORTS_CACHE_KEY = 'nelys_admin_reports_cache';
let lastRendered_reports_Hash = '';
/**
 * Nely's Salon — Admin Reports Controller
 * Directly connected to backend database API (/api/reports, /api/dashboard/stats)
 * Manages comprehensive business analytics, revenue timeline chart, appointment distribution,
 * popular services, customer growth statistics, staff performance, full service revenue breakdown,
 * and multi-format PDF/Excel CSV export.
 */

// ================= GLOBAL STATE =================
let currentDateRange = 'this_month';
let reportData = null;

// ================= INITIALIZATION & AUTH =================
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupEventListeners();
  fetchReportsData();
  fetchSidebarStats();
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

// ================= FETCH REPORTS DATA FROM BACKEND =================
async function fetchReportsData() {
  try {
    const res = await fetch(`../api/reports?range=${currentDateRange}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('Admin session expired or unauthenticated.');
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch reports data`);
    }

    const json = await res.json();
    if (json.data) {
      reportData = json.data;
      renderAllSections();
    }

  } catch (err) {
    console.error('Error fetching reports from backend:', err);
    showToast('Failed to load report analytics from server.', 'error');
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
    // Non-critical, ignore
  }
}

// ================= SETUP EVENT LISTENERS =================
function setupEventListeners() {
  const rangeSelect = document.getElementById('reportDateRangeSelect');
  if (rangeSelect) {
    rangeSelect.addEventListener('change', (e) => {
      currentDateRange = e.target.value;
      fetchReportsData();
      showToast(`Loading reports for selected period...`, 'info');
    });
  }

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// ================= RENDER ALL SECTIONS =================
function renderAllSections() {
  if (!reportData) return;

  renderSummaryCards();
  renderRevenueSection();
  renderAppointmentSection();
  renderPopularServices();
  renderCustomerStats();
  renderStaffPerformance();
  renderServiceRevenueBreakdown();
}

// ================= 1. SUMMARY CARDS =================
function renderSummaryCards() {
  const summary = reportData.summary;
  if (!summary) return;

  const totalRevEl = document.getElementById('statTotalRevenue');
  const revGrowthEl = document.getElementById('statRevenueGrowth');
  const totalApptEl = document.getElementById('statTotalAppointments');
  const apptGrowthEl = document.getElementById('statAppointmentGrowth');
  const totalCustEl = document.getElementById('statTotalCustomers');
  const newCustEl = document.getElementById('statNewCustomers');
  const compServEl = document.getElementById('statCompletedServices');
  const compRateEl = document.getElementById('statCompletionRate');
  const compRateBadge = document.getElementById('statCompletionRateBadge');

  if (totalRevEl) totalRevEl.textContent = `₱${summary.total_revenue.toLocaleString()}`;
  if (revGrowthEl) revGrowthEl.innerHTML = `<i class="fa-solid fa-arrow-trend-up text-emerald-600 text-[10px]"></i> <span class="text-emerald-600 font-semibold">${summary.revenue_growth}</span> from previous period`;
  if (totalApptEl) totalApptEl.textContent = summary.total_appointments;
  if (apptGrowthEl) apptGrowthEl.innerHTML = `<i class="fa-solid fa-arrow-trend-up text-emerald-600 text-[10px]"></i> <span class="text-emerald-600 font-semibold">${summary.appointment_growth}</span> from previous period`;
  if (totalCustEl) totalCustEl.textContent = summary.total_customers;
  if (newCustEl) newCustEl.innerHTML = `<i class="fa-solid fa-user-plus text-amber-600 text-[10px]"></i> <span class="text-amber-700 font-semibold">${summary.new_customers} new</span> customer${summary.new_customers === 1 ? '' : 's'}`;
  if (compServEl) compServEl.textContent = summary.completed_services;
  if (compRateEl) compRateEl.innerHTML = `<i class="fa-solid fa-percent text-emerald-600 text-[10px]"></i> <span class="text-emerald-700 font-semibold">${summary.completion_rate}</span> completion rate`;
  if (compRateBadge) compRateBadge.textContent = summary.completion_rate;
}

// ================= 2. REVENUE OVERVIEW & CHART =================
function renderRevenueSection() {
  const chartData = reportData.revenue_chart;
  if (!chartData) return;

  const revTotalEl = document.getElementById('chartRevenueTotal');
  const revAvgEl = document.getElementById('chartRevenueAverage');
  const revHighestEl = document.getElementById('chartRevenueHighest');

  if (revTotalEl) revTotalEl.textContent = `₱${chartData.total.toLocaleString()}`;
  if (revAvgEl) revAvgEl.textContent = `₱${chartData.average.toLocaleString()}`;
  if (revHighestEl) revHighestEl.textContent = chartData.highest;

  const container = document.getElementById('revenueChartBars');
  if (!container) return;

  const points = chartData.points || [];
  const maxVal = Math.max(...points.map(p => p.amount), 1);

  container.innerHTML = points.map(pt => {
    const heightPercent = pt.amount > 0 ? Math.max(Math.round((pt.amount / maxVal) * 100), 8) : 4;
    const isPeak = pt.amount > 0 && pt.amount === maxVal;
    const barBg = isPeak 
      ? 'bg-[#810B38]' 
      : (pt.amount > 0 ? 'bg-[#DCC3AA] group-hover:bg-[#810B38]/80' : 'bg-stone-200');

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

        <!-- Day/Period Label -->
        <div class="text-center mt-1">
          <span class="block text-xs font-bold text-stone-700">${pt.day}</span>
          <span class="block text-[10px] text-stone-400 font-mono">₱${(pt.amount / 1000).toFixed(1)}k</span>
        </div>
      </div>
    `;
  }).join('');
}

// ================= 3. APPOINTMENT OVERVIEW & DONUT =================
function renderAppointmentSection() {
  const appts = reportData.appointments;
  if (!appts) return;

  const tBadge = document.getElementById('apptTotalBadge');
  const tTotal = document.getElementById('apptDonutTotal');
  const cComp = document.getElementById('apptCountCompleted');
  const cConf = document.getElementById('apptCountConfirmed');
  const cPend = document.getElementById('apptCountPending');
  const cCanc = document.getElementById('apptCountCancelled');

  const pComp = document.getElementById('apptPctCompleted');
  const pConf = document.getElementById('apptPctConfirmed');
  const pPend = document.getElementById('apptPctPending');
  const pCanc = document.getElementById('apptPctCancelled');

  if (tBadge) tBadge.textContent = `${appts.total} total`;
  if (tTotal) tTotal.textContent = appts.total;
  if (cComp) cComp.textContent = appts.completed;
  if (cConf) cConf.textContent = appts.confirmed;
  if (cPend) cPend.textContent = appts.pending;
  if (cCanc) cCanc.textContent = appts.cancelled;

  if (pComp) pComp.textContent = `${appts.completed_pct}%`;
  if (pConf) pConf.textContent = `${appts.confirmed_pct}%`;
  if (pPend) pPend.textContent = `${appts.pending_pct}%`;
  if (pCanc) pCanc.textContent = `${appts.cancelled_pct}%`;

  // Multi-segment progress bar
  const barCompleted = document.getElementById('apptBarCompleted');
  const barConfirmed = document.getElementById('apptBarConfirmed');
  const barPending = document.getElementById('apptBarPending');
  const barCancelled = document.getElementById('apptBarCancelled');

  if (barCompleted) barCompleted.style.width = `${appts.completed_pct}%`;
  if (barConfirmed) barConfirmed.style.width = `${appts.confirmed_pct}%`;
  if (barPending) barPending.style.width = `${appts.pending_pct}%`;
  if (barCancelled) barCancelled.style.width = `${appts.cancelled_pct}%`;
}

// ================= 4. POPULAR SERVICES TABLE =================
function renderPopularServices() {
  const container = document.getElementById('popularServicesTableBody');
  if (!container) return;

  const popular = reportData.popular_services || [];
  if (popular.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="3" class="px-5 py-6 text-center text-xs text-stone-400">
          No services booked for this period.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = popular.map(s => `
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
          ${s.bookings} booking${s.bookings === 1 ? '' : 's'}
        </span>
      </td>
      <td class="px-5 py-3.5 font-mono font-bold text-stone-800 text-right">
        ₱${s.revenue.toLocaleString()}
      </td>
    </tr>
  `).join('');
}

// ================= 5. CUSTOMER STATISTICS & GROWTH =================
function renderCustomerStats() {
  const custStats = reportData.customer_stats;
  if (!custStats) return;

  const totalEl = document.getElementById('custStatTotal');
  const newEl = document.getElementById('custStatNew');
  const retEl = document.getElementById('custStatReturning');
  const inactEl = document.getElementById('custStatInactive');
  const footerEl = document.getElementById('customerRetentionFooter');

  if (totalEl) totalEl.textContent = custStats.total;
  if (newEl) newEl.textContent = custStats.new;
  if (retEl) retEl.textContent = custStats.returning;
  if (inactEl) inactEl.textContent = custStats.inactive;

  if (footerEl) {
    footerEl.textContent = `Consistent client retention at ${custStats.retention_rate}% repeat rate`;
  }

  const container = document.getElementById('customerGrowthBars');
  if (!container) return;

  const growth = custStats.growth_bars || [];
  if (growth.length === 0) {
    container.innerHTML = `<div class="text-xs text-stone-400 py-4 text-center">No customer acquisition data recorded yet.</div>`;
    return;
  }

  container.innerHTML = growth.map(g => `
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-stone-700">${g.month}</span>
        <span class="font-mono text-stone-500 font-semibold">${g.count} client${g.count === 1 ? '' : 's'}</span>
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

// ================= 6. STAFF PERFORMANCE TABLE =================
function renderStaffPerformance() {
  const container = document.getElementById('staffPerformanceTableBody');
  const countLabel = document.getElementById('staffCountLabel');
  if (!container) return;

  const staff = reportData.staff_performance || [];
  if (countLabel) {
    countLabel.textContent = `${staff.length} Stylist${staff.length === 1 ? '' : 's'}`;
  }

  if (staff.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="px-5 py-6 text-center text-xs text-stone-400">
          No staff records available.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = staff.map(st => `
    <tr class="border-b border-stone-100 hover:bg-[#FAF6F0]/60 transition-colors text-xs">
      <td class="px-5 py-3.5">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#810B38] to-[#541A1A] text-[#F1E2D1] flex items-center justify-center font-bold text-xs shrink-0">
            ${st.staff ? st.staff[0].toUpperCase() : 'S'}
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

// ================= 7. COMPLETE SERVICE REVENUE REPORT =================
function renderServiceRevenueBreakdown() {
  const container = document.getElementById('serviceRevenueTableBody');
  const countLabel = document.getElementById('serviceCountLabel');
  if (!container) return;

  const services = reportData.service_breakdown || [];
  if (countLabel) {
    countLabel.textContent = `All ${services.length} Services`;
  }

  if (services.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="px-5 py-6 text-center text-xs text-stone-400">
          No catalog services found.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = services.map(sr => {
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
          ${sr.bookings} booking${sr.bookings === 1 ? '' : 's'}
        </td>
        <td class="px-5 py-3 text-right">
          ${revenuePill}
        </td>
      </tr>
    `;
  }).join('');
}

// ================= 8. EXPORT REPORT MODAL & DOWNLOAD =================
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
  showToast(`Preparing ${reportType} for printable PDF statement...`, 'info');
  setTimeout(() => {
    window.print();
  }, 400);
}

// Export Excel / CSV spreadsheet using live backend data
function handleExportExcel() {
  const reportType = document.getElementById('exportReportType') ? document.getElementById('exportReportType').value : 'Complete Salon Report';
  if (!reportData) {
    showToast('Report data is still loading. Please try again.', 'warning');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "NELY'S SALON MANAGEMENT SYSTEM - OFFICIAL REPORT\n";
  csvContent += `Generated Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n`;
  csvContent += `Date Range: ${reportData.label}\n`;
  csvContent += `Report Type: ${reportType}\n\n`;

  // Summary section
  csvContent += "EXECUTIVE SUMMARY\n";
  csvContent += `Total Revenue (PHP),${reportData.summary.total_revenue}\n`;
  csvContent += `Revenue Growth,${reportData.summary.revenue_growth}\n`;
  csvContent += `Total Appointments,${reportData.summary.total_appointments}\n`;
  csvContent += `Appointment Growth,${reportData.summary.appointment_growth}\n`;
  csvContent += `Total Customers,${reportData.summary.total_customers}\n`;
  csvContent += `New Customers,${reportData.summary.new_customers}\n`;
  csvContent += `Completed Services,${reportData.summary.completed_services}\n`;
  csvContent += `Completion Rate,${reportData.summary.completion_rate}\n\n`;

  if (reportType === 'Service Report' || reportType === 'Complete Salon Report') {
    csvContent += "SERVICE REVENUE BREAKDOWN\n";
    csvContent += "Service,Price,Bookings,Total Revenue (PHP)\n";
    (reportData.service_breakdown || []).forEach(row => {
      csvContent += `"${row.service}","${row.priceDisplay}","${row.bookings}","${row.revenue}"\n`;
    });
    csvContent += "\n";
  }

  if (reportType === 'Staff Report' || reportType === 'Complete Salon Report') {
    csvContent += "STAFF PERFORMANCE\n";
    csvContent += "Staff Name,Role,Appointments,Completed,Revenue (PHP)\n";
    (reportData.staff_performance || []).forEach(row => {
      csvContent += `"${row.staff}","${row.role}","${row.appointments}","${row.completed}","${row.revenue}"\n`;
    });
    csvContent += "\n";
  }

  if (reportType === 'Customer Report' || reportType === 'Complete Salon Report') {
    csvContent += "CUSTOMER STATISTICS\n";
    csvContent += `Total Customers,${reportData.customer_stats.total}\n`;
    csvContent += `New Customers,${reportData.customer_stats.new}\n`;
    csvContent += `Returning Customers,${reportData.customer_stats.returning}\n`;
    csvContent += `Inactive Customers,${reportData.customer_stats.inactive}\n`;
    csvContent += `Retention Rate,${reportData.customer_stats.retention_rate}%\n\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Nelys_Salon_${reportType.replace(/\s+/g, '_')}_${currentDateRange}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  closeExportModal();
  showToast(`Excel CSV exported: ${reportType}`, 'success');
}

// ================= CLOSE ALL MODALS =================
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

// ================= MOBILE NAVIGATION =================
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

// ================= STANDARDIZED ADMIN LOGOUT HANDLERS =================
function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
  }
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
  }
}

function handleConfirmLogout() {
  try {
    localStorage.removeItem('nelys_token');
    localStorage.removeItem('nelys_user');
    sessionStorage.clear();
  } catch(e) {}
  window.location.href = '../login.html';
}

function confirmLogout() {
  handleConfirmLogout();
}

window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.handleConfirmLogout = handleConfirmLogout;
window.confirmLogout = confirmLogout;
