// Marks dist/esm as ES modules so Node resolves the `import` condition correctly.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../dist/esm/package.json', import.meta.url));
writeFileSync(target, `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
