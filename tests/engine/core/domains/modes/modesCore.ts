import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { ModeFollowUps } from '../../../../../src/engine/core/domains/modes/modeFollowUps';
import { ModePanel } from '../../../../../src/engine/core/domains/modes/modePanel';
import { PageModes } from '../../../../../src/engine/core/domains/modes/pageModes';
import { ShapeParts } from '../../../../../src/engine/core/domains/modes/shapeParts';
import { PluginGuard } from '../../../../../src/engine/core/domains/runtime/pluginGuard';
import { PageEffectRegistry } from '../../../../../src/engine/core/effects/registry';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import { DEFAULT_SETTINGS } from '../../../../../src/engine/core/settings';
import { TextMeasure } from '../../../../../src/engine/core/render/textMeasure';

/** Cœur réduit et modes de test communs aux tests du domaine des modes (`PageModes`, `ModePanel`, `ModeFollowUps`). */

const XML = `<mxfile><diagram id="p" name="P" spatial.mode="boom"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="B" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="e" edge="1" source="a" target="b" parent="1" style="spatial.boom.broken=x;"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

export const fail = (): never => {
  throw new Error('panne');
};

/** Mode de test dont les points d'entrée lèvent une exception. */
export const BOOM: PageModeDefinition = {
  id: 'boom',
  namespace: 'boom',
  name: 'Boom',
  lifecycle: { check: fail },
  dressing: () => ({ edgeColor: fail, edgeBadge: () => ({ text: '1', color: '#ff0000' }) }),
  gestures: {
    placed: (edit) => {
      edit.setPageAttribute('before', '1');
      fail();
    },
    carries: (_page, shape) => (shape.id === 'a' ? ['b'] : fail()),
    obstacles: fail,
  },
  page: { allowsEffect: (id) => (id === 'refused' ? false : fail()) },
  edges: {
    connects: fail,
    properties: [
      { type: 'text', key: 'ok', label: 'Correct', value: () => 'calculé', readOnly: () => true },
      { type: 'choice', key: 'broken', label: 'En panne', value: fail, readOnly: fail, options: fail },
      { type: 'toggle', key: 'hidden', label: 'Masqué', hidden: () => true },
      { type: 'toggle', key: 'hiddenBroken', label: 'Masquage en panne', hidden: fail },
    ],
  },
};

/** Cœur réduit à ce que le domaine des modes utilise ; `published` compte les republications des Diagnostics. */
export function setup(mode: PageModeDefinition = BOOM) {
  const { document, tree } = readDrawio(XML);
  const state = { published: 0, snapshots: [] as string[], changed: 0 };
  const editable = () => ({ page: document.pages[0]!, pageTree: tree.pages[0]!, xmlTree: tree });
  const core = {
    modes: new PageModeRegistry().register(mode),
    effects: new PageEffectRegistry(),
    settings: DEFAULT_SETTINGS,
    pages: { pageById: (id: string) => document.pages.find((p) => p.id === id) },
    targets: { editablePage: editable, editablePageById: (id: string) => (id === 'p' ? editable() : undefined) },
    edits: { recordSnapshot: (label: string) => state.snapshots.push(label) },
    modeCurrents: { getModeCurrent: () => undefined },
    textMeasure: new TextMeasure(),
    file: {
      xmlTree: tree,
      pageTreeOf: () => tree.pages[0],
      publishWarnings: () => state.published++,
      documentChanged: () => state.changed++,
    },
  } as unknown as EngineCore;
  const guard = new PluginGuard(core);
  Object.assign(core, { pluginGuard: guard });
  const modes = new PageModes(core);
  // Réglages et remises en ordre sortis de l'hôte (sujet 379).
  const panel = new ModePanel(core);
  const followUps = new ModeFollowUps(core);
  Object.assign(core, {
    pageModes: modes,
    modePanel: panel,
    modeFollowUps: followUps,
    shapeParts: new ShapeParts(core),
  });
  return { core, document, tree, modes, panel, followUps, guard, state, page: document.pages[0]! };
}

/** Mode dont `connects` et les suites notent la partie reçue ; les parties sont « haut » (y < 30) et « bas ». */
export function spy() {
  const seen = {
    connects: [] as Array<string | undefined>,
    created: [] as Array<string | undefined>,
    reconnected: [] as Array<string | undefined>,
  };
  const mode: PageModeDefinition = {
    id: 'boom',
    namespace: 'boom',
    name: 'Boom',
    edges: {
      connects: (_page, _source, _target, part) => (seen.connects.push(part), true),
      created: (_edit, _id, _current, part) => void seen.created.push(part),
      reconnected: (_edit, _id, part) => void seen.reconnected.push(part),
    },
    parts: {
      at: (_page, _shape, point) => (point.y < 30 ? 'haut' : 'bas'),
      bounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    },
  };
  return { seen, ...setup(mode) };
}
