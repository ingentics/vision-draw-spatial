import { isModifierKeyEvent } from '../selectionRules';
import type { ControlContext } from './context';
import type { Drift } from './drift';
import type { HeldKeys } from './host';
import type { Shortcuts } from './shortcuts';
import { ARROW_KEYS, isMoveKey, ROTATE_CODES } from './motion';
import { orderShortcut, resolveShortcut } from './shortcuts';

/**
 * Clavier : raccourcis, édition, déplacement et rotation de la vue, touches de modification maintenues. Les touches
 * de déplacement sont lues par position physique (`KeyboardEvent.code`) : Z Q S D sur AZERTY et W A S D sur QWERTY
 * sont les mêmes touches.
 */
export class KeyboardControls {
  /** Touches de modification maintenues. */
  private held: HeldKeys = { followLink: false, multiSelect: false };

  constructor(
    private readonly ctx: ControlContext,
    private readonly drift: Drift,
  ) {}

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.release);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.release);
  }

  /** Oublie les touches maintenues (perte du focus : leur relâchement ne sera pas reçu). */
  readonly release = (): void => {
    this.setHeld({ followLink: false, multiSelect: false });
    this.stopMotion();
    this.ctx.spaceDown = false;
    this.ctx.element.style.cursor = '';
  };

  /**
   * Arrête la glissade de la vue (contrôles désactivés, ex. pendant une transition). Les touches de modification
   * restent connues : leur relâchement est toujours lu, et Espace maintenue garde le mode navigation à l'arrivée.
   */
  stopMotion(): void {
    this.drift.pressed.clear();
    this.drift.stop();
  }

  setHeld(held: HeldKeys): void {
    if (this.held.followLink === held.followLink && this.held.multiSelect === held.multiSelect) return;
    this.held = held;
    this.ctx.host.heldKeys?.({ ...held });
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.trackHeldKeys(event)) return;
    if (!this.ctx.enabled || isEditable(event.target)) return;
    const action = this.runSelectionKey(event);
    if (action === true) return;
    if (this.runEditKey(event)) return;
    if (this.runViewKey(event, action)) return;
    this.startMotion(event);
  };

  /** Touches de modification maintenues (suivre un lien, sélection multiple) ; vrai si la touche s'arrête là. */
  private trackHeldKeys(event: KeyboardEvent): boolean {
    const { ctx } = this;
    const { settings } = ctx;
    const followLink = isModifierKeyEvent(event, settings.followLinkKey);
    const multiSelect = isModifierKeyEvent(event, settings.multiSelectKey);
    if ((followLink || multiSelect) && !isEditable(event.target)) {
      if (!event.repeat) {
        this.setHeld({
          followLink: this.held.followLink || followLink,
          multiSelect: this.held.multiSelect || multiSelect,
        });
      }
      // Espace garde aussi son rôle de déplacement de la vue (plus bas).
      return event.code !== 'Space';
    }
    // Une autre touche avec ⌘ ou Ctrl (⌘+Tab, Ctrl+Z…) : un raccourci, pas un mode. Espace, elle,
    // reste maintenue (ex. déplacement au clavier pendant qu'elle l'est).
    this.setHeld({ followLink: settings.followLinkKey === 'space' && ctx.spaceDown, multiSelect: false });
    return false;
  }

  /**
   * Raccourcis sur la sélection et retour, y compris avec ⌘, Ctrl ou Alt : `true` si la touche est traitée (ou
   * réservée à un raccourci système), sinon l'action de raccourci de la touche, pour la suite.
   */
  private runSelectionKey(event: KeyboardEvent): true | keyof Shortcuts | undefined {
    const { element, host, settings } = this.ctx;
    // Tout sélectionner : seulement si le focus est sur la zone de dessin (ailleurs, comportement natif).
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === 'a' &&
      event.target === element
    ) {
      event.preventDefault();
      if (!event.repeat) host.selectAll?.();
      return true;
    }
    // Ordre de dessin : touches physiques (Alt change le caractère produit sur macOS).
    const order = orderShortcut(event);
    if (order && event.target === element) {
      event.preventDefault();
      if (!event.repeat) host.orderSelection?.(order);
      return true;
    }
    // Une touche de déplacement reste une touche de déplacement, même si elle porte une lettre de raccourci.
    const action = isMoveKey(event.code, settings.moveKeys)
      ? undefined
      : resolveShortcut(event.key, settings.shortcuts, {
          canDelete: host.canDeleteSelection?.() ?? false,
        });
    if (action === 'deleteSelection' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!event.repeat) host.deleteSelection?.();
      return true;
    }
    // Retour (SPEC §9.2) : Alt+↑, remonter (sujet 357) ; ni Backspace (trop utilisé) ni Alt+← (souvent déjà pris).
    if (event.code === 'ArrowUp' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      if (!event.repeat) host.back?.();
      return true;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    return action;
  }

  /** Édition au clavier (flèches, F2, Suppr, Échap, touche du mode) ; vrai si la touche est traitée. */
  private runEditKey(event: KeyboardEvent): boolean {
    const { host } = this.ctx;
    const nudge = ARROW_KEYS[event.code];
    if (nudge && host.nudgeSelection?.(nudge, event.shiftKey)) {
      event.preventDefault();
      return true;
    }
    // Édition (touches fixes) : F2 = texte, Suppr = supprimer, Échap = désélectionner.
    if (event.key === 'F2' || event.key === 'Delete' || event.key === 'Escape') {
      if (event.repeat) return true;
      event.preventDefault();
      if (event.key === 'F2') host.editSelection?.();
      else if (event.key === 'Delete') host.deleteSelection?.();
      else host.escape?.();
      return true;
    }
    // Touche propre au mode de la page, sur la sélection (ex. « + » / « - » : rang d'une flèche dans son flux).
    if (host.modeKey?.(event.key)) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  /** Raccourcis de la vue (commentaire, variante, vue d'ensemble, bascules) ; vrai si la touche est traitée. */
  private runViewKey(event: KeyboardEvent, action: keyof Shortcuts | undefined): boolean {
    const { ctx } = this;
    const { host } = ctx;
    if (action === 'editComment') {
      if (!event.repeat && host.editComment?.()) event.preventDefault();
      return true;
    }
    if (action === 'placementVariant') {
      if (!event.repeat && host.placementVariant?.()) event.preventDefault();
      return true;
    }
    if (action === 'overview') {
      // Sur un bouton, Entrée (ou Espace) l'active : on ne détourne pas la touche.
      if (event.repeat || (event.target instanceof HTMLElement && event.target.tagName === 'BUTTON')) return true;
      event.preventDefault();
      this.drift.stop();
      host.toggleOverview(ctx.hover);
      return true;
    }
    if (
      action === 'toggleViewMode' ||
      action === 'toggle3d' ||
      action === 'toggleGraph' ||
      action === 'toggleMinimap' ||
      action === 'toggleMinigraph' ||
      action === 'toggleFlatten'
    ) {
      event.preventDefault();
      if (event.repeat) return true;
      if (action === 'toggleViewMode') host.toggleViewMode?.();
      else if (action === 'toggle3d') host.toggle3d?.();
      else if (action === 'toggleGraph') host.toggleGraph?.();
      else if (action === 'toggleFlatten') host.toggleFlatten?.();
      else if (action === 'toggleMinigraph') host.toggleMinigraph?.();
      else host.toggleMinimap?.();
      return true;
    }
    return false;
  }

  /** Mouvement de la vue au clavier : rotation (iso, 3D), Espace maintenue (glisser), déplacement. */
  private startMotion(event: KeyboardEvent): void {
    const { ctx, drift } = this;
    // Rotation (A / E) : en iso et en 3D seulement ; en 2D, la vue n'est jamais tournée.
    if (ROTATE_CODES.includes(event.code) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (ctx.host.getCameraState().mode === 'top') return;
      drift.pressed.add(event.code);
      drift.start();
      return;
    }
    if (event.code === 'Space') {
      ctx.spaceDown = true;
      if (!ctx.drag) ctx.element.style.cursor = 'grab';
      event.preventDefault();
      return;
    }
    if (!isMoveKey(event.code, ctx.settings.moveKeys)) return;
    event.preventDefault();
    drift.pressed.add(event.code);
    drift.start();
  }

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const { ctx } = this;
    this.setHeld({
      followLink: this.held.followLink && !isModifierKeyEvent(event, ctx.settings.followLinkKey),
      multiSelect: this.held.multiSelect && !isModifierKeyEvent(event, ctx.settings.multiSelectKey),
    });
    if (event.code === 'Space') {
      ctx.spaceDown = false;
      if (!ctx.drag) ctx.element.style.cursor = '';
    }
    this.drift.pressed.delete(event.code);
  };
}

/** Saisie en cours dans un champ : les touches lui appartiennent. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
}
