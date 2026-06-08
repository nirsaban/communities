import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export type ModelInfo = {
  name: string;
  file: string;
  fields: string[];
  indexes: string[];
  hasCommunityId: boolean;
};

const SCHEMA_BLOCK_RE = /new\s+Schema\s*<[^>]*>\s*\(\s*\{([\s\S]*?)\}\s*,/;
const FIELD_RE = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
const INDEX_RE = /\.index\s*\(\s*(\{[\s\S]*?\})\s*(?:,\s*(\{[\s\S]*?\})\s*)?\)/g;

export async function buildModelsCatalog(): Promise<ModelInfo[]> {
  const dir = path.join(config.backendSrc, 'models');
  const files = await fs.readdir(dir);
  const out: ModelInfo[] = [];
  for (const f of files.filter((f) => f.endsWith('.ts'))) {
    const src = await fs.readFile(path.join(dir, f), 'utf8');
    const name = f.replace(/\.ts$/, '');
    const block = src.match(SCHEMA_BLOCK_RE)?.[1] ?? '';
    const fields = Array.from(
      new Set(
        Array.from(block.matchAll(FIELD_RE))
          .map((m) => m[1])
          .filter((n) => !['type', 'required', 'default', 'enum', 'ref', 'index'].includes(n)),
      ),
    );
    const indexes = Array.from(src.matchAll(INDEX_RE)).map((m) =>
      `${m[1]}${m[2] ? `, ${m[2]}` : ''}`.replace(/\s+/g, ' '),
    );
    out.push({
      name,
      file: `backend/src/models/${f}`,
      fields,
      indexes,
      hasCommunityId: /\bcommunityId\b/.test(src),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
