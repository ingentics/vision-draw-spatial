import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { backticked, readRepo, ROOT } from '../docHelpers';

/**
 * Chemins cités par les docs (sujet 390) : un chemin entre backticks (`src/…`, `tests/…`, `docs/…`, et ceux du moteur
 * écrits sans `src/` : `engine/…`, `core/…`, `plugins/…`) ou un lien relatif d'un fichier de `docs/` désigne un fichier
 * ou un dossier qui existe. Les backlogs (`docs/backlogs/`) ne sont pas relus : un sujet fait décrit le code de son
 * époque. Un chemin à compléter (`<id>`, `*`, `…`) n'est pas vérifié.
 */
const DOCS = [
  ...readdirSync(resolve(ROOT, 'docs'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `docs/${name}`),
  'CLAUDE.md',
  '.claude/rules/coding.md',
];

/** Préfixe d'un chemin cité → dossier depuis la racine du dépôt. */
const PREFIXES: Record<string, string> = {
  src: 'src',
  tests: 'tests',
  docs: 'docs',
  engine: 'src/engine',
  core: 'src/engine/core',
  plugins: 'src/engine/plugins',
};

/** Le chemin existe-t-il (un module peut être cité sans son extension : `core/render/iso/block`) ? */
const exists = (path: string) => ['', '.ts', '.tsx'].some((extension) => existsSync(resolve(ROOT, path + extension)));

/** Chemin à compléter par le lecteur : pas vérifiable. */
const template = (path: string) => /[<>*…{}]/.test(path);

/** Chemins entre backticks, depuis la racine du dépôt (numéro de ligne retiré). */
function citedPaths(markdown: string): string[] {
  return backticked(markdown).flatMap((text) => {
    const match = /^(src|tests|docs|engine|core|plugins)\/(\S*)/.exec(text);
    if (!match) return [];
    const path = `${PREFIXES[match[1]!]}/${match[2]!.replace(/:\d+.*$/, '')}`;
    return template(path) ? [] : [path];
  });
}

/** Cibles des liens relatifs d'un fichier de `docs/`, depuis la racine du dépôt (ancre retirée). */
function linkedPaths(markdown: string): string[] {
  return [...markdown.matchAll(/\]\(([^)\s]+)\)/g)].flatMap((match) => {
    const target = match[1]!.replace(/#.*$/, '');
    if (target === '' || /^[a-z]+:/.test(target)) return [];
    return [resolve(ROOT, 'docs', target).slice(ROOT.length + 1)];
  });
}

describe('chemins cités par les docs (sujet 390)', () => {
  it('chaque chemin cité entre backticks existe', () => {
    const cited = DOCS.flatMap((doc) => citedPaths(readRepo(doc)).map((path) => [doc, path] as const));
    expect(cited.length).toBeGreaterThan(100);
    expect(cited.filter(([, path]) => !exists(path)).map(([doc, path]) => `${doc} : ${path}`)).toEqual([]);
  });

  it('chaque lien relatif des docs mène à un fichier qui existe', () => {
    const linked = DOCS.filter((doc) => doc.startsWith('docs/')).flatMap((doc) =>
      linkedPaths(readRepo(doc)).map((path) => [doc, path] as const),
    );
    expect(linked.length).toBeGreaterThan(50);
    expect(linked.filter(([, path]) => !exists(path)).map(([doc, path]) => `${doc} : ${path}`)).toEqual([]);
  });
});
