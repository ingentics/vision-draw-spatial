import { SETTINGS_LIMITS } from '../../engine';
import type { SettingsSectionProps } from './types';
import { Section, Subsection, Subsubsection } from '../PanelSection';
import { Choice, ColorField, Slider, Toggle } from '../SettingsFields';
import { ANCHORING_OPTIONS, EDGE_LINE_OPTIONS, JUMP_OPTIONS } from '../edgeIcons';
import {
  EdgeEndTextsPreview,
  EdgeLabelPreview,
  LoopPreview,
  PlaceholderPreview,
  SplitEdgePreview,
} from '../settingsPreviews';

/** Section « Formes et flèches » des paramètres. */
export function ShapeEdgeSettings({ settings, onChange }: SettingsSectionProps) {
  const { shapes, background } = settings;
  return (
    <Section title="Formes et flèches">
      <Subsection title="Nouvelles formes et flèches">
        <Slider
          label="Taille du texte"
          value={shapes.textSize}
          limits={SETTINGS_LIMITS['shapes.textSize']}
          format={(v) => `${v} px`}
          onChange={(textSize) => onChange({ shapes: { textSize } })}
        />
        <Choice
          label="Tracé des flèches"
          value={shapes.edgeLineStyle}
          options={EDGE_LINE_OPTIONS}
          onChange={(edgeLineStyle) => onChange({ shapes: { edgeLineStyle } })}
        />
        <Slider
          label="Marge d’une boucle (flèche vers la même forme)"
          value={shapes.edgeLoopMargin}
          limits={SETTINGS_LIMITS['shapes.edgeLoopMargin']}
          format={(v) => `${v} px`}
          onChange={(edgeLoopMargin) => onChange({ shapes: { edgeLoopMargin } })}
        />
        <p className="hint muted">
          Écrits dans le style draw.io des formes de la palette et des flèches tirées depuis une forme ; à changer
          ensuite forme par forme dans le panneau de droite.
        </p>
        <LoopPreview shapes={shapes} background={background} />
      </Subsection>
      <Subsection title="Ancrage">
        <Choice
          label="Ancrage des flèches"
          value={shapes.edgeAnchoring}
          options={ANCHORING_OPTIONS}
          onChange={(edgeAnchoring) => onChange({ shapes: { edgeAnchoring } })}
        />
        <ul className="hint muted hint-list">
          <li>
            <strong>Manuel</strong> : on choisit le point d'attache, un point libre est toujours proposé entre deux
            flèches.
          </li>
          <li>
            <strong>Automatique</strong> : on choisit le côté, les flèches y sont réparties sans se croiser.
          </li>
          <li>
            <strong>Typon</strong> : comme l'automatique, tracé à 45° comme les pistes d'un circuit imprimé.
          </li>
        </ul>
        <p className="hint muted">Une page peut avoir son propre réglage (panneau Page).</p>
        <Subsubsection title="Automatique">
          <Toggle
            label="Contourner les formes et les flèches"
            checked={shapes.edgeAutoRoute}
            onChange={(edgeAutoRoute) => onChange({ shapes: { edgeAutoRoute } })}
          />
          <Slider
            label="Écart aux formes"
            value={shapes.edgeShapeClearance}
            limits={SETTINGS_LIMITS['shapes.edgeShapeClearance']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgeAutoRoute}
            onChange={(edgeShapeClearance) => onChange({ shapes: { edgeShapeClearance } })}
          />
          <Slider
            label="Écart entre flèches"
            value={shapes.edgeSpacing}
            limits={SETTINGS_LIMITS['shapes.edgeSpacing']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgeAutoRoute}
            onChange={(edgeSpacing) => onChange({ shapes: { edgeSpacing } })}
          />
          <Slider
            label="Premier et dernier segments"
            value={shapes.edgePortStub}
            limits={SETTINGS_LIMITS['shapes.edgePortStub']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgeAutoRoute}
            onChange={(edgePortStub) => onChange({ shapes: { edgePortStub } })}
          />
          <Slider
            label="Détour pour éviter un croisement"
            value={shapes.edgeCrossingDetour}
            limits={SETTINGS_LIMITS['shapes.edgeCrossingDetour']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgeAutoRoute}
            onChange={(edgeCrossingDetour) => onChange({ shapes: { edgeCrossingDetour } })}
          />
          <p className="hint muted">
            Le tracé à angles droits contourne les formes et ne se superpose pas aux autres flèches ; il est écrit en
            points intermédiaires, que draw.io suit tels quels. Appliqué à la prochaine modification de la page. Sans
            contournement : la répartition seule, tracé de draw.io.
          </p>
        </Subsubsection>
        <Subsubsection title="Typon">
          <Toggle
            label="Contourner les formes et les flèches"
            checked={shapes.edgePcbAutoRoute}
            onChange={(edgePcbAutoRoute) => onChange({ shapes: { edgePcbAutoRoute } })}
          />
          <Slider
            label="Écart aux formes"
            value={shapes.edgePcbShapeClearance}
            limits={SETTINGS_LIMITS['shapes.edgePcbShapeClearance']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgePcbAutoRoute}
            onChange={(edgePcbShapeClearance) => onChange({ shapes: { edgePcbShapeClearance } })}
          />
          <Slider
            label="Écart entre flèches (pas de la grille)"
            value={shapes.edgePcbSpacing}
            limits={SETTINGS_LIMITS['shapes.edgePcbSpacing']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgePcbAutoRoute}
            onChange={(edgePcbSpacing) => onChange({ shapes: { edgePcbSpacing } })}
          />
          <Slider
            label="Premier et dernier segments"
            value={shapes.edgePcbPortStub}
            limits={SETTINGS_LIMITS['shapes.edgePcbPortStub']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgePcbAutoRoute}
            onChange={(edgePcbPortStub) => onChange({ shapes: { edgePcbPortStub } })}
          />
          <Slider
            label="Détour pour éviter un croisement"
            value={shapes.edgePcbCrossingDetour}
            limits={SETTINGS_LIMITS['shapes.edgePcbCrossingDetour']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgePcbAutoRoute}
            onChange={(edgePcbCrossingDetour) => onChange({ shapes: { edgePcbCrossingDetour } })}
          />
          <Slider
            label="Coût d’un coude à 45°"
            value={shapes.edgePcbBend45}
            limits={SETTINGS_LIMITS['shapes.edgePcbBend45']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgePcbAutoRoute}
            onChange={(edgePcbBend45) => onChange({ shapes: { edgePcbBend45 } })}
          />
          <Slider
            label="Coût d’un coude à 90°"
            value={shapes.edgePcbBend90}
            limits={SETTINGS_LIMITS['shapes.edgePcbBend90']}
            format={(v) => `${v} px`}
            disabled={!shapes.edgePcbAutoRoute}
            onChange={(edgePcbBend90) => onChange({ shapes: { edgePcbBend90 } })}
          />
          <p className="hint muted">
            Tracé à 0°, 45° et 90° sur une grille au pas de l'écart entre flèches ; un coude coûte autant qu'un
            allongement de cette longueur. Appliqué à la prochaine modification de la page. Sans contournement : tracé
            octilinéaire direct.
          </p>
        </Subsubsection>
      </Subsection>
      <Subsection title="Textes de début et de fin">
        <Slider
          label="Taille"
          value={shapes.edgeEndTextSize}
          limits={SETTINGS_LIMITS['shapes.edgeEndTextSize']}
          format={(v) => `${v} px`}
          onChange={(edgeEndTextSize) => onChange({ shapes: { edgeEndTextSize } })}
        />
        <ColorField
          label="Couleur"
          value={shapes.edgeEndTextColor}
          onChange={(edgeEndTextColor) => onChange({ shapes: { edgeEndTextColor } })}
        />
        <Slider
          label="Écart le long de la flèche"
          value={shapes.edgeEndTextGapAlong}
          limits={SETTINGS_LIMITS['shapes.edgeEndTextGapAlong']}
          format={(v) => `${v} px`}
          onChange={(edgeEndTextGapAlong) => onChange({ shapes: { edgeEndTextGapAlong } })}
        />
        <Slider
          label="Écart depuis le trait"
          value={shapes.edgeEndTextGapAcross}
          limits={SETTINGS_LIMITS['shapes.edgeEndTextGapAcross']}
          format={(v) => `${v} px`}
          onChange={(edgeEndTextGapAcross) => onChange({ shapes: { edgeEndTextGapAcross } })}
        />
        <p className="hint muted">
          Textes créés au début ou à la fin d'une flèche : contre leur bout (à ces écarts de la forme et du trait), du
          côté et avec l'alignement qui les éloignent de la forme.
        </p>
        <EdgeEndTextsPreview shapes={shapes} background={background} />
      </Subsection>
      <Subsection title="Flèches">
        <ColorField
          label="Couleur du texte des flèches"
          value={shapes.edgeFontColor}
          onChange={(edgeFontColor) => onChange({ shapes: { edgeFontColor } })}
        />
        <p className="hint muted">Quand le style draw.io de la flèche ne précise pas de couleur de texte.</p>
        <Choice
          label="Croisements des flèches"
          value={shapes.edgeJumpStyle}
          options={JUMP_OPTIONS}
          onChange={(edgeJumpStyle) => onChange({ shapes: { edgeJumpStyle } })}
        />
        {shapes.edgeJumpStyle !== 'none' && (
          <Slider
            label="Taille du saut"
            value={shapes.edgeJumpSize}
            limits={SETTINGS_LIMITS['shapes.edgeJumpSize']}
            format={(v) => `${v} pt`}
            onChange={(edgeJumpSize) => onChange({ shapes: { edgeJumpSize } })}
          />
        )}
        <p className="hint muted">
          Quand ni la flèche (panneau de la flèche) ni sa page (panneau de la page) n’ont le leur. draw.io ne connaît
          que celui de la flèche : une flèche par défaut n’y saute pas.
        </p>
        <Choice
          label="Fond du texte des flèches"
          value={shapes.edgeLabelBackdrop}
          options={[
            ['halo', 'Halo'],
            ['solid', 'Fond uni'],
            ['none', 'Aucun'],
          ]}
          onChange={(edgeLabelBackdrop) => onChange({ shapes: { edgeLabelBackdrop } })}
        />
        <Slider
          label="Épaisseur du halo"
          value={shapes.edgeLabelHaloWidth}
          limits={SETTINGS_LIMITS['shapes.edgeLabelHaloWidth']}
          format={(v) => `${v.toLocaleString('fr-FR')} px`}
          disabled={shapes.edgeLabelBackdrop !== 'halo'}
          onChange={(edgeLabelHaloWidth) => onChange({ shapes: { edgeLabelHaloWidth } })}
        />
        <Slider
          label="Flou du halo"
          value={shapes.edgeLabelHaloBlur}
          limits={SETTINGS_LIMITS['shapes.edgeLabelHaloBlur']}
          format={(v) => (v === 0 ? 'net' : `${v.toLocaleString('fr-FR')} px`)}
          disabled={shapes.edgeLabelBackdrop !== 'halo'}
          onChange={(edgeLabelHaloBlur) => onChange({ shapes: { edgeLabelHaloBlur } })}
        />
        <p className="hint muted">
          Halo : un contour de la couleur du fond autour de chaque lettre, lisible sur le trait sans cacher la flèche.
          Fond uni : un rectangle de la couleur du fond. Une couleur de fond précisée dans le style draw.io l'emporte.
        </p>
        <EdgeLabelPreview shapes={shapes} background={background} />
      </Subsection>
      <Subsection title="Flèches coupées">
        <Slider
          label="Longueur visible d’un tronçon"
          value={shapes.edgeSplitLength}
          limits={SETTINGS_LIMITS['shapes.edgeSplitLength']}
          format={(v) => `${v} px`}
          onChange={(edgeSplitLength) => onChange({ shapes: { edgeSplitLength } })}
        />
        <Slider
          label="Longueur du fondu"
          value={shapes.edgeSplitFade}
          limits={SETTINGS_LIMITS['shapes.edgeSplitFade']}
          format={(v) => (v === 0 ? 'sans' : `${v} px`)}
          onChange={(edgeSplitFade) => onChange({ shapes: { edgeSplitFade } })}
        />
        <Slider
          label="Taille du texte de renvoi"
          value={shapes.edgeSplitLabelSize}
          limits={SETTINGS_LIMITS['shapes.edgeSplitLabelSize']}
          format={(v) => `${v} pt`}
          onChange={(edgeSplitLabelSize) => onChange({ shapes: { edgeSplitLabelSize } })}
        />
        <Slider
          label="Marge du cadre de renvoi"
          value={shapes.edgeSplitLabelPadding}
          limits={SETTINGS_LIMITS['shapes.edgeSplitLabelPadding']}
          format={(v) => `${v} px`}
          onChange={(edgeSplitLabelPadding) => onChange({ shapes: { edgeSplitLabelPadding } })}
        />
        <p className="hint muted">
          Une flèche coupée (case « Couper la flèche » de son panneau) ne montre qu’un tronçon au départ et un à
          l’arrivée. Le fondu est compris dans la longueur visible ; un tronçon qui porte un texte de renvoi s’arrête
          net sur son cadre.
        </p>
        <SplitEdgePreview shapes={shapes} background={background} />
      </Subsection>
      <Subsection title="Formes non supportées">
        <ColorField
          label="Fond du placeholder"
          value={shapes.placeholderFill}
          onChange={(placeholderFill) => onChange({ shapes: { placeholderFill } })}
        />
        <ColorField
          label="Bordure du placeholder"
          value={shapes.placeholderStroke}
          onChange={(placeholderStroke) => onChange({ shapes: { placeholderStroke } })}
        />
        <PlaceholderPreview shapes={shapes} background={background} />
      </Subsection>
    </Section>
  );
}
