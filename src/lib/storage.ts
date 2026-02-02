import { openDB, DBSchema } from 'idb';
import { ModelPricing } from './pricing';

interface Document {
    id: string;
    title: string;
    content: string;
    plainText: string;
    createdAt: Date;
    updatedAt: Date;
}

interface Settings {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseURL?: string;
    tokensUsed?: number;
    totalCost?: number;
    hoverHighlightEnabled?: boolean;
    showCostEstimate?: boolean;
}

interface KitaabDB extends DBSchema {
    documents: {
        key: string;
        value: Document;
    };
    settings: {
        key: string;
        value: Settings;
    };
    pricing: {
        key: string;
        value: {
            data: Record<string, ModelPricing>;
            lastUpdated: Date;
        };
    };
}

const DB_NAME = 'kitaab-db';
const DB_VERSION = 2;

export const initDB = async () => {
    return openDB<KitaabDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (!db.objectStoreNames.contains('documents')) {
                db.createObjectStore('documents', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings'); // Singleton store, usage: put('config', settings)
            }
            if (oldVersion < 2 && !db.objectStoreNames.contains('pricing')) {
                db.createObjectStore('pricing');
            }
        },
    });
};

export const saveDocument = async (doc: Document) => {
    const db = await initDB();
    return db.put('documents', doc);
};

export const loadDocument = async (id: string) => {
    const db = await initDB();
    return db.get('documents', id);
};

export const listDocuments = async () => {
    const db = await initDB();
    return db.getAll('documents');
};

export const saveSettings = async (settings: Settings) => {
    const db = await initDB();
    return db.put('settings', settings, 'config');
};

export const loadSettings = async () => {
    const db = await initDB();
    return db.get('settings', 'config');
};

export const savePricingCache = async (data: Record<string, ModelPricing>) => {
    const db = await initDB();
    return db.put('pricing', { data, lastUpdated: new Date() }, 'cached');
};

export const loadPricingCache = async () => {
    const db = await initDB();
    return db.get('pricing', 'cached');
};
