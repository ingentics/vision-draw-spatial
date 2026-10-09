import { useState } from 'react';
import type { ImageExportOptions } from '../engine';
import { ChoiceGroup } from './ChoiceGroup';
import type { ChoiceOption } from './ChoiceGroup';
import { NumberField } from './Fields';
import { Section } from './PanelSection';
import { CollapseButton } from './Sidebar';

type Density = '1' | '1.5' | '2';
type Content = 'selection' | 'page';
type Format = 'png' | 'svg';

/** Densités proposées : rapport de largeur entre l'écran visé et un écran HD (1920 px). */
const DENSITY_OPTIONS: ReadonlyArray<ChoiceOption<Density>> = [
  { value: '1', label: 'HD', title: 'HD : 1 pixel par unité du schéma (écran de 1920 px)' },
  { value: '1.5', label: '2K', title: '2K : 1,5 pixel par unité du schéma (écran de 2560 px)' },
  { value: '2', label: '4K', title: '4K : 2 pixels par unité du schéma (écran de 3840 px)' },
];

const FORMAT_OPTIONS: ReadonlyArray<ChoiceOption<Format>> = [
  { value: 'png', label: 'PNG', title: 'PNG : image en pixels' },
  { value: 'svg', label: 'SVG', title: 'SVG : bientôt disponible', disabled: true },
];

const DEFAULT_MARGIN = 10;
const MAX_MARGIN = 200;

/**
 * Panneau « Exporter » de la barre de droite (sujet 431) : image PNG de la page courante ou de sa sélection, en vue de
 * dessus. Réglages non mémorisés : défauts à chaque ouverture.
 */
export function ExportPanel({
  hasSelection,
  onExport,
  onClose,
}: {
  /** Quelque chose est sélectionné sur la page courante. */
  hasSelection: boolean;
  onExport: (options: ImageExportOptions) => Promise<void>;
  onClose: () => void;
}) {
  const [density, setDensity] = useState<Density>('1');
  const [chosenContent, setContent] = useState<Content>(hasSelection ? 'selection' : 'page');
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Sélection vidée depuis le choix : tout le schéma.
  const content = hasSelection ? chosenContent : 'page';
  const contentOptions: ReadonlyArray<ChoiceOption<Content>> = [
    {
      value: 'selection',
      label: 'Sélection',
      title: hasSelection
        ? 'Sélection : les éléments sélectionnés et ce que leurs formes contiennent'
        : 'Sélection : rien n’est sélectionné',
      disabled: !hasSelection,
    },
    { value: 'page', label: 'Tout le schéma', title: 'Tout le schéma : toute la page courante' },
  ];

  const run = () => {
    setBusy(true);
    void onExport({
      density: Number(density),
      margin,
      transparent,
      selectionOnly: content === 'selection',
    }).finally(() => setBusy(false));
  };

  return (
    <aside className="side-panel card-panel context-panel" aria-label="Exporter">
      <header className="side-panel-header">
        <CollapseButton />
        <h2>Exporter</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer" data-tip="Fermer">
          ×
        </button>
      </header>
      <div className="side-panel-body">
        <Section title="Image">
          <div className="field-row">
            <span data-tip="Pixels par unité du schéma, selon l'écran visé : la taille de l'image suit le contenu">
              Densité
            </span>
            <ChoiceGroup
              label="Densité"
              value={density}
              options={DENSITY_OPTIONS}
              onChange={(value) => value && setDensity(value)}
            />
          </div>
          <div className="field-row">
            <span data-tip="Ce qui est dessiné dans l'image, en vue de dessus quelle que soit la vue">Contenu</span>
            <ChoiceGroup
              label="Contenu"
              value={content}
              options={contentOptions}
              onChange={(value) => value && setContent(value)}
            />
          </div>
          <NumberField
            label="Marge"
            title={`Marge autour du contenu, en unités du schéma (0 à ${MAX_MARGIN})`}
            value={margin}
            placeholder={String(DEFAULT_MARGIN)}
            onCommit={(value) => setMargin(Math.min(MAX_MARGIN, Math.round(value ?? DEFAULT_MARGIN)))}
          />
          <label className="field toggle" data-tip="Sans fond : seuls les éléments sont opaques">
            <input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} />
            Fond transparent
          </label>
          <div className="field-row">
            <span data-tip="Format du fichier téléchargé">Format</span>
            <ChoiceGroup label="Format" value="png" options={FORMAT_OPTIONS} onChange={() => undefined} />
          </div>
        </Section>
        <div className="export-actions">
          <button type="button" className="button primary" disabled={busy} onClick={run}>
            {busy ? 'Export…' : 'Exporter'}
          </button>
        </div>
      </div>
    </aside>
  );
}
