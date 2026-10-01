type Handler = (...args: unknown[]) => void;

/** Émetteur d'événements minimal et typé. */
export class Emitter<Events extends Record<string, unknown[]>> {
  private readonly handlers = new Map<keyof Events, Set<Handler>>();

  on<K extends keyof Events>(event: K, handler: (...args: Events[K]) => void): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    const stored = handler as unknown as Handler;
    set.add(stored);
    return () => set.delete(stored);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    for (const handler of this.handlers.get(event) ?? []) handler(...args);
  }

  clear(): void {
    this.handlers.clear();
  }
}
