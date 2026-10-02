/**
 * Empaquetage de l'appli native (SPEC §16), lancé dans le conteneur `desktop` (make desktop-package) :
 * runtime Electron de la plateforme cible + main.cjs, preload.cjs et l'appli web (web/).
 * macOS : « Drawio Spatial.app » renommée (Info.plist), signée ad hoc par rcodesign, puis zippée.
 * Linux : dossier avec l'exécutable `electron`, puis archive tar.gz.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [platform = 'darwin', arch = 'arm64'] = process.argv.slice(2);
const desktop = dirname(fileURLToPath(import.meta.url));
const out = join(desktop, '..', 'dist-desktop');
const pkg = JSON.parse(await readFile(join(desktop, 'package.json'), 'utf8'));
const electron = join(desktop, 'node_modules', 'electron', 'dist');
const run = (command, args, options = {}) => execFileSync(command, args, { stdio: 'inherit', ...options });

if (!existsSync(join(desktop, 'web', 'index.html'))) throw new Error('web/ absent : make desktop-web');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

/** Fichiers de l'appli, dans le dossier `resources/app` du runtime. */
async function addApp(resources) {
  const app = join(resources, 'app');
  await mkdir(app, { recursive: true });
  for (const file of ['main.cjs', 'preload.cjs']) await cp(join(desktop, file), join(app, file));
  await cp(join(desktop, 'web'), join(app, 'web'), { recursive: true });
  const { name, productName, version, description, main } = pkg;
  await writeFile(
    join(app, 'package.json'),
    JSON.stringify({ name, productName, version, description, main }, null, 2),
  );
  await rm(join(resources, 'default_app.asar'), { force: true });
}

if (platform === 'darwin') {
  const bundle = join(out, `${pkg.productName}.app`);
  // cp -a : liens symboliques des frameworks et droits d'exécution conservés.
  run('cp', ['-a', join(electron, 'Electron.app'), bundle]);
  await addApp(join(bundle, 'Contents', 'Resources'));

  await editPlist(join(bundle, 'Contents', 'Info.plist'), {
    CFBundleName: pkg.productName,
    CFBundleDisplayName: pkg.productName,
    CFBundleIdentifier: 'fr.drawio-spatial.desktop',
    CFBundleShortVersionString: pkg.version,
    CFBundleVersion: pkg.version,
  });
  // Les applis auxiliaires d'Electron n'indiquent pas leur exécutable (macOS le déduit du nom) :
  // rcodesign en a besoin pour les signer comme des bundles.
  const frameworks = join(bundle, 'Contents', 'Frameworks');
  for (const helper of (await readdir(frameworks)).filter((name) => name.endsWith('.app'))) {
    await editPlist(
      join(frameworks, helper, 'Contents', 'Info.plist'),
      {
        CFBundleExecutable: helper.slice(0, -'.app'.length),
      },
      { onlyIfMissing: true },
    );
  }

  // Signature ad hoc (sans certificat) de l'appli et de ses bundles imbriqués : obligatoire sur Apple Silicon.
  run('rcodesign', ['sign', bundle]);
  run('zip', ['-qry', `${pkg.productName}-mac-${arch}.zip`, `${pkg.productName}.app`], { cwd: out });
  console.log(`\n  ${bundle}\n`);
} else if (platform === 'linux') {
  const folder = join(out, `drawio-spatial-linux-${arch}`);
  run('cp', ['-a', electron, folder]);
  await addApp(join(folder, 'resources'));
  run('tar', ['-czf', `drawio-spatial-linux-${arch}.tar.gz`, `drawio-spatial-linux-${arch}`], { cwd: out });
  console.log(`\n  ${folder}/electron\n`);
} else {
  throw new Error(`Plateforme non prise en charge : ${platform}`);
}

/** Modifie (ou ajoute) des clés texte d'un Info.plist XML. */
async function editPlist(path, values, { onlyIfMissing = false } = {}) {
  let plist = await readFile(path, 'utf8');
  for (const [key, value] of Object.entries(values)) {
    const entry = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`);
    if (entry.test(plist)) {
      if (!onlyIfMissing) plist = plist.replace(entry, `$1${value}$2`);
    } else {
      plist = plist.replace(
        /<\/dict>\s*<\/plist>\s*$/,
        `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>\n</plist>\n`,
      );
    }
  }
  await writeFile(path, plist);
}
