import type { ShapeLibraryKit } from '../../../../core/plugins';
import { libraryShape } from './libraryShape';
import { unloadedShape } from './unloadedShape';

/** Dessin des bibliothèques de formes (sujets 529, 530), remis au registre par la racine de composition. */
export const libraryKit: ShapeLibraryKit = { build: libraryShape, unloaded: unloadedShape };
