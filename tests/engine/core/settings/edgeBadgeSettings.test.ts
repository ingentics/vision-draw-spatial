import { describe, expect, it } from 'vitest';
import { edgeBadgeSettings, edgeBadgeStyle } from '../../../../src/engine/core/settings/edgeBadgeSettings';
import { DEFAULT_EDGE_BADGE } from '../../../../src/engine/core/render/decorations';

describe('réglages des pastilles d’un mode (sujet 532)', () => {
  const settings = edgeBadgeSettings({ groupHint: 'Aide', labelFaceCamera: 'Texte face à la caméra' });

  it('textes propres au mode ; défauts : la pastille par défaut du moteur', () => {
    expect(settings[0]).toMatchObject({ key: 'badgeFaceCamera', group: 'Pastilles', groupHint: 'Aide' });
    expect(settings[1]).toMatchObject({ key: 'badgeLabelFaceCamera', label: 'Texte face à la caméra' });
    const defaults = Object.fromEntries(settings.map((setting) => [setting.key, setting.default]));
    expect(edgeBadgeStyle(defaults as never)).toEqual(DEFAULT_EDGE_BADGE);
  });
});
