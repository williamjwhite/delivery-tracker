/**
 * cloud.js — Cloud sync layer for RouteLog
 *
 * Google Drive: Uses the Drive REST API v3 with a user-supplied
 *   OAuth token (obtained via Google Sign-In on the settings page).
 *   Data is stored as a single JSON file named "routelog-data.json"
 *   in the user's Drive appDataFolder.
 *
 * Apple / Custom Endpoint: Sends a PUT to a user-configured HTTPS
 *   endpoint with a bearer token. Works with iCloud CloudKit Web
 *   Services or any REST endpoint the user controls.
 */

const Cloud = (() => {

  // ── Status ───────────────────────────────────────────────
  let _status = 'idle'; // idle | syncing | synced | error
  let _lastSync = null;

  function getStatus() { return { status: _status, lastSync: _lastSync }; }

  function setStatus(s) {
    _status = s;
    if (s === 'synced') _lastSync = new Date().toISOString();
    document.dispatchEvent(new CustomEvent('cloud:status', { detail: { status: _status, lastSync: _lastSync } }));
  }

  // ── Google Drive ─────────────────────────────────────────
  const GDRIVE_FILE_NAME = 'routelog-data.json';

  async function gdriveGetFileId(token) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${GDRIVE_FILE_NAME}'&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
    const data = await res.json();
    return data.files?.[0]?.id || null;
  }

  async function gdrivePush(token, payload) {
    const settings = Storage.getSettings();
    let fileId = settings.googleDriveFileId;

    const body = JSON.stringify(payload);
    const blob = new Blob([body], { type: 'application/json' });

    if (!fileId) {
      // Check if file already exists
      fileId = await gdriveGetFileId(token);
    }

    let res;
    if (fileId) {
      // Update existing
      res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: blob,
        }
      );
    } else {
      // Create new in appDataFolder
      const meta = JSON.stringify({ name: GDRIVE_FILE_NAME, parents: ['appDataFolder'] });
      const form = new FormData();
      form.append('metadata', new Blob([meta], { type: 'application/json' }));
      form.append('file', blob);
      res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );
      if (res.ok) {
        const created = await res.json();
        fileId = created.id;
        const s = Storage.getSettings();
        s.googleDriveFileId = fileId;
        Storage.saveSettings(s);
        return; // done
      }
    }

    if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
  }

  async function gdrivePull(token) {
    const settings = Storage.getSettings();
    let fileId = settings.googleDriveFileId;
    if (!fileId) fileId = await gdriveGetFileId(token);
    if (!fileId) return null; // no file yet

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
    return await res.json();
  }

  // ── Apple / Custom Endpoint ──────────────────────────────
  async function customPush(endpoint, token, payload) {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Custom push failed: ${res.status}`);
  }

  async function customPull(endpoint, token) {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`Custom pull failed: ${res.status}`);
    return await res.json();
  }

  // ── Public API ───────────────────────────────────────────
  async function push() {
    const settings = Storage.getSettings();
    if (settings.cloudProvider === 'none') return;
    setStatus('syncing');
    try {
      const payload = Storage.exportAll();
      if (settings.cloudProvider === 'google') {
        await gdrivePush(settings.googleAccessToken, payload);
      } else if (settings.cloudProvider === 'apple') {
        await customPush(settings.icloudEndpoint, settings.icloudToken, payload);
      }
      setStatus('synced');
      return true;
    } catch (err) {
      console.error('[Cloud] push error:', err);
      setStatus('error');
      return false;
    }
  }

  async function pull() {
    const settings = Storage.getSettings();
    if (settings.cloudProvider === 'none') return;
    setStatus('syncing');
    try {
      let data;
      if (settings.cloudProvider === 'google') {
        data = await gdrivePull(settings.googleAccessToken);
      } else if (settings.cloudProvider === 'apple') {
        data = await customPull(settings.icloudEndpoint, settings.icloudToken);
      }
      if (data) Storage.importAll(data);
      setStatus('synced');
      return data;
    } catch (err) {
      console.error('[Cloud] pull error:', err);
      setStatus('error');
      return null;
    }
  }

  // Google OAuth popup flow
  function startGoogleAuth() {
    const settings = Storage.getSettings();
    const clientId = settings.googleClientId || '';
    if (!clientId) {
      showToast('Enter your Google OAuth Client ID in settings first.', 'error');
      return;
    }
    const redirectUri = window.location.origin + window.location.pathname;
    const scope = 'https://www.googleapis.com/auth/drive.appdata';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scope)}`;
    window.location.href = url;
  }

  // Handle OAuth redirect (token in URL hash)
  function handleOAuthRedirect() {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return false;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const token = params.get('access_token');
    if (!token) return false;
    const s = Storage.getSettings();
    s.googleAccessToken = token;
    s.cloudProvider = 'google';
    Storage.saveSettings(s);
    // Clean URL
    history.replaceState(null, '', window.location.pathname);
    showToast('Google Drive connected!', 'success');
    return true;
  }

  return { push, pull, getStatus, startGoogleAuth, handleOAuthRedirect, setStatus };
})();
