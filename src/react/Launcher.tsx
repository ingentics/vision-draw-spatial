import { useRef, useState } from 'react';
import type { StoredFileMeta } from '../engine';

export interface LauncherExample {
  id: string;
  name: string;
}

interface LauncherProps {
  recents: StoredFileMeta[];
  /** Fichiers d'exemple (facultatif). */
  examples?: LauncherExample[];
  onOpenRecent: (id: string) => void;
  onRemoveRecent: (id: string) => void;
  onOpenFile: (file: File) => void;
  /** Ouverture par le dialogue du système (appli native) ; sinon, sélecteur de fichier du navigateur. */
  onOpenDialog?: () => void;
  onNewFile: () => void;
  onOpenExample?: (id: string) => void;
  error?: string;
  /** Horloge, pour les dates relatives (injectable pour les tests). */
  now?: number;
}

/**
 * Lanceur (SPEC §6) : fichiers récents triés par récence, ouverture (sélecteur ou glisser-déposer),
 * nouveau fichier, retrait d'un fichier de la liste.
 */
export function Launcher({
  recents,
  examples = [],
  onOpenRecent,
  onRemoveRecent,
  onOpenFile,
  onOpenDialog,
  onNewFile,
  onOpenExample,
  error,
  now = Date.now(),
}: LauncherProps) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const needle = normalizeSearch(query);
  const matches = (name: string) => normalizeSearch(name).includes(needle);
  const shownRecents = recents.filter((file) => matches(file.name));
  const shownExamples = examples.filter((example) => matches(example.name));

  return (
    <main className="launcher">
      <div className="launcher-card">
        <h1>Drawio Spatial</h1>
        <p className="muted">Vos schémas draw.io, posés dans l’espace.</p>

        <div className="launcher-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => (onOpenDialog ? onOpenDialog() : input.current?.click())}
          >
            Ouvrir un fichier…
          </button>
          <button type="button" className="button" onClick={onNewFile}>
            Nouveau fichier
          </button>
          <input
            ref={input}
            type="file"
            accept=".drawio,.xml"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onOpenFile(file);
              event.target.value = '';
            }}
          />
        </div>
        <p className="drop-hint muted">ou glissez-déposez un fichier .drawio n’importe où dans la fenêtre</p>
        {error && (
          <p className="launcher-error" role="alert">
            {error}
          </p>
        )}

        {(recents.length > 0 || examples.length > 0) && (
          <div className="launcher-search">
            <input
              type="search"
              placeholder="Rechercher un fichier…"
              aria-label="Rechercher un fichier"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setQuery('');
              }}
            />
          </div>
        )}

        <section>
          <h2>Récents</h2>
          {recents.length === 0 ? (
            <p className="muted">Aucun fichier ouvert pour l’instant.</p>
          ) : shownRecents.length === 0 ? (
            <p className="muted">Aucun fichier récent ne correspond.</p>
          ) : (
            <ul className="file-list">
              {shownRecents.map((file) => (
                <li key={file.id}>
                  <button type="button" className="file-open" onClick={() => onOpenRecent(file.id)}>
                    <span className="file-name">{file.name}</span>
                    <span className="muted">{relativeDate(file.lastOpenedAt, now)}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Retirer ${file.name} de la liste`}
                    title="Retirer de la liste"
                    onClick={() => onRemoveRecent(file.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {shownExamples.length > 0 && onOpenExample && (
          <section>
            <h2>Exemples</h2>
            <ul className="file-list compact">
              {shownExamples.map((example) => (
                <li key={example.id}>
                  <button type="button" className="file-open" onClick={() => onOpenExample(example.id)}>
                    <span className="file-name">{example.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

/** Texte comparable : minuscules, sans accents ni apostrophes typographiques. */
function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .trim();
}

function relativeDate(at: number, now: number): string {
  const minutes = Math.round((now - at) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
