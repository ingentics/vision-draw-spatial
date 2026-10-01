import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { RESERVED_CODES } from '../engine/interaction/controls';
import type { Shortcuts } from '../engine/interaction/controls';
import { SETTINGS_LIMITS } from '../engine/settings';
import type { Settings, SettingsPatch } from '../engine/settings';
import { IsoIcon, IsoSettings } from './IsoSettings';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: SettingsPatch) => void;
  onReset: () => void;
  onClose: () => void;
}

const SHORTCUT_LABELS: Record<keyof Shortcuts, string> = {
  toggleViewMode: 'Basculer 2D ↔ iso',
  toggleGraph: 'Vue graphe ↔ dernière page',
  toggleMinimap: 'Afficher / masquer la mini-carte',
  overview: 'Vue globale ↔ 1:1',
  back: 'Retour (Alt+← aussi)',
};

/** Panneau de paramètres (SPEC §13) : tout s'applique immédiatement et est mémorisé. */
export function SettingsPanel({ settings, onChange, onReset, onClose }: SettingsPanelProps) {
  const { controls, view, transition, preload, minimap, selection, accessibility, debug } = settings;
  const systemReduced = useSystemReducedMotion();

  return (
    <aside className="side-panel settings-panel" aria-label="Paramètres">
      <header className="side-panel-header">
        <h2>Paramètres</h2>
        <button type="button" className="button" onClick={onReset} title="Revenir aux valeurs par défaut">
          Réinitialiser
        </button>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </header>

      <div className="side-panel-body">
        <Section title="Navigation">
          <Choice
            label="Touches de déplacement"
            value={controls.moveKeys}
            options={[
              ['all', 'Lettres + flèches'],
              ['letters', 'ZQSD / WASD'],
              ['arrows', 'Flèches'],
            ]}
            onChange={(moveKeys) => onChange({ controls: { moveKeys } })}
          />
          <Choice
            label="Glisser avec la molette"
            value={controls.middleDrag}
            options={[
              ['pan', 'Déplacer'],
              ['rotate', 'Tourner'],
            ]}
            onChange={(middleDrag) => onChange({ controls: { middleDrag } })}
          />
          <Slider
            label="Vitesse au clavier"
            value={controls.moveSpeed}
            limits={SETTINGS_LIMITS['controls.moveSpeed']}
            format={(v) => `${v} px/s`}
            onChange={(moveSpeed) => onChange({ controls: { moveSpeed } })}
          />
          <Slider
            label="Sensibilité de la molette"
            value={controls.zoomSpeed}
            limits={SETTINGS_LIMITS['controls.zoomSpeed']}
            format={(v) => `×${(v / 0.0015).toFixed(1)}`}
            onChange={(zoomSpeed) => onChange({ controls: { zoomSpeed } })}
          />
          <Slider
            label="Vitesse de rotation"
            value={controls.rotateSpeed}
            limits={SETTINGS_LIMITS['controls.rotateSpeed']}
            format={(v) => `${((v * 100 * 180) / Math.PI).toFixed(0)}° / 100 px`}
            onChange={(rotateSpeed) => onChange({ controls: { rotateSpeed } })}
          />
          <Slider
            label="Glissade à l’arrêt"
            value={controls.decelerationMs}
            limits={SETTINGS_LIMITS['controls.decelerationMs']}
            format={(v) => (v === 0 ? 'aucune' : `${v} ms`)}
            onChange={(decelerationMs) => onChange({ controls: { decelerationMs } })}
          />
        </Section>

        <Section title="Vue">
          <Choice
            label="Mode à l’ouverture"
            value={view.defaultMode}
            options={[
              ['top', '2D'],
              ['iso', 'Iso'],
            ]}
            onChange={(defaultMode) => onChange({ view: { defaultMode } })}
          />
          <Slider
            label="Durée de la bascule 2D ↔ iso"
            value={view.switchDurationMs}
            limits={SETTINGS_LIMITS['view.switchDurationMs']}
            format={(v) => (v === 0 ? 'instantanée' : `${v} ms`)}
            onChange={(switchDurationMs) => onChange({ view: { switchDurationMs } })}
          />
        </Section>

        <Section
          title={
            <>
              <IsoIcon />
              Vue isométrique
            </>
          }
        >
          <IsoSettings value={view} onChange={(patch) => onChange({ view: patch })} />
        </Section>

        <Section title="Transitions entre pages">
          <Toggle
            label="Animer le passage par un lien"
            checked={transition.enabled}
            onChange={(enabled) => onChange({ transition: { enabled } })}
          />
          <Slider
            label="Durée"
            value={transition.durationMs}
            limits={SETTINGS_LIMITS['transition.durationMs']}
            format={(v) => `${(v / 1000).toFixed(2)} s`}
            disabled={!transition.enabled}
            onChange={(durationMs) => onChange({ transition: { durationMs } })}
          />
          <Choice
            label="Courbe"
            value={transition.easing}
            options={[
              ['ease-in-out', 'Douce'],
              ['ease-out', 'Freinée'],
              ['ease-in', 'Accélérée'],
              ['linear', 'Linéaire'],
            ]}
            disabled={!transition.enabled}
            onChange={(easing) => onChange({ transition: { easing } })}
          />
        </Section>

        <Section title="Préchargement">
          <Toggle
            label="Préparer la page cible au clic sur un lien"
            checked={preload.onClick}
            onChange={(onClick) => onChange({ preload: { onClick } })}
          />
          <Toggle
            label="Préparer au survol prolongé"
            checked={preload.onHover}
            onChange={(onHover) => onChange({ preload: { onHover } })}
          />
          <Slider
            label="Délai de survol"
            value={preload.hoverDelayMs}
            limits={SETTINGS_LIMITS['preload.hoverDelayMs']}
            format={(v) => `${v} ms`}
            disabled={!preload.onHover}
            onChange={(hoverDelayMs) => onChange({ preload: { hoverDelayMs } })}
          />
          <Slider
            label="Pages gardées en mémoire"
            value={preload.maxCachedPages}
            limits={SETTINGS_LIMITS['preload.maxCachedPages']}
            format={(v) => `${v}`}
            onChange={(maxCachedPages) => onChange({ preload: { maxCachedPages } })}
          />
        </Section>

        <Section title="Mini-carte">
          <Toggle
            label="Afficher"
            checked={minimap.visible}
            onChange={(visible) => onChange({ minimap: { visible } })}
          />
          <Slider
            label="Largeur"
            value={minimap.size}
            limits={SETTINGS_LIMITS['minimap.size']}
            format={(v) => `${v} px`}
            disabled={!minimap.visible}
            onChange={(size) => onChange({ minimap: { size } })}
          />
        </Section>

        <Section title="Sélection">
          <Toggle
            label="Contour animé (les tirets défilent)"
            checked={selection.animated}
            onChange={(animated) => onChange({ selection: { animated } })}
          />
          <Slider
            label="Vitesse"
            value={selection.speed}
            limits={SETTINGS_LIMITS['selection.speed']}
            format={(v) => `${v} px/s`}
            disabled={!selection.animated}
            onChange={(speed) => onChange({ selection: { speed } })}
          />
        </Section>

        <Section title="Accessibilité">
          <Choice
            label="Réduire les animations"
            value={accessibility.reducedMotion}
            options={[
              ['system', 'Comme le système'],
              ['always', 'Toujours'],
              ['never', 'Jamais'],
            ]}
            onChange={(reducedMotion) => onChange({ accessibility: { reducedMotion } })}
          />
          <p className="hint muted">
            Système : {systemReduced ? 'animations réduites demandées' : 'animations normales'}. Réduites = transitions,
            bascule iso, vue globale et glissade instantanées.
          </p>
        </Section>

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
          <p className="hint muted">Le déplacement (ZQSD / WASD, flèches) et Espace ne sont pas attribuables.</p>
        </Section>

        <Section title="Diagnostics">
          <Toggle
            label="Bouton « Diagnostics » (styles non supportés)"
            checked={debug.showUnsupportedPanel}
            onChange={(showUnsupportedPanel) => onChange({ debug: { showUnsupportedPanel } })}
          />
        </Section>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Champs

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  limits,
  format,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number; step: number };
  format: (value: number) => string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={disabled ? 'field disabled' : 'field'}>
      <span className="field-row">
        <span>{label}</span>
        <span className="field-value">{format(value)}</span>
      </span>
      <input
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="field toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className={disabled ? 'field disabled' : 'field'}>
      <span className="field-row">{label}</span>
      <div className="button-group choice" role="radiogroup" aria-label={label}>
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            role="radio"
            className="group-button"
            aria-checked={value === option}
            aria-pressed={value === option}
            disabled={disabled}
            onClick={() => onChange(option)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

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
          title="Cliquer, puis appuyer sur la nouvelle touche (Échap pour annuler)"
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

export function keyLabel(key: string): string {
  return KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

function useSystemReducedMotion(): boolean {
  const [query] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)'));
  const [reduced, setReduced] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, [query]);
  return reduced;
}
