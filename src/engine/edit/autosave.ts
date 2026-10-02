/**
 * Sauvegarde automatique (SPEC §14.1) : `changed()` à chaque modification ; la sauvegarde a lieu
 * `delayMs` après la dernière, et attend la fin d'un geste en cours (`busy`). `flush()` sauvegarde
 * tout de suite ce qui attend (fermeture, changement de fichier).
 */
export class Autosaver {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly options: {
      delayMs: number;
      /** Vrai s'il y a quelque chose à sauvegarder. */
      pending: () => boolean;
      /** Vrai pendant un geste (glisser) : la sauvegarde est repoussée. */
      busy: () => boolean;
      save: () => void;
    },
  ) {}

  changed(): void {
    clearTimeout(this.timer);
    if (!this.options.pending()) {
      this.timer = undefined;
      return;
    }
    this.timer = setTimeout(this.tick, this.options.delayMs);
  }

  flush(): void {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.options.pending()) this.options.save();
  }

  cancel(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private readonly tick = (): void => {
    this.timer = undefined;
    if (!this.options.pending()) return;
    if (this.options.busy()) {
      this.timer = setTimeout(this.tick, this.options.delayMs);
      return;
    }
    this.options.save();
  };
}
