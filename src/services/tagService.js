/**
 * Tag Service - CRUD operations for tags
 */
import { tagsTable } from './db.js';
import { nanoid } from 'nanoid';

// Predefined tag colors
export const TAG_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#EAB308', // Yellow
    '#EF4444'  // Red
];

/**
 * Get all tags
 */
export async function getAllTags() {
    return await tagsTable.toArray();
}

/**
 * Get tag by ID
 */
export async function getTagById(id) {
    return await tagsTable.get(id);
}

/**
 * Get tag by name
 */
export async function getTagByName(name) {
    return await tagsTable.where('name').equals(name).first();
}

/**
 * Create a new tag
 */
export async function createTag(data) {
    // Check if tag with same name exists
    const existing = await getTagByName(data.name);
    if (existing) {
        return existing;
    }

    const tag = {
        id: nanoid(),
        name: data.name,
        color: data.color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
    };

    await tagsTable.add(tag);
    return tag;
}

/**
 * Update a tag
 */
export async function updateTag(id, data) {
    const existing = await getTagById(id);
    if (!existing) {
        throw new Error('Tag not found');
    }

    const updatedTag = {
        ...existing,
        ...data
    };

    await tagsTable.put(updatedTag);
    return updatedTag;
}

/**
 * Delete a tag
 */
export async function deleteTag(id) {
    await tagsTable.delete(id);
    return true;
}

/**
 * Get or create tags by names
 * Useful when adding tags to a prompt
 */
export async function getOrCreateTags(names) {
    const tags = [];

    for (const name of names) {
        let tag = await getTagByName(name);
        if (!tag) {
            tag = await createTag({ name });
        }
        tags.push(tag);
    }

    return tags;
}

export default {
    getAllTags,
    getTagById,
    getTagByName,
    createTag,
    updateTag,
    deleteTag,
    getOrCreateTags,
    TAG_COLORS
};
