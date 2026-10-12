import type { PageModel } from '../../../../core/plugins';
import { edgeOf } from '../../../../core/plugins';
import { storyState } from '../stories';
import type { Story } from '../stories';

/**
 * Pas de la simulation des histoires (sujet 534) : les histoires se jouent à la suite, dans l'ordre des numéros. Le
 * premier pas d'une histoire montre la forme de départ de sa flèche numérotée, chaque pas suivant une flèche et sa
 * forme d'arrivée ; un pas qui ne montrerait rien de nouveau est sauté. Ce qui a été montré le reste (accumulation).
 */

export interface Beat {
  story: Story;
  /** Rang du pas dans son histoire, à partir de 0. */
  index: number;
  /** Éléments montrés par ce pas (jamais vide). */
  ids: string[];
  /** Forme à garder dans la vue (forme montrée, sinon la forme de départ de la flèche). */
  focus: string | undefined;
}

/** Pas de toute la page, dans l'ordre. */
export function storyBeats(page: PageModel): Beat[] {
  const shown = new Set<string>();
  const beats: Beat[] = [];
  for (const story of storyState(page).stories) {
    const own: Omit<Beat, 'index' | 'story'>[] = [];
    const show = (ids: (string | undefined)[], focus: string | undefined) => {
      const fresh = ids.filter((id): id is string => id !== undefined && !shown.has(id));
      if (fresh.length === 0) return;
      fresh.forEach((id) => shown.add(id));
      own.push({ ids: fresh, focus });
    };
    const start = edgeOf(page, story.id)?.sourceId;
    show([start], start);
    for (const id of story.edges) {
      const edge = edgeOf(page, id)!;
      show([id, edge.targetId], edge.targetId ?? edge.sourceId);
    }
    own.forEach((beat, index) => beats.push({ ...beat, story, index }));
  }
  return beats;
}

/** Position dans les pas : avancer, reculer, sauter d'une histoire à l'autre ; ce qui est montré au pas courant. */
export class StoryPlayback {
  readonly beats: Beat[];
  private position = 0;

  /** Flèches de chaque histoire et formes qu'elles relient. */
  private readonly storyElements: Map<string, Set<string>>;

  constructor(page: PageModel) {
    this.beats = storyBeats(page);
    this.storyElements = new Map(
      storyState(page).stories.map((story) => [
        story.id,
        new Set(
          story.edges.flatMap((id) => {
            const edge = edgeOf(page, id)!;
            return [id, edge.sourceId, edge.targetId].filter((element) => element !== undefined);
          }),
        ),
      ]),
    );
  }

  /** Pas courant (la simulation n'est ouverte que s'il y en a au moins un). */
  get beat(): Beat {
    return this.beats[this.position]!;
  }

  /** Nombre de pas de l'histoire du pas courant. */
  get storyLength(): number {
    return this.beats.filter((beat) => beat.story === this.beat.story).length;
  }

  /** Éléments montrés : ceux de tous les pas jusqu'au courant. */
  shown(): string[] {
    return this.beats.slice(0, this.position + 1).flatMap((beat) => beat.ids);
  }

  /**
   * Éléments montrés qui appartiennent à l'histoire du pas courant (cadrage), y compris ceux montrés par une histoire
   * précédente (croisement).
   */
  shownInStory(): string[] {
    const own = this.storyElements.get(this.beat.story.id)!;
    return this.shown().filter((id) => own.has(id));
  }

  canNext = (): boolean => this.position < this.beats.length - 1;
  canBack = (): boolean => this.position > 0;
  canNextStory = (): boolean => this.nextStoryStart() !== undefined;

  /** Un pas en avant ; faux sans effet. */
  next(): boolean {
    return this.go(this.position + 1);
  }

  /** Un pas en arrière. */
  back(): boolean {
    return this.go(this.position - 1);
  }

  /** Premier pas de l'histoire suivante. */
  nextStory(): boolean {
    const start = this.nextStoryStart();
    return start !== undefined && this.go(start);
  }

  /** Premier pas de l'histoire en cours, ou de la précédente si on y est déjà. */
  previousStory(): boolean {
    if (this.beat.index > 0) return this.go(this.position - this.beat.index);
    const previous = this.beats[this.position - 1];
    return previous !== undefined && this.go(this.position - 1 - previous.index);
  }

  /** Tout début : premier pas de la première histoire. */
  restart(): boolean {
    return this.go(0);
  }

  private nextStoryStart(): number | undefined {
    const index = this.beats.findIndex((beat, i) => i > this.position && beat.index === 0);
    return index < 0 ? undefined : index;
  }

  private go(position: number): boolean {
    if (position < 0 || position >= this.beats.length || position === this.position) return false;
    this.position = position;
    return true;
  }
}
