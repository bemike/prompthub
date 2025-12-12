/**
 * Editor Modal Component
 */
import { getAllFolders } from '../services/folderService.js';
import { getAllTags, createTag } from '../services/tagService.js';
import { createPrompt, updatePrompt, restoreVersion } from '../services/promptService.js';
import { toast } from './Toast.js';

let modalOverlay = null;
let modalContent = null;
let currentPrompt = null;
let onSaveCallback = null;

/**
 * Initialize modal elements
 */
function getModalElements() {
  if (!modalOverlay) {
    modalOverlay = document.getElementById('editor-modal');
    modalContent = document.getElementById('editor-content');
  }
  return { modalOverlay, modalContent };
}

/**
 * Format date for display
 */
function formatVersionDate(date) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return `今天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `昨天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Open the editor modal
 */
export async function openEditor(prompt = null, onSave) {
  const { modalOverlay, modalContent } = getModalElements();
  currentPrompt = prompt;
  onSaveCallback = onSave;

  const folders = await getAllFolders();
  const tags = await getAllTags();

  const isEdit = !!prompt;
  const title = isEdit ? '编辑提示词' : '新建提示词';

  const promptTags = prompt?.tags || [];
  const versions = prompt?.versions || [];

  modalContent.innerHTML = `
    <div class="modal__header">
      <h2 class="modal__title">
        ${isEdit ? '✏️' : '➕'} ${title}
      </h2>
      <button class="modal__close" id="modal-close">✕</button>
    </div>
    
    <div class="modal__body">
      <div class="form-group">
        <label class="form-label" for="prompt-title">标题</label>
        <input 
          type="text" 
          class="form-input" 
          id="prompt-title" 
          placeholder="输入提示词标题..."
          value="${prompt?.title || ''}"
        >
      </div>
      
      <div class="form-group">
        <label class="form-label" for="prompt-folder">文件夹</label>
        <select class="form-input form-select" id="prompt-folder">
          <option value="">不选择文件夹</option>
          ${folders.filter(f => f.id !== 'all').map(folder => `
            <option value="${folder.id}" ${prompt?.folderId === folder.id ? 'selected' : ''}>
              📁 ${folder.name}
            </option>
          `).join('')}
        </select>
      </div>
      
      <div class="form-group" style="position: relative;">
        <label class="form-label">标签</label>
        <div class="tags-input" id="tags-input">
          ${promptTags.map(tagId => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return '';
    return `
              <span class="tags-input__tag" data-tag-id="${tag.id}">
                ${tag.name}
                <button class="tags-input__tag-remove" data-tag-id="${tag.id}">✕</button>
              </span>
            `;
  }).join('')}
          <input 
            type="text" 
            class="tags-input__input" 
            id="tag-input"
            placeholder="输入标签..."
            autocomplete="off"
          >
        </div>
        <div class="tag-autocomplete" id="tag-autocomplete"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="prompt-content">内容</label>
        <textarea 
          class="form-input form-textarea" 
          id="prompt-content" 
          placeholder="输入提示词内容...&#10;&#10;使用 {变量名} 来定义变量占位符"
        >${prompt?.content || ''}</textarea>
      </div>
      
      ${versions.length > 0 ? `
        <div class="version-history">
          <div class="version-history__title">
            📜 版本历史 (${versions.length}个版本)
          </div>
          <div class="version-history__list">
            <div class="version-item version-item--current">
              <div class="version-item__info">
                <span class="version-item__badge">当前</span>
                <span>${formatVersionDate(prompt.updatedAt)}</span>
              </div>
            </div>
            ${versions.map((version, index) => `
              <div class="version-item">
                <div class="version-item__info">
                  <span>v${versions.length - index}</span>
                  <span>${formatVersionDate(version.createdAt)}</span>
                </div>
                <button class="btn btn--ghost" data-version-id="${version.id}">恢复</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    
    <div class="modal__footer">
      <button class="btn" id="modal-cancel">取消</button>
      <button class="btn btn--primary" id="modal-save">
        💾 保存
      </button>
    </div>
  `;

  // Show modal
  modalOverlay.classList.add('modal-overlay--visible');

  // Focus title input
  setTimeout(() => {
    document.getElementById('prompt-title').focus();
  }, 100);

  // Setup event listeners
  setupModalEvents(tags);
}

/**
 * Setup modal event listeners
 */
function setupModalEvents(allTags) {
  const { modalOverlay } = getModalElements();

  // Close button
  document.getElementById('modal-close').addEventListener('click', closeEditor);
  document.getElementById('modal-cancel').addEventListener('click', closeEditor);

  // Click outside to close
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeEditor();
    }
  });

  // Escape key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeEditor();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Tag input with autocomplete
  const tagInput = document.getElementById('tag-input');
  const tagsContainer = document.getElementById('tags-input');
  const autocompleteContainer = document.getElementById('tag-autocomplete');
  const selectedTags = new Set(currentPrompt?.tags || []);
  let highlightedIndex = -1;

  // Remove tag
  tagsContainer.querySelectorAll('.tags-input__tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tagId = btn.dataset.tagId;
      selectedTags.delete(tagId);
      btn.parentElement.remove();
    });
  });

  // Helper: Add tag to selection
  function addTagToSelection(tag) {
    if (!selectedTags.has(tag.id)) {
      selectedTags.add(tag.id);
      const tagEl = document.createElement('span');
      tagEl.className = 'tags-input__tag';
      tagEl.dataset.tagId = tag.id;
      tagEl.innerHTML = `
              ${tag.name}
              <button class="tags-input__tag-remove" data-tag-id="${tag.id}">✕</button>
            `;
      tagEl.querySelector('.tags-input__tag-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        selectedTags.delete(tag.id);
        tagEl.remove();
      });
      tagsContainer.insertBefore(tagEl, tagInput);
    }
    tagInput.value = '';
    hideAutocomplete();
  }

  // Helper: Show autocomplete suggestions
  function showAutocomplete(query) {
    const lowerQuery = query.toLowerCase();
    const filteredTags = allTags.filter(tag =>
      tag.name.toLowerCase().includes(lowerQuery) && !selectedTags.has(tag.id)
    );

    if (filteredTags.length === 0 && query.trim()) {
      // Show option to create new tag
      autocompleteContainer.innerHTML = `
                <div class="autocomplete-item autocomplete-item--create" data-action="create" data-name="${query.trim()}">
                    ➕ 创建标签 "${query.trim()}"
                </div>
            `;
      autocompleteContainer.style.display = 'block';
    } else if (filteredTags.length > 0) {
      autocompleteContainer.innerHTML = filteredTags.map((tag, index) => `
                <div class="autocomplete-item ${index === highlightedIndex ? 'autocomplete-item--highlighted' : ''}" 
                     data-tag-id="${tag.id}" data-index="${index}">
                    <span class="tag-chip__dot" style="background-color: ${tag.color}"></span>
                    ${tag.name}
                </div>
            `).join('');
      autocompleteContainer.style.display = 'block';
    } else {
      hideAutocomplete();
    }

    // Add click handlers
    autocompleteContainer.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', async () => {
        if (item.dataset.action === 'create') {
          const newTag = await createTag({ name: item.dataset.name });
          allTags.push(newTag);
          addTagToSelection(newTag);
        } else {
          const tag = allTags.find(t => t.id === item.dataset.tagId);
          if (tag) addTagToSelection(tag);
        }
      });
    });
  }

  // Helper: Hide autocomplete
  function hideAutocomplete() {
    autocompleteContainer.innerHTML = '';
    autocompleteContainer.style.display = 'none';
    highlightedIndex = -1;
  }

  // Input event for autocomplete
  tagInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (query) {
      showAutocomplete(query);
    } else {
      hideAutocomplete();
    }
  });

  // Focus shows all available tags
  tagInput.addEventListener('focus', () => {
    if (!tagInput.value) {
      const availableTags = allTags.filter(t => !selectedTags.has(t.id));
      if (availableTags.length > 0) {
        autocompleteContainer.innerHTML = availableTags.map((tag, index) => `
                    <div class="autocomplete-item" data-tag-id="${tag.id}" data-index="${index}">
                        <span class="tag-chip__dot" style="background-color: ${tag.color}"></span>
                        ${tag.name}
                    </div>
                `).join('');
        autocompleteContainer.style.display = 'block';

        // Add click handlers
        autocompleteContainer.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const tag = allTags.find(t => t.id === item.dataset.tagId);
            if (tag) addTagToSelection(tag);
          });
        });
      }
    }
  });

  // Keyboard navigation for autocomplete
  tagInput.addEventListener('keydown', async (e) => {
    const items = autocompleteContainer.querySelectorAll('.autocomplete-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
      items.forEach((item, i) => {
        item.classList.toggle('autocomplete-item--highlighted', i === highlightedIndex);
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      items.forEach((item, i) => {
        item.classList.toggle('autocomplete-item--highlighted', i === highlightedIndex);
      });
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (items.length > 0 && highlightedIndex >= 0) {
        e.preventDefault();
        items[highlightedIndex].click();
      } else if (e.key === 'Enter' && tagInput.value.trim()) {
        e.preventDefault();
        // Create new tag
        const tagName = tagInput.value.trim();
        let tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (!tag) {
          tag = await createTag({ name: tagName });
          allTags.push(tag);
        }
        addTagToSelection(tag);
      }
    } else if (e.key === 'Escape') {
      hideAutocomplete();
    }
  });

  // Hide autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (!tagsContainer.contains(e.target) && !autocompleteContainer.contains(e.target)) {
      hideAutocomplete();
    }
  });

  // Version restore
  document.querySelectorAll('[data-version-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const versionId = btn.dataset.versionId;
      if (currentPrompt && confirm('确定要恢复到此版本吗？当前内容将被保存为新版本。')) {
        try {
          await restoreVersion(currentPrompt.id, versionId);
          toast.success('已恢复到历史版本');
          closeEditor();
          if (onSaveCallback) onSaveCallback();
        } catch (error) {
          toast.error('恢复失败: ' + error.message);
        }
      }
    });
  });

  // Save button
  document.getElementById('modal-save').addEventListener('click', async () => {
    const title = document.getElementById('prompt-title').value.trim();
    const content = document.getElementById('prompt-content').value;
    const folderId = document.getElementById('prompt-folder').value || null;

    if (!title) {
      toast.error('请输入标题');
      return;
    }

    if (!content.trim()) {
      toast.error('请输入内容');
      return;
    }

    // Collect selected tags
    const tags = [];
    tagsContainer.querySelectorAll('.tags-input__tag').forEach(el => {
      tags.push(el.dataset.tagId);
    });

    try {
      if (currentPrompt) {
        await updatePrompt(currentPrompt.id, { title, content, folderId, tags });
        toast.success('保存成功！');
      } else {
        await createPrompt({ title, content, folderId, tags });
        toast.success('创建成功！');
      }

      // 先执行回调刷新数据，再关闭模态框
      if (onSaveCallback) {
        await onSaveCallback();
      }
      closeEditor();
    } catch (error) {
      toast.error('保存失败: ' + error.message);
    }
  });

  // Ctrl+S to save
  document.getElementById('prompt-content').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      document.getElementById('modal-save').click();
    }
  });
}

/**
 * Close the editor modal
 */
export function closeEditor() {
  const { modalOverlay } = getModalElements();
  modalOverlay.classList.remove('modal-overlay--visible');
  currentPrompt = null;
  onSaveCallback = null;
}

export default { openEditor, closeEditor };
