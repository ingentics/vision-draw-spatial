import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { isFilePath } from '../../engine';
import type { Engine, Settings, StoredFile } from '../../engine';
import { desktop } from '../desktop';
import { canWrite, requestWrite, writeDiskFile } from '../diskFile';
import { saveAs, store } from '../fileLibrary';

/**
 * Sauvegardes du fichier affiché : état de consultation (SPEC §5.3 : page, caméras, historique, liens suivis) peu
 * après le dernier changement et à la fermeture ; XML enregistré (SPEC §14.1) dans la bibliothèque, le fichier du
 * disque, un téléchargement ou le vrai fichier de l'appli native.
 */
export function useFileSaving({
  file,
  engineRef,
  settingsRef,
  onFileReplaced,
  setError,
}: {
  file: StoredFile;
  engineRef: MutableRefObject<Engine | undefined>;
  settingsRef: MutableRefObject<Settings>;
  onFileReplaced?: (file: StoredFile) => void;
  setError: (error: string | undefined) => void;
}) {
  const [autosavedAt, setAutosavedAt] = useState<number>();
  /** Sauvegarde automatique en cours d'écriture (texte d'état de la barre d'outils). */
  const [autosaving, setAutosaving] = useState(false);
  /** Navigateur : fichier du disque ouvert, sa date de modification suivie au fil des écritures. */
  const diskRef = useRef(desktop ? undefined : file.disk);
  /** Écriture sur le disque non autorisée : avertissement dans la barre d'outils, un clic la demande. */
  const [diskBlocked, setDiskBlocked] = useState(false);

  // --- Persistance de l'état de consultation -------------------------------
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    const instance = engineRef.current;
    if (!instance || instance.getFileId() !== file.id) return;
    void store.updateMeta(file.id, {
      lastPageId: instance.getCurrentPage()?.id,
      cameraByPage: instance.getPageCameras(),
      history: instance.getHistory(),
      linkUsage: instance.getLinkUsage(),
    });
  }, [file.id, engineRef]);
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    // SPEC §5.3 : état de consultation sauvegardé peu après le dernier changement, et à la fermeture.
    saveTimer.current = setTimeout(save, settingsRef.current.save.viewStateDelayMs);
  }, [save, settingsRef]);
  const flush = useCallback(() => {
    if (saveTimer.current) save();
  }, [save]);

  useEffect(() => {
    const onHide = () => {
      if (window.document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  // Navigateur : l'autorisation d'écrire ne survit pas toujours au rechargement ; on prévient dès l'ouverture.
  useEffect(() => {
    const disk = diskRef.current;
    if (disk)
      void canWrite(disk).then(
        (ok) => setDiskBlocked(!ok),
        () => setDiskBlocked(true),
      );
  }, []);

  /**
   * Navigateur : réécrit le fichier du disque d'où il a été ouvert. `ask` (geste de l'utilisateur) demande
   * l'autorisation au besoin ; sinon, sans autorisation, l'avertissement s'affiche et rien n'est écrit.
   */
  const writeDisk = useCallback(
    async (xml: string, ask: boolean) => {
      const disk = diskRef.current;
      if (!disk) return;
      if (!(await (ask ? requestWrite(disk) : canWrite(disk)))) {
        setDiskBlocked(true);
        return;
      }
      setDiskBlocked(false);
      diskRef.current = { ...disk, modifiedAt: await writeDiskFile(disk, xml) };
      await store.updateMeta(file.id, { disk: diskRef.current });
    },
    [file.id],
  );

  /**
   * Enregistre le XML sauvegardé (SPEC §14.1) : navigateur → bibliothèque, plus le fichier du disque s'il en
   * vient (étape 354), sinon téléchargement si demandé ; appli native → le vrai fichier (un exemple embarqué :
   * « Enregistrer sous » si demandé, sinon sa copie dans la bibliothèque).
   */
  const persist = useCallback(
    (xml: string, auto: boolean) => {
      save();
      const report = (cause: unknown) =>
        setError(`Sauvegarde impossible : ${cause instanceof Error ? cause.message : String(cause)}`);
      if (desktop && !isFilePath(file.id) && !auto) {
        void saveAs(xml, file.name).then((saved) => saved && onFileReplaced?.(saved));
        return;
      }
      if (!desktop && !diskRef.current && !auto) download(file.name.split('/').pop() || 'diagram.drawio', xml);
      if (auto) setAutosaving(true);
      // Bibliothèque et disque à part : un refus d'écrire sur le disque garde la copie de la bibliothèque.
      Promise.all([store.updateMeta(file.id, { content: xml, size: xml.length }), writeDisk(xml, !auto)])
        .then(() => {
          setError(undefined);
          if (auto) setAutosavedAt(Date.now());
        }, report)
        .finally(() => auto && setAutosaving(false));
    },
    [file.id, file.name, save, onFileReplaced, writeDisk, setError],
  );

  /** Sauvegarde demandée (bouton, Ctrl+S hors du canvas). */
  const saveFile = useCallback(() => {
    const instance = engineRef.current;
    if (!instance || instance.getFileId() !== file.id) return;
    const xml = instance.serialize();
    if (xml !== undefined) persist(xml, false);
  }, [file.id, persist, engineRef]);

  return {
    scheduleSave,
    flush,
    persist,
    saveFile,
    /** Ouvert d'un fichier du disque (navigateur) : « Enregistrer » le réécrit. */
    onDisk: diskRef.current !== undefined,
    diskBlocked,
    autosaving,
    autosavedAt,
  };
}

/** Propose le fichier au téléchargement (sous son nom d'origine). */
function download(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/xml' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
