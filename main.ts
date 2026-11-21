// Mirror Cove — make.fun submission program.
// Copies game/ and screenshots/ into the output directory and writes the
// dossier with the vendored make.fun library, using the bounty's caps.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyFresh(sourceName) {
  const from = join(here, sourceName);
  const to = join(outputDir, sourceName);
  if (!existsSync(from)) throw new Error(`missing ${sourceName}/ next to main.ts`);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyFresh('game');
copyFresh('screenshots');

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Mirror Cove: wrote game/, screenshots/ and dossier.json to ${outputDir}`);
