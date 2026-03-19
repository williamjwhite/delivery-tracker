/**
 * views/dashboard.js — Dashboard view renderer & controller
 */

const DashboardView = (() => {

  function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function formatCurrency(n) {
    return '$' + (n || 0).toFixed(2);
  }

  function render() {
    const container = document.getElementById('view-dashboard');
    const active    = Shift.getActive();
    const settings  = Storage.getSettings();
    const weekShifts = Storage.getWeekShifts();
    const weekStats  = weekShifts.reduce((acc, s) => {
      const st = Storage.calcShiftStats(s);
      acc.earnings += st.totalEarnings;
      acc.tips     += st.totalTips;
      acc.miles    += (st.mileage || 0);
      acc.time     += st.duration;
      return acc;
    }, { earnings: 0, tips: 0, miles: 0, time: 0 });

    const unit = settings.distanceUnit === 'km' ? 'km' : 'mi';
    const name = settings.driverName ? `, ${settings.driverName.split(' ')[0]}` : '';

    container.innerHTML = `
      <div class="view-header">
        <div>
          <div class="view-title">RouteLog</div>
          <div class="view-subtitle">${getGreeting()}${name}</div>
        </div>
        <div class="sync-row" id="sync-status-row">
          <div class="sync-dot" id="sync-dot"></div>
          <span id="sync-label">Local</span>
        </div>
      </div>

      <div class="view-body">
        <!-- Week summary banner -->
        <div class="week-banner">
          <div class="week-banner-title">This Week</div>
          <div class="week-banner-value">${formatCurrency(weekStats.earnings)}</div>
          <div class="week-banner-sub">
            ${weekShifts.length} shift${weekShifts.length !== 1 ? 's' : ''} &middot;
            ${(weekStats.miles).toFixed(1)} ${unit} &middot;
            ${formatDuration(weekStats.time)}
          </div>
        </div>

        <!-- Active / Start Shift Card -->
        ${active ? renderActiveShift(active, unit) : renderStartCard()}
      </div>
    `;

    updateSyncUI();
    bindDashboardEvents();

    // Hook timer ticks
    Shift.onTick((ms) => {
      const el = document.getElementById('live-timer');
      if (el) el.textContent = formatDuration(ms);
      updateLiveTips();
    });

    if (Shift.isActive()) {
      const el = document.getElementById('live-timer');
      if (el) el.textContent = formatDuration(Shift.getElapsed());
      updateLiveTips();
    }
  }

  function renderActiveShift(shift, unit) {
    const stats = Storage.calcShiftStats(shift);
    const tipsHtml = (shift.tips || []).length === 0
      ? `<div class="text-sm text-muted" style="padding:0.5rem 0; text-align:center">No tips logged yet</div>`
      : (shift.tips || []).slice().reverse().map(t => `
          <div class="tip-item">
            <div>
              <div class="tip-amount">${formatCurrency(t.amount)}</div>
              <div class="tip-meta">${t.note || formatTime(t.time)}</div>
            </div>
            <button class="tip-delete" data-tip-id="${t.id}" aria-label="Remove tip">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`).join('');

    return `
      <!-- Shift in progress -->
      <div class="card shift-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.875rem">
          <span class="status-badge online">
            <span class="status-dot"></span> Online
          </span>
          <span class="text-xs text-muted">Started ${formatTime(shift.startTime)}</span>
        </div>

        <div class="timer-display" id="live-timer">${formatDuration(Shift.getElapsed())}</div>

        <div class="stat-grid" style="margin-top:1rem">
          <div class="stat-card">
            <div class="stat-label">Tips</div>
            <div class="stat-value green" id="live-tips-total">${formatCurrency(stats.totalTips)}</div>
            <div class="stat-sub" id="live-tip-count">${(shift.tips||[]).length} logged</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Start Odo</div>
            <div class="stat-value">${shift.startOdometer > 0 ? shift.startOdometer.toLocaleString() : '—'}</div>
            <div class="stat-sub">${unit}</div>
          </div>
        </div>

        <!-- Tip list -->
        <div style="margin-top:1rem">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem">
            <div class="section-label">Tips</div>
            <button id="btn-add-tip" class="btn btn-outline" style="padding:0.3rem 0.875rem;font-size:0.78rem">
              + Add Tip
            </button>
          </div>
          <div class="tip-list" id="tip-list">${tipsHtml}</div>
        </div>

        <!-- End shift -->
        <div style="margin-top:1.25rem">
          <button id="btn-end-shift" class="btn btn-danger btn-full btn-lg">
            End Shift
          </button>
        </div>
      </div>
    `;
  }

  function renderStartCard() {
    const settings = Storage.getSettings();
    return `
      <div class="card">
        <div class="status-badge offline" style="margin-bottom:1rem">
          <span class="status-dot"></span> Offline
        </div>

        <div class="form-group">
          <label class="form-label">Start Odometer (${settings.distanceUnit})</label>
          <input id="start-odometer" type="number" inputmode="numeric" placeholder="e.g. 48500" class="form-input" />
        </div>

        <button id="btn-start-shift" class="btn btn-primary btn-full btn-lg" style="margin-top:0.25rem">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start Shift
        </button>
      </div>

      <!-- Quick stats grid -->
      ${renderQuickStats()}
    `;
  }

  function renderQuickStats() {
    const shifts = Storage.getShifts();
    if (shifts.length === 0) return '';

    const last = shifts[0];
    const lastStats = Storage.calcShiftStats(last);
    const settings = Storage.getSettings();
    const unit = settings.distanceUnit === 'km' ? 'km' : 'mi';

    return `
      <div class="section-label" style="margin-top:0.5rem">Last Shift</div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Earnings</div>
          <div class="stat-value green">${formatCurrency(lastStats.totalEarnings)}</div>
          <div class="stat-sub">${formatCurrency(lastStats.totalTips)} in tips</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Duration</div>
          <div class="stat-value" style="font-size:1.25rem">${formatDuration(lastStats.duration)}</div>
          <div class="stat-sub">${new Date(last.startTime).toLocaleDateString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Mileage</div>
          <div class="stat-value">${lastStats.mileage !== null ? lastStats.mileage.toFixed(1) : '—'}</div>
          <div class="stat-sub">${unit}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tips</div>
          <div class="stat-value accent">${(last.tips || []).length}</div>
          <div class="stat-sub">deliveries</div>
        </div>
      </div>
    `;
  }

  function updateLiveTips() {
    const shift = Shift.getActive();
    if (!shift) return;
    const stats = Storage.calcShiftStats(shift);
    const el = document.getElementById('live-tips-total');
    const cnt = document.getElementById('live-tip-count');
    if (el) el.textContent = formatCurrency(stats.totalTips);
    if (cnt) cnt.textContent = `${(shift.tips||[]).length} logged`;
  }

  function bindDashboardEvents() {
    // Start shift
    const btnStart = document.getElementById('btn-start-shift');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const odo = document.getElementById('start-odometer').value;
        Shift.start(odo);
        render();
        showToast('Shift started!', 'success');
      });
    }

    // End shift → open modal
    const btnEnd = document.getElementById('btn-end-shift');
    if (btnEnd) {
      btnEnd.addEventListener('click', () => {
        openModal('end-shift-modal');
      });
    }

    // Add tip → open modal
    const btnTip = document.getElementById('btn-add-tip');
    if (btnTip) {
      btnTip.addEventListener('click', () => {
        openModal('tip-modal');
      });
    }

    // Delete tip buttons
    document.querySelectorAll('.tip-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.tipId, 10);
        Shift.removeTip(id);
        renderTipList();
        updateLiveTips();
      });
    });
  }

  function renderTipList() {
    const shift = Shift.getActive();
    const listEl = document.getElementById('tip-list');
    if (!listEl || !shift) return;
    const tips = (shift.tips || []).slice().reverse();
    if (tips.length === 0) {
      listEl.innerHTML = `<div class="text-sm text-muted" style="padding:0.5rem 0;text-align:center">No tips logged yet</div>`;
      return;
    }
    listEl.innerHTML = tips.map(t => `
      <div class="tip-item">
        <div>
          <div class="tip-amount">${formatCurrency(t.amount)}</div>
          <div class="tip-meta">${t.note || formatTime(t.time)}</div>
        </div>
        <button class="tip-delete" data-tip-id="${t.id}" aria-label="Remove tip">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('.tip-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.tipId, 10);
        Shift.removeTip(id);
        renderTipList();
        updateLiveTips();
      });
    });
  }

  function updateSyncUI() {
    const settings = Storage.getSettings();
    const { status, lastSync } = Cloud.getStatus();
    const dot   = document.getElementById('sync-dot');
    const label = document.getElementById('sync-label');
    if (!dot || !label) return;

    if (settings.cloudProvider === 'none') {
      dot.className = 'sync-dot';
      label.textContent = 'Local only';
      return;
    }

    dot.className = `sync-dot ${status}`;
    const providerName = settings.cloudProvider === 'google' ? 'Drive' : 'iCloud';

    if (status === 'synced' && lastSync) {
      const ago = timeSince(new Date(lastSync));
      label.textContent = `${providerName} · ${ago}`;
    } else if (status === 'syncing') {
      label.textContent = `${providerName} · syncing…`;
    } else if (status === 'error') {
      label.textContent = `${providerName} · sync error`;
    } else {
      label.textContent = providerName;
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function timeSince(date) {
    const s = Math.floor((Date.now() - date) / 1000);
    if (s < 60)  return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  }

  // Listen for cloud status changes
  document.addEventListener('cloud:status', () => updateSyncUI());

  return { render, renderTipList };
})();
