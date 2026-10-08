import type { ModeInfo } from '../engine';

/** Icône déclarée par un mode (sujet 198) : onglet de sa page, choix du mode de la page. */
export function ModeIcon({
  mode,
  className,
  label,
}: {
  mode: Pick<ModeInfo, 'icon'>;
  className?: string;
  label?: string;
}) {
  if (!mode.icon) return null;
  const { fill, line, accent } = mode.icon;
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {label && <title>{label}</title>}
      {fill && <path className="mode-icon-fill" d={fill} />}
      {line && <path className="mode-icon-line" d={line} />}
      {accent && <path className="mode-icon-accent" d={accent} />}
    </svg>
  );
}
