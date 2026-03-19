/**
 * views/history.js — History view renderer & controller
 */

const HistoryView = (() => {

  let _filterMonth = '';

  function formatCurrency(n) {
    return '$' + (n || 0).toFixed(2);
  }

  function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function render() {
    const container = document.getElementById('view-history');
    const shifts    = Storage.getShifts();
    const settings  = Storage.getSettings();
    const unit      = settings.distanceUnit === 'km' ? 'km' : 'mi';

    // Month options for filter
    const months = [...new Set(shifts.map(s =>
      new Date(s.startTime).toISOString().slice(0, 7)
    ))].sort().reverse();

    let filtered = _filterMonth
      ? shifts.filter(s => s.startTime.startsWith(_filterMonth))
      : shifts;

    // Aggregate stats for filtered set
    const aggr = filtered.reduce((acc, s) => {
      const st = Storage.calcShiftStats(s);
      acc.earnings += st.totalEarnings;
      acc.tips     += st.totalTips;
      acc.miles    += (st.mileage || 0);
      acc.time     += st.duration;
      return acc;
    }, { earnings: 0, tips: 0, miles: 0, time: 0 });

    container.innerHTML = `
      <div class="view-header">
        <div>
          <div class="view-title">History</div>
          <div class="view-subtitle">${filtered.length} shift${filtered.length !== 1 ? 's' : ''}</div>
        </div>
        ${months.length > 1 ? `
          <select id="month-filter" class="form-select" style="width:auto;font-size:0.8rem;padding:0.4rem 2rem 0.4rem 0.6rem">
            <option value="">All time</option>
            ${months.map(m => `<option value="${m}" ${m === _filterMonth ? 'selected' : ''}>${formatMonth(m)}</option>`).join('')}
          </select>` : ''}
      </div>

      <div class="view-body">
        ${filtered.length > 0 ? `
          <!-- Summary strip -->
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-label">Total Earned</div>
              <div class="stat-value green">${formatCurrency(aggr.earnings)}</div>
              <div class="stat-sub">${formatCurrency(aggr.tips)} in tips</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Time</div>
              <div class="stat-value" style="font-size:1.25rem">${formatDuration(aggr.time)}</div>
              <div class="stat-sub">${filtered.length} shifts</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Mileage</div>
              <div class="stat-value">${aggr.miles.toFixed(1)}</div>
              <div class="stat-sub">${unit}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Avg / Shift</div>
              <div class="stat-value green" style="font-size:1.25rem">${formatCurrency(aggr.earnings / filtered.length)}</div>
              <div class="stat-sub">per shift</div>
            </div>
          </div>

          <!-- Shift list -->
          <div id="shift-list">
            ${filtered.map(s => renderShiftItem(s, unit)).join('')}
          </div>
        ` : renderEmpty()}
      </div>
    `;

    bindHistoryEvents();
  }

  function renderShiftItem(shift, unit) {
    const stats = Storage.calcShiftStats(shift);
    return `
      <div class="history-item" data-shift-id="${shift.id}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div>
            <div class="history-date">${formatDate(shift.startTime)}</div>
            <div class="history-earnings">${formatCurrency(stats.totalEarnings)}</div>
          </div>
          <button class="btn btn-icon btn-secondary delete-shift-btn" data-shift-id="${shift.id}" aria-label="Delete shift" style="margin-top:0.125rem">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>

        <div class="history-meta-row">
          <div class="history-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <strong>${formatTime(shift.startTime)}</strong>
            <span>→</span>
            <strong>${shift.endTime ? formatTime(shift.endTime) : '—'}</strong>
          </div>
          <div class="history-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <strong>${formatDuration(stats.duration)}</strong>
          </div>
          ${stats.mileage !== null ? `
          <div class="history-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
            <strong>${stats.mileage.toFixed(1)} ${unit}</strong>
          </div>` : ''}
          <div class="history-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <strong>${formatCurrency(stats.totalTips)}</strong> tips (${(shift.tips||[]).length})
          </div>
          ${shift.basePay ? `
          <div class="history-meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            Base: <strong>${formatCurrency(shift.basePay)}</strong>
          </div>` : ''}
        </div>
      </div>
    `;
  }

  function renderEmpty() {
    return `
      <div class="history-empty">
        <div class="history-empty-icon">🚗</div>
        <div>No shifts yet.<br>Start your first shift on the Dashboard!</div>
      </div>
    `;
  }

  function formatMonth(ym) {
    const [y, m] = ym.split('-');
    return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  function bindHistoryEvents() {
    const filter = document.getElementById('month-filter');
    if (filter) {
      filter.addEventListener('change', () => {
        _filterMonth = filter.value;
        render();
      });
    }

    document.querySelectorAll('.delete-shift-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this shift? This cannot be undone.')) {
          const shiftId = btn.dataset.shiftId;
          Storage.deleteShift(shiftId);
          if (Storage.getSettings().autoSync) Cloud.deleteShift(shiftId);
          render();
          showToast('Shift deleted', 'info');
        }
      });
    });
  }

  return { render };
})();
