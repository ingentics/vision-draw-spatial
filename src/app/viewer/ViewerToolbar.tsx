import { useEffect, useState } from 'react';
import type { ViewMode } from '../../engine';
import { desktop } from '../desktop';
import { NavigationToolbar } from '../NavigationToolbar';
import { useTooltip } from '../Tooltip';

/**
 * Barre d'outils de la visionneuse : fichier, enregistrement, export d'image, annuler / rétablir, modes de vue, état de la
 * sauvegarde automatique ; à droite plein écran, diagnostics et paramètres.
 */
export function ViewerToolbar({
  fileName,
  save,
  undoLabels,
  viewMode,
  allowedViewModes,
  diagnostics,
  exportOpen,
  settingsOpen,
  error,
  onShowFiles,
  onSave,
  onToggleExport,
  onUndo,
  onRedo,
  onViewModeChange,
  onResetView,
  onOpenSettings,
}: {
  fileName: string;
  /** État de l'enregistrement : fichier du disque, modifications, sauvegarde automatique. */
  save: {
    onDisk: boolean;
    diskBlocked: boolean;
    modified: boolean;
    autosave: boolean;
    autosaving: boolean;
    autosavedAt: number | undefined;
  };
  undoLabels: { undo?: string; redo?: string };
  viewMode: ViewMode;
  allowedViewModes: ViewMode[];
  /** Bouton des diagnostics (absent si le réglage le masque) : ouvert, nombre de problèmes, bascule. */
  diagnostics: { open: boolean; issueCount: number; onToggle: () => void } | undefined;
  /** Panneau « Exporter » ouvert dans la barre de droite (sujet 431). */
  exportOpen: boolean;
  settingsOpen: boolean;
  error: string | undefined;
  onShowFiles: () => void;
  onSave: () => void;
  onToggleExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onResetView: () => void;
  onOpenSettings: () => void;
}) {
  /** Plein écran de la page, suivi sur le navigateur (Échap en sort aussi, sujet 396). */
  const [fullscreen, setFullscreen] = useState(() => window.document.fullscreenElement !== null);
  useEffect(() => {
    const follow = () => setFullscreen(window.document.fullscreenElement !== null);
    window.document.addEventListener('fullscreenchange', follow);
    return () => window.document.removeEventListener('fullscreenchange', follow);
  }, []);
  const { hover, hide, tooltip } = useTooltip();
  const toggleFullscreen = () => {
    if (window.document.fullscreenElement) void window.document.exitFullscreen();
    else void window.document.documentElement.requestFullscreen();
  };
  const { onDisk, diskBlocked, modified, autosave, autosaving, autosavedAt } = save;

  return (
    <header className="toolbar">
      <button
        type="button"
        className="button file-button"
        data-tip="Revenir à la liste des fichiers"
        onClick={onShowFiles}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 3.5h4l1.5 1.5h5.5v7.5h-11z" />
        </svg>
        <span className="file-name">{fileName}</span>
      </button>
      <button
        type="button"
        className="button save-button"
        data-tip={[
          desktop
            ? 'Enregistrer le fichier sous (Ctrl+S)'
            : onDisk
              ? 'Enregistrer (Ctrl+S) : réécrit le fichier sur le disque et la bibliothèque'
              : 'Enregistrer sous (Ctrl+S) : téléchargement et bibliothèque',
          modified ? 'modifications non sauvegardées' : undefined,
          autosavedAt
            ? `enregistré automatiquement à ${new Date(autosavedAt).toLocaleTimeString('fr-FR')}`
            : autosave
              ? 'sauvegarde automatique activée'
              : undefined,
        ]
          .filter(Boolean)
          .join(' — ')}
        onClick={onSave}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2.5v7M5 6.5l3 3 3-3M3 11v2.5h10V11" />
        </svg>
        {onDisk ? 'Enregistrer' : 'Enregistrer sous'}
      </button>
      <button
        type="button"
        className="button icon-button"
        aria-pressed={exportOpen}
        aria-label="Exporter"
        data-tip="Exporter en image : PNG de la page ou de la sélection, en vue de dessus"
        onClick={onToggleExport}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 8h7.5M10.5 5l3 3-3 3M5 3H2.5v10H5" />
        </svg>
      </button>
      {diskBlocked && (
        <button
          type="button"
          className="button disk-warning"
          data-tip="Le navigateur n’autorise pas (encore) l’écriture du fichier sur le disque : les sauvegardes ne vont que dans la bibliothèque. Cliquer pour l’autoriser et enregistrer."
          onClick={onSave}
        >
          ⚠ Écriture sur le disque non autorisée
        </button>
      )}
      <span className="button-group">
        <button
          type="button"
          className="button icon-button"
          disabled={!undoLabels.undo}
          data-tip={undoLabels.undo ? `Annuler : ${undoLabels.undo} (Ctrl+Z)` : 'Annuler (Ctrl+Z)'}
          aria-label="Annuler"
          onClick={onUndo}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8h-2" />
          </svg>
        </button>
        <button
          type="button"
          className="button icon-button"
          disabled={!undoLabels.redo}
          data-tip={undoLabels.redo ? `Rétablir : ${undoLabels.redo} (Ctrl+Maj+Z)` : 'Rétablir (Ctrl+Maj+Z)'}
          aria-label="Rétablir"
          onClick={onRedo}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10.5 3.5l3 3-3 3M13.5 6.5h-7a4 4 0 0 0 0 8h2" />
          </svg>
        </button>
      </span>
      <NavigationToolbar
        viewMode={viewMode}
        allowedViewModes={allowedViewModes}
        onViewModeChange={onViewModeChange}
        onResetView={onResetView}
      />
      {autosave && (autosaving || modified || autosavedAt) && (
        <span className="save-status" role="status">
          {autosaving || modified ? 'Saving...' : 'All changes saved'}
        </span>
      )}
      <div className="toolbar-end">
        {window.document.fullscreenEnabled && (
          <button
            type="button"
            className="button fullscreen-toggle"
            aria-pressed={fullscreen}
            aria-label="Plein écran"
            onClick={() => {
              hide();
              toggleFullscreen();
            }}
            {...hover(
              fullscreen
                ? 'Quitter le plein écran (ou Échap)'
                : "Plein écran : l'appli occupe tout l'écran, sans la barre du navigateur",
            )}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {fullscreen ? (
                <path d="M6 2.5V6H2.5M10 2.5V6h3.5M6 13.5V10H2.5M10 13.5V10h3.5" />
              ) : (
                <path d="M2.5 6V2.5H6M13.5 6V2.5H10M2.5 10v3.5H6M13.5 10v3.5H10" />
              )}
            </svg>
          </button>
        )}
        {diagnostics && (
          <button
            type="button"
            className="button diagnostics-toggle"
            aria-pressed={diagnostics.open}
            aria-label="Diagnostics"
            data-tip="Diagnostics : erreurs, éléments non supportés, avertissements"
            onClick={diagnostics.onToggle}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 1.5h1.5M7.5 1.5H9M3.75 1.5v4a2.5 2.5 0 0 0 5 0v-4M6.25 8v2.5a2.5 2.5 0 0 0 5 0V9" />
              <circle className="diagnostics-chest" cx="11.25" cy="7.5" r="1.5" />
            </svg>
            {diagnostics.issueCount > 0 && <span className="pill">{diagnostics.issueCount}</span>}
          </button>
        )}
        <button
          type="button"
          className="button"
          aria-pressed={settingsOpen}
          aria-haspopup="dialog"
          data-tip="Paramètres"
          onClick={onOpenSettings}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 4.5h7M12.5 4.5h1M2.5 11.5h1M6.5 11.5h7" />
            <circle cx="11" cy="4.5" r="1.5" />
            <circle cx="5" cy="11.5" r="1.5" />
          </svg>
          Paramètres
        </button>
      </div>
      {error && <span className="badge error">{error}</span>}
      {tooltip}
    </header>
  );
}
