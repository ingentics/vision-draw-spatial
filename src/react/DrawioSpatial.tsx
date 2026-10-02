import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, Ref } from 'react';
import { Engine } from '../engine/Engine';
import type { InitialView, Selection, SettingsPatch } from '../engine/Engine';
import type { CameraState } from '../engine/interaction/camera';
import type { DocumentModel, PageModel } from '../engine/model/types';
import type { FileStore } from '../engine/persistence/FileStore';
import type { FontSet } from '../engine/render/troikaText';
import './drawio-spatial.css';

/** Actions disponibles par la `ref` du composant. */
export interface DrawioSpatialHandle {
  /** Moteur (navigation, sélection, édition…) ; undefined avant le montage. */
  readonly engine: Engine | undefined;
  /**
   * XML à jour du document (modifications et vue de chaque page comprises), comme Ctrl+S :
   * appelle `onSave` et, avec un `store`, y enregistre le contenu.
   */
  save(): string | undefined;
  undo(): void;
  redo(): void;
}

export interface DrawioSpatialProps {
  /** Contenu XML draw.io à afficher (ou bien `store` + `fileId`). */
  xml?: string;
  /**
   * Bibliothèque de fichiers (SPEC §5) : le fichier `fileId` y est lu, sa vue (page, caméras,
   * historique) y est mémorisée au fil de la navigation, et son contenu y est enregistré à la sauvegarde.
   */
  store?: FileStore;
  /** Identifiant stable du fichier (persistance, cache) ; obligatoire avec `store`. */
  fileId?: string;
  /** Édition à la souris et au clavier (SPEC §14). Désactivée par défaut : visionneuse. */
  editable?: boolean;
  /** Couleur de fond de la vue (CSS), lue à la création du moteur. Défaut : blanc. */
  background?: string;
  /** Polices du texte (Roboto conseillée), lues à la création du moteur. */
  fonts?: FontSet;
  /** Paramètres (SPEC §13), appliqués à la création puis à chaque changement. */
  settings?: SettingsPatch;
  /**
   * Mini-carte (SPEC §10). Sans `onMinimapToggle`, son affichage est géré par le composant
   * (bouton ×, touche M) ; avec, c'est à l'hôte de changer `minimap.visible`.
   */
  minimap?: { visible: boolean; size?: number };
  onMinimapToggle?: () => void;
  /** Page et caméra à restaurer au chargement (sinon, avec `store`, celles mémorisées). */
  initialView?: InitialView;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<DrawioSpatialHandle>;

  /** Accès direct au moteur. Appelé avec `undefined` au démontage. */
  onEngine?: (engine: Engine | undefined) => void;
  onError?: (error: unknown) => void;
  onLoad?: (document: DocumentModel) => void;
  onPageChange?: (page: PageModel) => void;
  onSelectionChange?: (selection: Selection | undefined) => void;
  onCameraChange?: (camera: CameraState) => void;
  /** Modifications non sauvegardées (édition), ou plus après une sauvegarde / un retour en arrière. */
  onModifiedChange?: (modified: boolean) => void;
  /** Sauvegarde demandée (Ctrl+S ou `ref.save()`), avec le XML à jour. */
  onSave?: (xml: string) => void;
}

/** Vue mémorisée du fichier (SPEC §5.3) : enregistrée 500 ms après le dernier changement. */
const STORE_DELAY_MS = 500;

/**
 * Visionneuse / éditeur draw.io spatial (SPEC §3.2) : coquille React fine autour du moteur.
 * Le composant occupe toute la place de son parent (donnez-lui une hauteur).
 */
export function DrawioSpatial(props: DrawioSpatialProps) {
  const {
    xml,
    store,
    fileId = 'inline',
    editable = false,
    fonts,
    settings,
    minimap,
    onMinimapToggle,
    initialView,
    className,
    style,
    ref,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine>();
  const [localMinimap, setLocalMinimap] = useState(true);
  const minimapVisible = minimap?.visible ?? localMinimap;

  // Rappels lus au moment de l'événement (pas de réabonnement à chaque rendu).
  const propsRef = useRef(props);
  propsRef.current = props;
  // Lus à la création du moteur seulement.
  const fontsRef = useRef(fonts);
  const settingsRef = useRef(settings);
  const editableRef = useRef(editable);
  // Lue au chargement d'un fichier seulement : changer la vue ne recharge pas le fichier.
  const initialViewRef = useRef(initialView);
  initialViewRef.current = initialView;

  const toggleMinimap = useCallback(() => {
    const host = propsRef.current.onMinimapToggle;
    if (host) host();
    else setLocalMinimap((visible) => !visible);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const instance = new Engine({
      canvas,
      fonts: fontsRef.current,
      settings: settingsRef.current,
      editable: editableRef.current,
      background: propsRef.current.background,
    });
    setEngine(instance);
    propsRef.current.onEngine?.(instance);
    const subscriptions = [
      instance.on('load', (document) => propsRef.current.onLoad?.(document)),
      instance.on('pageChange', (page) => propsRef.current.onPageChange?.(page)),
      instance.on('selectionChange', (selection) => propsRef.current.onSelectionChange?.(selection)),
      instance.on('cameraChange', (camera) => propsRef.current.onCameraChange?.(camera)),
      instance.on('modifiedChange', (modified) => propsRef.current.onModifiedChange?.(modified)),
      instance.on('minimapToggle', toggleMinimap),
    ];
    return () => {
      for (const unsubscribe of subscriptions) unsubscribe();
      propsRef.current.onEngine?.(undefined);
      instance.dispose();
    };
  }, [toggleMinimap]);

  // Changements de paramètres et de mode après la création du moteur.
  useEffect(() => {
    if (engine && settings && settings !== settingsRef.current) engine.updateSettings(settings);
    settingsRef.current = settings;
  }, [engine, settings]);
  useEffect(() => engine?.setEditable(editable), [engine, editable]);

  useEffect(() => {
    const canvas = minimapRef.current;
    if (!engine || !canvas || !minimapVisible) return;
    return engine.attachMinimap(canvas, minimap?.size);
  }, [engine, minimapVisible, minimap?.size]);

  // Contenu direct.
  useEffect(() => {
    if (!engine || store || xml === undefined) return;
    engine.load(xml, fileId, initialViewRef.current).catch((error: unknown) => propsRef.current.onError?.(error));
  }, [engine, store, xml, fileId]);

  // Fichier d'une bibliothèque : lu, puis sa vue mémorisée au fil de la navigation.
  useEffect(() => {
    if (!engine || !store) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      clearTimeout(timer);
      timer = undefined;
      if (engine.getFileId() !== fileId) return;
      void store.updateMeta(fileId, {
        lastPageId: engine.getCurrentPage()?.id,
        cameraByPage: engine.getPageCameras(),
        history: engine.getHistory(),
        linkUsage: engine.getLinkUsage(),
      });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(persist, STORE_DELAY_MS);
    };
    const flush = () => {
      if (timer) persist();
    };
    const subscriptions = (['pageChange', 'cameraChange', 'historyChange', 'linkUsed'] as const).map((event) =>
      engine.on(event, schedule),
    );
    store
      .get(fileId)
      .then(async (file) => {
        if (cancelled) return;
        if (!file) throw new Error(`Fichier introuvable dans la bibliothèque : ${fileId}`);
        const view = initialViewRef.current ?? {
          pageId: file.lastPageId,
          cameraByPage: file.cameraByPage,
          history: file.history,
          linkUsage: file.linkUsage,
        };
        await engine.load(file.content, fileId, view);
      })
      .catch((error: unknown) => propsRef.current.onError?.(error));
    window.addEventListener('pagehide', flush);
    return () => {
      cancelled = true;
      for (const unsubscribe of subscriptions) unsubscribe();
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [engine, store, fileId]);

  const save = useCallback((): string | undefined => {
    const current = propsRef.current;
    const content = engine?.serialize();
    if (content === undefined) return undefined;
    current.onSave?.(content);
    if (current.store && engine?.getFileId() === (current.fileId ?? 'inline')) {
      void current.store.updateMeta(engine.getFileId()!, { content, size: content.length });
    }
    return content;
  }, [engine]);

  useImperativeHandle(
    ref,
    () => ({
      get engine() {
        return engine;
      },
      save,
      undo: () => engine?.undo(),
      redo: () => engine?.redo(),
    }),
    [engine, save],
  );

  // Raccourcis quand le focus est dans le composant : Ctrl+S, et en édition Ctrl+Z / Ctrl+Maj+Z / Ctrl+Y.
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const target = event.target as HTMLElement;
    if (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
    if (key === 's' && (propsRef.current.onSave || propsRef.current.store)) save();
    else if (editable && key === 'z') event.shiftKey ? engine?.redo() : engine?.undo();
    else if (editable && key === 'y') engine?.redo();
    else return;
    // Traité ici : ni le navigateur ni l'application hôte ne le traitent une seconde fois.
    event.preventDefault();
    event.stopPropagation();
  };

  const canToggle = onMinimapToggle !== undefined || minimap === undefined;
  return (
    <div
      className={className ? `drawio-spatial ${className}` : 'drawio-spatial'}
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
      onKeyDown={onKeyDown}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div className="drawio-minimap" style={{ position: 'absolute', right: 12, bottom: 12 }}>
        {minimapVisible ? (
          <>
            <canvas ref={minimapRef} aria-label="Mini-carte : cliquer ou glisser pour se déplacer" />
            {canToggle && (
              <button
                type="button"
                className="drawio-minimap-toggle"
                aria-label="Masquer la mini-carte (M)"
                title="Masquer la mini-carte (M)"
                onClick={toggleMinimap}
              >
                ×
              </button>
            )}
          </>
        ) : (
          canToggle && (
            <button
              type="button"
              className="drawio-minimap-show"
              title="Afficher la mini-carte (M)"
              onClick={toggleMinimap}
            >
              Mini-carte
            </button>
          )
        )}
      </div>
    </div>
  );
}
