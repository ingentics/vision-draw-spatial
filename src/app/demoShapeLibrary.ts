import type { Engine } from '../engine';

/**
 * Bibliothèque de formes d'exemple de l'appli de démo (sujet 531) : deux formes dynamiques, l'une pour les pages sans
 * mode, l'autre pour les pages Machine à états, dans la section « Dynamic shapes » de la palette. Un vrai hôte la
 * chargerait d'un serveur ; elle est ici dans le code.
 */
const DEMO_LIBRARY = {
  format: 'drawio-spatial/shapes',
  formatVersion: 1,
  library: {
    id: 'demo',
    name: 'Exemple de l’appli',
    description: 'Formes dynamiques d’exemple, fixées dans l’appli de démo',
    meta: { source: 'src/app/demoShapeLibrary.ts' },
  },
  categories: [{ id: 'dynamic', name: 'Dynamic shapes', order: 100 }],
  shapes: [
    {
      id: 'server',
      category: 'dynamic',
      name: 'Serveur',
      description: 'Baie aux coins coupés, trois tiroirs',
      keywords: ['serveur', 'baie', 'rack', 'dynamique'],
      size: { width: 100, height: 70 },
      style: 'fillColor=#dae8fc;strokeColor=#6c8ebf;whiteSpace=wrap;html=1;verticalAlign=bottom;',
      value: 'Serveur',
      render: {
        outline: [
          [0.1, 0],
          [0.9, 0],
          [1, 0.15],
          [1, 1],
          [0, 1],
          [0, 0.15],
        ],
        details: [
          {
            path: [
              [0.12, 0.25],
              [0.88, 0.25],
            ],
          },
          {
            path: [
              [0.12, 0.42],
              [0.88, 0.42],
            ],
          },
          {
            path: [
              [0.12, 0.59],
              [0.88, 0.59],
            ],
          },
        ],
        depth: 48,
      },
    },
    {
      id: 'token',
      category: 'dynamic',
      name: 'Jeton',
      description: 'Hexagone et losange, proposé sur les pages Machine à états',
      keywords: ['jeton', 'token', 'dynamique'],
      size: { width: 80, height: 60 },
      style: 'fillColor=#fff2cc;strokeColor=#d6b656;whiteSpace=wrap;html=1;',
      modes: ['states'],
      render: {
        outline: [
          [0.25, 0],
          [0.75, 0],
          [1, 0.5],
          [0.75, 1],
          [0.25, 1],
          [0, 0.5],
        ],
        details: [
          {
            path: [
              [0.5, 0.2],
              [0.7, 0.5],
              [0.5, 0.8],
              [0.3, 0.5],
            ],
            closed: true,
          },
        ],
      },
    },
  ],
};

/**
 * Charge la bibliothèque d'exemple dans le moteur et répond à ses demandes (`shapesMissing`) : l'exemple est
 * rechargé, toute autre bibliothèque est déclarée introuvable.
 */
export function installDemoShapeLibrary(engine: Engine): void {
  const result = engine.registerShapes(DEMO_LIBRARY);
  if (!result.ok) console.error('Bibliothèque d’exemple refusée', result.errors);
  engine.on('shapesMissing', (missing) => {
    if (missing.some((shape) => shape.library === DEMO_LIBRARY.library.id)) engine.registerShapes(DEMO_LIBRARY);
    const others = new Set(missing.map((shape) => shape.library).filter((id) => id !== DEMO_LIBRARY.library.id));
    if (others.size > 0) engine.markShapesUnavailable([...others].map((library) => ({ library })));
  });
}
