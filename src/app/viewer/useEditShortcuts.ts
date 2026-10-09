import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { Engine } from '../../engine';

/**
 * Raccourcis d'édition de l'appli, hors du canvas : Ctrl+S / ⌘S sauvegarde (plutôt que l'enregistrement de la page
 * par le navigateur) ; Ctrl+Z annule, Ctrl+Maj+Z ou Ctrl+Y rétablit, Ctrl+D duplique, copier / couper / coller (hors
 * saisie dans un champ).
 */
export function useEditShortcuts(engineRef: MutableRefObject<Engine | undefined>, saveFile: () => void) {
  useEffect(() => {
    // Raccourci presse-papier en attente de son événement natif (`copy`, `cut`, `paste`).
    let pending: 'c' | 'x' | 'v' | undefined;
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        saveFile();
        return;
      }
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
      if (typing) return;
      if (key === 'd' && !event.shiftKey) {
        event.preventDefault();
        engineRef.current?.duplicateSelection();
        return;
      }
      if ((key === 'c' || key === 'x' || key === 'v') && !event.shiftKey && !window.getSelection()?.toString()) {
        // Repli si le navigateur n'émet pas l'événement natif hors d'un champ : presse-papier
        // interne (et écriture asynchrone dans celui du système, si elle est permise).
        pending = key;
        window.setTimeout(() => {
          if (pending !== key) return;
          pending = undefined;
          const engine = engineRef.current;
          if (key === 'v') {
            engine?.paste();
            return;
          }
          const xml = key === 'x' ? engine?.cutSelection() : engine?.copySelection();
          if (xml !== undefined) navigator.clipboard?.writeText(xml).catch(() => undefined);
        }, 50);
        return;
      }
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) engineRef.current?.redo();
      else engineRef.current?.undo();
    };
    // Copier / couper / coller (ticket 59) : presse-papier système au format draw.io, sauf dans un
    // champ ou sur un texte sélectionné dans l'interface (copie native du navigateur).
    const nativeClipboard = (event: ClipboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
      return typing || !!window.getSelection()?.toString();
    };
    const onCopy = (event: ClipboardEvent) => {
      pending = undefined;
      if (nativeClipboard(event)) return;
      const engine = engineRef.current;
      const xml = event.type === 'cut' ? engine?.cutSelection() : engine?.copySelection();
      if (xml === undefined) return;
      event.clipboardData?.setData('text/plain', xml);
      event.preventDefault();
    };
    const onPaste = (event: ClipboardEvent) => {
      pending = undefined;
      if (nativeClipboard(event)) return;
      const text = event.clipboardData?.getData('text/plain');
      if (engineRef.current?.paste(text || undefined)) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('copy', onCopy);
    window.addEventListener('cut', onCopy);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('cut', onCopy);
      window.removeEventListener('paste', onPaste);
    };
  }, [saveFile, engineRef]);
}
