/**
 * Pont entre l'interface et le processus principal (SPEC §5.2, FsStore) : seules ces fonctions
 * sont exposées, sous window.drawioSpatialDesktop. Voir src/app/desktop.ts pour les types.
 */
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('drawioSpatialDesktop', {
  platform: process.platform,
  readLibrary: () => ipcRenderer.invoke('library:read'),
  writeLibrary: (json) => ipcRenderer.invoke('library:write', json),
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  writeFile: (path, content) => ipcRenderer.invoke('file:write', path, content),
  openDialog: () => ipcRenderer.invoke('dialog:open'),
  saveDialog: (defaultName) => ipcRenderer.invoke('dialog:save', defaultName),
  /** Chemin d'un fichier glissé-déposé (vide s'il ne vient pas du disque), autorisé en écriture. */
  async pathForFile(file) {
    const path = webUtils.getPathForFile(file);
    if (!path) return undefined;
    await ipcRenderer.invoke('file:grant', path);
    return path;
  },
});
