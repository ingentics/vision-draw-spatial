import { RESERVED_CODES } from '../../engine';
import type { FollowLinkGesture, FollowLinkKey, MultiSelectKey, Shortcuts } from '../../engine';
import { useEffect, useState } from 'react';
import { Section } from '../PanelSection';
import { Choice } from '../SettingsFields';
import type { SettingsSectionProps } from './types';

/** Section « Raccourcis clavier » des paramètres. */
export function ShortcutSettings({ settings, onChange }: SettingsSectionProps) {
  const { controls } = settings;
  return (
    <Section title="Raccourcis clavier">
      {(Object.keys(SHORTCUT_LABELS) as Array<keyof Shortcuts>).map((action) => (
        <ShortcutField
          key={action}
          label={SHORTCUT_LABELS[action]}
          value={controls.shortcuts[action]}
          taken={Object.entries(controls.shortcuts)
            .filter(([other]) => other !== action)
            .map(([, key]) => key.toLowerCase())}
          onChange={(key) => onChange({ controls: { shortcuts: { [action]: key } } })}
        />
      ))}
      <p className="hint muted">
        Le déplacement (ZQSD / WASD, flèches), la rotation (A / E) et Espace ne sont pas attribuables. Remonter à la
        page parente : Alt+↑.
      </p>
      <Choice
        label="Sélection multiple : touche + clic"
        value={controls.multiSelectKey}
        options={(Object.keys(MULTI_SELECT_LABELS) as MultiSelectKey[]).map((key) => [key, MULTI_SELECT_LABELS[key]])}
        onChange={(multiSelectKey) => onChange({ controls: { multiSelectKey } })}
      />
      <p className="hint muted">
        Maintenir la touche en cliquant ajoute l’élément à la sélection, ou l’en retire. Glisser une forme sélectionnée
        déplace toute la sélection.
      </p>
      <Choice
        label="Suivre un lien : touche"
        value={controls.followLinkKey}
        options={(Object.keys(FOLLOW_LINK_LABELS) as FollowLinkKey[]).map((key) => [key, FOLLOW_LINK_LABELS[key]])}
        onChange={(followLinkKey) => onChange({ controls: { followLinkKey } })}
      />
      <Choice
        label="Suivre un lien : touche +"
        value={controls.followLinkKey === 'none' ? 'doubleClick' : controls.followLinkGesture}
        options={(Object.keys(FOLLOW_LINK_GESTURE_LABELS) as FollowLinkGesture[]).map((gesture) => [
          gesture,
          FOLLOW_LINK_GESTURE_LABELS[gesture],
        ])}
        disabled={controls.followLinkKey === 'none'}
        onChange={(followLinkGesture) => onChange({ controls: { followLinkGesture } })}
      />
      <p className="hint muted">
        Maintenir la touche fait ressortir les zones liées (« Mode navigation » en bas à droite). Avec Espace, glisser
        déplace toujours la vue : seul un clic sans glisser suit le lien. Sans touche, le double-clic sur une forme liée
        modifie son texte. Dans la vue graphe, le double-clic seul plonge dans la page.
      </p>
    </Section>
  );
}

/** Touches de sélection multiple, telles qu'affichées. */
export const MULTI_SELECT_LABELS: Record<MultiSelectKey, string> = {
  ctrl: 'Ctrl',
  meta: '⌘ / Windows',
  shift: 'Maj',
  alt: 'Alt / ⌥',
};

/** Touches pour suivre un lien au double-clic, telles qu'affichées. */
const FOLLOW_LINK_LABELS: Record<FollowLinkKey, string> = {
  space: 'Espace',
  ...MULTI_SELECT_LABELS,
  none: 'Aucune (double-clic seul)',
};

const FOLLOW_LINK_GESTURE_LABELS: Record<FollowLinkGesture, string> = { click: 'Clic', doubleClick: 'Double-clic' };

const SHORTCUT_LABELS: Record<keyof Shortcuts, string> = {
  toggleViewMode: 'Basculer 2D ↔ iso',
  toggle3d: 'Basculer vers / depuis la 3D',
  toggleGraph: 'Vue graphe ↔ dernière page',
  toggleMinimap: 'Afficher / masquer la mini-carte',
  toggleMinigraph: 'Afficher / masquer le mini-graphe',
  toggleFlatten: 'Aplatir / rétablir les volumes (iso, 3D)',
  overview: 'Vue globale ↔ 1:1',
  deleteSelection: 'Supprimer la sélection (Suppr aussi)',
  placementVariant: 'Variante de placement d’une flèche (ancrage manuel)',
  editComment: 'Éditer le commentaire (sélectionné, sinon survolé)',
};

// ---------------------------------------------------------------------------
// Champs

/** Capture d'une touche : cliquer, puis appuyer sur la nouvelle touche (Échap annule). */
function ShortcutField({
  label,
  value,
  taken,
  onChange,
}: {
  label: string;
  value: string;
  taken: string[];
  onChange: (key: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      // Capture : la touche ne doit pas aussi déclencher une action de la vue.
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        setListening(false);
        return;
      }
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      if (RESERVED_CODES.includes(event.code)) {
        setProblem('Touche réservée au déplacement.');
        return;
      }
      if (taken.includes(event.key.toLowerCase())) {
        setProblem('Déjà utilisée par un autre raccourci.');
        return;
      }
      setProblem(undefined);
      setListening(false);
      onChange(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, taken, onChange]);

  return (
    <div className="field">
      <span className="field-row">
        <span>{label}</span>
        <button
          type="button"
          className={listening ? 'key-button listening' : 'key-button'}
          onClick={() => {
            setProblem(undefined);
            setListening((on) => !on);
          }}
          data-tip="Cliquer, puis appuyer sur la nouvelle touche (Échap pour annuler)"
        >
          {listening ? 'Appuyez sur une touche…' : keyLabel(value)}
        </button>
      </span>
      {problem && <span className="hint error-text">{problem}</span>}
    </div>
  );
}

const KEY_NAMES: Record<string, string> = {
  Enter: 'Entrée',
  Backspace: 'Retour arrière',
  Escape: 'Échap',
  Tab: 'Tab',
  Delete: 'Suppr',
  Home: 'Début',
  End: 'Fin',
  PageUp: 'Page préc.',
  PageDown: 'Page suiv.',
};

function keyLabel(key: string): string {
  if (key === '') return 'Aucune';
  return KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}
