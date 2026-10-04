import { useState } from 'react';
import { sequenceState, addFlow, moveFlow, removeFlow, renameFlow } from '../../../engine/modes/sequences/steps';
import type { Flow } from '../../../engine/modes/sequences/flows';
import { Section } from '../../PanelSection';
import type { ModePanel, ModePanelProps } from '../registry';

/**
 * Mode « Séquences » (sujet 70), partie appli : la section « Flux » du panneau de la page. Elle affiche les flux et
 * appelle les opérations du mode (`engine/modes/sequences/steps.ts`) ; les règles (couleurs, rangs) sont là-bas.
 */
export const panel: ModePanel = { PageSection: FlowsSection };

function FlowsSection({ page, onEdit, current }: ModePanelProps) {
  const { flows, members } = sequenceState(page);
  const [title, setTitle] = useState('');
  const add = () => {
    if (!title.trim()) return;
    onEdit?.('Flux ajouté', (edit) => addFlow(edit, title));
    setTitle('');
  };
  return (
    <Section title="Flux">
      {flows.length === 0 && <p className="panel-hint">Aucun flux : ajoutez-en un, puis rangez-y des flèches.</p>}
      <ul className="flow-list">
        {flows.map((flow, index) => (
          <FlowRow
            key={`${flow.id}:${flow.title}`}
            flow={flow}
            count={members.get(flow.id)?.length ?? 0}
            current={flow.id === current}
            first={index === 0}
            last={index === flows.length - 1}
            onRename={onEdit && ((next) => onEdit('Flux renommé', (edit) => renameFlow(edit, flow.id, next)))}
            onMove={onEdit && ((delta) => onEdit('Flux déplacé', (edit) => moveFlow(edit, flow.id, index + delta)))}
            onRemove={onEdit && (() => onEdit('Flux supprimé', (edit) => removeFlow(edit, flow.id)))}
          />
        ))}
      </ul>
      {onEdit && (
        <div className="flow-item">
          <input
            type="text"
            value={title}
            placeholder="Nouveau flux"
            aria-label="Titre du nouveau flux"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add();
            }}
          />
          <button type="button" className="button" disabled={!title.trim()} onClick={add}>
            Ajouter
          </button>
        </div>
      )}
      {flows.length > 0 && (
        <p className="panel-hint">
          Flux courant (encadré) : les nouvelles flèches y vont ; cliquer une flèche d’un flux le choisit. Une flèche se
          range aussi depuis son panneau (Flux, Rang), ou « + » / « - » pour changer son rang.
        </p>
      )}
    </Section>
  );
}

function FlowRow({
  flow,
  count,
  current,
  first,
  last,
  onRename,
  onMove,
  onRemove,
}: {
  flow: Flow;
  count: number;
  /** Flux courant : les nouvelles flèches y vont (cliquer une flèche d'un flux le choisit). */
  current: boolean;
  first: boolean;
  last: boolean;
  onRename?: (title: string) => void;
  onMove?: (delta: -1 | 1) => void;
  onRemove?: () => void;
}) {
  return (
    <li
      className={current ? 'flow-item current' : 'flow-item'}
      aria-current={current ? 'true' : undefined}
      title={current ? 'Flux courant : les nouvelles flèches y vont' : undefined}
    >
      <span className="color-dot" style={{ background: flow.color }} aria-hidden="true" />
      <input
        type="text"
        defaultValue={flow.title}
        readOnly={!onRename}
        aria-label={`Titre du flux « ${flow.title} »`}
        title="Titre du flux (Entrée pour valider)"
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next && next !== flow.title) onRename?.(next);
          else event.target.value = flow.title;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          else if (event.key === 'Escape') {
            event.currentTarget.value = flow.title;
            event.currentTarget.blur();
          }
        }}
      />
      <span className="field-value" title={`${count} flèche${count > 1 ? 's' : ''}`}>
        {count}
      </span>
      {onMove && (
        <>
          <button
            type="button"
            className="icon-button"
            title="Monter le flux"
            disabled={first}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-button"
            title="Descendre le flux"
            disabled={last}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
        </>
      )}
      {onRemove && (
        <button
          type="button"
          className="icon-button"
          title="Supprimer le flux (ses flèches en sortent)"
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </li>
  );
}
