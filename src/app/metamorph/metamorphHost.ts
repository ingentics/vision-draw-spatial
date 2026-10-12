import type { Engine } from '../../engine';
import { createMockMetamorphServer, METAMORPH_LIBRARY } from './metamorphServer';

/**
 * Branchement des Metamorph (sujet 538) entre le moteur et le serveur (mocké) : formes acceptées chargées au démarrage
 * comme une bibliothèque de formes, demandes du moteur transmises au serveur, proposition choisie gardée par le serveur
 * puis posée. Un serveur pour toute l'appli : ses propositions survivent au rechargement du moteur en dev.
 */
const server = createMockMetamorphServer();

export { METAMORPH_LIBRARY };

/** Charge les formes acceptées dans le moteur et répond à ses demandes de propositions. */
export function installMetamorph(engine: Engine): void {
  const registerAccepted = async () => {
    const json = await server.library();
    if (json === undefined) return;
    const result = engine.registerShapes(json);
    if (!result.ok) console.error('Formes Metamorph refusées', result.errors);
  };
  void registerAccepted();
  engine.on('shapesMissing', (missing) => {
    if (missing.some((shape) => shape.library === METAMORPH_LIBRARY)) void registerAccepted();
  });
  engine.on('metamorphRequest', async (request) => {
    const json = await server.generate(request);
    const result = engine.metamorphResults(request.shapeId, json);
    // Refus attendu si la forme n'attend plus (annuler, « Réessayer » entre-temps) : rien à montrer.
    if (!result.ok) console.info('Propositions Metamorph ignorées', result.errors);
  });
}

/** Proposition choisie : gardée par le serveur, sa bibliothèque rechargée, puis la Metamorph remplacée par elle. */
export async function acceptMetamorph(engine: Engine, shapeId: string, candidateId: string): Promise<void> {
  const json = await server.accept(candidateId);
  const result = json === undefined ? undefined : engine.registerShapes(json);
  if (!result?.ok) {
    console.error('Forme Metamorph refusée', result?.errors);
    return;
  }
  engine.acceptMetamorph(shapeId, `${METAMORPH_LIBRARY}:${candidateId}`);
}
