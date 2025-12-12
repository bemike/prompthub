/**
 * Prompt Card Component
 */
import { copyToClipboard } from '../utils/clipboard.js';
import { toast } from './Toast.js';
import { getAllTags } from '../services/tagService.js';
import { showConfirm } from './ConfirmDialog.js';

/**
 * Highlight variables in content
 */
function highlightVariables(content) {
  return content.replace(/\{([^}]+)\}/g, '<span class="variable">{$1}</span>');
}

/**
 * Format date relative to now
 */
function formatDate(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return d.toLocaleDateString('zh-CN');
}

/**
 * Truncate text
 */
function truncate(text, maxLength = 150) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Render a single prompt card
 */
export async function renderPromptCard(prompt, { onEdit, onDelete }) {
  const allTags = await getAllTags();
  const tagMap = {};
  allTags.forEach(t => tagMap[t.id] = t);

  const card = document.createElement('div');
  card.className = 'prompt-card';
  card.dataset.promptId = prompt.id;

  const promptTags = (prompt.tags || [])
    .map(tagId => tagMap[tagId])
    .filter(Boolean);

  card.innerHTML = `
    <div class="prompt-card__header">
      <h3 class="prompt-card__title">${prompt.title}</h3>
      <span class="prompt-card__icon">📝</span>
    </div>
    
    <div class="prompt-card__content">
      ${highlightVariables(truncate(prompt.content))}
    </div>
    
    <div class="prompt-card__tags">
      ${promptTags.map(tag => `
        <span class="prompt-card__tag" style="background-color: ${tag.color}20; color: ${tag.color}">
          ${tag.name}
        </span>
      `).join('')}
    </div>
    
    <div class="prompt-card__footer">
      <span class="prompt-card__date">${formatDate(prompt.updatedAt)}</span>
      <div class="prompt-card__actions">
        <button class="btn btn--ghost btn--icon copy-btn" title="复制 (Ctrl+C)">
          📋
        </button>
        <button class="btn btn--ghost btn--icon edit-btn" title="编辑">
          ✏️
        </button>
        <button class="btn btn--ghost btn--icon delete-btn" title="删除">
          🗑️
        </button>
      </div>
    </div>
  `;

  // Copy button
  card.querySelector('.copy-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const success = await copyToClipboard(prompt.content);
    if (success) {
      toast.success('已复制到剪贴板！');
    } else {
      toast.error('复制失败');
    }
  });

  // Edit button
  card.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    onEdit(prompt);
  });

  // Delete button - 使用自定义确认对话框
  card.querySelector('.delete-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('🗑️ [PromptCard] 删除按钮被点击, promptId:', prompt.id);

    // 使用自定义确认对话框替代浏览器原生 confirm
    const confirmed = await showConfirm(`确定要删除「${prompt.title}」吗？`, {
      title: '确认删除',
      confirmText: '删除',
      cancelText: '取消',
      danger: true
    });

    if (confirmed) {
      console.log('✅ [PromptCard] 用户确认删除');
      onDelete(prompt.id);
    } else {
      console.log('❌ [PromptCard] 用户取消删除');
    }
  });

  // Card click = edit
  card.addEventListener('click', (e) => {
    // 如果点击的是按钮区域，不触发编辑
    if (e.target.closest('.prompt-card__actions')) {
      return;
    }
    onEdit(prompt);
  });

  return card;
}

/**
 * Render prompt grid
 */
export async function renderPromptGrid(container, prompts, { onEdit, onDelete }) {
  container.innerHTML = '';

  if (prompts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📭</div>
        <h3 class="empty-state__title">暂无提示词</h3>
        <p class="empty-state__description">点击右上角"新建"按钮创建你的第一个提示词</p>
      </div>
    `;
    return;
  }

  for (const prompt of prompts) {
    const card = await renderPromptCard(prompt, { onEdit, onDelete });
    container.appendChild(card);
  }
}

export default { renderPromptCard, renderPromptGrid };
