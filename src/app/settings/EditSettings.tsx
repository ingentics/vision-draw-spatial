import { SETTINGS_LIMITS } from '../../engine';
import type { SettingsSectionProps } from './types';
import { Section, Subsection } from '../PanelSection';
import { Slider, Toggle } from '../SettingsFields';
import { desktop } from '../desktop';
import { ms } from './formats';

/** Sections « Édition » et « Sauvegarde » des paramètres. */
export function EditSettings({ settings, onChange }: SettingsSectionProps) {
  const { save, edit } = settings;
  return (
    <>
      <Section title="Édition">
        <Subsection title="Clic">
          <Slider
            label="Tolérance de clic sur une flèche"
            value={edit.edgePickTolerance}
            limits={SETTINGS_LIMITS['edit.edgePickTolerance']}
            format={(v) => `${v} px`}
            onChange={(edgePickTolerance) => onChange({ edit: { edgePickTolerance } })}
          />
          <Slider
            label="Tolérance de clic sur une poignée"
            value={edit.handlePickTolerance}
            limits={SETTINGS_LIMITS['edit.handlePickTolerance']}
            format={(v) => `${v} px`}
            onChange={(handlePickTolerance) => onChange({ edit: { handlePickTolerance } })}
          />
          <Slider
            label="Retrait d’un point de flèche remis dans l’alignement"
            value={edit.edgePointAlignTolerance}
            limits={SETTINGS_LIMITS['edit.edgePointAlignTolerance']}
            format={(v) => (v === 0 ? 'jamais' : `à ${v} px`)}
            onChange={(edgePointAlignTolerance) => onChange({ edit: { edgePointAlignTolerance } })}
          />
        </Subsection>
        <Subsection title="Poignées et redimensionnement">
          <Slider
            label="Taille des poignées"
            value={edit.handleSize}
            limits={SETTINGS_LIMITS['edit.handleSize']}
            format={(v) => `${v * 2} px`}
            onChange={(handleSize) => onChange({ edit: { handleSize } })}
          />
          <Slider
            label="Taille minimale d’une forme"
            value={edit.minShapeSize}
            limits={SETTINGS_LIMITS['edit.minShapeSize']}
            format={(v) => `${v} px`}
            onChange={(minShapeSize) => onChange({ edit: { minShapeSize } })}
          />
          <Slider
            label="Écart des poignées de connexion"
            value={edit.connectHandleOffset}
            limits={SETTINGS_LIMITS['edit.connectHandleOffset']}
            format={(v) => `${v} px`}
            onChange={(connectHandleOffset) => onChange({ edit: { connectHandleOffset } })}
          />
          <Slider
            label="Masquer les poignées du milieu sous"
            value={edit.middleHandleMinSpan}
            limits={SETTINGS_LIMITS['edit.middleHandleMinSpan']}
            format={(v) => (v === 0 ? 'jamais' : `${v} px`)}
            onChange={(middleHandleMinSpan) => onChange({ edit: { middleHandleMinSpan } })}
          />
        </Subsection>
        <Subsection title="Annuler, coller">
          <Slider
            label="Étapes d’annulation gardées"
            value={edit.undoLimit}
            limits={SETTINGS_LIMITS['edit.undoLimit']}
            format={(v) => `${v} px`}
            onChange={(undoLimit) => onChange({ edit: { undoLimit } })}
          />
          <Slider
            label="Décalage d’un collage sans grille"
            value={edit.pasteOffset}
            limits={SETTINGS_LIMITS['edit.pasteOffset']}
            format={(v) => `${v} px`}
            onChange={(pasteOffset) => onChange({ edit: { pasteOffset } })}
          />
          <p className="hint muted">
            Coller et dupliquer décalent d’un pas de grille ; sur une page sans grille, de ce décalage.
          </p>
        </Subsection>
        <Subsection title="Déplacement au clavier">
          <Slider
            label="Pas d’une flèche"
            value={edit.nudgeStep}
            limits={SETTINGS_LIMITS['edit.nudgeStep']}
            format={(v) => `${v} px`}
            onChange={(nudgeStep) => onChange({ edit: { nudgeStep } })}
          />
          <Slider
            label="Pas avec Maj"
            value={edit.nudgeCoarseStep}
            limits={SETTINGS_LIMITS['edit.nudgeCoarseStep']}
            format={(v) => (v === 0 ? 'grille' : `${v} px`)}
            onChange={(nudgeCoarseStep) => onChange({ edit: { nudgeCoarseStep } })}
          />
          <p className="hint muted">
            Les flèches du clavier déplacent la sélection ; avec Maj, d’un pas plus grand (à 0, un pas de grille, calé
            sur la grille).
          </p>
        </Subsection>
      </Section>

      <Section title="Sauvegarde">
        <Toggle
          label="Sauvegarde automatique"
          checked={save.autosave}
          onChange={(autosave) => onChange({ save: { autosave } })}
        />
        <Slider
          label="Délai après la dernière modification"
          value={save.delayMs}
          limits={SETTINGS_LIMITS['save.delayMs']}
          format={ms}
          disabled={!save.autosave}
          onChange={(delayMs) => onChange({ save: { delayMs } })}
        />
        <p className="hint muted">
          {desktop
            ? 'Le fichier est réécrit sur le disque. Un exemple est gardé dans la bibliothèque ; « Enregistrer sous » l’enregistre comme fichier.'
            : 'Le fichier est enregistré dans la bibliothèque du navigateur ; ouvert depuis le disque (Chrome, Edge), il y est aussi réécrit, sinon « Enregistrer sous » le télécharge en plus.'}
        </p>
        <Slider
          label="Mémoriser la position de consultation (page, vue) après"
          value={save.viewStateDelayMs}
          limits={SETTINGS_LIMITS['save.viewStateDelayMs']}
          format={ms}
          onChange={(viewStateDelayMs) => onChange({ save: { viewStateDelayMs } })}
        />
        <Slider
          label="Fichiers récents listés à l’accueil"
          value={save.recentLimit}
          limits={SETTINGS_LIMITS['save.recentLimit']}
          format={(v) => `${v} px`}
          onChange={(recentLimit) => onChange({ save: { recentLimit } })}
        />
      </Section>
    </>
  );
}
