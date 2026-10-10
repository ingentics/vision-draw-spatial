import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlContext } from '../../../../src/engine/core/interaction/controls/context';
import { Drift } from '../../../../src/engine/core/interaction/controls/drift';
import type { CameraHost } from '../../../../src/engine/core/interaction/controls/host';
import { KeyboardControls } from '../../../../src/engine/core/interaction/controls/keyboard';
import { DEFAULT_CONTROLS } from '../../../../src/engine/core/interaction/controls/settings';

/** Élément du DOM réduit (les tests tournent sans DOM) : `tagName`, style. */
class FakeElement {
  style = { cursor: '' };
  isContentEditable = false;
  constructor(readonly tagName: string) {}
}

/** Clavier branché sur une fenêtre factice : `press` envoie un appui (et le relâché si `up`). */
function keyboard(capturedKey: (key: string) => boolean) {
  const listeners = new Map<string, (event: unknown) => void>();
  vi.stubGlobal('window', {
    addEventListener: (name: string, fn: (event: unknown) => void) => listeners.set(name, fn),
  });
  const canvas = new FakeElement('CANVAS');
  const host = {
    capturing: () => true,
    capturedKey,
    getCameraState: () => ({ mode: 'top' }),
    selectAll: vi.fn(),
  } as unknown as CameraHost;
  const ctx = new ControlContext(canvas as unknown as HTMLElement, host, DEFAULT_CONTROLS);
  new KeyboardControls(ctx, new Drift(ctx)).attach();
  const press = (key: string, options: { code?: string; repeat?: boolean; meta?: boolean; target?: unknown } = {}) => {
    const event = {
      key,
      code: options.code ?? key,
      repeat: options.repeat ?? false,
      metaKey: options.meta ?? false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: options.target ?? canvas,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    listeners.get('keydown')!(event);
    return event;
  };
  const release = (code: string) => listeners.get('keyup')!({ key: code, code, target: canvas });
  return { press, release, ctx, host };
}

describe('touches capturées par un mode (sujet 467)', () => {
  beforeEach(() => {
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('une touche prise ne se répète pas tant qu’elle est tenue ; relâchée, elle repart', () => {
    const keys: string[] = [];
    const { press, release } = keyboard((key) => (keys.push(key), key === 'ArrowLeft'));
    expect(press('ArrowLeft').defaultPrevented).toBe(true);
    expect(press('ArrowLeft', { repeat: true }).defaultPrevented).toBe(true);
    expect(press('ArrowLeft', { repeat: true }).defaultPrevented).toBe(true);
    expect(keys).toEqual(['ArrowLeft']);
    release('ArrowLeft');
    press('ArrowLeft');
    expect(keys).toEqual(['ArrowLeft', 'ArrowLeft']);
  });

  it('une touche que le mode ne prend pas revient à la vue (Espace : déplacement de la caméra)', () => {
    const { press, ctx } = keyboard(() => false);
    press(' ', { code: 'Space' });
    expect(ctx.spaceDown).toBe(true);
  });

  it('tout sélectionner sur la zone de dessin : rien, ni le navigateur ; les touches modifiées ne vont pas au mode', () => {
    const keys: string[] = [];
    const { press, host } = keyboard((key) => (keys.push(key), true));
    expect(press('a', { code: 'KeyA', meta: true }).defaultPrevented).toBe(true);
    expect(host.selectAll).not.toHaveBeenCalled();
    expect(keys).toEqual([]);
  });

  it('Espace et Entrée sur un bouton de l’appli l’activent, sans aller au mode', () => {
    const keys: string[] = [];
    const { press } = keyboard((key) => (keys.push(key), true));
    const button = new FakeElement('BUTTON');
    expect(press(' ', { code: 'Space', target: button }).defaultPrevented).toBe(false);
    expect(press('Enter', { target: button }).defaultPrevented).toBe(false);
    press('1', { code: 'Digit1', target: button });
    expect(keys).toEqual(['1']);
  });
});
