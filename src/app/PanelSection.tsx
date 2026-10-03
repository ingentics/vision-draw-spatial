import type { ReactNode } from 'react';

/** Section d'un panneau latéral (carte avec titre), comme dans les paramètres. */
export function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** Sous-section (liseré à gauche, titre plus discret). */
export function Subsection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="settings-subsection">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
