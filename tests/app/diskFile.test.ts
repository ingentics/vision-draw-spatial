import { describe, expect, it } from 'vitest';
import type { DiskFile } from '../../src/engine';
import { canWrite, DiskConflictError, requestWrite, writeDiskFile } from '../../src/app/diskFile';

/** Faux fichier du disque : contenu, date de modification avancée à chaque écriture, autorisation. */
function fakeDisk(permission: PermissionState, granted: PermissionState = permission) {
  const state = { content: 'avant', lastModified: 1000, permission, requests: 0 };
  const handle = {
    name: 'archi.drawio',
    getFile: async () => ({ lastModified: state.lastModified }),
    createWritable: async () => ({
      write: async (content: string) => {
        state.content = content;
      },
      close: async () => {
        state.lastModified += 1;
      },
    }),
    queryPermission: async () => state.permission,
    requestPermission: async () => {
      state.requests++;
      state.permission = granted;
      return granted;
    },
  };
  return { state, disk: { handle, modifiedAt: 1000 } as unknown as DiskFile };
}

describe('écriture du fichier du disque dans le navigateur (étape 354)', () => {
  it('réécrit le fichier et renvoie sa nouvelle date de modification', async () => {
    const { state, disk } = fakeDisk('granted');
    expect(await writeDiskFile(disk, 'après')).toBe(1001);
    expect(state.content).toBe('après');
  });

  it('n’écrase pas un fichier modifié sur le disque depuis son ouverture', async () => {
    const { state, disk } = fakeDisk('granted');
    state.lastModified = 2000;
    await expect(writeDiskFile(disk, 'après')).rejects.toBeInstanceOf(DiskConflictError);
    expect(state.content).toBe('avant');
  });

  it('ne demande l’autorisation que si elle manque', async () => {
    const granted = fakeDisk('granted');
    expect(await requestWrite(granted.disk)).toBe(true);
    expect(granted.state.requests).toBe(0);

    const prompt = fakeDisk('prompt', 'granted');
    expect(await canWrite(prompt.disk)).toBe(false);
    expect(await requestWrite(prompt.disk)).toBe(true);
    expect(prompt.state.requests).toBe(1);

    const denied = fakeDisk('prompt', 'denied');
    expect(await requestWrite(denied.disk)).toBe(false);
  });
});
