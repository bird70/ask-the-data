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
// Write intermediate .mmd files into assets/images/mmd
const outDir = path.join(root, 'assets', 'images', 'mmd');
ensureDir(outDir);

for (const file of files) {
  try {
    const rel = path.relative(root, file);
    let content = fs.readFileSync(file, 'utf8');
    const re = /```mermaid\n([\s\S]*?)```/g;
    let m;
    let localIndex = 0;
    let newContent = '';
    let lastIndex = 0;

    while ((m = re.exec(content)) !== null) {
      const body = m[1];
      if (!body.trim()) continue;

      // Create a friendlier filename: strip leading dates from post filenames
      // e.g. "2025-11-28-Enterprise-CICD-GitHub-Actions.md" -> "Enterprise-CICD-GitHub-Actions_md_0.svg"
      const origBase = path.basename(rel); // include extension
      const display = origBase.replace(/^\d{4}-\d{2}-\d{2}-/, '');
      const ext = path.extname(display); // .md or .markdown
      const nameNoExt = display.slice(0, -ext.length);
      const base = sanitize(nameNoExt) + '_' + ext.replace('.', '') + '_' + (localIndex++);
      const outMmd = path.join(outDir, base + '.mmd');
      fs.writeFileSync(outMmd, body, 'utf8');
      console.log('WROTE', outMmd);

      const svgName = base + '.svg';
      // Insert an HTML <img> that first tries absolute_url and falls back to relative_url on error
      const absUrl = `{{ "/assets/images/${svgName}" | absolute_url }}`;
      const relUrl = `{{ "/assets/images/${svgName}" | relative_url }}`;
      const imageLine = `<img src="${absUrl}" alt="diagram" onerror="this.onerror=null;this.src='${relUrl}'" />`;

      const matchEnd = m.index + m[0].length;
      newContent += content.slice(lastIndex, matchEnd);

      const lookahead = content.slice(matchEnd, matchEnd + 400);
      const alreadyHasImage = lookahead.includes(svgName) || /!\[.*\]\(.+assets\/images\/.+\)/.test(lookahead);

      if (!alreadyHasImage) {
        newContent += '\n\n' + imageLine + '\n';
        console.log('INSERTED image ref for', file, svgName);
      } else {
        console.log('Image ref already present for', file, svgName);
      }

      lastIndex = matchEnd;
    }

    newContent += content.slice(lastIndex);

    if (newContent && newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('UPDATED', file);
    }
  } catch (err) {
    console.error('ERR', file, err.message);
  }
}

// Also leave any existing .mmd files alone; the workflow will render everything in assets/images/diagrams
console.log('Extraction complete.');
