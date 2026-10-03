import { SHAPE_TEMPLATES } from '../engine/edit/palette';
import type { ShapeTemplate } from '../engine/edit/palette';

/** Type de données du glisser-déposer d'une forme de la palette vers le plan. */
export const PALETTE_MIME = 'application/x-drawio-spatial-shape';

interface PaletteProps {
  /** Clic (ou Entrée) sur une forme : ajout au centre de la vue. */
  onAdd: (template: ShapeTemplate) => void;
  disabled?: boolean;
}

/**
 * Palette de formes (SPEC §14.1) : glisser une forme sur le plan la dépose au point visé
 * (projeté au sol, en vue de dessus comme en iso) ; un clic l'ajoute au centre de la vue.
 */
export function Palette({ onAdd, disabled }: PaletteProps) {
  return (
    <aside className="palette" aria-label="Formes">
      {SHAPE_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          className="palette-item"
          draggable={!disabled}
          disabled={disabled}
          title={`${template.name} : glisser sur le plan, ou cliquer pour l’ajouter au centre`}
          onDragStart={(event) => {
            event.dataTransfer.setData(PALETTE_MIME, template.id);
            event.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onAdd(template)}
        >
          <ShapePreview id={template.id} />
          <span>{template.name}</span>
        </button>
      ))}
    </aside>
  );
}

export function templateById(id: string): ShapeTemplate | undefined {
  return SHAPE_TEMPLATES.find((t) => t.id === id);
}

function ShapePreview({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true">
      {id === 'rectangle' && <rect x="4" y="6" width="32" height="16" />}
      {id === 'rounded' && <rect x="4" y="6" width="32" height="16" rx="4" />}
      {id === 'ellipse' && <ellipse cx="20" cy="14" rx="16" ry="9" />}
      {id === 'circle' && <circle cx="20" cy="14" r="10" />}
      {id === 'database' && <path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0" />}
      {id === 'queue' && <path d="M10 5h20a4 9 0 0 1 0 18H10a4 9 0 0 1 0-18zM30 5a4 9 0 0 0 0 18" />}
      {id === 'cache' && (
        <path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0M12 9c0 3 16 3 16 0M12 12c0 3 16 3 16 0" />
      )}
      {id === 'text' && (
        <text x="20" y="18" textAnchor="middle">
          Abc
        </text>
      )}
    </svg>
  );
}
