/**
 * storage.js — Local data layer for RouteLog
 * All data lives in localStorage; cloud sync happens on top.
 */

const Storage = (() => {
  const KEYS = {
    SHIFTS:      'routelog_shifts',
    ACTIVE:      'routelog_active_shift',
    SETTINGS:    'routelog_settings',
  };

  // ── Defaults ────────────────────────────────────────────
  const DEFAULT_SETTINGS = {
    driverName:       '',
    distanceUnit:     'miles',      // 'miles' | 'km'
    darkMode:         false,
    cloudProvider:    'none',       // 'none' | 'google' | 'apple'
    googleDriveFileId: '',
    googleAccessToken: '',
    icloudEndpoint:   '',
    icloudToken:      '',
    autoSync:         true,
    defaultPlatform:  '',           // e.g. 'DoorDash', 'Uber Eats'
    hourlyGoal:       '',
  };

  // ── Settings ────────────────────────────────────────────
  function getSettings() {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  // ── Shifts ──────────────────────────────────────────────
  function getShifts() {
    try {
      const raw = localStorage.getItem(KEYS.SHIFTS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function saveShifts(shifts) {
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
  }

  function addShift(shift) {
    const shifts = getShifts();
    shifts.unshift(shift); // newest first
    saveShifts(shifts);
    return shifts;
  }

  function deleteShift(id) {
    const shifts = getShifts().filter(s => s.id !== id);
    saveShifts(shifts);
    return shifts;
  }

  // ── Active Shift ─────────────────────────────────────────
  function getActiveShift() {
    try {
      const raw = localStorage.getItem(KEYS.ACTIVE);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveActiveShift(shift) {
    if (shift === null) {
      localStorage.removeItem(KEYS.ACTIVE);
    } else {
      localStorage.setItem(KEYS.ACTIVE, JSON.stringify(shift));
    }
  }

  // ── Export all data (for cloud sync) ────────────────────
  function exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      shifts: getShifts(),
      settings: getSettings(),
    };
  }

  // ── Import from cloud ────────────────────────────────────
  function importAll(data) {
    if (!data || data.version !== 1) throw new Error('Invalid data format');
    if (Array.isArray(data.shifts)) saveShifts(data.shifts);
    // don't overwrite settings from cloud (they're device-specific)
  }

  // ── Stats helpers ────────────────────────────────────────
  function getWeekShifts() {
    const shifts = getShifts();
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    return shifts.filter(s => new Date(s.startTime) >= startOfWeek);
  }

  function calcShiftStats(shift) {
    const duration = shift.endTime
      ? (new Date(shift.endTime) - new Date(shift.startTime))
      : (Date.now() - new Date(shift.startTime));

    const totalTips = (shift.tips || []).reduce((sum, t) => sum + t.amount, 0);
    const totalEarnings = (shift.basePay || 0) + totalTips;
    const mileage = (shift.endOdometer && shift.startOdometer)
      ? (shift.endOdometer - shift.startOdometer)
      : null;

    return { duration, totalTips, totalEarnings, mileage };
  }

  return {
    getSettings, saveSettings,
    getShifts, saveShifts, addShift, deleteShift,
    getActiveShift, saveActiveShift,
    exportAll, importAll,
    getWeekShifts, calcShiftStats,
    DEFAULT_SETTINGS,
  };
})();
