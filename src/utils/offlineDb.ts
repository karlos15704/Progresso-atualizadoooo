// src/utils/offlineDb.ts
// Simple IndexedDB wrapper using idb and sql.js for offline storage of user session and exams
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import initSqlJs, { Database } from 'sql.js';

interface ProgressoDB extends DBSchema {
  user: {
    key: string; // email
    value: {
      email: string;
      role: string;
      profile: any;
      token: string;
      expires_at: number;
    };
  };
  exams: {
    key: string; // exam.id
    value: any; // exam data
  };
}

let dbPromise: Promise<IDBPDatabase<ProgressoDB>> | null = null;
let sqlPromise: Promise<Database> | null = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<ProgressoDB>('progresso-offline-db', 1, {
      upgrade(db) {
        db.createObjectStore('user');
        db.createObjectStore('exams');
      },
    });
  }
  return dbPromise;
};

const getSQL = async () => {
  return null;
};

export const offlineDb = {
  async saveUserSession(session: { email: string; role: string; profile: any; token: string; expires_at: number }) {
    const db = await getDB();
    await db.put('user', session, session.email);
  },
  async getUserSession(email: string) {
    const db = await getDB();
    return db.get('user', email);
  },
  async saveExams(exams: any[]) {
    const db = await getDB();
    const tx = db.transaction('exams', 'readwrite');
    for (const exam of exams) {
      await tx.store.put(exam, exam.id);
    }
    await tx.done;
  },
  async getAllExams() {
    const db = await getDB();
    return db.getAll('exams');
  },
  async execSQL(_query: string) {
    console.warn('SQL offline query não disponível sem sql.js. Use IndexedDB diretamente.');
    return [];
  },
};
