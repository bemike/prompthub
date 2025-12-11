/**
 * PromptHub - Main Application Entry
 */
import { initializeDatabase } from './services/db.js';
import { getPromptsByFolder, getPromptsByTag, searchPrompts, deletePrompt } from './services/promptService.js';
import { initTheme } from './utils/theme.js';
import { renderHeader } from './components/Header.js';
import { renderFolderTabs } from './components/FolderTabs.js';
import { renderTagFilter } from './components/TagFilter.js';
import { renderPromptGrid } from './components/PromptCard.js';
import { openEditor } from './components/EditorModal.js';
import { toast } from './components/Toast.js';

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
        await renderAllComponents();
    });
}

/**
 * Handle edit prompt
 */
function handleEditPrompt(prompt) {
    openEditor(prompt, async () => {
        await renderAllComponents();
    });
}

/**
 * Handle delete prompt
 */
async function handleDeletePrompt(promptId) {
    try {
        await deletePrompt(promptId);
        toast.success('删除成功！');
        await renderAllComponents();
    } catch (error) {
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
