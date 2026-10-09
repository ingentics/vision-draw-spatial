import { interpolateCamera } from '../../interaction/cameraMoves';
import type { CameraState } from '../../interaction/cameraState';
import { easing, embedIn, embeddedCamera, phase } from '../../interaction/transitionMath';
import type { PageModel, Rect } from '../../model/types';
import { setPageOpacity } from '../../render/pageEffects';
import { setPageTransform } from '../../render/space';
import type { EngineCore } from '../EngineCore';

/** Transition « zoom + fondu » entre une page et une page liée (SPEC §11.2), dans les deux sens. */
export class Transitions {
  /** Transition en cours : de quoi l'interrompre proprement. */
  private active: { abort: () => void } | undefined;

  constructor(private readonly core: EngineCore) {}

  isTransitioning(): boolean {
    return this.active !== undefined;
  }

  /** Interrompt la transition en cours, s'il y en a une. */
  abort(): void {
    this.active?.abort();
  }

  /** Nouveau document : la transition en cours est interrompue. */
  resetDocument(): void {
    this.abort();
  }

  /**
   * Transition « zoom + fondu » (SPEC §11.2), dans les deux sens, en un seul trajet de caméra.
   * La page intérieure (`inner`) est posée dans la forme (`frame`) de la page extérieure (`outer`).
   * - `in` : on part de la page extérieure et on plonge jusqu'à la vue `destination` de l'intérieure ;
   * - `out` : on part de la page intérieure (même image, exprimée dans le repère extérieur) et on
   *   recule jusqu'à la vue `destination` de l'extérieure, la page intérieure rétrécissant dans la forme.
   * Fondu croisé entre 25 % et 75 %. Entrées ignorées pendant la transition. Vers ou depuis la vue graphe, durée
   * propre (`graph.transitionMs`, sujet 367).
   */
  runTransition(options: {
    direction: 'in' | 'out';
    outer: PageModel;
    inner: PageModel;
    frame: Rect | undefined;
    destination: CameraState;
  }): void {
    const { direction, outer, inner, frame } = options;
    const to = direction === 'in' ? inner : outer;
    // Arrivée dans un mode d'affichage permis par la page de destination (sujet 178).
    const destination = this.core.viewModes.constrain(options.destination, to.id);
    const from = this.core.pages.getCurrentPage();
    if (!from || this.active) return;

    // La vue graphe est toujours la page extérieure d'une transition qui la touche.
    const duration = this.core.graph.isGraph(outer.id)
      ? this.core.settings.graph.transitionMs
      : this.core.settings.transition.durationMs;
    if (!frame || !this.core.settings.transition.enabled || this.core.config.reducedMotion() || duration <= 0) {
      if (direction === 'in') this.core.pages.rememberCamera(outer.id, this.core.camera.state);
      this.core.pages.rememberCamera(to.id, destination);
      this.core.pages.goToPage(to.id);
      return;
    }

    this.play({ direction, outer, inner, to, frame, destination, duration, fromId: from.id });
  }

  /** Trajet animé de la transition : pages posées l'une dans l'autre, caméra interpolée, fondu croisé. */
  private play(run: {
    direction: 'in' | 'out';
    outer: PageModel;
    inner: PageModel;
    to: PageModel;
    frame: Rect;
    destination: CameraState;
    duration: number;
    fromId: string;
  }): void {
    const { direction, outer, inner, to, destination, duration } = run;
    this.core.camera.cancelAnimation();
    this.core.selection.clearSelection();
    const embedding = embedIn(inner.bounds, run.frame);
    const outerScene = this.core.scenes.prebuild(outer);
    const innerScene = this.core.scenes.prebuild(inner);

    // Caméras de départ et d'arrivée, exprimées dans le repère de la page extérieure.
    const startCamera = direction === 'in' ? this.core.camera.state : embeddedCamera(this.core.camera.state, embedding);
    const endCamera = direction === 'in' ? embeddedCamera(destination, embedding) : destination;
    const outerCameraBefore = direction === 'in' ? this.core.camera.state : undefined;

    // Pendant la transition, la page courante est l'extérieure ; l'intérieure est posée dans la forme.
    this.core.pages.setCurrent(outer.id);
    this.core.scenes.show(outer);
    this.core.minimap.invalidate();
    innerScene.root.visible = true;
    setPageTransform(innerScene.root, embedding);
    const innerAlpha = (fade: number) => (direction === 'in' ? fade : 1 - fade);
    const setFade = (fade: number) => {
      setPageOpacity(innerScene.root, innerAlpha(fade));
      setPageOpacity(outerScene.root, 1 - innerAlpha(fade));
    };
    setFade(0);
    this.core.camera.applyCamera(startCamera);

    const ease = easing(this.core.settings.transition.easing);
    const { fadeStart, fadeEnd } = this.core.settings.transition;

    this.core.controller.setEnabled(false);
    this.core.events.emit('transitionStart', run.fromId, to.id);

    const restore = () => {
      setPageOpacity(outerScene.root, 1);
      setPageOpacity(innerScene.root, 1);
      setPageTransform(innerScene.root, undefined);
    };
    this.active = {
      abort: () => {
        // On reste sur la page extérieure, à la vue courante.
        this.core.camera.cancelAnimation();
        restore();
        this.core.scenes.show(outer);
        this.finish(to.id);
      },
    };
    // Pas de zones liées pendant le trajet.
    this.core.links.updateLinkZones();

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      if (t < 1) {
        this.core.camera.applyCamera(interpolateCamera(startCamera, endCamera, ease(t)));
        setFade(phase(t, fadeStart, fadeEnd));
        this.core.camera.requestFrame(step);
        return;
      }
      restore();
      this.arrive(outer, to, destination, outerCameraBefore);
    };
    this.core.camera.requestFrame(step);
  }

  /** Arrivée : même image à l'écran, sur la page de destination sans transformation. */
  private arrive(
    outer: PageModel,
    to: PageModel,
    destination: CameraState,
    outerCameraBefore: CameraState | undefined,
  ): void {
    if (outerCameraBefore) this.core.pages.rememberCamera(outer.id, outerCameraBefore);
    this.core.viewModes.applyPageIso(to.id);
    this.core.pages.arriveAt(to.id);
    this.core.scenes.show(to);
    this.core.minimap.invalidate();
    this.core.camera.applyCamera(destination);
    this.core.events.emit('pageChange', to);
    this.finish(to.id);
  }

  /** Fin de la transition, arrivée ou interrompue : contrôles rendus, zones liées de la page courante. */
  private finish(toId: string): void {
    this.active = undefined;
    this.core.camera.cancelAnimation();
    this.core.controller.setEnabled(true);
    // Touche toujours maintenue : les zones liées de la page d'arrivée.
    this.core.links.updateLinkZones();
    this.core.events.emit('transitionEnd', this.core.pages.currentPageId ?? toId);
  }
}
