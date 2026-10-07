import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CollapseButton } from './Sidebar';
import { searchTemplates } from '../engine';
import type { PageModePalette, PaletteCategory, PaletteCategoryId, ShapeTemplate } from '../engine';

/** Catégorie des formes présentes sur la page, en tête de la palette (hors catégories des formes). */
const USED_CATEGORY = { id: 'used', name: 'Utilisées' } as const;
type SectionId = PaletteCategoryId | typeof USED_CATEGORY.id;

/** Type de données du glisser-déposer d'une forme de la palette vers le plan. */
export const PALETTE_MIME = 'application/x-drawio-spatial-shape';

/** Catégories repliées, retenues d'une session à l'autre. */
const COLLAPSED_KEY = 'drawio-spatial:palette-collapsed';

function loadCollapsed(): Set<SectionId> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as SectionId[]) : []);
  } catch {
    return new Set();
  }
}

function saveCollapsed(collapsed: Set<SectionId>): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Stockage indisponible : l'état vaut pour la session seulement.
  }
}

/** Infobulle du nom d'une forme, placée sous la forme survolée (`anchor` : son cadre dans la fenêtre). */
interface Tooltip {
  text: string;
  anchor: DOMRect;
  visible: boolean;
}

/** Écart entre l'infobulle et la forme, et marge minimale aux bords de la fenêtre. */
const TOOLTIP_GAP = 4;

/**
 * Position de l'infobulle : centrée sous la forme, décalée pour rester dans la fenêtre, et au-dessus de la forme
 * s'il n'y a pas la place en dessous dans la zone visible (`area` : la liste des formes de la palette, dont le bas
 * peut être bordé par la barre des onglets).
 */
function tooltipPosition(
  anchor: Pick<DOMRect, 'left' | 'width' | 'top' | 'bottom'>,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  area: { top: number; bottom: number } = { top: 0, bottom: viewport.height },
): { left: number; top: number } {
  const centered = anchor.left + anchor.width / 2 - size.width / 2;
  const left = Math.max(TOOLTIP_GAP, Math.min(centered, viewport.width - size.width - TOOLTIP_GAP));
  const below = anchor.bottom + TOOLTIP_GAP;
  const bottom = Math.min(area.bottom, viewport.height);
  const top = below + size.height + TOOLTIP_GAP <= bottom ? below : anchor.top - TOOLTIP_GAP - size.height;
  return { left, top: Math.max(Math.max(area.top, 0) + TOOLTIP_GAP, top) };
}

interface PaletteProps {
  /** Clic (ou Entrée) sur une forme : ajout au centre de la vue. */
  onAdd: (template: ShapeTemplate) => void;
  /** Modèles des formes de la page courante (catégorie « Utilisées », masquée si vide). */
  used?: ShapeTemplate[];
  /** Catégories et formes proposées sur la page (mode de la page, sujet 178) ; défaut : la palette normale. */
  content?: PageModePalette;
  disabled?: boolean;
}

/**
 * Palette de formes (SPEC §14.1), comme la barre latérale de draw.io : une recherche, puis les formes rangées
 * par catégorie, chacune repliable. Glisser une forme sur le plan la dépose au point visé (projeté au sol, en
 * vue de dessus comme en iso) ; un clic l'ajoute au centre de la vue.
 */
/** Rien à proposer tant que le moteur n'a pas donné la palette de la page (sujet 290). */
const DEFAULT_CONTENT: PageModePalette = { categories: [], templates: [] };

export function Palette({ onAdd, used = [], content = DEFAULT_CONTENT, disabled }: PaletteProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const showTooltip = (template: ShapeTemplate, target: HTMLElement) => {
    setTooltip({ text: template.name, anchor: target.getBoundingClientRect(), visible: true });
  };
  // Placée une fois sa taille connue, avant l'affichage.
  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!tooltip || !element) return;
    const { left, top } = tooltipPosition(
      tooltip.anchor,
      { width: element.offsetWidth, height: element.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      sectionsRef.current?.getBoundingClientRect(),
    );
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }, [tooltip]);
  // Le texte reste en place pendant le fondu de sortie.
  const hideTooltip = () => setTooltip((current) => current && { ...current, visible: false });
  const searching = query.trim() !== '';
  const found = searchTemplates(content.templates, query, content.categories);

  const toggle = (id: SectionId) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
    saveCollapsed(next);
  };

  const sections: { category: PaletteCategory | typeof USED_CATEGORY; templates: ShapeTemplate[] }[] = [
    // Par id : les modèles viennent de deux appels au registre du moteur (sujet 290), objets distincts.
    { category: USED_CATEGORY, templates: used.filter((t) => found.some((f) => f.id === t.id)) },
    ...content.categories.map((category) => ({
      category,
      templates: found.filter((t) => t.category === category.id),
    })),
  ].filter((section) => section.templates.length > 0 || (!searching && section.category !== USED_CATEGORY));

  return (
    <aside className="palette" aria-label="Formes">
      <div className="palette-search">
        <span className="palette-search-field">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l4 4" />
          </svg>
          <input
            type="search"
            placeholder="Rechercher une forme"
            aria-label="Rechercher une forme"
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setQuery('');
              }
            }}
          />
          {query !== '' && (
            <button
              type="button"
              className="palette-search-clear"
              title="Vider la recherche"
              onClick={() => setQuery('')}
            >
              ×
            </button>
          )}
        </span>
        <CollapseButton />
      </div>
      <div className="palette-sections" ref={sectionsRef}>
        {sections.map(({ category, templates }) => {
          const open = searching || !collapsed.has(category.id);
          return (
            <section key={category.id} className="palette-category">
              <button
                type="button"
                className="palette-category-header"
                aria-expanded={open}
                disabled={searching}
                onClick={() => toggle(category.id)}
              >
                <span className="palette-chevron" aria-hidden="true">
                  {open ? '▾' : '▸'}
                </span>
                {category.name}
              </button>
              {open && (
                <div className="palette-grid">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="palette-item"
                      draggable={!disabled}
                      disabled={disabled}
                      aria-label={template.name}
                      onMouseEnter={(event) => showTooltip(template, event.currentTarget)}
                      onMouseLeave={hideTooltip}
                      onDragStart={(event) => {
                        hideTooltip();
                        event.dataTransfer.setData(PALETTE_MIME, template.id);
                        event.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onAdd(template)}
                    >
                      <ShapePreview template={template} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {sections.length === 0 && <p className="palette-empty">Aucune forme trouvée</p>}
      </div>
      {/* À la racine du document : au premier plan, hors de la couche de la barre latérale. */}
      {tooltip &&
        createPortal(
          <div
            key={tooltip.text}
            ref={tooltipRef}
            className={`palette-tooltip${tooltip.visible ? ' visible' : ''}`}
            role="tooltip"
          >
            {tooltip.text}
          </div>,
          document.body,
        )}
    </aside>
  );
}

/** Icône du modèle, déclarée par sa forme (contenu SVG statique du moteur, cadre `0 0 40 28`). */
function ShapePreview({ template }: { template: ShapeTemplate }) {
  return <svg viewBox="0 0 40 28" aria-hidden="true" dangerouslySetInnerHTML={{ __html: template.icon }} />;
}
