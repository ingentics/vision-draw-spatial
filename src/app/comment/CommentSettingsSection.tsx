import { SETTINGS_LIMITS } from '../../engine';
import type { Settings, SettingsPatch } from '../../engine';
import { Section, Subsection } from '../PanelSection';
import { ColorField, Slider } from '../SettingsFields';
import { CommentPreview } from './CommentPreview';

/** Section « Commentaires » des paramètres (réglages `comment`) : voile, texte, fondu, et l'aperçu en direct. */
export function CommentSettingsSection({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: SettingsPatch) => void;
}) {
  const { comment } = settings;
  return (
    <Section title="Commentaires">
      <p className="hint muted">
        Au survol d’une flèche ou d’une forme commentée : texte en bas à gauche du rendu, sur un voile dégradé.
      </p>
      <Subsection title="Voile">
        <ColorField
          label="Couleur"
          value={comment.veilColor}
          onChange={(veilColor) => onChange({ comment: { veilColor } })}
        />
        <Slider
          label="Opacité dans le coin"
          value={comment.opacityCorner}
          limits={SETTINGS_LIMITS['comment.opacityCorner']}
          format={(v) => `${Math.round(v * 100)} %`}
          onChange={(opacityCorner) => onChange({ comment: { opacityCorner } })}
        />
        <Slider
          label="Opacité vers la courbe"
          value={comment.opacityEdge}
          limits={SETTINGS_LIMITS['comment.opacityEdge']}
          format={(v) => `${Math.round(v * 100)} %`}
          onChange={(opacityEdge) => onChange({ comment: { opacityEdge } })}
        />
        <Slider
          label="Courbe au-dessus du texte"
          value={comment.marginTop}
          limits={SETTINGS_LIMITS['comment.marginTop']}
          format={(v) => `${v} px`}
          onChange={(marginTop) => onChange({ comment: { marginTop } })}
        />
        <Slider
          label="Courbe à droite du texte"
          value={comment.marginRight}
          limits={SETTINGS_LIMITS['comment.marginRight']}
          format={(v) => `${v} px`}
          onChange={(marginRight) => onChange({ comment: { marginRight } })}
        />
        <Slider
          label="Arrondi de la courbe"
          value={comment.curveRadius}
          limits={SETTINGS_LIMITS['comment.curveRadius']}
          format={(v) => `${v} px`}
          onChange={(curveRadius) => onChange({ comment: { curveRadius } })}
        />
        <Slider
          label="Longueur du dégradé"
          value={comment.fadeLength}
          limits={SETTINGS_LIMITS['comment.fadeLength']}
          format={(v) => `${v} px`}
          onChange={(fadeLength) => onChange({ comment: { fadeLength } })}
        />
      </Subsection>
      <Subsection title="Texte">
        <ColorField
          label="Couleur"
          value={comment.textColor}
          onChange={(textColor) => onChange({ comment: { textColor } })}
        />
        <Slider
          label="Taille"
          value={comment.textSize}
          limits={SETTINGS_LIMITS['comment.textSize']}
          format={(v) => `${v} px`}
          onChange={(textSize) => onChange({ comment: { textSize } })}
        />
        <Slider
          label="Largeur maximale"
          value={comment.textMaxWidth}
          limits={SETTINGS_LIMITS['comment.textMaxWidth']}
          format={(v) => `${v} px`}
          onChange={(textMaxWidth) => onChange({ comment: { textMaxWidth } })}
        />
        <Slider
          label="Distance aux bords"
          value={comment.padding}
          limits={SETTINGS_LIMITS['comment.padding']}
          format={(v) => `${v} px`}
          onChange={(padding) => onChange({ comment: { padding } })}
        />
      </Subsection>
      <Subsection title="Fondu">
        <Slider
          label="Apparition"
          value={comment.fadeInMs}
          limits={SETTINGS_LIMITS['comment.fadeInMs']}
          format={(v) => `${v} ms`}
          onChange={(fadeInMs) => onChange({ comment: { fadeInMs } })}
        />
        <Slider
          label="Disparition"
          value={comment.fadeOutMs}
          limits={SETTINGS_LIMITS['comment.fadeOutMs']}
          format={(v) => `${v} ms`}
          onChange={(fadeOutMs) => onChange({ comment: { fadeOutMs } })}
        />
      </Subsection>
      <Subsection title="Aperçu">
        <CommentPreview settings={comment} background={settings.background} />
      </Subsection>
    </Section>
  );
}
