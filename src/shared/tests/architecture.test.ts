/// <reference types="node" />
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
function files(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

test('shared implementation does not depend on games, screens or the router', () => {
  const sharedRoot = path.join(root, 'src/shared');
  for (const file of files(sharedRoot).filter(file => /\.[jt]sx?$/.test(file) && !file.includes(`${path.sep}tests${path.sep}`))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g)) {
      const reference = match[1];
      if (!reference.startsWith('.') && !reference.startsWith('@/')) continue;
      const target = reference.startsWith('@/') ? path.resolve(root, 'src', reference.slice(2)) : path.resolve(path.dirname(file), reference);
      const relative = path.relative(path.join(root, 'src'), target).replace(/\\/g, '/');
      expect(relative).not.toMatch(/^(?:games|screens|app)(?:\/|$)/);
    }
  }
});
test('every relative asset and source import resolves after moving modules', () => {
  const sourceFiles = files(path.join(root, 'src')).filter(file => /\.[jt]sx?$/.test(file));
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const references = [...source.matchAll(/(?:from\s*|require\(\s*)['"](\.[^'"]+)['"]/g)];
    for (const reference of references) {
      const base = path.resolve(path.dirname(file), reference[1]);
      const candidates = [base, ...['.ts', '.tsx', '.js'].map(extension => base + extension),
        ...['index.ts', 'index.tsx', 'index.js'].map(name => path.join(base, name))];
      expect(candidates.some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())).toBe(true);
    }
  }
});
test('game modules do not import another game and non-route implementation stays outside Expo Router', () => {
  const gamesRoot = path.join(root, 'src/games');
  for (const file of files(gamesRoot).filter(file => /\.[jt]sx?$/.test(file) && !file.includes(`${path.sep}tests${path.sep}`))) {
    const relative = path.relative(gamesRoot, file);
    if (!relative.includes(path.sep)) continue; // central registry
    const game = relative.split(path.sep)[0];
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/from\s*['"](\.[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file), match[1]);
      if (target.startsWith(gamesRoot + path.sep)) expect(path.relative(gamesRoot, target).split(path.sep)[0]).toBe(game);
    }
  }
  expect(files(path.join(root, 'src/app')).map(file => path.relative(path.join(root, 'src/app'), file).replace(/\\/g, '/')).sort())
    .toEqual(['_layout.tsx', 'games/[gameId].tsx', 'index.tsx']);
});
