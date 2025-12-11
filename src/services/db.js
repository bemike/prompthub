/**
 * Database Configuration and Initialization
 * Using Dexie.js for IndexedDB wrapper
 */
import Dexie from 'dexie';

// Create database instance
export const db = new Dexie('PromptHubDB');

// Define database schema
db.version(1).stores({
    prompts: '++id, title, folderId, createdAt, updatedAt, *tags',
    folders: '++id, name, parentId, order',
    tags: '++id, name, color'
});

// Export table references for convenience
export const promptsTable = db.prompts;
export const foldersTable = db.folders;
export const tagsTable = db.tags;

/**
 * Initialize database with default data if empty
 */
export async function initializeDatabase() {
    const folderCount = await foldersTable.count();

    if (folderCount === 0) {
        // Create default folders
        await foldersTable.bulkAdd([
            { id: 'all', name: '全部', parentId: null, order: 0 },
            { id: 'writing', name: '写作', parentId: null, order: 1 },
            { id: 'coding', name: '编程', parentId: null, order: 2 },
            { id: 'translation', name: '翻译', parentId: null, order: 3 }
        ]);

        // Create default tags with colors
        await tagsTable.bulkAdd([
            { id: 'tag-writing', name: '写作', color: '#3B82F6' },
            { id: 'tag-coding', name: '编程', color: '#10B981' },
            { id: 'tag-translation', name: '翻译', color: '#8B5CF6' },
            { id: 'tag-analysis', name: '分析', color: '#F97316' }
        ]);

        // Create sample prompts
        await promptsTable.bulkAdd([
            {
                id: 'sample-1',
                title: '代码审查专家',
                content: '你是一位资深的代码审查专家，拥有10年以上的软件开发经验。\n\n请审查以下代码：\n\n{code}\n\n请从以下几个方面进行审查并给出改进建议：\n1. 代码可读性和命名规范\n2. 潜在的 Bug 和边界情况\n3. 性能优化建议\n4. 最佳实践和设计模式',
                folderId: 'coding',
                tags: ['tag-coding'],
                createdAt: new Date(),
                updatedAt: new Date(),
                versions: []
            },
            {
                id: 'sample-2',
                title: '翻译助手',
                content: '你是一位专业的翻译专家，精通多国语言。\n\n请将以下内容翻译成{language}：\n\n{content}\n\n要求：\n1. 保持原文的语气和风格\n2. 确保翻译准确、自然流畅\n3. 对于专业术语，请在括号中注明原文',
                folderId: 'translation',
                tags: ['tag-translation'],
                createdAt: new Date(),
                updatedAt: new Date(),
                versions: []
            },
            {
                id: 'sample-3',
                title: '博客大纲生成',
                content: '请为主题「{topic}」生成一篇博客文章大纲。\n\n要求：\n1. 包含引人入胜的标题\n2. 3-5个主要章节\n3. 每个章节包含2-3个要点\n4. 添加一个有力的结尾总结\n\n目标读者：{audience}',
                folderId: 'writing',
                tags: ['tag-writing'],
                createdAt: new Date(),
                updatedAt: new Date(),
                versions: []
            }
        ]);
    }

    return true;
}

export default db;
