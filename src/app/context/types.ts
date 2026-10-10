import type {
  AlignMove,
  AlignReference,
  Anchoring,
  DistributeMove,
  EdgeEnd,
  EdgeLine,
  EdgeModel,
  EdgeTextAnchor,
  ExporterSettings,
  JumpStyle,
  LinkModel,
  ModeEdit,
  ModeScope,
  OrderMove,
  OrientAction,
  PageModel,
  PluginSettings,
  ShapeModel,
  StylePreset,
  StyleSettings,
} from '../../engine';
import type { TextEdit } from '../TextFormat';
import type { EdgeStylePatch } from './EdgeLineSections';

/** Ce que reçoit le panneau contextuel (et chacune de ses sections) : la sélection, la page et les actions. */

export interface ContextPanelProps {
  page: PageModel;
  /** Toutes les pages, pour les liens. */
  pages: PageModel[];
  /** Formes et flèches sélectionnées sur la page (vides : panneau de la page). */
  shapes: ShapeModel[];
  edges: EdgeModel[];
  styles: StyleSettings;
  /** Réglages enregistrés des modes (`settings.modes`), passés bornés à la section du mode. */
  modeSettings: PluginSettings;
  /** Moteurs de rendu des exports (`settings.exporters`), pour la fenêtre d'export d'un mode. */
  exporters: ExporterSettings;
  /** Épaisseur par défaut des volumes (réglage), affichée quand la forme n'a pas la sienne. */
  defaultDepth: number;
  /** Libellé de la touche de sélection multiple (ex. « Ctrl »), pour l'aide. */
  multiSelectKey: string;
  onApplyStyle: (preset: StylePreset) => void;
  /** Clés de style des formes sélectionnées (bordure : couleur, épaisseur, trait, coins). */
  onShapeStyle: (patch: Record<string, string | undefined>) => void;
  /** Retourner ou pivoter les formes sélectionnées qui l'acceptent (sujet 335). */
  onOrient: (action: OrientAction) => void;
  /** Clés de style des flèches sélectionnées (tracé : droite, angles droits, arrondi, courbe), calculées par flèche. */
  /** `merge` : réglage en direct, fusionné en une étape d'annulation avec les précédents de même clé. */
  onEdgeStyle: (patch: EdgeStylePatch, merge?: string) => void;
  /** Retour en auto de la flèche : points intermédiaires et points d'attache imposés retirés. */
  onResetRoute: () => void;
  /** Renommer la page ; absent si les pages ne sont pas modifiables. */
  onRenamePage?: (name: string) => void;
  /** Mode de la page (undefined = page normale) ; absent si la page n'est pas modifiable. */
  onPageMode?: (modeId: string | undefined) => void;
  /** Active ou retire un effet de la page ; absent si la page n'est pas modifiable. */
  onPageEffect?: (effectId: string, enabled: boolean) => void;
  /** Ancrage des flèches propre à la page (undefined = réglage de l'appli) ; absent si la page n'est pas modifiable. */
  onPageAnchoring?: (anchoring: Anchoring | undefined) => void;
  /** Ancrage des flèches du réglage de l'appli (choix « par défaut » de la page). */
  defaultAnchoring?: Anchoring;
  /** Tracé des flèches créées propre à la page (undefined = réglage de l'appli) ; absent si non modifiable. */
  onPageEdgeLine?: (line: EdgeLine | undefined) => void;
  /** Tracé du réglage de l'appli (choix « par défaut » de la page). */
  defaultEdgeLine: EdgeLine;
  /** Tracés permis par l'ancrage de la page : un seul, le choix du tracé n'est pas proposé. */
  pageEdgeLines: readonly EdgeLine[];
  /** Saut des flèches aux croisements propre à la page (undefined = réglage de l'appli) ; absent si non modifiable. */
  onPageJumps?: (jumps: JumpStyle | 'none' | undefined) => void;
  /** Saut du réglage de l'appli (choix « par défaut » de la page). */
  defaultJumps: JumpStyle | 'none';
  /** Saut suivi par les flèches de la page sans le leur (celui de la page, sinon celui de l'appli). */
  pageJumps: JumpStyle | 'none';
  /** Taille du saut d'une flèche sans `jumpSize` (réglage de l'appli). */
  defaultJumpSize: number;
  /** Opération du mode de la page (sections propres au mode) ; absent si la page n'est pas modifiable. */
  onModeEdit?: (label: string, edit: (edit: ModeEdit) => void) => void;
  /**
   * Réglage déclaré par le mode de la page (undefined = vide) ; absent si la page n'est pas modifiable. `merge` :
   * réglage en direct, une étape d'annulation par saisie.
   */
  onModeProperty?: (
    scope: ModeScope,
    targetId: string | undefined,
    key: string,
    value: string | undefined,
    part?: string,
    merge?: string,
  ) => void;
  /** Partie sélectionnée de la forme (ex. champ d'une table RDD, sujet 249) : le panneau ne montre que ses réglages. */
  part?: string;
  /** « Courant » du mode de la page (ex. flux courant), montré par ses sections. */
  modeCurrent?: string;
  /** Lien de l'élément sélectionné (vers une page ou une URL) ; undefined = retiré. */
  onLink: (link: LinkModel | undefined) => void;
  /** Attribut spatial de la forme sélectionnée (épaisseur, élévation…) ; undefined = valeur par défaut. */
  /** `merge` : réglage en direct, fusionné en une étape d'annulation avec les précédents de même clé. */
  onSpatial: (key: string, value: number | string | undefined, merge?: string) => void;
  /** Édition du texte (du milieu, pour une flèche) dans le plan. */
  onEditLabel: () => void;
  /** Édition en place du commentaire de l'élément sélectionné (montré au survol), dans l'encart du rendu. */
  onEditComment: () => void;
  /** Texte de début ou de fin d'une flèche (vide = retiré). */
  onEndLabel: (end: EdgeEnd, text: string) => void;
  onDelete: () => void;
  /** Inverse les flèches sélectionnées (source et cible échangées). */
  onReverse: () => void;
  /** Ordre de dessin de la sélection (premier plan, arrière-plan, avancer, reculer). */
  onOrder: (move: OrderMove) => void;
  /** Référence de l'alignement (réglage de l'appli) et son changement. */
  alignReference: AlignReference;
  onAlignReference: (reference: AlignReference) => void;
  /** Aligner ou répartir les formes de la sélection. */
  onAlign: (move: AlignMove) => void;
  onDistribute: (move: DistributeMove) => void;
  /** Ancre d'un texte de la flèche (début, milieu, fin). */
  onTextAnchor: (cellId: string, anchor: EdgeTextAnchor) => void;
  /** Texte en cours d'édition en place : le panneau montre son format. */
  textEdit?: TextEdit;
}
