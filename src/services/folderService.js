/**
 * Folder Service - CRUD operations for folders
 */
import { foldersTable } from './db.js';
import { nanoid } from 'nanoid';

/**
 * Get all folders
 */
export async function getAllFolders() {
    return await foldersTable.orderBy('order').toArray();
}

/**
 * Get folder by ID
 */
export async function getFolderById(id) {
    return await foldersTable.get(id);
}

/**
 * Get child folders of a parent
 */
export async function getChildFolders(parentId) {
    return await foldersTable.where('parentId').equals(parentId).toArray();
}

/**
 * Create a new folder
 */
export async function createFolder(data) {
    const allFolders = await getAllFolders();
    const maxOrder = allFolders.reduce((max, f) => Math.max(max, f.order || 0), 0);

    const folder = {
        id: nanoid(),
        name: data.name || '新文件夹',
        parentId: data.parentId || null,
        order: maxOrder + 1
    };

    await foldersTable.add(folder);
    return folder;
}

/**
 * Update a folder
 */
export async function updateFolder(id, data) {
    const existing = await getFolderById(id);
    if (!existing) {
        throw new Error('Folder not found');
    }

    // Prevent updating the 'all' folder
    if (id === 'all') {
        throw new Error('Cannot update the default folder');
    }

    const updatedFolder = {
        ...existing,
        ...data
    };

    await foldersTable.put(updatedFolder);
    return updatedFolder;
}

/**
 * Delete a folder
 */
export async function deleteFolder(id) {
    // Prevent deleting the 'all' folder
    if (id === 'all') {
        throw new Error('Cannot delete the default folder');
    }

    await foldersTable.delete(id);
    return true;
}

/**
 * Reorder folders
 */
export async function reorderFolders(folderIds) {
    const updates = folderIds.map((id, index) => ({
        key: id,
        changes: { order: index }
    }));

    await foldersTable.bulkUpdate(updates);
    return true;
}

/**
 * Get folder tree (hierarchical structure)
 */
export async function getFolderTree() {
    const folders = await getAllFolders();

    const buildTree = (parentId) => {
        return folders
            .filter(f => f.parentId === parentId)
            .sort((a, b) => a.order - b.order)
            .map(folder => ({
                ...folder,
                children: buildTree(folder.id)
            }));
    };

    return buildTree(null);
}

export default {
    getAllFolders,
    getFolderById,
    getChildFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
    getFolderTree
};
