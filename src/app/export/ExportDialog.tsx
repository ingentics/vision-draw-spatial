import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ExporterSettings } from '../../engine';
import { plantUmlUrls } from './plantumlServer';

/** Rendu d'un texte exporté : image et page où l'ouvrir. */
type Preview = (
  source: string,
  exporters: ExporterSettings,
) => Promise<{ image: string; link: string; linkLabel: string }>;

/** Rendus connus, par format ; un format sans rendu n'affiche que son texte. */
const PREVIEWS: Record<string, Preview> = {
  plantuml: async (source, exporters) => {
    const { svg, editor } = await plantUmlUrls(source, exporters.plantuml);
    return { image: svg, link: editor, linkLabel: 'Ouvrir sur plantuml.com' };
  },
};

/**
 * Fenêtre d'export d'un texte (sujets 90, 439), commune aux modes : texte fourni par l'exporteur du mode (copiable) et,
 * si le format en a un, son rendu en ligne par le moteur des paramètres. Les choix propres au mode (ex. flux exporté)
 * passent en `children`, dans l'entête. Croix ou Échap : fermer.
 */
export function ExportDialog({
  format,
  source,
  exporters,
  onClose,
  children,
}: {
  /** Format exporté : `id` choisit le rendu, `name` est affiché (ex. « PlantUML »). */
  format: { id: string; name: string };
  source: string;
  /** Moteurs de rendu (paramètres de l'appli, Exporteurs). */
  exporters: ExporterSettings;
  onClose: () => void;
  children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<Preview>>>();
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    const render = PREVIEWS[format.id];
    setPreview(undefined);
    setFailed(false);
    setCopied(false);
    if (!render) return;
    let live = true;
    render(source, exporters).then(
      (next) => live && setPreview(next),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [format.id, source, exporters]);

  const copy = () =>
    void navigator.clipboard.writeText(source).then(
      () => setCopied(true),
      () => setCopied(false),
    );

  return (
    <dialog
      ref={dialog}
      className="export-dialog"
      aria-label={`Export ${format.name}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Les touches tapées dans la fenêtre n'agissent pas sur la vue derrière.
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <header className="settings-dialog-header">
        <h2>Export {format.name}</h2>
        {children}
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer" data-tip="Fermer (Échap)">
          ×
        </button>
      </header>
      <div className="export-dialog-main">
        <div className="export-source">
          <textarea readOnly value={source} aria-label={`Texte ${format.name}`} spellCheck={false} />
          <button type="button" className="button" onClick={copy}>
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
        {PREVIEWS[format.id] && (
          <div className="export-preview">
            {failed ? (
              <p className="panel-hint">
                Rendu impossible{preview ? ` : ${new URL(preview.image).origin} ne répond pas` : ''}. Le moteur de rendu
                se règle dans les paramètres (Exporteurs).
              </p>
            ) : preview ? (
              <>
                <div className="export-preview-bar">
                  <a href={preview.link} target="_blank" rel="noreferrer">
                    {preview.linkLabel}
                  </a>
                </div>
                <div className="export-canvas">
                  <img src={preview.image} alt={`Rendu ${format.name}`} onError={() => setFailed(true)} />
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
