import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export type ServiceInfo = {
  name: string;
  file: string;
  exports: string[];
};

const EXPORT_RE = /export\s+(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
const EXPORT_CONST_RE = /export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;

async function listExports(dir: string): Promise<ServiceInfo[]> {
  const files = await fs.readdir(dir);
  const out: ServiceInfo[] = [];
  for (const f of files.filter((f) => f.endsWith('.ts'))) {
    const src = await fs.readFile(path.join(dir, f), 'utf8');
    const exps = new Set<string>();
    for (const m of src.matchAll(EXPORT_RE)) exps.add(m[1]);
    for (const m of src.matchAll(EXPORT_CONST_RE)) exps.add(m[1]);
    out.push({
      name: f.replace(/\.ts$/, ''),
      file: path.relative(config.repoRoot, path.join(dir, f)),
      exports: [...exps].sort(),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function buildServicesCatalog(): Promise<ServiceInfo[]> {
  return listExports(path.join(config.backendSrc, 'services'));
}

export async function buildJobsCatalog(): Promise<ServiceInfo[]> {
  return listExports(path.join(config.backendSrc, 'jobs'));
}

export async function buildMiddlewareCatalog(): Promise<ServiceInfo[]> {
  return listExports(path.join(config.backendSrc, 'middleware'));
}
