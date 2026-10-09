import type { ReactNode } from 'react';

/** Arbre des catégories des paramètres et recherche, lus sur le texte affiché par les sections. */

/**
 * Nœud de l'arbre des catégories : une section, l'une de ses sous-sections, ou l'un des groupes d'une sous-section
 * (rangs dans le panneau).
 */
export interface SettingsNode {
  section: number;
  subsection?: number;
  group?: number;
}

/** Arbre des catégories, lu sur les titres affichés ; `shown` : nœud gardé par la recherche. */
interface TreeNode {
  title: string;
  shown: boolean;
}
export interface TreeSection extends TreeNode {
  subsections: Array<TreeNode & { groups: TreeNode[] }>;
}

/** Clé d'un nœud dépliable : la section, ou la sous-section (« 3.1 »). */
export const keyOf = (section: number, subsection?: number) =>
  subsection === undefined ? `${section}` : `${section}.${subsection}`;

/** Clés des nœuds à déplier pour montrer `node` dans l'arbre, et ses enfants. */
export const keysOf = ({ section, subsection }: SettingsNode) =>
  subsection === undefined ? [keyOf(section)] : [keyOf(section), keyOf(section, subsection)];

// ---------------------------------------------------------------------------
// Recherche

/** Texte comparable : minuscules, sans accents ni apostrophes typographiques. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .trim();
}

/**
 * Masque les sections dont le texte ne contient pas la recherche. Dans une section dont le titre
 * ne correspond pas, seules les sous-sections qui correspondent restent (avec le reste de la
 * section si lui-même correspond). Renvoie vrai si au moins une section reste affichée.
 */
export function filterSections(root: HTMLElement, query: string): boolean {
  const needle = normalizeSearch(query);
  const matches = (element: Element | null) => !!element && normalizeSearch(searchText(element)).includes(needle);
  let any = false;
  for (const section of sectionsOf(root)) {
    const subsections = subsectionsOf(section);
    // L'aperçu d'une section suit la section, son texte (dessin) n'est pas cherché.
    const loose = looseOf(section).filter((child) => !isSectionPreview(child));
    const whole = !needle || matches(section.querySelector(':scope > h3'));
    const looseMatch = loose.some((child) => matches(child));
    let shown = whole || looseMatch;
    for (const subsection of subsections) {
      const visible = whole || matches(subsection);
      subsection.hidden = !visible;
      shown ||= visible;
      // Groupes : tous si la section ou le titre de la sous-section correspond, sinon ceux qui correspondent.
      const all = whole || matches(subsection.querySelector(':scope > h4'));
      const inner = looseOf(subsection);
      const innerMatch = inner.some((child) => matches(child));
      for (const group of groupsOf(subsection)) group.hidden = !(all || matches(group));
      if (groupsOf(subsection).length > 0) for (const child of inner) child.hidden = !(all || innerMatch);
    }
    for (const child of loose) child.hidden = !(whole || looseMatch);
    for (const child of looseOf(section).filter(isSectionPreview)) child.hidden = !shown;
    section.hidden = !shown;
    any ||= shown;
  }
  return any;
}

/** Texte cherché d'un élément : sans celui des aperçus (sujets 320, 321), qui ne sont que des dessins. */
function searchText(element: Element): string {
  if (!element.querySelector('.settings-preview')) return element.textContent ?? '';
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('.settings-preview').forEach((preview) => preview.remove());
  return copy.textContent ?? '';
}

export const sectionsOf = (root: HTMLElement | null) => [
  ...(root?.querySelectorAll<HTMLElement>(':scope > .settings-section') ?? []),
];
export const subsectionsOf = (section: HTMLElement | undefined) => [
  ...(section?.querySelectorAll<HTMLElement>(':scope > .settings-subsection') ?? []),
];
export const groupsOf = (subsection: HTMLElement | undefined) => [
  ...(subsection?.querySelectorAll<HTMLElement>(':scope > .settings-subsubsection') ?? []),
];
/**
 * Contenu d'une section (ou d'une sous-section) hors sous-sections (ou groupes) et titre : réglages posés directement
 * dedans.
 */
const looseOf = (parent: HTMLElement) =>
  [...parent.children].filter(
    (child) =>
      !child.classList.contains('settings-subsection') &&
      !child.classList.contains('settings-subsubsection') &&
      child.tagName !== 'H3' &&
      child.tagName !== 'H4',
  ) as HTMLElement[];

/** Aperçu commun aux sous-sections d'une section (sujet 320), posé en bas de la section. */
export function SectionPreview({ children }: { children: ReactNode }) {
  return <div className="settings-section-preview">{children}</div>;
}

const isSectionPreview = (element: HTMLElement) => element.classList.contains('settings-section-preview');

/** N'affiche que le nœud choisi : la section entière, ou une seule de ses sous-sections. Vrai s'il existe. */
export function showNode(root: HTMLElement, node: SettingsNode): boolean {
  let found = false;
  sectionsOf(root).forEach((section, i) => {
    const subsections = subsectionsOf(section);
    const visible =
      i === node.section &&
      (node.subsection === undefined ||
        (node.subsection < subsections.length &&
          (node.group === undefined || node.group < groupsOf(subsections[node.subsection]).length)));
    section.hidden = !visible;
    found ||= visible;
    subsections.forEach((subsection, j) => {
      subsection.hidden = node.subsection !== undefined && j !== node.subsection;
      // Sous-sous-sections : chacune sur sa page seulement ; la page de leur sous-section n'a que ses propres réglages.
      const chosen = j === node.subsection && node.group !== undefined;
      groupsOf(subsection).forEach((group, k) => {
        group.hidden = !chosen || k !== node.group;
      });
      if (groupsOf(subsection).length > 0) for (const child of looseOf(subsection)) child.hidden = chosen;
    });
    // L'aperçu de la section (sujet 320) reste sous chacune de ses sous-sections.
    for (const child of looseOf(section)) child.hidden = node.subsection !== undefined && !isSectionPreview(child);
  });
  return found;
}

/** Arbre des catégories d'après les titres affichés ; avec une recherche, les nœuds masqués par elle. */
export function readTree(root: HTMLElement, searching: boolean): TreeSection[] {
  const title = (element: Element | null) => element?.textContent?.trim() ?? '';
  return sectionsOf(root).map((section) => ({
    title: title(section.querySelector(':scope > h3')),
    shown: !searching || !section.hidden,
    subsections: subsectionsOf(section).map((subsection) => ({
      title: title(subsection.querySelector(':scope > h4')),
      shown: !searching || !subsection.hidden,
      groups: groupsOf(subsection).map((group) => ({
        title: title(group.querySelector(':scope > h5')),
        shown: !searching || !group.hidden,
      })),
    })),
  }));
}

/** Ligne de l'arbre des catégories : flèche pour déplier (si le nœud a des enfants) et titre à choisir. */
export function TreeRow({
  title,
  selected,
  expandable = false,
  expanded = false,
  searching,
  onToggle,
  onChoose,
}: {
  title: string;
  selected: boolean;
  expandable?: boolean;
  expanded?: boolean;
  searching: boolean;
  onToggle?: () => void;
  onChoose: () => void;
}) {
  return (
    <div className={selected ? 'settings-tree-row selected' : 'settings-tree-row'}>
      {expandable ? (
        <button
          type="button"
          className="settings-tree-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? 'Replier' : 'Déplier'}
          disabled={searching}
          onClick={onToggle}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>
      ) : (
        <span className="settings-tree-toggle" />
      )}
      <button type="button" className="settings-tree-label" aria-current={selected} onClick={onChoose}>
        {title}
      </button>
    </div>
  );
}
