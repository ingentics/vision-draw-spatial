import { useEffect, useRef, useState } from 'react';
import { Engine } from '../engine/Engine';
import type { InitialView, ViewSettings } from '../engine/Engine';
import type { FontSet } from '../engine/render/troikaText';

export interface DrawioSpatialProps {
  /** Contenu XML draw.io à afficher. */
  xml?: string;
  /** Identifiant stable du fichier (persistance, cache). */
  fileId?: string;
  fonts?: FontSet;
  /** Réglages de vue appliqués à la création du moteur (ensuite : `engine.setViewSettings`). */
  view?: Partial<ViewSettings>;
  /** Mini-carte (SPEC §10) : visible ou repliée, largeur en pixels CSS. */
  minimap?: { visible: boolean; size?: number };
  /** Bouton de la mini-carte ou touche M : l'hôte change `minimap.visible`. */
  onMinimapToggle?: () => void;
  /** Page et caméra à restaurer au chargement du fichier. */
  initialView?: InitialView;
  className?: string;
  /** Donne accès au moteur (navigation, état de caméra…). Appelé avec `undefined` au démontage. */
  onEngine?: (engine: Engine | undefined) => void;
  onError?: (error: unknown) => void;
}

/** Coquille React fine autour du moteur (SPEC §3.2). */
export function DrawioSpatial({
  xml,
  fileId = 'inline',
  fonts,
  view,
  minimap = { visible: true },
  onMinimapToggle,
  initialView,
  className,
  onEngine,
  onError,
}: DrawioSpatialProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const onMinimapToggleRef = useRef(onMinimapToggle);
  onMinimapToggleRef.current = onMinimapToggle;
  const [engine, setEngine] = useState<Engine>();

  // Les polices ne sont lues qu'à la création du moteur.
  const fontsRef = useRef(fonts);
  const viewRef = useRef(view);
  const onEngineRef = useRef(onEngine);
  onEngineRef.current = onEngine;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  // Lue au chargement d'un fichier seulement : changer la vue ne recharge pas le fichier.
  const initialViewRef = useRef(initialView);
  initialViewRef.current = initialView;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const instance = new Engine({ canvas, fonts: fontsRef.current, view: viewRef.current });
    setEngine(instance);
    onEngineRef.current?.(instance);
    return () => {
      onEngineRef.current?.(undefined);
      instance.dispose();
    };
  }, []);

  // Touche M (émise par le moteur).
  useEffect(() => engine?.on('minimapToggle', () => onMinimapToggleRef.current?.()), [engine]);

  useEffect(() => {
    const canvas = minimapRef.current;
    if (!engine || !canvas || !minimap.visible) return;
    return engine.attachMinimap(canvas, minimap.size);
  }, [engine, minimap.visible, minimap.size]);

  useEffect(() => {
    if (!engine || xml === undefined) return;
    engine.load(xml, fileId, initialViewRef.current).catch((error: unknown) => onErrorRef.current?.(error));
  }, [engine, xml, fileId]);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div className="drawio-minimap" style={{ position: 'absolute', right: 12, bottom: 12 }}>
        {minimap.visible ? (
          <>
            <canvas ref={minimapRef} aria-label="Mini-carte : cliquer ou glisser pour se déplacer" />
            {onMinimapToggle && (
              <button
                type="button"
                className="drawio-minimap-toggle"
                aria-label="Masquer la mini-carte (M)"
                title="Masquer la mini-carte (M)"
                onClick={onMinimapToggle}
              >
                ×
              </button>
            )}
          </>
        ) : (
          onMinimapToggle && (
            <button
              type="button"
              className="drawio-minimap-show"
              title="Afficher la mini-carte (M)"
              onClick={onMinimapToggle}
            >
              Mini-carte
            </button>
          )
        )}
      </div>
    </div>
  );
}
