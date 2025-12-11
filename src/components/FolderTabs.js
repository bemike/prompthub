/**
 * Folder Tabs Component
 */
import { getAllFolders, createFolder } from '../services/folderService.js';
import { getPromptCountByFolder } from '../services/promptService.js';
import { toast } from './Toast.js';

/**
 * Render folder tabs
 */
export async function renderFolderTabs(container, { activeFolder, onFolderChange }) {
    const folders = await getAllFolders();

    // Get counts for each folder
    const folderCounts = {};
    for (const folder of folders) {
        folderCounts[folder.id] = await getPromptCountByFolder(folder.id);
    }

    const folderIcons = {
        'all': '📋',
        'writing': '✍️',
        'coding': '💻',
        'translation': '🌐'
    };

    container.innerHTML = `
    ${folders.map(folder => `
      <button 
        class="folder-tab ${activeFolder === folder.id ? 'folder-tab--active' : ''}"
        data-folder-id="${folder.id}"
      >
        <span class="folder-tab__icon">${folderIcons[folder.id] || '📁'}</span>
        <span class="folder-tab__name">${folder.name}</span>
        <span class="folder-tab__count">${folderCounts[folder.id] || 0}</span>
      </button>
    `).join('')}
    
    <button class="folder-tabs__add" id="add-folder-btn" title="新建文件夹">
      ➕
    </button>
  `;

    // Event listeners
    container.querySelectorAll('.folder-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const folderId = tab.dataset.folderId;
            onFolderChange(folderId);
        });
    });

    // Add folder
    container.querySelector('#add-folder-btn').addEventListener('click', async () => {
        const name = prompt('请输入文件夹名称:');
        if (name && name.trim()) {
            try {
                await createFolder({ name: name.trim() });
                toast.success('文件夹创建成功！');
                // Re-render with new folder
                await renderFolderTabs(container, { activeFolder, onFolderChange });
            } catch (error) {
                toast.error('创建失败: ' + error.message);
            }
        }
    });
}

export default { renderFolderTabs };
