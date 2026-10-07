import { useState } from 'react';
import {
  addFlow,
  removeFlow,
  renameFlow,
  SEQUENCE_EXPORTERS,
  sequenceState,
} from '../../../../engine/plugins/modes/sequences/api';
import type { Flow, SequenceExporter } from '../../../../engine/plugins/modes/sequences/api';
import { Section } from '../../../PanelSection';
import { ExportViewer } from './ExportViewer';
import type { ModePanel, ModePanelProps } from '../registry';

/**
 * Mode « Séquences » (sujet 70), partie appli : la section « Flux » du panneau de la page. Elle affiche les flux et
 * appelle les opérations du mode (`engine/modes/sequences/steps.ts`) ; les règles (couleurs, rangs) sont là-bas.
 */
export const panel: ModePanel = { PageSection: FlowsSection };

function FlowsSection({ page, onEdit, current, values }: ModePanelProps) {
  const { flows, members } = sequenceState(page);
  const [title, setTitle] = useState('');
  const [exporting, setExporting] = useState<SequenceExporter>();
  const add = () => {
    if (!title.trim()) return;
    onEdit?.('Flux ajouté', (edit) => addFlow(edit, title));
    setTitle('');
  };
  return (
    <Section title="Flux">
      {flows.length === 0 && <p className="panel-hint">Aucun flux : ajoutez-en un, puis rangez-y des flèches.</p>}
      <ul className="flow-list">
        {flows.map((flow) => (
          <FlowRow
            key={`${flow.id}:${flow.title}`}
            flow={flow}
            count={members.get(flow.id)?.length ?? 0}
            current={flow.id === current}
            onRename={onEdit && ((next) => onEdit('Flux renommé', (edit) => renameFlow(edit, flow.id, next)))}
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
          Flux courant (pastille cerclée) : les nouvelles flèches y vont ; cliquer une flèche d’un flux le choisit. Une
          flèche se range aussi depuis son panneau (Flux, Rang), ou «&nbsp;+&nbsp;» / «&nbsp;-&nbsp;» pour changer son
          rang.
        </p>
      )}
      {flows.length > 0 && (
        <div className="flow-exports">
          {SEQUENCE_EXPORTERS.map((exporter) => (
            <button key={exporter.id} type="button" className="button" onClick={() => setExporting(exporter)}>
              Exporter en {exporter.name}
            </button>
          ))}
        </div>
      )}
      {exporting && flows.length > 0 && (
        <ExportViewer
          page={page}
          exporter={exporting}
          settings={{ renderer: String(values.plantumlRenderer), localUrl: String(values.plantumlUrl) }}
          onClose={() => setExporting(undefined)}
        />
      )}
    </Section>
  );
}

function FlowRow({
  flow,
  count,
  current,
  onRename,
  onRemove,
}: {
  flow: Flow;
  count: number;
  /** Flux courant : les nouvelles flèches y vont (cliquer une flèche d'un flux le choisit). */
  current: boolean;
  onRename?: (title: string) => void;
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
