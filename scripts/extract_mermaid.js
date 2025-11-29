#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

function sanitize(name) {
  return name.replace(/[\\/:<>"'`\s]+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g,'');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const root = process.cwd();
const files = walk(root).filter(f => f.endsWith('.md') || f.endsWith('.markdown'));
const outDir = path.join(root, 'assets', 'diagrams');
ensureDir(outDir);

for (const file of files) {
  try {
    const rel = path.relative(root, file);
    const content = fs.readFileSync(file, 'utf8');
    const re = /```mermaid\n([\s\S]*?)```/g;
    let m;
    let localIndex = 0;
    while ((m = re.exec(content)) !== null) {
      const body = m[1];
      if (!body.trim()) continue;
      const base = sanitize(rel) + '_' + (localIndex++);
      const outPath = path.join(outDir, base + '.mmd');
      fs.writeFileSync(outPath, body, 'utf8');
      console.log('WROTE', outPath);
    }
  } catch (err) {
    console.error('ERR', file, err.message);
  }
}

// Also leave any existing .mmd files alone; the workflow will render everything in assets/diagrams
console.log('Extraction complete.');
