import rawActiveDocuments from '$lib/gen/activeDocuments.json';
import rawFullDocuments from '$lib/gen/fullDocuments.json';

export type RegistryAttribute = {
	name: string;
	brief?: string;
	examples?: unknown;
	deprecated: boolean;
};

export type RegistryDocument = {
	title: string;
	content: RegistryAttribute[];
	vector: number[];
};

export const activeDocuments = rawActiveDocuments as RegistryDocument[];
export const fullDocuments = rawFullDocuments as RegistryDocument[];
