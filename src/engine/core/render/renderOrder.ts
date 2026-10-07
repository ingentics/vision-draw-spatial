import type { Object3D } from 'three';

/**
 * Le fond reste juste sous son texte, mais au-dessus du trait de l'élément, quel que soit l'ordre de
 * dessin donné au texte ensuite. Le fond n'existe qu'une fois le texte mis en page (asynchrone) :
 * une copie de l'ordre à cet instant resterait figée, par exemple sur l'ordre « au-dessus du voile »
 * d'une sélection, et le fond masquerait le texte une fois la sélection retirée.
 */
export function followRenderOrder(background: Object3D, text: Object3D, offset = -0.5): void {
  Object.defineProperty(background, 'renderOrder', {
    configurable: true,
    get: () => text.renderOrder + offset,
    // Les changements d'ordre (voile, page) passent par le texte : rien à mémoriser ici.
    set: () => undefined,
  });
}
