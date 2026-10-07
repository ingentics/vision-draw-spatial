import { createContext, useContext } from 'react';
import type {
  EffectRegistryView,
  ModePropertyView,
  ModeRegistryView,
  ModeScope,
  ModeTarget,
  PageModel,
  ShapeRegistryView,
} from '../engine';

/**
 * Plugins du moteur affiché (sujet 290) : ses registres de formes, de modes et d'effets, en lecture seule (sujet 304), et la règle des flèches gérées
 * par un mode. L'appli ne suppose jamais les registres par défaut : un moteur construit avec d'autres registres est
 * suivi par toute l'interface.
 */
export interface AppPlugins {
  shapes: ShapeRegistryView;
  modes: ModeRegistryView;
  effects: EffectRegistryView;
  /** Flèche gérée par le mode de la page courante (réglages imposés, sujet 265). */
  managesEdge(edgeId: string): boolean;
  /** Ids des effets permis sur la page par son mode (sujet 296 : l'appli n'appelle pas le mode). */
  allowedEffects(page: PageModel): string[];
  /** Réglages déclarés par le mode pour une cible, évalués par le moteur (sujet 294 : l'appli n'appelle pas le mode). */
  modePropertyViews(
    page: PageModel,
    scope: ModeScope,
    target: ModeTarget,
    part?: string,
    palette?: readonly string[],
  ): ModePropertyView[];
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
