/**
 * Processus principal de l'appli native (SPEC §16, Electron). L'interface est l'appli web
 * (`web/`, ou le serveur de dev si DRAWIO_SPATIAL_DEV_URL est défini) ; ce processus ne fait que
 * l'accès aux vrais fichiers, exposé par `preload.cjs` (window.drawioSpatialDesktop).
 */
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const DEV_URL = process.env.DRAWIO_SPATIAL_DEV_URL;
const DRAWIO_FILE = /\.(drawio|xml)$/i;
const FILTERS = [{ name: 'draw.io', extensions: ['drawio', 'xml'] }];

app.setName('Drawio Spatial');

/** Fichiers que l'utilisateur a choisis (dialogues, glisser-déposer) ou déjà ouverts : seuls modifiables. */
const granted = new Set();
const libraryPath = () => path.join(app.getPath('userData'), 'library.json');

async function readLibrary() {
  try {
    return await fs.readFile(libraryPath(), 'utf8');
  } catch {
    return undefined;
  }
}

/** Écriture atomique (fichier temporaire puis renommage) : jamais de bibliothèque à moitié écrite. */
async function writeAtomic(file, content) {
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content, 'utf8');
  await fs.rename(temporary, file);
}

function checkDrawioPath(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file) || !DRAWIO_FILE.test(file)) {
    throw new Error(`Chemin refusé : ${file}`);
  }
}

ipcMain.handle('library:read', () => readLibrary());
ipcMain.handle('library:write', async (_event, json) => {
  if (typeof json !== 'string') throw new Error('Bibliothèque invalide');
  JSON.parse(json);
  await fs.mkdir(path.dirname(libraryPath()), { recursive: true });
  await writeAtomic(libraryPath(), json);
});

ipcMain.handle('file:read', async (_event, file) => {
  checkDrawioPath(file);
  return fs.readFile(file, 'utf8');
});

ipcMain.handle('file:write', async (_event, file, content) => {
  checkDrawioPath(file);
  if (!granted.has(file)) throw new Error(`Fichier non autorisé en écriture : ${file}`);
  if (typeof content !== 'string') throw new Error('Contenu invalide');
  await writeAtomic(file, content);
});

/** Fichier glissé-déposé : le chemin vient du renderer (webUtils), on l'accepte s'il existe. */
ipcMain.handle('file:grant', async (_event, file) => {
  checkDrawioPath(file);
  await fs.access(file);
  granted.add(file);
});

ipcMain.handle('dialog:open', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: FILTERS });
  const file = result.filePaths[0];
  if (result.canceled || !file) return undefined;
  granted.add(file);
  return { path: file, content: await fs.readFile(file, 'utf8') };
});

ipcMain.handle('dialog:save', async (event, defaultName) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(window, {
    defaultPath: typeof defaultName === 'string' ? defaultName : 'Sans titre.drawio',
    filters: FILTERS,
  });
  if (result.canceled || !result.filePath) return undefined;
  const file = DRAWIO_FILE.test(result.filePath) ? result.filePath : `${result.filePath}.drawio`;
  granted.add(file);
  return file;
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'Drawio Spatial',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  // Liens des schémas (SPEC §11.4) : dans le navigateur, et seulement les URL sûres.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  // Pas de navigation hors de l'appli (ex. fichier lâché hors de la zone prévue).
  window.webContents.on('will-navigate', (event, url) => {
    if (DEV_URL ? !url.startsWith(DEV_URL) : !url.startsWith('file:')) event.preventDefault();
  });
  if (DEV_URL) void window.loadURL(DEV_URL);
  else void window.loadFile(path.join(__dirname, 'web', 'index.html'));
}

/** Les fichiers de la bibliothèque (choisis lors d'une session précédente) restent modifiables. */
async function grantLibraryFiles() {
  try {
    const library = JSON.parse((await readLibrary()) ?? '{}');
    for (const id of Object.keys(library.files ?? {})) if (path.isAbsolute(id) && DRAWIO_FILE.test(id)) granted.add(id);
  } catch {
    // Bibliothèque illisible : elle sera réécrite.
  }
}

app.whenReady().then(async () => {
  await grantLibraryFiles();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
