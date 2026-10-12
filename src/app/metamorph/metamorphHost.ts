import type { Engine } from '../../engine';
import { createMockMetamorphServer, METAMORPH_LIBRARY } from './metamorphServer';
import type { MetamorphServer } from './metamorphServer';

/**
 * Branchement des Metamorph (sujet 538) entre le moteur et le serveur (mocké) : formes acceptées chargées au démarrage
 * comme une bibliothèque de formes, demandes du moteur transmises au serveur, proposition choisie gardée par le serveur
 * puis posée. Un serveur pour toute l'appli : ses propositions survivent au rechargement du moteur en dev.
 */
const sharedServer = createMockMetamorphServer();

export { METAMORPH_LIBRARY };

/** Charge les formes acceptées dans le moteur et répond à ses demandes de propositions. */
export function installMetamorph(engine: Engine, server: MetamorphServer = sharedServer): void {
  /**
   * Formes acceptées (re)chargées ; celles du document que le serveur ne connaît pas (fichier venu d'un autre
   * navigateur, stockage vidé) sont déclarées introuvables plutôt que de rester « en chargement ».
   */
  const registerAccepted = async (missing: readonly string[] = []) => {
    try {
      const json = await server.library();
      if (json !== undefined) {
        const result = engine.registerShapes(json);
        if (!result.ok) console.error('Formes Metamorph refusées', result.errors);
      }
    } catch (error) {
      console.error('Formes Metamorph indisponibles', error);
    }
    const known = new Set(engine.shapeLibrary(METAMORPH_LIBRARY)?.shapes.map((shape) => shape.id));
    const unknown = missing.filter((kind) => !known.has(kind));
    if (unknown.length > 0) engine.markShapesUnavailable(unknown.map((kind) => ({ library: METAMORPH_LIBRARY, kind })));
  };
  void registerAccepted();
  engine.on('shapesMissing', (missing) => {
    const kinds = missing.filter((shape) => shape.library === METAMORPH_LIBRARY).map((shape) => shape.kind);
    if (kinds.length > 0) void registerAccepted(kinds);
  });
  engine.on('metamorphRequest', async (request) => {
    try {
      const json = await server.generate(request);
      const result = engine.metamorphResults(request.shapeId, json);
      // Refus attendu si la forme n'attend plus (annuler, « Réessayer » entre-temps) : rien à montrer.
      if (!result.ok) console.info('Propositions Metamorph ignorées', result.errors);
    } catch (error) {
      console.error('Génération Metamorph échouée', error);
      engine.metamorphFailed(request.shapeId, 'La génération a échoué : réessayez ou modifiez la description.');
    }
  });
}

/** Proposition choisie : gardée par le serveur, sa bibliothèque rechargée, puis la Metamorph remplacée par elle. */
export async function acceptMetamorph(
  engine: Engine,
  shapeId: string,
  candidateId: string,
  server: MetamorphServer = sharedServer,
): Promise<void> {
  try {
    const json = await server.accept(candidateId);
    const result = json === undefined ? undefined : engine.registerShapes(json);
    if (!result?.ok) {
      console.error('Forme Metamorph refusée', result?.errors);
      return;
    }
    engine.acceptMetamorph(shapeId, `${METAMORPH_LIBRARY}:${candidateId}`);
  } catch (error) {
    console.error('Forme Metamorph non gardée par le serveur', error);
  }
}
