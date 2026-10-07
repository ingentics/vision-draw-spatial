import { createContext, useContext } from 'react';
import type { PageEffectRegistry, PageModeRegistry, ShapeRegistry } from '../engine';

/**
 * Plugins du moteur affiché (sujet 290) : ses registres de formes, de modes et d'effets, et la règle des flèches gérées
 * par un mode. L'appli ne suppose jamais les registres par défaut : un moteur construit avec d'autres registres est
 * suivi par toute l'interface.
 */
export interface AppPlugins {
  shapes: ShapeRegistry;
  modes: PageModeRegistry;
  effects: PageEffectRegistry;
  /** Flèche gérée par le mode de la page courante (réglages imposés, sujet 265). */
  managesEdge(edgeId: string): boolean;
}

export const PluginsContext = createContext<AppPlugins | undefined>(undefined);

/** Plugins du moteur ; undefined tant qu'il n'est pas créé. */
export function usePlugins(): AppPlugins | undefined {
  return useContext(PluginsContext);
}

/** Plugins du moteur, pour un panneau qui n'existe qu'avec un document ouvert (donc un moteur). */
export function useEnginePlugins(): AppPlugins {
  const plugins = useContext(PluginsContext);
  if (!plugins) throw new Error('Panneau affiché sans moteur : PluginsContext manquant.');
  return plugins;
}
