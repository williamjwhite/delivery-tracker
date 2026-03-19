/**
 * shift.js — Active shift management for RouteLog
 */

const Shift = (() => {

  let _timerInterval = null;
  let _onTick = null; // callback(elapsedMs)

  function isActive() {
    return Storage.getActiveShift() !== null;
  }

  function getActive() {
    return Storage.getActiveShift();
  }

  function start(startOdometer) {
    if (isActive()) return false;
    const shift = {
      id:            crypto.randomUUID ? crypto.randomUUID() : `shift_${Date.now()}`,
      startTime:     new Date().toISOString(),
      endTime:       null,
      startOdometer: parseFloat(startOdometer) || 0,
      endOdometer:   null,
      tips:          [],
      basePay:       0,
      platform:      Storage.getSettings().defaultPlatform || '',
    };
    Storage.saveActiveShift(shift);
    startTimer();
    return true;
  }

  function end(endOdometer, basePay) {
    const shift = getActive();
    if (!shift) return null;
    shift.endTime       = new Date().toISOString();
    shift.endOdometer   = parseFloat(endOdometer) || null;
    shift.basePay       = parseFloat(basePay) || 0;
    Storage.saveActiveShift(null);
    stopTimer();
    const shifts = Storage.addShift(shift);
    if (Storage.getSettings().autoSync) {
      Cloud.pushShift(shift);
    }
    return shift;
  }

  function addTip(amount, note) {
    const shift = getActive();
    if (!shift) return false;
    shift.tips.push({
      id:     Date.now(),
      amount: parseFloat(amount) || 0,
      note:   note || '',
      time:   new Date().toISOString(),
    });
    Storage.saveActiveShift(shift);
    return true;
  }

  function removeTip(tipId) {
    const shift = getActive();
    if (!shift) return false;
    shift.tips = shift.tips.filter(t => t.id !== tipId);
    Storage.saveActiveShift(shift);
    return true;
  }

  function getElapsed() {
    const shift = getActive();
    if (!shift) return 0;
    return Date.now() - new Date(shift.startTime).getTime();
  }

  function startTimer() {
    stopTimer();
    _timerInterval = setInterval(() => {
      if (_onTick) _onTick(getElapsed());
    }, 1000);
  }

  function stopTimer() {
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
  }

  function onTick(cb) {
    _onTick = cb;
  }

  // Resume timer if app was closed mid-shift
  function resumeIfActive() {
    if (isActive()) startTimer();
  }

  return { isActive, getActive, start, end, addTip, removeTip, getElapsed, onTick, resumeIfActive };
})();
