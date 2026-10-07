import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Frontières des plugins (sujet 287), sur les chemins résolus : la lint (motifs sur le texte de l'import) ne sait pas
 * désigner un chemin qui finit par `..` ni distinguer le dossier d'où part l'import. Un plugin n'importe que son propre
 * dossier, l'API des plugins (`core/plugins`) et `three` ; une forme (de `plugins/shapes/` ou d'un mode) peut en plus
 * étendre une forme de `plugins/shapes/`.
 */
const ENGINE = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src/engine');
const PLUGINS = join(ENGINE, 'plugins');
const API = join(ENGINE, 'core', 'plugins');

function filesOf(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesOf(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Dossier propre d'un plugin : `plugins/<sorte>/<id>` (une forme : sa catégorie, et sa famille en dépend). */
function ownFolder(file: string): string {
  const [kind, id] = relative(PLUGINS, file).split(sep);
  return join(PLUGINS, kind!, id!);
}

const isShape = (file: string) =>
  relative(PLUGINS, file).startsWith(`shapes${sep}`) || relative(PLUGINS, file).split(sep)[2] === 'shapes';

const inside = (path: string, dir: string) => path === dir || path.startsWith(dir + sep);

const IMPORT = /(?:import|export)\s[^'"]*?from\s+'([^']+)'|import\s+'([^']+)'/g;

describe('frontières des plugins (sujet 287)', () => {
  const files = filesOf(PLUGINS).filter((file) => file !== join(PLUGINS, 'index.ts'));

  it('un plugin n’importe que son dossier, l’API des plugins et three (une forme : aussi les formes générales)', () => {
    const outside: string[] = [];
    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(IMPORT)) {
        const source = match[1] ?? match[2]!;
        if (!source.startsWith('.')) {
          if (source !== 'three') outside.push(`${relative(ENGINE, file)} → ${source}`);
          continue;
        }
        const target = resolve(dirname(file), source);
        const allowed =
          inside(target, ownFolder(file)) ||
          target === API ||
          (isShape(file) && inside(target, join(PLUGINS, 'shapes')));
        if (!allowed) outside.push(`${relative(ENGINE, file)} → ${source}`);
      }
    }
    expect(outside).toEqual([]);
  });
});
