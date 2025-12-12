/**
 * PromptHub - Main Application Entry
 */
import { initializeDatabase } from './services/db.js';
import { getPromptsByFolder, getPromptsByTag, searchPrompts, deletePrompt } from './services/promptService.js';
import { getAllFolders } from './services/folderService.js';
import { initTheme } from './utils/theme.js';
import { renderHeader } from './components/Header.js';
import { renderFolderTabs } from './components/FolderTabs.js';
import { renderTagFilter } from './components/TagFilter.js';
import { renderPromptGrid } from './components/PromptCard.js';
import { openEditor } from './components/EditorModal.js';
import { toast } from './components/Toast.js';

// localStorage 存储键
const STORAGE_KEY_ACTIVE_FOLDER = 'prompthub_active_folder';

// Application state
const state = {
    activeFolder: 'all',
    activeTag: null,
    searchKeyword: '',
    prompts: []
};

// DOM elements
let headerEl, folderTabsEl, tagFilterEl, promptGridEl;

/**
 * 从 localStorage 获取保存的文件夹ID
 */
function getSavedActiveFolder() {
    try {
        return localStorage.getItem(STORAGE_KEY_ACTIVE_FOLDER) || 'all';
    } catch (e) {
        console.warn('无法读取 localStorage:', e);
        return 'all';
    }
}

/**
 * 保存当前文件夹ID到 localStorage
 */
function saveActiveFolder(folderId) {
    try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_FOLDER, folderId);
    } catch (e) {
        console.warn('无法写入 localStorage:', e);
    }
}

/**
 * Initialize the application
 */
async function init() {
    console.log('🚀 Initializing PromptHub...');

    // Initialize theme
    initTheme();

    // Get DOM elements
    headerEl = document.getElementById('header');
    folderTabsEl = document.getElementById('folder-tabs');
    tagFilterEl = document.getElementById('tag-filter');
    promptGridEl = document.getElementById('prompt-grid');

    try {
        // Initialize database
        await initializeDatabase();
        console.log('✅ Database initialized');

        // 从 localStorage 恢复文件夹状态
        const savedFolder = getSavedActiveFolder();
        // 验证文件夹是否存在，如果不存在则回退到 'all'
        const folders = await getAllFolders();
        const folderExists = savedFolder === 'all' || folders.some(f => f.id === savedFolder);
        state.activeFolder = folderExists ? savedFolder : 'all';
        console.log('📂 恢复文件夹状态:', state.activeFolder);

        // Render components
        await renderAllComponents();

        // Setup keyboard shortcuts
        setupKeyboardShortcuts();

        console.log('✅ PromptHub ready!');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        toast.error('应用初始化失败: ' + error.message);
    }
}

/**
 * Render all components
 */
async function renderAllComponents() {
    // Render header
    renderHeader(headerEl, {
        onSearch: handleSearch,
        onNewPrompt: handleNewPrompt
    });

    // Render folder tabs
    await renderFolderTabs(folderTabsEl, {
        activeFolder: state.activeFolder,
        onFolderChange: handleFolderChange
    });

    // Render tag filter
    await renderTagFilter(tagFilterEl, {
        activeTag: state.activeTag,
        onTagChange: handleTagChange
    });

    // Load and render prompts
    await loadAndRenderPrompts();
}

/**
 * Load prompts based on current state and render
 */
async function loadAndRenderPrompts() {
    let prompts;

    if (state.searchKeyword) {
        prompts = await searchPrompts(state.searchKeyword);
    } else if (state.activeTag) {
        prompts = await getPromptsByTag(state.activeTag);
    } else {
        prompts = await getPromptsByFolder(state.activeFolder);
    }

    // Sort by updatedAt (newest first)
    prompts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    state.prompts = prompts;

    await renderPromptGrid(promptGridEl, prompts, {
        onEdit: handleEditPrompt,
        onDelete: handleDeletePrompt
    });
}

/**
 * Handle search
 */
function handleSearch(keyword) {
    state.searchKeyword = keyword;
    state.activeTag = null;
    loadAndRenderPrompts();

    // Update tag filter to clear selection
    renderTagFilter(tagFilterEl, {
        activeTag: null,
        onTagChange: handleTagChange
    });
}

/**
 * Handle folder change
 */
async function handleFolderChange(folderId) {
    state.activeFolder = folderId;
    saveActiveFolder(folderId);  // 保存到 localStorage
    state.searchKeyword = '';
    state.activeTag = null;

    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    // Re-render folder tabs with new active state
    await renderFolderTabs(folderTabsEl, {
        activeFolder: folderId,
        onFolderChange: handleFolderChange
    });

    // Reset tag filter
    await renderTagFilter(tagFilterEl, {
        activeTag: null,
        onTagChange: handleTagChange
    });

    await loadAndRenderPrompts();
}

/**
 * Handle tag change
 */
async function handleTagChange(tagId) {
    state.activeTag = tagId;
    state.searchKeyword = '';

    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    // Re-render tag filter with new active state
    await renderTagFilter(tagFilterEl, {
        activeTag: tagId,
        onTagChange: handleTagChange
    });

    await loadAndRenderPrompts();
}

/**
 * Handle new prompt
 */
function handleNewPrompt() {
    openEditor(null, async () => {
        console.log('🔄 [handleNewPrompt] 回调被调用，开始刷新...');
        // 只刷新提示词列表，保持当前筛选状态
        await loadAndRenderPrompts();
        console.log('✅ [handleNewPrompt] 提示词列表刷新完成');
        // 同时刷新文件夹标签页的计数
        await renderFolderTabs(folderTabsEl, {
            activeFolder: state.activeFolder,
            onFolderChange: handleFolderChange
        });
        console.log('✅ [handleNewPrompt] 文件夹标签刷新完成');
    });
}

/**
 * Handle edit prompt
 */
function handleEditPrompt(prompt) {
    openEditor(prompt, async () => {
        console.log('🔄 [handleEditPrompt] 回调被调用，开始刷新...');
        // 只刷新提示词列表，保持当前筛选状态
        await loadAndRenderPrompts();
        console.log('✅ [handleEditPrompt] 提示词列表刷新完成');
        // 同时刷新文件夹标签页的计数
        await renderFolderTabs(folderTabsEl, {
            activeFolder: state.activeFolder,
            onFolderChange: handleFolderChange
        });
        console.log('✅ [handleEditPrompt] 文件夹标签刷新完成');
    });
}

/**
 * Handle delete prompt
 */
async function handleDeletePrompt(promptId) {
    console.log('🗑️ [handleDeletePrompt] 开始删除:', promptId);
    try {
        await deletePrompt(promptId);
        console.log('✅ [handleDeletePrompt] 删除成功');
        toast.success('删除成功！');
        // 只刷新提示词列表和文件夹计数，不重新渲染 Header
        await loadAndRenderPrompts();
        await renderFolderTabs(folderTabsEl, {
            activeFolder: state.activeFolder,
            onFolderChange: handleFolderChange
        });
        console.log('✅ [handleDeletePrompt] 页面刷新完成');
    } catch (error) {
        console.error('❌ [handleDeletePrompt] 删除失败:', error);
        toast.error('删除失败: ' + error.message);
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if in input or textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + N = New prompt
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            handleNewPrompt();
        }

        // Ctrl/Cmd + F = Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
    });
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
