import { modeText } from '../../../../core/plugins';
import type { ShapeModel } from '../../../../core/plugins';
import { keys } from '../keys';

/** Contenu d'un état (sujet 433) : texte libre sous son titre, rangé dans `spatial.sm.body` (`modeText`, sujet 448). */
export const BODY_TEXT = modeText(keys, 'body');

/** Partie du contenu (`ModeParts.textAt`) : son texte s'édite sur place ; le texte dessiné porte cette marque. */
export const BODY_PART = 'body';

/** Contenu d'un état ; vide s'il n'en a pas. */
export const stateBody = (shape: ShapeModel): string => BODY_TEXT.read(shape);
