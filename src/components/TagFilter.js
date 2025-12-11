/**
 * Tag Filter Component
 */
import { getAllTags } from '../services/tagService.js';

/**
 * Render tag filter chips
 */
export async function renderTagFilter(container, { activeTag, onTagChange }) {
    const tags = await getAllTags();

    container.innerHTML = `
    <span class="tag-filter__label">标签筛选：</span>
    
    <button 
      class="tag-chip ${!activeTag ? 'tag-chip--active' : ''}"
      data-tag-id=""
    >
      全部
    </button>
    
    ${tags.map(tag => `
      <button 
        class="tag-chip ${activeTag === tag.id ? 'tag-chip--active' : ''}"
        data-tag-id="${tag.id}"
      >
        <span class="tag-chip__dot" style="background-color: ${tag.color}"></span>
        ${tag.name}
      </button>
    `).join('')}
  `;

    // Event listeners
    container.querySelectorAll('.tag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const tagId = chip.dataset.tagId || null;
            onTagChange(tagId);
        });
    });
}

export default { renderTagFilter };
