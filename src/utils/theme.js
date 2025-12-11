/**
 * Theme Utilities
 */

const THEME_KEY = 'prompthub-theme';

/**
 * Get current theme
 */
export function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
}

/**
 * Set theme
 */
export function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Toggle theme
 */
export function toggleTheme() {
    const current = getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
    return next;
}

/**
 * Initialize theme from storage
 */
export function initTheme() {
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
}

export default {
    getTheme,
    setTheme,
    toggleTheme,
    initTheme
};
