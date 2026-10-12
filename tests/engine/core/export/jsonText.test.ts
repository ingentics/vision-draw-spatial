import { describe, expect, it } from 'vitest';
import { JSON_FORMAT, jsonExporter } from '../../../../src/engine/core/export/jsonText';
import type { PageModel } from '../../../../src/engine/core/model/types';

describe('export JSON d’un mode (sujet 546)', () => {
  it('format JSON, modèle indenté de deux espaces, fin de ligne finale', () => {
    const exporter = jsonExporter((page: PageModel) => ({ page: page.id, items: [1] }));
    expect(exporter).toMatchObject(JSON_FORMAT);
    expect(exporter.export({ id: 'p' } as PageModel)).toBe('{\n  "page": "p",\n  "items": [\n    1\n  ]\n}\n');
  });
});
