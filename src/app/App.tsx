import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import { useCallback, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Engine } from '../engine/Engine';
import type { DocumentModel } from '../engine/model/types';
import { DrawioSpatial } from '../react/DrawioSpatial';
import { demoFiles } from './demoFiles';

const FONTS = { regular: robotoRegular, bold: robotoBold };
const DEFAULT_FILE = demoFiles.find((f) => f.name === 'docs/test.drawio') ?? demoFiles[0];

interface OpenFile {
  id: string;
  xml: string;
}

export function App() {
  const [file, setFile] = useState<OpenFile | undefined>(DEFAULT_FILE);
  const [engine, setEngine] = useState<Engine>();
  const [document, setDocument] = useState<DocumentModel>();
  const [pageId, setPageId] = useState<string>();
  const [error, setError] = useState<string>();

  const handleEngine = useCallback((instance: Engine | undefined) => {
    setEngine(instance);
    // Accès au moteur depuis la console du navigateur, en dev uniquement.
    if (import.meta.env.DEV) (window as unknown as { engine?: Engine }).engine = instance;
    if (!instance) return;
    instance.on('load', (doc) => {
      setDocument(doc);
      setError(undefined);
    });
    instance.on('pageChange', (page) => setPageId(page.id));
  }, []);

  const pickDemo = (event: ChangeEvent<HTMLSelectElement>) => {
    const demo = demoFiles.find((f) => f.id === event.target.value);
    if (demo) setFile(demo);
  };

  const openLocal = async (event: ChangeEvent<HTMLInputElement>) => {
    const local = event.target.files?.[0];
    if (local) setFile({ id: `local/${local.name}`, xml: await local.text() });
    event.target.value = '';
  };

  const unsupported = engine?.getPageScene()?.unsupported;

  return (
    <div className="app">
      <header className="toolbar">
        <select value={demoFiles.some((f) => f.id === file?.id) ? file?.id : ''} onChange={pickDemo}>
          {!demoFiles.some((f) => f.id === file?.id) && <option value="">{file?.id ?? '—'}</option>}
          {demoFiles.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <label className="button">
          Ouvrir…
          <input type="file" accept=".drawio,.xml" hidden onChange={openLocal} />
        </label>
        {document && document.warnings.length > 0 && (
          <span className="badge" title={document.warnings.map((w) => w.message).join('\n')}>
            {document.warnings.length} avertissement(s)
          </span>
        )}
        {unsupported && unsupported.size > 0 && (
          <span className="badge" title={[...unsupported].map(([k, n]) => `${k} × ${n}`).join('\n')}>
            {unsupported.size} élément(s) non supporté(s)
          </span>
        )}
        {error && <span className="badge error">{error}</span>}
      </header>

      <div className="viewport">
        <DrawioSpatial
          xml={file?.xml}
          fileId={file?.id}
          fonts={FONTS}
          onEngine={handleEngine}
          onError={(e) => setError(e instanceof Error ? e.message : String(e))}
        />
      </div>

      {document && document.pages.length > 1 && (
        <nav className="tabs">
          {document.pages.map((page) => (
            <button
              key={page.id}
              className={page.id === pageId ? 'tab active' : 'tab'}
              onClick={() => engine?.goToPage(page.id)}
            >
              {page.name}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
