import { describe, expect, it } from 'vitest';
import { encodePlantUml, plantUmlUrls } from '../../../src/app/export/plantumlServer';

describe('encodage PlantUML des URL (sujet 90)', () => {
  it('donne le code de l’exemple de PlantUML', async () => {
    expect(await encodePlantUml('Bob -> Alice : hello')).toBe('SyfFKj2rKt3CoKnELR1Io4ZDoSa70000');
  });

  it('construit le rendu SVG (kroki.io) et la page de l’éditeur (plantuml.com)', async () => {
    const { svg, editor } = await plantUmlUrls('Bob -> Alice : hello');
    expect(svg).toBe('https://kroki.io/plantuml/svg/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000');
    expect(editor).toBe('https://www.plantuml.com/plantuml/uml/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000');
  });

  it('rend par le moteur choisi dans les paramètres (sujet 100)', async () => {
    const code = 'SyfFKj2rKt3CoKnELR1Io4ZDoSa70000';
    const url = async (renderer: 'kroki' | 'plantuml' | 'local') =>
      (await plantUmlUrls('Bob -> Alice : hello', { renderer, localUrl: 'http://localhost:9000' })).svg;
    expect(await url('kroki')).toBe(`https://kroki.io/plantuml/svg/${code}`);
    expect(await url('plantuml')).toBe(`https://www.plantuml.com/plantuml/svg/${code}`);
    expect(await url('local')).toBe(`http://localhost:9000/svg/${code}`);
  });
});
