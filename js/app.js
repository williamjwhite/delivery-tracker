/**
 * app.js — RouteLog main controller
 * Handles routing, modals, toasts, theme, and app init.
 */

// ── Theme ────────────────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px) scale(0.95)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modal ────────────────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  // Focus first input
  setTimeout(() => {
    const input = modal.querySelector('input');
    if (input) input.focus();
  }, 100);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ── Tip Modal ────────────────────────────────────────────────
document.getElementById('tip-cancel').addEventListener('click', () => closeModal('tip-modal'));

document.getElementById('tip-save').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('tip-amount').value);
  const note   = document.getElementById('tip-note').value.trim();
  if (!amount || amount <= 0) {
    showToast('Enter a valid tip amount', 'error');
    return;
  }
  Shift.addTip(amount, note);
  closeModal('tip-modal');
  document.getElementById('tip-amount').value = '';
  document.getElementById('tip-note').value   = '';
  DashboardView.renderTipList();
  showToast(`Tip of $${amount.toFixed(2)} logged!`, 'success');
});

// ── End Shift Modal ───────────────────────────────────────────
document.getElementById('end-cancel').addEventListener('click', () => closeModal('end-shift-modal'));

document.getElementById('end-confirm').addEventListener('click', () => {
  const odo  = document.getElementById('end-odometer').value;
  const pay  = document.getElementById('end-base-pay').value;
  const shift = Shift.end(odo, pay);
  closeModal('end-shift-modal');
  document.getElementById('end-odometer').value = '';
  document.getElementById('end-base-pay').value = '';
  if (shift) {
    const stats = Storage.calcShiftStats(shift);
    showToast(
      `Shift ended! Earned $${stats.totalEarnings.toFixed(2)} with ${(shift.tips||[]).length} tips`,
      'success',
      4000
    );
  }
  DashboardView.render();
});

// ── Router ───────────────────────────────────────────────────
let _currentView = 'dashboard';

function navigateTo(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // Update nav
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewName);
  });
  // Show target
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');
  _currentView = viewName;

  // Render
  if (viewName === 'dashboard') DashboardView.render();
  if (viewName === 'history')   HistoryView.render();
  if (viewName === 'settings')  SettingsView.render();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.view));
});

// ── Keyboard shortcuts (desktop) ─────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === '1') navigateTo('dashboard');
  if (e.key === '2') navigateTo('history');
  if (e.key === '3') navigateTo('settings');
});

// ── Init ──────────────────────────────────────────────────────
(function init() {
  // Apply saved theme
  const settings = Storage.getSettings();
  applyTheme(settings.darkMode);

  // Handle Google OAuth redirect
  Cloud.handleOAuthRedirect();

  // Resume active shift timer if app was reloaded mid-shift
  Shift.resumeIfActive();

  // Initial render
  navigateTo('dashboard');
})();
