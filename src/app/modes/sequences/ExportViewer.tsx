import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageModel } from '../../../engine/model/types';
import type { SequenceExporter } from '../../../engine/modes/sequences/export';
import { sequenceState } from '../../../engine/modes/sequences/steps';
import { plantUmlUrls } from './plantumlServer';

/** Choix de toute la page dans la liste des flux (un id de flux n'est jamais vide). */
const ALL = '';

/** Rendu d'un texte exporté : image et page où l'ouvrir. */
type Preview = (source: string) => Promise<{ image: string; link: string; linkLabel: string }>;

/** Rendus connus, par id d'exporteur ; un exporteur sans rendu n'affiche que son texte. */
const PREVIEWS: Record<string, Preview> = {
  plantuml: async (source) => {
    const { svg, editor } = await plantUmlUrls(source);
    return { image: svg, link: editor, linkLabel: 'Ouvrir sur plantuml.com' };
  },
};

/**
 * Fenêtre d'export d'un flux (sujet 90) : choix du flux, ou de toute la page (sujet 96, choix à l'ouverture), texte fourni par l'exporteur du moteur (copiable) et, si le
 * format en a un, son rendu en ligne. Croix ou Échap : fermer.
 */
export function ExportViewer({
  page,
  exporter,
  onClose,
}: {
  page: PageModel;
  exporter: SequenceExporter;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { flows } = sequenceState(page);
  /** Flux exporté ; `ALL` : tous les flux de la page. */
  const [flow, setFlow] = useState(ALL);
  const source = useMemo(() => exporter.export(page, flow === ALL ? undefined : flow), [exporter, page, flow]);
  const [preview, setPreview] = useState<Awaited<ReturnType<Preview>>>();
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    const render = PREVIEWS[exporter.id];
    setPreview(undefined);
    setFailed(false);
    setCopied(false);
    if (!render) return;
    let live = true;
    render(source).then(
      (next) => live && setPreview(next),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [exporter, source]);

  const copy = () =>
    void navigator.clipboard.writeText(source).then(
      () => setCopied(true),
      () => setCopied(false),
    );

  return (
    <dialog
      ref={dialog}
      className="export-dialog"
      aria-label={`Export ${exporter.name}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Les touches tapées dans la fenêtre n'agissent pas sur la vue derrière.
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <header className="settings-dialog-header">
        <h2>Export {exporter.name}</h2>
        <select value={flow} aria-label="Flux exporté" onChange={(event) => setFlow(event.target.value)}>
          <option value={ALL} title={`Tous les flux de la page « ${page.name} »`}>
            {page.name}
          </option>
          {flows.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title || f.id}
            </option>
          ))}
        </select>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer" title="Fermer (Échap)">
          ×
        </button>
      </header>
      <div className="export-dialog-main">
        <div className="export-source">
          <textarea readOnly value={source} aria-label={`Texte ${exporter.name}`} spellCheck={false} />
          <button type="button" className="button" onClick={copy}>
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
        {PREVIEWS[exporter.id] && (
          <div className="export-preview">
            {failed ? (
              <p className="panel-hint">Rendu impossible.</p>
            ) : preview ? (
              <>
                <div className="export-preview-bar">
                  <a href={preview.link} target="_blank" rel="noreferrer">
                    {preview.linkLabel}
                  </a>
                </div>
                <div className="export-canvas">
                  <img src={preview.image} alt={`Rendu ${exporter.name}`} onError={() => setFailed(true)} />
                </div>
              </>
            ) : (
              <p className="panel-hint">Rendu en cours…</p>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
