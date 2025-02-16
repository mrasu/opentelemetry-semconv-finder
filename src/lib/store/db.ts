import { readable, readonly, writable } from 'svelte/store';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { activeDocuments, fullDocuments, type RegistryDocument } from '$lib/gen/documents';
import * as yaml from 'js-yaml';

const initDatabase = async (): Promise<PGlite> => {
	try {
		console.log('Initializing database...');
		const db = await PGlite.create({ extensions: { vector } });
		await db.exec(`
				CREATE EXTENSION vector;
				CREATE TABLE IF NOT EXISTS active_documents (
					id SERIAL PRIMARY KEY,
					document TEXT,
					embedding vector(384)
				);
				CREATE TABLE IF NOT EXISTS full_documents (
					id SERIAL PRIMARY KEY,
					document TEXT,
					embedding vector(384)
				);
			`);
		console.log('Database initialized successfully');

		await insertDocuments(db);
		return db;
	} catch (error) {
		console.error('Error initializing database:', error);
		throw error;
	}
};

const insertDocuments = async (db: PGlite) => {
	await db.exec('DELETE FROM active_documents');
	await db.exec('DELETE FROM full_documents');

	for (const doc of activeDocuments) {
		const text = yaml.dump(doc.content);
		await db.query('INSERT INTO active_documents (document, embedding) VALUES ($1, $2)', [
			text,
			JSON.stringify(doc.vector)
		]);
	}

	for (const doc of fullDocuments) {
		const text = yaml.dump(doc.content);
		await db.query('INSERT INTO full_documents (document, embedding) VALUES ($1, $2)', [
			text,
			JSON.stringify(doc.vector)
		]);
	}
	console.log('Insertion finished');
};

function createDb() {
	const store = writable<PGlite | null>(null);
	initDatabase().then((db) => {
		store.set(db);
	});

	return readonly(store);
}

export const db = createDb();
