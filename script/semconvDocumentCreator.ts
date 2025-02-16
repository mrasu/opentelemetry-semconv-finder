import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { toVector } from '../src/lib/vector';

type Attribute = {
	name: string;
	brief?: string;
	examples?: unknown;
	deprecated: boolean;
};

// TODO: include title in content for LLM (makes better?)
type RegistryDocument = {
	title: string;
	content: Attribute[];
	vector: number[];
};

type Registry = {
	groups: {
		attributes?: {
			id: string;
			examples: unknown;
			brief?: string;
		}[];
	}[];
};

type RegistryFile = {
	category: string;
	files: {
		path: string;
		deprecated: boolean;
	}[];
};

function loadAttributes(file: string, deprecated: boolean): Attribute[] {
	const data = yaml.load(fs.readFileSync(file, 'utf8')) as Registry;
	return (
		data.groups?.at(0)?.attributes?.map(
			(attr): Attribute => ({
				name: attr.id,
				brief: attr.brief ?? undefined,
				examples: attr.examples ?? undefined,
				deprecated: deprecated
			})
		) || []
	);
}

async function createDocuments(
	registryFiles: RegistryFile[],
	includesDeprecated: boolean
): Promise<RegistryDocument[]> {
	const docs: RegistryDocument[] = [];

	for (const regFile of registryFiles) {
		let attrs: Attribute[] = [];
		for (const f of regFile.files) {
			if (f.deprecated && !includesDeprecated) continue;

			attrs = attrs.concat(loadAttributes(f.path, f.deprecated));
		}
		const attrText = yaml.dump(attrs);
		const vector = await toVector(attrText);
		docs.push({ title: `About ${regFile.category} attributes`, content: attrs, vector: vector });
	}

	return docs;
}

async function findRegistryFiles(): Promise<RegistryFile[]> {
	const registryFiles: RegistryFile[] = [];
	for (const f of await readdir('semantic-conventions/model/')) {
		const files: RegistryFile['files'] = [];
		const regPath = path.join('semantic-conventions/model/', f, 'registry.yaml');
		if (await Bun.file(regPath).exists()) {
			files.push({
				path: regPath,
				deprecated: false
			});
		}

		const deprecatedRegPath = path.join(
			'semantic-conventions/model/',
			f,
			'deprecated/registry-deprecated.yaml'
		);
		if (await Bun.file(deprecatedRegPath).exists()) {
			files.push({
				path: deprecatedRegPath,
				deprecated: true
			});
		}

		if (files.length > 0) {
			registryFiles.push({
				category: f,
				files: files
			});
		}
	}

	return registryFiles;
}

const regFiles = await findRegistryFiles();

const activeDocs = await createDocuments(regFiles, false);
await Bun.write('src/lib/gen/activeDocuments.json', JSON.stringify(activeDocs, null, 2));

const fullDocs = await createDocuments(regFiles, true);
await Bun.write('src/lib/gen/fullDocuments.json', JSON.stringify(fullDocs, null, 2));
