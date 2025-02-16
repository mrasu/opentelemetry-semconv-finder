import { pipeline } from '@xenova/transformers';

export const toVector = async (text: string): Promise<number[]> => {
	const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
	const vector = await embedder(text, { pooling: 'mean', normalize: true });

	return Array.from(vector.data);
};
