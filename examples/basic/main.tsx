/**
 * Exemple d'intégration du composant <DrawioSpatial /> dans une application React (SPEC §18).
 * En dev : http://localhost:5173/examples/basic/
 *
 * Dans une vraie application, les imports viennent du paquet :
 *   import { DrawioSpatial, MemoryStore } from 'drawio-spatial';
 *   import 'drawio-spatial/style.css';
 */
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DrawioSpatial, MemoryStore } from '../../src/index';
import type { DrawioSpatialHandle, PageModel, Selection } from '../../src/index';
import diagram from '../../tests/fixtures/links.drawio?raw';
import './example.css';

const FONTS = { regular: robotoRegular, bold: robotoBold };

/** Bibliothèque en mémoire avec un fichier : la vue (page, caméra) y est mémorisée par le composant. */
const store = new MemoryStore();
await store.put({
  id: 'demo',
  name: 'links.drawio',
  content: diagram,
  size: diagram.length,
  lastOpenedAt: Date.now(),
  cameraByPage: {},
});

function Example() {
  const viewer = useRef<DrawioSpatialHandle>(null);
  const [source, setSource] = useState<'xml' | 'store'>('xml');
  const [editable, setEditable] = useState(false);
  const [pages, setPages] = useState<PageModel[]>([]);
  const [page, setPage] = useState<PageModel>();
  const [selection, setSelection] = useState<Selection>();
  const [modified, setModified] = useState(false);
  const [saved, setSaved] = useState<string>();

  return (
    <div className="example">
      <header>
        <label>
          Source{' '}
          <select value={source} onChange={(event) => setSource(event.target.value as 'xml' | 'store')}>
            <option value="xml">contenu (prop xml)</option>
            <option value="store">bibliothèque (props store + fileId)</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={editable} onChange={(event) => setEditable(event.target.checked)} /> Édition
        </label>
        <select
          aria-label="Page"
          value={page?.id ?? ''}
          onChange={(event) => viewer.current?.engine?.goToPage(event.target.value)}
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button onClick={() => viewer.current?.engine?.toggleViewMode()}>2D ↔ Iso</button>
        <button disabled={!editable} onClick={() => viewer.current?.undo()}>
          Annuler
        </button>
        <button disabled={!editable} onClick={() => viewer.current?.redo()}>
          Rétablir
        </button>
        <button onClick={() => viewer.current?.save()}>Sauvegarder{modified ? ' •' : ''}</button>
      </header>

      <main>
        <DrawioSpatial
          ref={viewer}
          key={source}
          {...(source === 'xml' ? { xml: diagram, fileId: 'links' } : { store, fileId: 'demo' })}
          editable={editable}
          fonts={FONTS}
          settings={{ view: { isoDepth: 24 } }}
          onLoad={(document) => setPages(document.pages)}
          onPageChange={setPage}
          onSelectionChange={setSelection}
          onModifiedChange={setModified}
          onSave={(xml) => setSaved(`${xml.length} caractères, ${new Date().toLocaleTimeString()}`)}
          onError={(error) => console.error(error)}
        />
      </main>

      <footer>
        Page : <strong>{page?.name ?? '—'}</strong> · Sélection :{' '}
        <strong>{selection ? selection.picked.element.label || selection.picked.element.id : '—'}</strong>
        {saved && <> · Sauvegardé : {saved}</>}
      </footer>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root introuvable');
createRoot(container).render(
  <StrictMode>
    <Example />
  </StrictMode>,
);
