import type { CSSProperties } from 'react';
import { SIMULATION_COLOR, proposedRules } from '../../../../engine/plugins/modes/states/api';
import type { StateSimulation } from '../../../../engine/plugins/modes/states/api';

/**
 * Règles de gestion des transitions proposées (sujet 528), au-dessus de la barre de la simulation : pour chacune qui en
 * a, la pastille de son numéro, son nom, puis ses règles. Rien si aucune n'en a.
 */
export function SimulationRules({ sim }: { sim: StateSimulation }) {
  const proposed = proposedRules(sim);
  if (proposed.length === 0) return null;
  return (
    <div
      className="simulation-rules"
      aria-label="Règles de gestion des transitions proposées"
      // Couleur de la simulation, celle du moteur : pastilles comme sur le dessin.
      style={{ '--simulation-color': SIMULATION_COLOR } as CSSProperties}
    >
      {proposed.map(({ badge, name, rules }) => (
        <section key={badge}>
          <h4>
            <span className="simulation-badge" data-tip={`Transition ${badge} : taper ${badge} pour la franchir`}>
              {badge}
            </span>
            {name || 'Transition sans nom'}
          </h4>
          <ul>
            {rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
