/**
 * cloud.js — Google Sheets sync via Apps Script Web App
 *
 * No OAuth, no API keys, no Google Cloud Console.
 * The Web App URL acts as both the endpoint and the secret —
 * keep it private (don't commit it to a public repo).
 */

const Cloud = (() => {

  let _status   = 'idle';
  let _lastSync = null;

  function getStatus() { return { status: _status, lastSync: _lastSync }; }

  function setStatus(s) {
    _status = s;
    if (s === 'synced') _lastSync = new Date().toISOString();
    document.dispatchEvent(new CustomEvent('cloud:status', {
      detail: { status: _status, lastSync: _lastSync }
    }));
  }

  function getEndpoint() {
    return (Storage.getSettings().sheetsWebAppUrl || '').trim();
  }

  function isConfigured() {
    const url = getEndpoint();
    return url.startsWith('https://script.google.com/macros/s/');
  }

  async function appsScriptPost(action, payload) {
    const url = getEndpoint();
    const res = await fetch(url, {
      method:  'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Apps Script error');
    return data;
  }

  async function appsScriptGet() {
    const url = getEndpoint();
    const res = await fetch(url + '?_=' + Date.now(), {
      method: 'GET', redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Apps Script error');
    return data.data;
  }

  async function push() {
    if (!isConfigured()) return false;
    setStatus('syncing');
    try {
      await appsScriptPost('sync_shifts', Storage.getShifts());
      setStatus('synced');
      return true;
    } catch (err) {
      console.error('[Cloud] push error:', err);
      setStatus('error');
      return false;
    }
  }

  async function pushShift(shift) {
    if (!isConfigured()) return false;
    setStatus('syncing');
    try {
      await appsScriptPost('add_shift', shift);
      setStatus('synced');
      return true;
    } catch (err) {
      console.error('[Cloud] pushShift error:', err);
      setStatus('error');
      return false;
    }
  }

  async function deleteShift(id) {
    if (!isConfigured()) return false;
    try {
      await appsScriptPost('delete_shift', { id });
      return true;
    } catch (err) {
      console.error('[Cloud] deleteShift error:', err);
      return false;
    }
  }

  async function pull() {
    if (!isConfigured()) return null;
    setStatus('syncing');
    try {
      const remote = await appsScriptGet();
      if (remote && Array.isArray(remote.shifts) && remote.shifts.length > 0) {
        const active = Storage.getActiveShift();
        Storage.saveShifts(remote.shifts);
        if (active) Storage.saveActiveShift(active);
      }
      setStatus('synced');
      return remote;
    } catch (err) {
      console.error('[Cloud] pull error:', err);
      setStatus('error');
      return null;
    }
  }

  async function testConnection() {
    if (!isConfigured()) return { ok: false, error: 'No URL configured' };
    try {
      const data = await appsScriptGet();
      return { ok: true, shiftCount: (data.shifts || []).length };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function handleOAuthRedirect() { return false; }

  return {
    push, pushShift, pull, deleteShift,
    testConnection, getStatus, setStatus,
    isConfigured, handleOAuthRedirect,
  };
})();
