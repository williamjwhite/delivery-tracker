/**
 * views/settings.js — Settings view renderer & controller
 */

const SettingsView = (() => {

  function render() {
    const container = document.getElementById('view-settings');
    const s         = Storage.getSettings();
    const { status, lastSync } = Cloud.getStatus();

    const syncStatusHtml = (() => {
      if (!Cloud.isConfigured()) return `<span style="color:var(--muted-foreground)">Not connected</span>`;
      if (status === 'synced' && lastSync) {
        const ago = timeSince(new Date(lastSync));
        return `<span style="color:#22c55e">✓ Last synced ${ago}</span>`;
      }
      if (status === 'error') return `<span style="color:var(--destructive)">✕ Sync error</span>`;
      if (status === 'syncing') return `<span style="color:var(--primary)">↻ Syncing…</span>`;
      return `<span style="color:var(--muted-foreground)">URL saved, not yet tested</span>`;
    })();

    container.innerHTML = `
      <div class="view-header">
        <div>
          <div class="view-title">Settings</div>
          <div class="view-subtitle">Preferences & cloud sync</div>
        </div>
      </div>

      <div class="view-body">

        <!-- ── Driver ───────────────────────────── -->
        <div class="settings-section">
          <div class="settings-section-title">Driver</div>
          <div class="card card-sm">
            <div class="form-group" style="margin-bottom:0.75rem">
              <label class="form-label">Your Name</label>
              <input id="s-name" type="text" class="form-input" placeholder="e.g. Jordan Smith" value="${escHtml(s.driverName)}" />
            </div>
            <div class="form-group" style="margin-bottom:0.75rem">
              <label class="form-label">Default Platform</label>
              <input id="s-platform" type="text" class="form-input" placeholder="e.g. DoorDash, Uber Eats" value="${escHtml(s.defaultPlatform)}" />
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Distance Unit</label>
              <select id="s-unit" class="form-select">
                <option value="miles" ${s.distanceUnit === 'miles' ? 'selected' : ''}>Miles</option>
                <option value="km"    ${s.distanceUnit === 'km'    ? 'selected' : ''}>Kilometers</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ── Appearance ─────────────────────── -->
        <div class="settings-section">
          <div class="settings-section-title">Appearance</div>
          <div class="card card-sm">
            <div class="toggle-row" style="border-bottom:none">
              <div class="toggle-label-wrap">
                <div class="toggle-label">Dark Mode</div>
                <div class="toggle-desc">Switch to a darker interface</div>
              </div>
              <label class="toggle">
                <input type="checkbox" id="s-dark" ${s.darkMode ? 'checked' : ''} />
                <span class="toggle-track"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- ── Google Sheets Sync ──────────────── -->
        <div class="settings-section">
          <div class="settings-section-title">Cloud Sync — Google Sheets</div>
          <div class="card card-sm">

            <!-- Status row -->
            <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:1rem;padding-bottom:0.875rem;border-bottom:1px solid var(--border)">
              <div style="font-size:1.5rem">📊</div>
              <div>
                <div style="font-size:0.875rem;font-weight:600">Google Sheets</div>
                <div style="font-size:0.72rem" id="sync-status-text">${syncStatusHtml}</div>
              </div>
            </div>

            <!-- How-to callout -->
            <div style="background:color-mix(in srgb, var(--primary) 10%, var(--background));border:1px solid color-mix(in srgb, var(--primary) 30%, transparent);border-radius:calc(var(--radius) - 4px);padding:0.75rem;margin-bottom:1rem;font-size:0.78rem;line-height:1.6">
              <strong>One-time setup (2 min):</strong><br>
              1. Open <a href="https://sheets.new" target="_blank" style="color:var(--primary)">sheets.new</a> → name it "RouteLog Data"<br>
              2. Click <strong>Extensions → Apps Script</strong><br>
              3. Paste the contents of <strong>google-apps-script.js</strong> (included in your download)<br>
              4. Click <strong>Deploy → New deployment → Web app</strong><br>
              5. Set <em>Execute as: Me</em> &amp; <em>Who has access: Anyone</em><br>
              6. Copy the URL and paste it below
            </div>

            <div class="form-group">
              <label class="form-label">Web App URL</label>
              <input id="s-sheets-url" type="url" class="form-input"
                placeholder="https://script.google.com/macros/s/…/exec"
                value="${escHtml(s.sheetsWebAppUrl || '')}" />
              <div class="text-xs text-muted mt-1">
                Treat this URL like a password — it grants access to your sheet data. Don't commit it to a public repo.
              </div>
            </div>

            <div class="toggle-row" style="padding-top:0.75rem;border-top:1px solid var(--border)">
              <div class="toggle-label-wrap">
                <div class="toggle-label">Auto-sync after each shift</div>
                <div class="toggle-desc">Push to Sheets when you end a shift</div>
              </div>
              <label class="toggle">
                <input type="checkbox" id="s-autosync" ${s.autoSync !== false ? 'checked' : ''} />
                <span class="toggle-track"></span>
              </label>
            </div>

            <div style="display:flex;gap:0.5rem;margin-top:1rem">
              <button id="btn-test-sync" class="btn btn-outline" style="flex:1">🔌 Test</button>
              <button id="btn-push-all" class="btn btn-secondary" style="flex:1">⬆ Push All</button>
              <button id="btn-pull" class="btn btn-secondary" style="flex:1">⬇ Pull</button>
            </div>
          </div>
        </div>

        <!-- ── Data ────────────────────────────── -->
        <div class="settings-section">
          <div class="settings-section-title">Data</div>
          <div class="card card-sm">
            <div class="toggle-row">
              <div class="toggle-label-wrap">
                <div class="toggle-label">Export backup</div>
                <div class="toggle-desc">Download all shifts as JSON</div>
              </div>
              <button id="btn-export" class="btn btn-secondary" style="font-size:0.78rem;padding:0.4rem 0.8rem">Export</button>
            </div>
            <div class="divider"></div>
            <div class="toggle-row" style="border-bottom:none">
              <div class="toggle-label-wrap">
                <div class="toggle-label" style="color:var(--destructive)">Clear all data</div>
                <div class="toggle-desc">Delete all local shifts</div>
              </div>
              <button id="btn-clear" class="btn btn-danger" style="font-size:0.78rem;padding:0.4rem 0.8rem">Clear</button>
            </div>
          </div>
        </div>

        <button id="btn-save-settings" class="btn btn-primary btn-full btn-lg">
          Save Settings
        </button>

        <div style="text-align:center;margin-top:0.75rem">
          <span class="text-xs text-muted">RouteLog v1.0 · <a href="https://github.com/williamjwhite/delivery-tracker" target="_blank" style="color:var(--primary)">GitHub</a></span>
        </div>

      </div>
    `;

    bindSettingsEvents();
  }

  function bindSettingsEvents() {
    // Dark mode live preview
    document.getElementById('s-dark').addEventListener('change', function() {
      applyTheme(this.checked);
    });

    // Test connection
    document.getElementById('btn-test-sync').addEventListener('click', async () => {
      saveSettingsData();
      if (!Cloud.isConfigured()) {
        showToast('Paste your Web App URL first', 'error'); return;
      }
      showToast('Testing connection…', 'info');
      const result = await Cloud.testConnection();
      if (result.ok) {
        showToast(`✓ Connected! ${result.shiftCount} shift(s) in Sheet`, 'success', 4000);
        render(); // refresh status line
      } else {
        showToast(`Connection failed: ${result.error}`, 'error', 5000);
      }
    });

    // Push all
    document.getElementById('btn-push-all').addEventListener('click', async () => {
      saveSettingsData();
      if (!Cloud.isConfigured()) { showToast('Configure Web App URL first', 'error'); return; }
      showToast('Pushing all shifts…', 'info');
      const ok = await Cloud.push();
      if (ok) { showToast('All shifts synced to Sheets!', 'success'); render(); }
      else     { showToast('Push failed — check URL', 'error'); }
    });

    // Pull
    document.getElementById('btn-pull').addEventListener('click', async () => {
      saveSettingsData();
      if (!Cloud.isConfigured()) { showToast('Configure Web App URL first', 'error'); return; }
      showToast('Pulling from Sheets…', 'info');
      const data = await Cloud.pull();
      if (data) {
        showToast(`Pulled ${(data.shifts||[]).length} shift(s) from Sheets!`, 'success');
        render();
      } else {
        showToast('Pull failed — check URL', 'error');
      }
    });

    // Export
    document.getElementById('btn-export').addEventListener('click', () => {
      const data = JSON.stringify(Storage.exportAll(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `routelog-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded!', 'success');
    });

    // Clear
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('Delete ALL local shift data? This cannot be undone.\n\n(Your Google Sheet is unaffected.)')) {
        Storage.saveShifts([]);
        showToast('Local data cleared', 'info');
      }
    });

    // Save
    document.getElementById('btn-save-settings').addEventListener('click', () => {
      saveSettingsData();
      showToast('Settings saved!', 'success');
    });
  }

  function saveSettingsData() {
    const s = Storage.getSettings();
    s.driverName      = document.getElementById('s-name')?.value.trim() || '';
    s.defaultPlatform = document.getElementById('s-platform')?.value.trim() || '';
    s.distanceUnit    = document.getElementById('s-unit')?.value || 'miles';
    s.darkMode        = document.getElementById('s-dark')?.checked || false;
    s.sheetsWebAppUrl = document.getElementById('s-sheets-url')?.value.trim() || '';
    s.autoSync        = document.getElementById('s-autosync')?.checked !== false;
    Storage.saveSettings(s);
    applyTheme(s.darkMode);
  }

  function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function timeSince(date) {
    const s = Math.floor((Date.now() - date) / 1000);
    if (s < 60)   return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  }

  document.addEventListener('cloud:status', () => {
    // Refresh status text if settings view is active
    const el = document.getElementById('sync-status-text');
    if (!el) return;
    const { status, lastSync } = Cloud.getStatus();
    if (status === 'synced' && lastSync) {
      el.innerHTML = `<span style="color:#22c55e">✓ Last synced ${timeSince(new Date(lastSync))}</span>`;
    } else if (status === 'syncing') {
      el.innerHTML = `<span style="color:var(--primary)">↻ Syncing…</span>`;
    } else if (status === 'error') {
      el.innerHTML = `<span style="color:var(--destructive)">✕ Sync error — check URL</span>`;
    }
  });

  return { render };
})();
