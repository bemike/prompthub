/**
 * Header Component
 */
import { toggleTheme, getTheme } from '../utils/theme.js';
import { exportAndDownload, exportAsMarkdown, importFromFile } from '../services/exportService.js';
import { toast } from './Toast.js';

/**
 * Render the header
 */
export function renderHeader(container, { onSearch, onNewPrompt }) {
  const currentTheme = getTheme();
  const themeIcon = currentTheme === 'light' ? '🌙' : '☀️';

  container.innerHTML = `
    <div class="header__logo">
      <img src="/favicon.svg" alt="PromptHub" class="header__logo-icon">
      <span>PromptHub</span>
    </div>
    
    <div class="header__search">
      <div class="header__search-wrapper">
        <span class="header__search-icon">🔍</span>
        <input 
          type="text" 
          class="header__search-input" 
          placeholder="搜索提示词..." 
          id="search-input"
        >
      </div>
    </div>
    
    <div class="header__actions">
      <div class="dropdown">
        <button class="btn btn--ghost btn--icon" id="settings-btn" title="设置">
          ⚙️
        </button>
        <div class="dropdown__menu" id="settings-menu">
          <button class="dropdown__item" id="export-json-btn">
            📤 导出 JSON
          </button>
          <button class="dropdown__item" id="export-md-btn">
            📝 导出 Markdown
          </button>
          <button class="dropdown__item" id="import-btn">
            📥 导入数据
          </button>
          <div class="dropdown__divider"></div>
          <button class="dropdown__item" id="theme-btn">
            ${themeIcon} 切换主题
          </button>
        </div>
      </div>
      <input type="file" id="import-input" accept=".json" style="display: none;">
      
      <button class="btn btn--primary" id="new-prompt-btn">
        ➕ 新建
      </button>
    </div>
  `;

  // Event listeners
  const searchInput = container.querySelector('#search-input');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      onSearch(e.target.value);
    }, 300);
  });

  // New prompt button
  container.querySelector('#new-prompt-btn').addEventListener('click', onNewPrompt);

  // Settings dropdown
  const settingsBtn = container.querySelector('#settings-btn');
  const settingsMenu = container.querySelector('#settings-menu');

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle('dropdown__menu--visible');
  });

  document.addEventListener('click', () => {
    settingsMenu.classList.remove('dropdown__menu--visible');
  });

  // Theme toggle
  container.querySelector('#theme-btn').addEventListener('click', () => {
    const newTheme = toggleTheme();
    const newIcon = newTheme === 'light' ? '🌙' : '☀️';
    container.querySelector('#theme-btn').textContent = `${newIcon} 切换主题`;
    toast.success(`已切换到${newTheme === 'light' ? '浅色' : '深色'}模式`);
  });

  // Export JSON
  container.querySelector('#export-json-btn').addEventListener('click', async () => {
    try {
      const result = await exportAndDownload();
      if (result.cancelled) {
        return; // User cancelled
      }
      if (result.method === 'savePicker') {
        toast.success(`JSON已保存: ${result.path}`);
      } else {
        toast.success('JSON数据导出成功！');
      }
    } catch (error) {
      toast.error('导出失败: ' + error.message);
    }
  });

  // Export Markdown
  container.querySelector('#export-md-btn').addEventListener('click', async () => {
    try {
      const result = await exportAsMarkdown();
      if (result.cancelled) {
        return; // User cancelled
      }
      if (result.method === 'directory') {
        toast.success(`Markdown已保存到指定目录: ${result.path}`);
      } else {
        toast.success('Markdown导出成功！');
      }
    } catch (error) {
      toast.error('导出失败: ' + error.message);
    }
  });

  // Import
  const importInput = container.querySelector('#import-input');
  container.querySelector('#import-btn').addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await importFromFile(file);
      toast.success(`成功导入 ${result.promptsImported} 个提示词！`);
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      toast.error(error.message);
    }

    importInput.value = '';
  });
}

export default { renderHeader };
