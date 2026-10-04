import { describe, expect, it } from 'vitest';
import { encodePlantUml, plantUmlUrls } from '../../src/app/modes/sequences/plantumlServer';

describe('encodage PlantUML des URL (sujet 90)', () => {
  it('donne le code de l’exemple de PlantUML', async () => {
    expect(await encodePlantUml('Bob -> Alice : hello')).toBe('SyfFKj2rKt3CoKnELR1Io4ZDoSa70000');
  });

  it('construit le rendu SVG et la page de l’éditeur', async () => {
    const { svg, editor } = await plantUmlUrls('Bob -> Alice : hello');
    expect(svg).toBe('https://www.plantuml.com/plantuml/svg/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000');
    expect(editor).toBe('https://www.plantuml.com/plantuml/uml/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000');
  });
});
