import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return nextResolve('next/server.js', context);
  }
  if (specifier === 'next/cache') {
    return nextResolve('next/cache.js', context);
  }
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2);
    let abs = path.resolve(process.cwd(), 'src', rel);
    for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js']) {
      if (fs.existsSync(abs + ext) && !fs.statSync(abs + ext).isDirectory()) {
        abs = abs + ext;
        break;
      }
    }
    return nextResolve(pathToFileURL(abs).href, context);
  }
  if (specifier.startsWith('.')) {
    const parentURL = context.parentURL ? new URL(context.parentURL) : null;
    if (parentURL && parentURL.protocol === 'file:') {
      let parentPath = decodeURIComponent(parentURL.pathname);
      if (/^\/[A-Za-z]:/.test(parentPath)) {
        parentPath = parentPath.slice(1);
      }
      const parentDir = path.dirname(parentPath);
      let target = path.resolve(parentDir, specifier);
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js']) {
        if (fs.existsSync(target + ext) && !fs.statSync(target + ext).isDirectory()) {
          return nextResolve(pathToFileURL(target + ext).href, context);
        }
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const parsed = new URL(url);
    // On Windows, pathname may start with /C:/
    let filePath = decodeURIComponent(parsed.pathname);
    if (/^\/[A-Za-z]:/.test(filePath)) {
      filePath = filePath.slice(1);
    }
    const source = fs.readFileSync(filePath, 'utf8');
    return {
      format: 'json',
      source,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
