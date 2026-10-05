import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoredFile, StoredFileMeta } from '../engine/persistence/FileStore';
import { DEFAULT_SETTINGS, mergeSettings } from '../engine/settings';
import type { Settings, SettingsPatch } from '../engine/settings';
import { Launcher } from '../react/Launcher';
import { demoFiles } from './demoFiles';
import { desktop } from './desktop';
import { createNewFile, importFile, openDemo, openFromDialog, openPath, openStored, store } from './fileLibrary';
import { loadSettings, saveSettings } from './settingsStore';
import { getCurrentFileId, setCurrentFileId } from './tabSession';
import { Viewer } from './Viewer';

const EXAMPLES = demoFiles.map(({ id, name }) => ({ id, name }));

/** Application de démonstration : lanceur (SPEC §6) ou visionneuse du fichier ouvert. */
export function App() {
  const [current, setCurrent] = useState<StoredFile>();
  const [recents, setRecents] = useState<StoredFileMeta[]>([]);
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Paramètres (SPEC §13) : partagés entre fichiers, persistés dans le navigateur.
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const updateSettings = useCallback((patch: SettingsPatch) => {
    setSettings((current) => {
      const next = mergeSettings(current, patch);
      saveSettings(next);
      return next;
    });
  }, []);
  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Lu à chaque rafraîchissement (pas de dépendance : les rappels qui l'utilisent restent stables).
  const recentLimit = useRef(settings.save.recentLimit);
  recentLimit.current = settings.save.recentLimit;
  const refreshRecents = useCallback(() => {
    store.listRecent(recentLimit.current).then(setRecents, () => setRecents([]));
  }, []);

  const show = useCallback((file: StoredFile) => {
    setError(undefined);
    setCurrentFileId(file.id);
    setCurrent(file);
  }, []);

  /** Ouvre un fichier ; en cas d'échec, revient au lanceur avec le message. */
  const open = useCallback(
    async (label: string, task: () => Promise<StoredFile | undefined>) => {
      try {
        const file = await task();
        if (file) show(file);
      } catch (cause) {
        setCurrent(undefined);
        setCurrentFileId(undefined);
        setError(`Impossible d’ouvrir « ${label} » : ${cause instanceof Error ? cause.message : String(cause)}`);
        refreshRecents();
      }
    },
    [show, refreshRecents],
  );

  // Appli native : un fichier déposé garde son chemin (il sera réécrit à la sauvegarde).
  const openFromDisk = useCallback(
    (file: File) =>
      void open(file.name, async () => {
        const path = await desktop?.pathForFile(file);
        return path ? openPath(path, await file.text()) : importFile(file.name, await file.text());
      }),
    [open],
  );

  // Au démarrage : le fichier de cet onglet s'il y en a un (rechargement), sinon le lanceur.
  useEffect(() => {
    const id = getCurrentFileId();
    const restore = id ? openStored(id).catch(() => undefined) : Promise.resolve(undefined);
    void restore.then((file) => {
      if (file) show(file);
      else {
        setCurrentFileId(undefined);
        refreshRecents();
      }
      setReady(true);
    });
  }, [show, refreshRecents]);

  // Glisser-déposer d'un fichier n'importe où dans la fenêtre (lanceur comme visionneuse).
  const depth = useRef(0);
  useEffect(() => {
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current++;
      setDragging(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) openFromDisk(file);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [openFromDisk]);

  const showLauncher = () => {
    setCurrentFileId(undefined);
    setCurrent(undefined);
    refreshRecents();
  };

  if (!ready) return null;

  return (
    <>
      {current ? (
        <Viewer
          key={current.id}
          file={current}
          onShowFiles={showLauncher}
          onFileReplaced={show}
          settings={settings}
          onSettingsChange={updateSettings}
          onResetSettings={resetSettings}
        />
      ) : (
        <Launcher
          recents={recents}
          examples={EXAMPLES}
          error={error}
          onOpenRecent={(id) => void open(recents.find((f) => f.id === id)?.name ?? id, () => openStored(id))}
          onRemoveRecent={(id) => void store.remove(id).then(refreshRecents)}
          onOpenFile={openFromDisk}
          onOpenDialog={desktop ? () => void open('fichier', openFromDialog) : undefined}
          onNewFile={() => void open('Nouveau fichier', createNewFile)}
          onOpenExample={(id) => {
            const demo = demoFiles.find((f) => f.id === id);
            if (demo) void open(demo.name, () => openDemo(demo));
          }}
        />
      )}
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div>Déposez le fichier .drawio pour l’ouvrir</div>
        </div>
      )}
    </>
  );
}
