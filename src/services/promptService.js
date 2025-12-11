/**
 * Prompt Service - CRUD operations for prompts
 */
import { promptsTable } from './db.js';
import { nanoid } from 'nanoid';

const MAX_VERSIONS = 10;

/**
 * Get all prompts
 */
export async function getAllPrompts() {
    return await promptsTable.toArray();
}

/**
 * Get prompts by folder ID
 */
export async function getPromptsByFolder(folderId) {
    if (folderId === 'all') {
        return await getAllPrompts();
    }
    return await promptsTable.where('folderId').equals(folderId).toArray();
}

/**
 * Get prompts by tag
 */
export async function getPromptsByTag(tagId) {
    return await promptsTable.where('tags').equals(tagId).toArray();
}

/**
 * Get a single prompt by ID
 */
export async function getPromptById(id) {
    return await promptsTable.get(id);
}

/**
 * Create a new prompt
 */
export async function createPrompt(data) {
    const now = new Date();
    const prompt = {
        id: nanoid(),
        title: data.title || '未命名提示词',
        content: data.content || '',
        folderId: data.folderId || null,
        tags: data.tags || [],
        createdAt: now,
        updatedAt: now,
        versions: []
    };

    await promptsTable.add(prompt);
    return prompt;
}

/**
 * Update an existing prompt
 */
export async function updatePrompt(id, data) {
    const existing = await getPromptById(id);
    if (!existing) {
        throw new Error('Prompt not found');
    }

    // Save current content as a version before updating
    const versions = existing.versions || [];
    if (existing.content !== data.content) {
        versions.unshift({
            id: nanoid(),
            content: existing.content,
            createdAt: existing.updatedAt
        });

        // Keep only the last MAX_VERSIONS versions
        if (versions.length > MAX_VERSIONS) {
            versions.length = MAX_VERSIONS;
        }
    }

    const updatedPrompt = {
        ...existing,
        ...data,
        versions,
        updatedAt: new Date()
    };

    await promptsTable.put(updatedPrompt);
    return updatedPrompt;
}

/**
 * Delete a prompt
 */
export async function deletePrompt(id) {
    await promptsTable.delete(id);
    return true;
}

/**
 * Restore a prompt to a previous version
 */
export async function restoreVersion(promptId, versionId) {
    const prompt = await getPromptById(promptId);
    if (!prompt) {
        throw new Error('Prompt not found');
    }

    const version = prompt.versions.find(v => v.id === versionId);
    if (!version) {
        throw new Error('Version not found');
    }

    // Update with the old content (this will save current as new version)
    return await updatePrompt(promptId, { content: version.content });
}

/**
 * Search prompts by keyword
 */
export async function searchPrompts(keyword) {
    if (!keyword || !keyword.trim()) {
        return await getAllPrompts();
    }

    const lowerKeyword = keyword.toLowerCase();
    const allPrompts = await getAllPrompts();

    return allPrompts.filter(prompt => {
        const titleMatch = prompt.title.toLowerCase().includes(lowerKeyword);
        const contentMatch = prompt.content.toLowerCase().includes(lowerKeyword);
        return titleMatch || contentMatch;
    });
}

/**
 * Get prompt count by folder
 */
export async function getPromptCountByFolder(folderId) {
    if (folderId === 'all') {
        return await promptsTable.count();
    }
    return await promptsTable.where('folderId').equals(folderId).count();
}

export default {
    getAllPrompts,
    getPromptsByFolder,
    getPromptsByTag,
    getPromptById,
    createPrompt,
    updatePrompt,
    deletePrompt,
    restoreVersion,
    searchPrompts,
    getPromptCountByFolder
};
