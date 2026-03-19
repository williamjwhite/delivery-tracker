/**
 * RouteLog — Google Apps Script Backend
 * =======================================
 * SETUP INSTRUCTIONS (one-time, ~2 minutes):
 *
 * 1. Open a new Google Sheet at sheets.new
 * 2. Name it "RouteLog Data"
 * 3. Click Extensions → Apps Script
 * 4. Delete any existing code, paste this entire file
 * 5. Click Save (floppy disk icon)
 * 6. Click Deploy → New deployment
 * 7. Click the gear icon next to "Select type" → Web app
 * 8. Set:
 *      Description:  RouteLog Sync
 *      Execute as:   Me
 *      Who has access: Anyone   ← important, the URL is your password
 * 9. Click Deploy → Authorize → Allow
 * 10. Copy the Web App URL (looks like https://script.google.com/macros/s/ABC.../exec)
 * 11. Paste it into RouteLog → Settings → Cloud Sync → Web App URL
 *
 * That's it! Your shifts will sync to the "Shifts" sheet tab.
 */

// ── Sheet names ──────────────────────────────────────────────
const SHIFTS_SHEET  = 'Shifts';
const META_SHEET    = 'Meta';

// Column order for the Shifts sheet
const SHIFT_COLS = [
  'id', 'startTime', 'endTime', 'startOdometer', 'endOdometer',
  'basePay', 'tipsTotal', 'tipsCount', 'tipsDetail', 'totalEarnings',
  'durationMinutes', 'mileage', 'platform'
];

// ── HTTP handlers ────────────────────────────────────────────

/**
 * GET  → returns all shifts + metadata as JSON
 */
function doGet(e) {
  try {
    const data = readAll();
    return jsonResponse({ ok: true, data });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

/**
 * POST → accepts { action, payload } and writes data
 *
 * Actions:
 *   sync_shifts   — full replace of shifts array
 *   add_shift     — append / upsert a single shift
 *   delete_shift  — remove a shift by id
 */
function doPost(e) {
  try {
    const body    = JSON.parse(e.postData.contents);
    const action  = body.action;
    const payload = body.payload;

    if (action === 'sync_shifts') {
      writeAllShifts(payload);
      return jsonResponse({ ok: true, message: 'Synced' });
    }

    if (action === 'add_shift') {
      upsertShift(payload);
      return jsonResponse({ ok: true, message: 'Shift saved' });
    }

    if (action === 'delete_shift') {
      deleteShiftById(payload.id);
      return jsonResponse({ ok: true, message: 'Shift deleted' });
    }

    return jsonResponse({ ok: false, error: 'Unknown action' }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

// ── Read ─────────────────────────────────────────────────────

function readAll() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = getOrCreateSheet(ss, SHIFTS_SHEET);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) return { shifts: [], lastSync: null };

  const headers = values[0];
  const shifts  = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    // Rehydrate tips array from stored JSON string
    try { obj.tips = JSON.parse(obj.tipsDetail || '[]'); } catch { obj.tips = []; }
    return obj;
  });

  const lastSync = readMeta(ss, 'lastSync');
  return { shifts, lastSync };
}

// ── Write ─────────────────────────────────────────────────────

function writeAllShifts(shifts) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHIFTS_SHEET);

  // Clear existing data (keep header)
  sheet.clearContents();

  // Write header
  sheet.getRange(1, 1, 1, SHIFT_COLS.length).setValues([SHIFT_COLS]);
  formatHeader(sheet);

  if (!shifts || shifts.length === 0) {
    writeMeta(ss, 'lastSync', new Date().toISOString());
    return;
  }

  // Write rows
  const rows = shifts.map(s => shiftToRow(s));
  sheet.getRange(2, 1, rows.length, SHIFT_COLS.length).setValues(rows);

  // Auto-resize columns
  sheet.autoResizeColumns(1, SHIFT_COLS.length);

  writeMeta(ss, 'lastSync', new Date().toISOString());
  writeMeta(ss, 'shiftCount', shifts.length);
}

function upsertShift(shift) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHIFTS_SHEET);
  const data  = sheet.getDataRange().getValues();

  // Ensure header exists
  if (data.length === 0) {
    sheet.getRange(1, 1, 1, SHIFT_COLS.length).setValues([SHIFT_COLS]);
    formatHeader(sheet);
  }

  // Look for existing row with same id
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === shift.id) { existingRow = i + 1; break; }
  }

  const row = shiftToRow(shift);
  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, SHIFT_COLS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  sheet.autoResizeColumns(1, SHIFT_COLS.length);
  writeMeta(ss, 'lastSync', new Date().toISOString());
}

function deleteShiftById(id) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHIFTS_SHEET);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  writeMeta(ss, 'lastSync', new Date().toISOString());
}

// ── Helpers ───────────────────────────────────────────────────

function shiftToRow(s) {
  const tips       = s.tips || [];
  const tipsTotal  = tips.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalEarnings = tipsTotal + (parseFloat(s.basePay) || 0);

  const durationMs = s.endTime && s.startTime
    ? new Date(s.endTime) - new Date(s.startTime) : 0;
  const durationMin = Math.round(durationMs / 60000);

  const mileage = (s.endOdometer && s.startOdometer)
    ? (parseFloat(s.endOdometer) - parseFloat(s.startOdometer)).toFixed(1) : '';

  return SHIFT_COLS.map(col => {
    switch(col) {
      case 'tipsTotal':      return parseFloat(tipsTotal.toFixed(2));
      case 'tipsCount':      return tips.length;
      case 'tipsDetail':     return JSON.stringify(tips);
      case 'totalEarnings':  return parseFloat(totalEarnings.toFixed(2));
      case 'durationMinutes':return durationMin;
      case 'mileage':        return mileage;
      default:               return s[col] !== undefined ? s[col] : '';
    }
  });
}

function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function formatHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, SHIFT_COLS.length);
  headerRange.setBackground('#57c4dc');
  headerRange.setFontColor('#171717');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function readMeta(ss, key) {
  const sheet = getOrCreateSheet(ss, META_SHEET);
  const data  = sheet.getDataRange().getValues();
  for (const row of data) {
    if (row[0] === key) return row[1];
  }
  return null;
}

function writeMeta(ss, key, value) {
  const sheet = getOrCreateSheet(ss, META_SHEET);
  const data  = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function jsonResponse(obj, code) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
