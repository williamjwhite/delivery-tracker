/**
 * views/settings.js — Settings view renderer & controller
 */

const SettingsView = (() => {

  function render() {
    const container = document.getElementById('view-settings');
    const s         = Storage.getSettings();

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
            <div class="form-group" style="margin-bottom:0.5rem">
              <label class="form-label">Your Name</label>
              <input id="s-name" type="text" class="form-input" placeholder="e.g. Jordan Smith" value="${escHtml(s.driverName)}" />
            </div>
            <div class="form-group" style="margin-bottom:0.5rem">
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
            <div class="toggle-row">
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

        <!-- ── Cloud Sync ──────────────────────── -->
        <div class="settings-section">
          <div class="settings-section-title">Cloud Sync</div>

          <!-- Provider picker -->
          <div class="card card-sm" style="margin-bottom:0.75rem">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Cloud Provider</label>
              <select id="s-cloud-provider" class="form-select">
                <option value="none"   ${s.cloudProvider === 'none'   ? 'selected' : ''}>None (local only)</option>
                <option value="google" ${s.cloudProvider === 'google' ? 'selected' : ''}>Google Drive</option>
                <option value="apple"  ${s.cloudProvider === 'apple'  ? 'selected' : ''}>Apple / Custom Endpoint</option>
              </select>
            </div>
          </div>

          <!-- Google Drive -->
          <div id="gdrive-section" class="${s.cloudProvider === 'google' ? '' : 'hidden'}" style="margin-bottom:0.75rem">
            <div class="card card-sm">
              <div class="cloud-status-card" style="margin-bottom:0.75rem">
                <div class="cloud-icon google">☁️</div>
                <div class="cloud-info">
                  <div class="cloud-name">Google Drive</div>
                  <div class="cloud-status-text" id="gdrive-status-text">
                    ${s.googleAccessToken ? '✓ Connected — token stored' : 'Not connected'}
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">OAuth Client ID
                  <span class="text-xs text-muted" style="font-weight:400"> — from Google Cloud Console</span>
                </label>
                <input id="s-gclient" type="text" class="form-input" placeholder="xxxxx.apps.googleusercontent.com" value="${escHtml(s.googleClientId || '')}" />
                <div class="text-xs text-muted mt-1">
                  Create a project at <strong>console.cloud.google.com</strong>, enable Drive API, add an OAuth 2.0 Web Client ID with this page's URL as an authorized redirect URI.
                </div>
              </div>

              <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                <button id="btn-gdrive-auth" class="btn btn-primary" style="flex:1">
                  ${s.googleAccessToken ? '↻ Re-authenticate' : '🔗 Connect Google Drive'}
                </button>
                ${s.googleAccessToken ? `<button id="btn-gdrive-pull" class="btn btn-secondary">⬇ Pull Data</button>` : ''}
              </div>

              ${s.googleAccessToken ? `
                <div class="toggle-row" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)">
                  <div class="toggle-label-wrap">
                    <div class="toggle-label">Auto-sync after each shift</div>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" id="s-autosync" ${s.autoSync ? 'checked' : ''} />
                    <span class="toggle-track"></span>
                  </label>
                </div>` : ''}
            </div>
          </div>

          <!-- Apple / Custom -->
          <div id="apple-section" class="${s.cloudProvider === 'apple' ? '' : 'hidden'}" style="margin-bottom:0.75rem">
            <div class="card card-sm">
              <div class="cloud-status-card" style="margin-bottom:0.75rem">
                <div class="cloud-icon apple">🍎</div>
                <div class="cloud-info">
                  <div class="cloud-name">Apple / Custom Endpoint</div>
                  <div class="cloud-status-text">${s.icloudEndpoint ? `Endpoint set` : 'Not configured'}</div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Endpoint URL</label>
                <input id="s-icloud-url" type="url" class="form-input" placeholder="https://your-endpoint.example.com/routelog" value="${escHtml(s.icloudEndpoint)}" />
                <div class="text-xs text-muted mt-1">
                  Must accept <strong>GET</strong> (pull) and <strong>PUT</strong> (push) requests returning/accepting JSON. Works with CloudKit JS Web Services or any REST API you control.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Bearer Token <span class="text-xs text-muted">(optional)</span></label>
                <input id="s-icloud-token" type="password" class="form-input" placeholder="sk-…" value="${escHtml(s.icloudToken)}" />
              </div>

              <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                <button id="btn-apple-test" class="btn btn-primary" style="flex:1">🔌 Test Connection</button>
                <button id="btn-apple-pull" class="btn btn-secondary">⬇ Pull Data</button>
              </div>

              <div class="toggle-row" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)">
                <div class="toggle-label-wrap">
                  <div class="toggle-label">Auto-sync after each shift</div>
                </div>
                <label class="toggle">
                  <input type="checkbox" id="s-autosync-apple" ${s.autoSync ? 'checked' : ''} />
                  <span class="toggle-track"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Data ────────────────────────────── -->
        <div class="settings-section">
          <div class="settings-section-title">Data</div>
          <div class="card card-sm">
            <div class="toggle-row" style="border-bottom:none">
              <div class="toggle-label-wrap">
                <div class="toggle-label">Export all data</div>
                <div class="toggle-desc">Download a JSON backup of all shifts</div>
              </div>
              <button id="btn-export" class="btn btn-secondary" style="font-size:0.78rem;padding:0.4rem 0.8rem">Export</button>
            </div>
            <div class="divider"></div>
            <div class="toggle-row" style="border-bottom:none">
              <div class="toggle-label-wrap">
                <div class="toggle-label" style="color:var(--destructive)">Clear all data</div>
                <div class="toggle-desc">Permanently delete all local shifts</div>
              </div>
              <button id="btn-clear" class="btn btn-danger" style="font-size:0.78rem;padding:0.4rem 0.8rem">Clear</button>
            </div>
          </div>
        </div>

        <!-- Save button -->
        <button id="btn-save-settings" class="btn btn-primary btn-full btn-lg">
          Save Settings
        </button>

        <div style="text-align:center;margin-top:0.75rem">
          <span class="text-xs text-muted">RouteLog v1.0 — Open source, data stays yours</span>
        </div>
      </div>
    `;

    bindSettingsEvents();
  }

  function bindSettingsEvents() {
    const s = Storage.getSettings();

    // Cloud provider switcher
    document.getElementById('s-cloud-provider').addEventListener('change', function() {
      document.getElementById('gdrive-section').className = this.value === 'google' ? '' : 'hidden';
      document.getElementById('apple-section').className = this.value === 'apple' ? '' : 'hidden';
    });

    // Dark mode live preview
    document.getElementById('s-dark').addEventListener('change', function() {
      applyTheme(this.checked);
    });

    // Google auth
    const btnAuth = document.getElementById('btn-gdrive-auth');
    if (btnAuth) {
      btnAuth.addEventListener('click', () => {
        saveSettingsData(); // save client id first
        Cloud.startGoogleAuth();
      });
    }

    // Google pull
    const btnPull = document.getElementById('btn-gdrive-pull');
    if (btnPull) {
      btnPull.addEventListener('click', async () => {
        saveSettingsData();
        showToast('Pulling from Google Drive…', 'info');
        const data = await Cloud.pull();
        if (data) showToast('Data synced from Drive!', 'success');
        else       showToast('Pull failed — check token', 'error');
      });
    }

    // Apple test
    const btnTest = document.getElementById('btn-apple-test');
    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        saveSettingsData();
        showToast('Testing connection…', 'info');
        const data = await Cloud.pull();
        if (data !== null) showToast('Connection successful!', 'success');
        else               showToast('Connection failed — check URL/token', 'error');
      });
    }

    // Apple pull
    const btnApplePull = document.getElementById('btn-apple-pull');
    if (btnApplePull) {
      btnApplePull.addEventListener('click', async () => {
        saveSettingsData();
        showToast('Pulling data…', 'info');
        const data = await Cloud.pull();
        if (data) showToast('Data synced!', 'success');
        else      showToast('Pull failed', 'error');
      });
    }

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
      showToast('Export downloaded!', 'success');
    });

    // Clear
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('Delete ALL shift data? This cannot be undone.')) {
        Storage.saveShifts([]);
        showToast('All data cleared', 'info');
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
    s.cloudProvider   = document.getElementById('s-cloud-provider')?.value || 'none';
    s.googleClientId  = document.getElementById('s-gclient')?.value.trim() || '';
    s.icloudEndpoint  = document.getElementById('s-icloud-url')?.value.trim() || '';
    s.icloudToken     = document.getElementById('s-icloud-token')?.value.trim() || '';

    const autoGoogle = document.getElementById('s-autosync');
    const autoApple  = document.getElementById('s-autosync-apple');
    if (autoGoogle) s.autoSync = autoGoogle.checked;
    if (autoApple)  s.autoSync = autoApple.checked;

    Storage.saveSettings(s);
    applyTheme(s.darkMode);
  }

  function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render };
})();
