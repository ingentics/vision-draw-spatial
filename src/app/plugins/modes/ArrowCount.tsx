/** Nombre de flèches d'une ligne de liste d'un mode (flux, histoire), avec sa bulle. */
export function ArrowCount({ count }: { count: number }) {
  return (
    <span className="field-value" data-tip={`${count} flèche${count > 1 ? 's' : ''}`}>
      {count}
    </span>
  );
}
