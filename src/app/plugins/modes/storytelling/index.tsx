import {
  setStoryNumber,
  stopStory,
  storiesExporter,
  storyState,
} from '../../../../engine/plugins/modes/storytelling/api';
import type { Story } from '../../../../engine/plugins/modes/storytelling/api';
import { Section } from '../../../PanelSection';
import { ArrowCount } from '../ArrowCount';
import { ModeExportButton } from '../ModeExport';
import type { ModePanel, ModePanelProps } from '../registry';
import { StoryBar } from './StoryBar';
import { launchStories, useStorySimulation } from './storyRun';

/**
 * Mode « Story telling » (sujet 474), partie appli : la section « Histoires » du panneau de la page (liste ordonnée,
 * ordre, retrait du numéro, choix de l'histoire courante, simulation, export JSON) ; la barre de la simulation sur la
 * zone de dessin (sujet 534).
 * Les règles (numéros, suite, couleurs, pas) sont dans le moteur (`engine/plugins/modes/storytelling/`).
 */
export const panel: ModePanel = { PageSection: StoriesSection, CanvasOverlay: StoryBar };

function StoriesSection({ page, onEdit, current, exporters, controls }: ModePanelProps) {
  const { stories } = storyState(page);
  const simulator = useStorySimulation(controls);
  return (
    <Section title="Histoires">
      {stories.length === 0 ? (
        <p className="panel-hint">Posez un numéro sur une flèche («&nbsp;+&nbsp;») pour commencer une histoire.</p>
      ) : (
        <ul className="flow-list">
          {stories.map((story) => (
            <StoryRow
              key={story.id}
              story={story}
              last={story.number === stories.length}
              current={story.id === current}
              onChoose={controls && !simulator ? () => controls.takeover.setModeCurrent(story.id, page.id) : undefined}
              onMove={
                onEdit && ((delta) => onEdit('Numéro', (edit) => setStoryNumber(edit, story.id, story.number + delta)))
              }
              onRemove={onEdit && (() => onEdit('Histoire retirée', (edit) => stopStory(edit, story.id)))}
            />
          ))}
        </ul>
      )}
      {stories.length > 0 && (
        <div className="mode-exports">
          {controls &&
            (simulator ? (
              <button
                type="button"
                className="button"
                data-tip="Arrêter la simulation et revenir à l’édition (Échap)"
                onClick={() => simulator.stop()}
              >
                Arrêter la simulation
              </button>
            ) : (
              <button
                type="button"
                className="button"
                data-tip="Jouer les histoires pas à pas depuis le tout début : tout est caché sauf ce qui a été montré ; l’édition est bloquée"
                onClick={() => launchStories(controls, page)}
              >
                Lancer la simulation
              </button>
            ))}
          <ModeExportButton
            page={page}
            exporters={exporters}
            exporter={storiesExporter}
            tip="Histoires numérotées avec leurs étapes (flèche, forme de départ, forme d’arrivée) : texte à copier"
          />
        </div>
      )}
    </Section>
  );
}

function StoryRow({
  story,
  last,
  current,
  onChoose,
  onMove,
  onRemove,
}: {
  story: Story;
  last: boolean;
  /** Histoire courante : les autres sont estompées. */
  current: boolean;
  /** Clic sur la ligne : l'histoire devient la courante (sujet 540). */
  onChoose?: () => void;
  onMove?: (delta: 1 | -1) => void;
  onRemove?: () => void;
}) {
  return (
    <li
      className={`flow-item${current ? ' current' : ''}${onChoose ? ' choosable' : ''}`}
      aria-current={current ? 'true' : undefined}
      data-tip={current ? 'Histoire courante (Échap : aucune)' : onChoose && 'Clic : en faire l’histoire courante'}
      // Choisie aussi au clavier (Tab, puis Entrée ou Espace) ; les touches de ses boutons restent à eux.
      role={onChoose ? 'button' : undefined}
      tabIndex={onChoose ? 0 : undefined}
      onClick={onChoose}
      onKeyDown={(event) => {
        if (!onChoose || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onChoose();
      }}
    >
      <span className="color-dot story-number" style={{ background: story.color }}>
        {story.number}
      </span>
      {/* Titre long (textes de toutes les étapes, sujet 541) : coupé, entier dans la bulle. */}
      <span
        className="story-title"
        data-tip={current || !onChoose ? story.title : `${story.title} — clic : en faire l’histoire courante`}
      >
        {story.title}
      </span>
      <ArrowCount count={story.edges.length} />
      {onMove && (
        <>
          <button
            type="button"
            className="icon-button"
            aria-label="Monter"
            data-tip="Numéro précédent (échange avec l’histoire qui l’avait)"
            disabled={story.number === 1}
            onClick={(event) => {
              event.stopPropagation();
              onMove(-1);
            }}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Descendre"
            data-tip="Numéro suivant (échange avec l’histoire qui l’avait)"
            disabled={last}
            onClick={(event) => {
              event.stopPropagation();
              onMove(1);
            }}
          >
            ↓
          </button>
        </>
      )}
      {onRemove && (
        <button
          type="button"
          className="icon-button"
          aria-label="Retirer"
          data-tip="Retirer le numéro : la flèche n’ouvre plus d’histoire"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      )}
    </li>
  );
}
