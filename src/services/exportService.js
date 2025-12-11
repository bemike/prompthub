/**
 * Export Service - Import/Export functionality
 */
import { db } from './db.js';
import { promptsTable, foldersTable, tagsTable } from './db.js';

const EXPORT_VERSION = '1.0';

/**
 * Export all data to JSON
 */
export async function exportAllData() {
    const prompts = await promptsTable.toArray();
    const folders = await foldersTable.toArray();
    const tags = await tagsTable.toArray();

    const exportData = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        prompts,
        folders,
        tags
    };

    return exportData;
}

/**
 * Download data as JSON file (fallback method)
 */
function downloadAsJson(data, filename = 'prompthub-export.json') {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export and download with file save picker
 */
export async function exportAndDownload() {
    const data = await exportAllData();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `prompthub-backup-${timestamp}.json`;
    const jsonStr = JSON.stringify(data, null, 2);

    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
        try {
            // Show save file picker - let user choose where to save
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'JSON文件',
                    accept: { 'application/json': ['.json'] }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();

            return { success: true, method: 'savePicker', path: fileHandle.name };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, cancelled: true };
            }
            // If there's any other error, fall back to download
            console.warn('showSaveFilePicker failed, falling back to download:', error);
        }
    }

    // Fallback: direct download
    downloadAsJson(data, filename);
    return { success: true, method: 'download' };
}

/**
 * Validate import data structure
 */
function validateImportData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('无效的导入数据格式');
    }

    if (!data.version) {
        throw new Error('缺少版本信息');
    }

    if (!Array.isArray(data.prompts)) {
        throw new Error('缺少提示词数据');
    }

    return true;
}

/**
 * Import data from JSON
 */
export async function importData(jsonData, options = { merge: true }) {
    validateImportData(jsonData);

    const { prompts, folders = [], tags = [] } = jsonData;

    // Use transaction for atomic operation
    await db.transaction('rw', [promptsTable, foldersTable, tagsTable], async () => {
        if (!options.merge) {
            // Clear existing data if not merging
            await promptsTable.clear();
            await foldersTable.clear();
            await tagsTable.clear();
        }

        // Import folders (skip duplicates)
        for (const folder of folders) {
            const existing = await foldersTable.get(folder.id);
            if (!existing) {
                await foldersTable.add(folder);
            }
        }

        // Import tags (skip duplicates)
        for (const tag of tags) {
            const existing = await tagsTable.get(tag.id);
            if (!existing) {
                await tagsTable.add(tag);
            }
        }

        // Import prompts (skip duplicates)
        for (const prompt of prompts) {
            const existing = await promptsTable.get(prompt.id);
            if (!existing) {
                // Ensure dates are properly converted
                const importedPrompt = {
                    ...prompt,
                    createdAt: new Date(prompt.createdAt),
                    updatedAt: new Date(prompt.updatedAt),
                    versions: (prompt.versions || []).map(v => ({
                        ...v,
                        createdAt: new Date(v.createdAt)
                    }))
                };
                await promptsTable.add(importedPrompt);
            }
        }
    });

    return {
        promptsImported: prompts.length,
        foldersImported: folders.length,
        tagsImported: tags.length
    };
}

/**
 * Read file and import
 */
export async function importFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                const result = await importData(jsonData);
                resolve(result);
            } catch (error) {
                reject(new Error(`导入失败: ${error.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };

        reader.readAsText(file);
    });
}

/**
 * Convert prompts to Markdown format
 */
function promptToMarkdown(prompt, folders, tags) {
    const folder = folders.find(f => f.id === prompt.folderId);
    const promptTags = (prompt.tags || [])
        .map(tagId => tags.find(t => t.id === tagId))
        .filter(Boolean)
        .map(t => `#${t.name}`)
        .join(' ');

    const date = new Date(prompt.updatedAt).toLocaleDateString('zh-CN');

    let md = `# ${prompt.title}\n\n`;
    md += `> 📁 ${folder?.name || '未分类'} | 🏷️ ${promptTags || '无标签'} | 📅 ${date}\n\n`;
    md += `---\n\n`;
    md += `${prompt.content}\n\n`;

    if (prompt.versions && prompt.versions.length > 0) {
        md += `---\n\n`;
        md += `## 版本历史\n\n`;
        prompt.versions.forEach((v, i) => {
            const vDate = new Date(v.createdAt).toLocaleString('zh-CN');
            md += `### v${prompt.versions.length - i} (${vDate})\n\n`;
            md += `\`\`\`\n${v.content}\n\`\`\`\n\n`;
        });
    }

    return md;
}

/**
 * Generate all prompts as a single Markdown file
 */
async function generateMarkdownExport() {
    const prompts = await promptsTable.toArray();
    const folders = await foldersTable.toArray();
    const tags = await tagsTable.toArray();

    let md = `# PromptHub 提示词导出\n\n`;
    md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    md += `> 共 ${prompts.length} 个提示词\n\n`;
    md += `---\n\n`;

    // Group prompts by folder
    const folderGroups = {};
    folders.forEach(f => {
        folderGroups[f.id] = { folder: f, prompts: [] };
    });
    folderGroups['uncategorized'] = { folder: { name: '未分类' }, prompts: [] };

    prompts.forEach(p => {
        const key = p.folderId || 'uncategorized';
        if (folderGroups[key]) {
            folderGroups[key].prompts.push(p);
        } else {
            folderGroups['uncategorized'].prompts.push(p);
        }
    });

    // Generate markdown for each folder
    for (const [key, group] of Object.entries(folderGroups)) {
        if (group.prompts.length === 0) continue;

        md += `## 📁 ${group.folder.name}\n\n`;

        group.prompts.forEach(prompt => {
            md += promptToMarkdown(prompt, folders, tags);
            md += `\n---\n\n`;
        });
    }

    return md;
}

/**
 * Export as Markdown with file save picker
 */
export async function exportAsMarkdown() {
    const md = await generateMarkdownExport();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `prompthub-export-${timestamp}.md`;

    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
        try {
            // Show save file picker - let user choose where to save
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Markdown文件',
                    accept: { 'text/markdown': ['.md'] }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(md);
            await writable.close();

            return { success: true, method: 'savePicker', path: fileHandle.name };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, cancelled: true };
            }
            // If there's any other error, fall back to download
            console.warn('showSaveFilePicker failed, falling back to download:', error);
        }
    }

    // Fallback: download as file (for unsupported browsers or errors)
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, method: 'download' };
}

export default {
    exportAllData,
    exportAndDownload,
    exportAsMarkdown,
    importData,
    importFromFile
};
