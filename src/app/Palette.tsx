import { useRef, useState } from 'react';
import { CollapseButton } from './Sidebar';
import { useTooltip } from './Tooltip';
import { searchTemplates } from '../engine';
import type { PageModePalette, PaletteCategory, PaletteCategoryId, ShapeTemplate } from '../engine';

/** Catégorie des formes présentes sur la page, en tête de la palette (hors catégories des formes). */
const USED_CATEGORY = { id: 'used', name: 'Utilisées' } as const;
type SectionId = PaletteCategoryId | typeof USED_CATEGORY.id;

/** Type de données du glisser-déposer d'une forme de la palette vers le plan. */
export const PALETTE_MIME = 'application/x-drawio-spatial-shape';

/** Catégories repliées, retenues d'une session à l'autre. */
const COLLAPSED_KEY = 'drawio-spatial:palette-collapsed';

/**
 * « Utilisées » est repliée par défaut (sujet 365), les autres dépliées : dans la même liste, on retient qu'elle a été
 * dépliée (une ancienne entrée `used`, d'avant ce défaut, ne compte plus).
 */
const USED_OPEN = 'used-open';
type StoredSection = SectionId | typeof USED_OPEN;

function isCollapsed(stored: Set<StoredSection>, id: SectionId): boolean {
  return id === USED_CATEGORY.id ? !stored.has(USED_OPEN) : stored.has(id);
}

function loadCollapsed(): Set<StoredSection> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as StoredSection[]) : []);
  } catch {
    return new Set();
  }
}

function saveCollapsed(collapsed: Set<StoredSection>): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Stockage indisponible : l'état vaut pour la session seulement.
  }
}

interface PaletteProps {
  /** Clic (ou Entrée) sur une forme : ajout au centre de la vue. */
  onAdd: (template: ShapeTemplate) => void;
  /** Modèles des formes de la page courante (catégorie « Utilisées », présente même vide hors recherche). */
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
  const sectionsRef = useRef<HTMLDivElement>(null);
  // Gardée dans la liste des formes, dont le bas peut être bordé par la barre des onglets.
  const { hover, hide: hideTooltip, tooltip } = useTooltip(() => sectionsRef.current?.getBoundingClientRect());
  const searching = query.trim() !== '';
  const found = searchTemplates(content.templates, query, content.categories);

  const toggle = (id: SectionId) => {
    const next = new Set(collapsed);
    const key = id === USED_CATEGORY.id ? USED_OPEN : id;
    if (next.has(key)) next.delete(key);
    else next.add(key);
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
  ].filter((section) => section.templates.length > 0 || !searching);

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
              data-tip="Vider la recherche"
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
          const open = searching || !isCollapsed(collapsed, category.id);
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
              {open && templates.length === 0 && category === USED_CATEGORY && (
                <p className="palette-empty">Aucune forme sur la page</p>
              )}
              {open && templates.length > 0 && (
                <div className="palette-grid">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="palette-item"
                      draggable={!disabled}
                      disabled={disabled}
                      aria-label={template.name}
                      {...hover(template.name)}
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
      {tooltip}
    </aside>
  );
}

/** Icône du modèle, déclarée par sa forme (contenu SVG statique du moteur, cadre `0 0 40 28`). */
function ShapePreview({ template }: { template: ShapeTemplate }) {
  return <svg viewBox="0 0 40 28" aria-hidden="true" dangerouslySetInnerHTML={{ __html: template.icon }} />;
}
