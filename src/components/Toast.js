/**
 * Toast Notification Component
 */

let toastContainer = null;

/**
 * Initialize toast container
 */
function getContainer() {
    if (!toastContainer) {
        toastContainer = document.getElementById('toast-container');
    }
    return toastContainer;
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
    const container = getContainer();

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${message}</span>
  `;

    container.appendChild(toast);

    // Remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.2s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 200);
    }, duration);

    return toast;
}

/**
 * Shorthand methods
 */
export const toast = {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    info: (msg, duration) => showToast(msg, 'info', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration)
};

export default toast;
