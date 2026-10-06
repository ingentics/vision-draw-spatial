import { perspectiveAmount } from '../../interaction/camera';
import { setPageOpacity } from '../../render/pageEffects';
import type { PageScene } from '../../render/pageScene';
import type { SceneLevel } from '../../shapes/types';
import { setPageTransform } from '../../render/space';
import type { EngineCore } from '../EngineCore';

/** Niveau de rendu de la page (à plat ou en volume) : hauteur des volumes qui suit l'inclinaison, fondu enchaîné des bascules 2D ↔ volume. */
export class Levels {
  /** Bascule 2D ↔ volume en cours : scènes en fondu enchaîné (renseignées à la première image). */
  levelBlend: { volume?: PageScene; flat?: PageScene } | undefined;
  /** Hauteur courante des volumes iso (0 à 1, suit l'inclinaison). */
  heightScale = 1;

  constructor(private readonly core: EngineCore) {}

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
    if (!scene || scene.level !== 'iso' || this.core.transitions.active) return;
    const tilted = this.core.camera.state.tilt / Math.max(this.core.camera.isoTilt(), 1e-6);
    const scale = Math.min(1, Math.max(0, tilted, perspectiveAmount(this.core.camera.state)));
    this.heightScale = scale;
    setPageTransform(scene.root, undefined, scale);
    this.blendLevels(scene, scale);
  }

  /**
   * Fondu enchaîné d'une bascule 2D ↔ volume : la scène en volume (qui s'aplatit ou pousse)
   * apparaît avec la hauteur des blocs, la scène à plat de la même page disparaît d'autant.
   */
  private blendLevels(volume: PageScene, weight: number): void {
    const blend = this.levelBlend;
    const page = this.core.pages.getCurrentPage();
    if (!blend || !page) return;
    const flat = blend.flat ?? this.core.scenes.overlay(page, 'flat');
    if (flat === volume) return;
    blend.flat = flat;
    blend.volume = volume;
    setPageOpacity(volume.root, weight);
    setPageOpacity(flat.root, 1 - weight);
  }

  /** Fin (ou interruption) du fondu enchaîné : chaque scène retrouve son opacité, seule la courante reste visible. */
  endLevelBlend(): void {
    const blend = this.levelBlend;
    if (!blend) return;
    this.levelBlend = undefined;
    for (const scene of [blend.volume, blend.flat]) if (scene) setPageOpacity(scene.root, 1);
    const page = this.core.pages.getCurrentPage();
    if (page && !this.core.transitions.active && (blend.volume || blend.flat)) {
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
