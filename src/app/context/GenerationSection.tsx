import { useState } from 'react';
import type { GenerationCandidate, GenerationState, GenerationView, ShapeModel } from '../../engine';
import { TextField } from '../Fields';
import { Section } from '../PanelSection';

/**
 * Ce que le panneau fait d'une forme générée par l'hôte (sujets 538, 545, ex. Metamorph), branché sur le moteur et
 * l'hôte qui génère.
 */
export interface GenerationControls {
  view: (shapeId: string) => GenerationView | undefined;
  setInstructions: (shapeId: string, instructions: string) => void;
  submit: (shapeId: string) => void;
  retry: (shapeId: string) => void;
  reprompt: (shapeId: string) => void;
  accept: (shapeId: string, candidateId: string) => void;
}

const HINTS: Record<GenerationState, string> = {
  draft: 'Décrivez la forme voulue par son texte et des instructions visuelles, puis validez.',
  pending: 'Génération des propositions en cours…',
  ready: 'Prêt : choisissez une proposition, réessayez, ou modifiez la description (Reprompt).',
};

/**
 * Section d'une forme générée, au titre de la forme : instructions visuelles, « Valider », puis les propositions,
 * « Reprompt » et « Réessayer ».
 */
export function GenerationSection({ shape, controls }: { shape: ShapeModel; controls: GenerationControls }) {
  const view = controls.view(shape.id);
  // Instructions en cours de frappe, pas encore écrites (elles le sont en quittant le champ) : « Valider » les suit.
  const [typing, setTyping] = useState<{ shapeId: string; text: string }>();
  if (!view) return null;
  const draft = view.state === 'draft';
  // Pendant la génération (« Morphing… »), Reprompt et Réessayer sont grisés.
  const instructions = typing?.shapeId === shape.id ? typing.text : view.instructions;
  const described = shape.label.trim() !== '' || instructions.trim() !== '';
  return (
    <Section title={view.title}>
      <p className="panel-hint">{view.error ?? HINTS[view.state]}</p>
      <TextField
        label="Instructions visuelles"
        title="Instructions visuelles : à quoi la forme doit ressembler"
        value={view.instructions}
        placeholder="Ex. un serveur en baie, trois tiroirs, bleu"
        multiline
        readOnly={!draft}
        onLive={(text) => setTyping({ shapeId: shape.id, text })}
        onCommit={(text) => {
          setTyping(undefined);
          controls.setInstructions(shape.id, text);
        }}
      />
      {view.state === 'ready' && view.candidates.length > 0 && (
        <div className="generation-candidates">
          {view.candidates.map((candidate) => (
            <CandidateButton
              key={candidate.id}
              candidate={candidate}
              onChoose={() => controls.accept(shape.id, candidate.id)}
            />
          ))}
        </div>
      )}
      <div className="generation-actions">
        {draft ? (
          <button
            type="button"
            className="button primary"
            disabled={!described}
            data-tip="Valider : demande des propositions de forme d'après le texte et les instructions"
            onClick={() => controls.submit(shape.id)}
          >
            Valider
          </button>
        ) : (
          <>
            <button
              type="button"
              className="button"
              data-tip="Reprompt : revient à la description pour la modifier, les propositions sont oubliées"
              disabled={view.state !== 'ready'}
              onClick={() => controls.reprompt(shape.id)}
            >
              Reprompt
            </button>
            <button
              type="button"
              className="button"
              data-tip="Réessayer : demande de nouvelles propositions avec la même description"
              disabled={view.state !== 'ready'}
              onClick={() => controls.retry(shape.id)}
            >
              Réessayer
            </button>
          </>
        )}
      </div>
    </Section>
  );
}

/** Proposition : aperçu (icône aux couleurs du style proposé) et nom ; un clic la choisit. */
function CandidateButton({ candidate, onChoose }: { candidate: GenerationCandidate; onChoose: () => void }) {
  const tip = `Choisir « ${candidate.name} » : la forme est remplacée par celle-ci${
    candidate.description ? `\n${candidate.description}` : ''
  }`;
  return (
    <button
      type="button"
      className="generation-candidate"
      data-tip={tip}
      aria-label={candidate.name}
      onClick={onChoose}
    >
      <svg
        viewBox="0 0 40 28"
        aria-hidden="true"
        style={{ fill: candidate.fill ?? 'none', stroke: candidate.stroke ?? 'currentColor' }}
        dangerouslySetInnerHTML={{ __html: candidate.icon }}
      />
      <span>{candidate.name}</span>
    </button>
  );
}
