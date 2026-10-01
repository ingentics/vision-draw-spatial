import { useEffect, useRef, useState } from 'react';
import { Engine } from '../engine/Engine';
import type { InitialView } from '../engine/Engine';
import type { FontSet } from '../engine/render/troikaText';

export interface DrawioSpatialProps {
  /** Contenu XML draw.io à afficher. */
  xml?: string;
  /** Identifiant stable du fichier (persistance, cache). */
  fileId?: string;
  fonts?: FontSet;
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
  initialView,
  className,
  onEngine,
  onError,
}: DrawioSpatialProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine>();

  // Les polices ne sont lues qu'à la création du moteur.
  const fontsRef = useRef(fonts);
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
    const instance = new Engine({ canvas, fonts: fontsRef.current });
    setEngine(instance);
    onEngineRef.current?.(instance);
    return () => {
      onEngineRef.current?.(undefined);
      instance.dispose();
    };
  }, []);

  useEffect(() => {
    if (!engine || xml === undefined) return;
    engine.load(xml, fileId, initialViewRef.current).catch((error: unknown) => onErrorRef.current?.(error));
  }, [engine, xml, fileId]);

  return <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />;
}
