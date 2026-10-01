/** Fichiers de démonstration : fixtures de test + fichiers déposés dans docs/. */
const fixtures = import.meta.glob<string>(['../../tests/fixtures/*.drawio', '../../tests/fixtures/*.xml'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
const docs = import.meta.glob<string>('../../docs/*.drawio', { query: '?raw', import: 'default', eager: true });

export interface DemoFile {
  id: string;
  name: string;
  xml: string;
}

function toFiles(source: Record<string, string>, prefix: string): DemoFile[] {
  return Object.entries(source)
    .map(([path, xml]) => {
      const name = path.split('/').pop()!;
      return { id: `${prefix}/${name}`, name: `${prefix}/${name}`, xml };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const demoFiles: DemoFile[] = [...toFiles(docs, 'docs'), ...toFiles(fixtures, 'fixtures')];
