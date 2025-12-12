/**
 * Confirm Dialog Component
 * 自定义确认对话框，替代浏览器原生 confirm
 */

let dialogContainer = null;

/**
 * 获取或创建对话框容器
 */
function getDialogContainer() {
    if (!dialogContainer) {
        dialogContainer = document.getElementById('confirm-dialog');
        if (!dialogContainer) {
            // 动态创建容器
            dialogContainer = document.createElement('div');
            dialogContainer.id = 'confirm-dialog';
            dialogContainer.className = 'confirm-dialog-overlay';
            document.body.appendChild(dialogContainer);
        }
    }
    return dialogContainer;
}

/**
 * 显示确认对话框
 * @param {string} message - 确认消息
 * @param {Object} options - 可选配置
 * @returns {Promise<boolean>} - 用户确认返回 true，取消返回 false
 */
export function showConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const container = getDialogContainer();

        const title = options.title || '确认操作';
        const confirmText = options.confirmText || '确定';
        const cancelText = options.cancelText || '取消';
        const danger = options.danger || false;

        container.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog__header">
                    <h3 class="confirm-dialog__title">${title}</h3>
                </div>
                <div class="confirm-dialog__body">
                    <p class="confirm-dialog__message">${message}</p>
                </div>
                <div class="confirm-dialog__footer">
                    <button class="btn confirm-dialog__cancel" id="confirm-cancel">${cancelText}</button>
                    <button class="btn ${danger ? 'btn--danger' : 'btn--primary'} confirm-dialog__confirm" id="confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;

        container.classList.add('confirm-dialog-overlay--visible');

        // 聚焦到确认按钮
        const confirmBtn = container.querySelector('#confirm-ok');
        const cancelBtn = container.querySelector('#confirm-cancel');

        confirmBtn.focus();

        // 清理函数
        const cleanup = () => {
            container.classList.remove('confirm-dialog-overlay--visible');
            document.removeEventListener('keydown', handleKeydown);
        };

        // 确认
        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        // 取消
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        // 点击背景关闭
        container.addEventListener('click', (e) => {
            if (e.target === container) {
                cleanup();
                resolve(false);
            }
        });

        // ESC 键关闭
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(false);
            } else if (e.key === 'Enter') {
                cleanup();
                resolve(true);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}

export default { showConfirm };
