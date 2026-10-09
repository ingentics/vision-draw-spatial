import { perspectiveAmount } from '../../interaction/cameraState';
import { setPageOpacity } from '../../render/pageEffects';
import type { PageScene } from '../../render/pageScene';
import type { SceneLevel } from '../../shapes/types';
import { setPageTransform } from '../../render/space';
import type { EngineCore } from '../EngineCore';
import { settingsSectionChanged } from '../../settings';
import type { Settings } from '../../settings';
import { clamp } from '../../model/numbers';

/**
 * Niveau de rendu de la page (à plat ou en volume) : hauteur des volumes qui suit l'inclinaison, fondu enchaîné des
 * bascules 2D ↔ volume.
 */
export class Levels {
  /** Bascule 2D ↔ volume en cours : scènes en fondu enchaîné (renseignées à la première image). */
  private blending: { volume?: PageScene; flat?: PageScene } | undefined;
  /** Hauteur courante des volumes iso (0 à 1, suit l'inclinaison). */
  private heights = 1;

  constructor(private readonly core: EngineCore) {}

  /** Scènes du fondu entre niveaux en cours (lecture seule : `startLevelBlend`, `endLevelBlend`). */
  get levelBlend(): { volume?: PageScene; flat?: PageScene } | undefined {
    return this.blending;
  }

  /** Échelle des hauteurs pendant une bascule (lecture seule : `applyHeightScale`). */
  get heightScale(): number {
    return this.heights;
  }

  /** Paramètres changés : les scènes sont reconstruites si leur dessin en dépend. */
  settingsChanged(settings: Settings, previous: Settings): void {
    const { view } = settings;
    if (
      view.isoVolume !== previous.view.isoVolume ||
      view.isoDepth !== previous.view.isoDepth ||
      view.shadeLight !== previous.view.shadeLight ||
      view.shadeDark !== previous.view.shadeDark ||
      // Fonds de labels « default » = couleur du fond.
      settings.background.color !== previous.background.color ||
      settings.selection.accentColor !== previous.selection.accentColor ||
      settingsSectionChanged(settings, previous, 'shapes') ||
      settingsSectionChanged(settings, previous, 'graph') ||
      settingsSectionChanged(settings, previous, 'effects') ||
      settingsSectionChanged(settings, previous, 'modes') ||
      settingsSectionChanged(settings, previous, 'shapeCategories')
    ) {
      this.rebuildScenes();
    }
  }

  /**
   * Réglages iso d'une page adoptés à son arrivée (`Config.adoptPageIso`) : volumes ou profondeur changés, les scènes
   * sont vidées sans être reconstruites, la page arrivant les reconstruit à son affichage.
   */
  pageSettingsAdopted(settings: Settings, previous: Settings): void {
    if (settings.view.isoVolume !== previous.view.isoVolume || settings.view.isoDepth !== previous.view.isoDepth)
      this.core.scenes.clear();
  }

  /**
   * Niveau de rendu demandé par le mode de vue (repli à plat si les formes n'en ont pas). En
   * revenant à la 2D, les volumes restent tant que la caméra est inclinée ou en perspective :
   * ils s'aplatissent pendant l'animation (`applyHeightScale`), la page passe à plat à l'arrivée.
   */
  requestedLevel(): SceneLevel {
    const { mode, tilt, fov } = this.core.camera.state;
    const volume = mode !== 'top' || tilt > 0 || fov !== undefined;
    return volume && this.core.settings.view.isoVolume && !this.core.viewModes.flattened ? 'iso' : 'flat';
  }

  /**
   * Volumes iso : la hauteur des blocs suit l'inclinaison (ils « poussent » pendant la bascule
   * 2D → iso, et s'aplatissent si l'on remonte vers la vue de dessus), ou la perspective : pleine
   * hauteur en 3D, même vue d'aplomb.
   */
  applyHeightScale(): void {
    const scene = this.core.scenes.current;
    if (!scene || scene.level !== 'iso' || !this.core.canInteract()) return;
    const tilted = this.core.camera.state.tilt / Math.max(this.core.camera.isoTilt(), 1e-6);
    const scale = clamp(Math.max(tilted, perspectiveAmount(this.core.camera.state, this.core.camera.limits)), 0, 1);
    this.heights = scale;
    setPageTransform(scene.root, undefined, scale);
    this.blendLevels(scene, scale);
  }

  /**
   * Fondu enchaîné d'une bascule 2D ↔ volume : la scène en volume (qui s'aplatit ou pousse)
   * apparaît avec la hauteur des blocs, la scène à plat de la même page disparaît d'autant.
   */
  private blendLevels(volume: PageScene, weight: number): void {
    const blend = this.blending;
    const page = this.core.pages.getCurrentPage();
    if (!blend || !page) return;
    const flat = blend.flat ?? this.core.scenes.overlay(page, 'flat');
    if (flat === volume) return;
    blend.flat = flat;
    blend.volume = volume;
    setPageOpacity(volume.root, weight);
    setPageOpacity(flat.root, 1 - weight);
  }

  /** Début d'une bascule 2D ↔ volume animée : fondu enchaîné des deux scènes de la page. */
  startLevelBlend(): void {
    this.blending = {};
  }

  /** Fin (ou interruption) du fondu enchaîné : chaque scène retrouve son opacité, seule la courante reste visible. */
  endLevelBlend(): void {
    const blend = this.blending;
    if (!blend) return;
    this.blending = undefined;
    for (const scene of [blend.volume, blend.flat]) if (scene) setPageOpacity(scene.root, 1);
    const page = this.core.pages.getCurrentPage();
    if (page && this.core.canInteract() && (blend.volume || blend.flat)) {
      this.core.scenes.show(page);
      this.applyHeightScale();
      // La sélection suit la scène affichée (voile, contour, poignées).
      this.core.highlight.update();
      this.core.rendering.requestRender();
    }
  }

  /** Les volumes ont changé (activés, épaisseur) : on reconstruit les scènes. */
  rebuildScenes(): void {
    this.core.scenes.clear();
    const page = this.core.pages.getCurrentPage();
    if (page) this.core.scenes.show(page);
    this.applyHeightScale();
    this.core.highlight.update();
    this.core.minimap.invalidate();
    this.core.rendering.requestRender();
  }
}
