// Lobby settings, remembered in this browser.

const KEY = 'imposters.settings.v1';

export const ROLE_CHOICES = ['random', 'crew', 'imp'];

export const settings = (() => {
  const base = { computer: false, role: 'random' };
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return base; }
})();

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode etc. */ }
}
