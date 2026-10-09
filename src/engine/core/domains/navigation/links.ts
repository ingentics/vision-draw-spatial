import { Group, Mesh } from 'three';
import type { MeshBasicMaterial } from 'three';
import { isNavigableLink } from '../../format/link';
import { fitBounds } from '../../interaction/cameraFraming';
import { usageKey } from '../../interaction/navigationHistory';
import type { LinkUsage } from '../../interaction/navigationHistory';
import { FOLLOW_LINK_KEY_LABELS, followLinkGesture } from '../../interaction/selectionRules';
import type { LinkModel } from '../../model/types';
import { linkZone } from '../../render/decorations';
import { disposeObject } from '../../render/meshes';
import type { EngineCore } from '../EngineCore';
import type { InitialView } from '../types';
import { elementOf, shapeOf } from '../../model/pageIndex';

/**
 * Liens des éléments (SPEC §11) : suivre un lien (page ou URL), préchargement, zones liées en évidence, usage des
 * liens.
 */
export class Links {
  /** Touche pour suivre un lien maintenue : zones liées de la page en évidence (`linkZonesObject`). */
  linkZonesShown = false;
  private linkZonesObject: Group | undefined;
  linkUsage: LinkUsage = {};

  /** Ouverture des liens URL. */
  private readonly openUrl: (href: string) => void;

  constructor(
    private readonly core: EngineCore,
    openUrl: ((href: string) => void) | undefined,
  ) {
    this.openUrl = openUrl ?? defaultOpenUrl;
  }

  /** Touche pour suivre un lien maintenue ou relâchée : zones liées de la page en évidence ou non. */
  setLinkZonesShown(shown: boolean): void {
    if (this.linkZonesShown === shown) return;
    this.linkZonesShown = shown;
    this.updateLinkZones();
  }

  /** Nouveau document : usage des liens repris de la session. */
  resetDocument(initialView: InitialView | undefined): void {
    this.linkUsage = { ...initialView?.linkUsage };
  }

  preloadLink(link: LinkModel | undefined): void {
    if (link?.type !== 'page' || link.pageId === this.core.pages.currentPageId) return;
    const page = this.core.pages.pageById(link.pageId);
    if (page) this.core.scenes.prebuild(page);
  }

  followLink(elementId: string): void {
    const page = this.core.pages.getCurrentPage();
    const element = page && elementOf(page, elementId);
    const link = element?.link;
    if (!page || !element || !isNavigableLink(link) || !this.core.canInteract()) return;
    if (link.type === 'url') {
      this.openUrl(link.href);
      return;
    }
    const target = this.core.pages.pageById(link.pageId);
    if (!target || target.id === page.id) return;

    const frame = shapeOf(page, elementId)?.bounds ?? this.core.sceneView.drawnBounds(elementId);
    this.core.history.push({
      pageId: page.id,
      elementId,
      frame,
      camera: this.core.camera.state,
      targetPageId: target.id,
    });
    // L'usage ne compte que pour les vrais liens du document (pas les cartes de la vue graphe).
    if (!this.core.graph.isGraph(page.id)) {
      const at = Date.now();
      this.linkUsage[usageKey(page.id, target.id)] = at;
      this.core.events.emit('linkUsed', page.id, target.id, at);
    }

    this.core.transitions.runTransition({
      direction: 'in',
      outer: page,
      inner: target,
      frame,
      destination:
        this.core.pages.cameraOf(target.id) ??
        fitBounds(target.bounds, this.core.display.viewport, {
          ...this.core.viewModes.arrivalOrientation(),
          limits: this.core.camera.limits,
        }),
    });
  }

  getLinkUsage(): LinkUsage {
    return { ...this.linkUsage };
  }

  describeLink(link: LinkModel): string {
    const { followLinkKey: key, followLinkGesture: chosen } = this.core.settings.controls;
    const click = followLinkGesture(key, chosen) === 'click' ? 'clic' : 'double-clic';
    const gesture = key === 'none' ? click : `${FOLLOW_LINK_KEY_LABELS[key]} + ${click}`;
    if (link.type === 'url') return `${link.href} (${gesture} : ouvrir dans un nouvel onglet)`;
    const name = this.core.pages.pageById(link.pageId)?.name;
    const action = `${gesture} : aller à « ${name} »`;
    return name ? action.charAt(0).toUpperCase() + action.slice(1) : `Lien vers une page absente (${link.pageId})`;
  }

  /**
   * Zones liées (SPEC §11.1) : chaque forme ou flèche de la page courante qui porte un lien navigable,
   * encadrée tant que la touche pour suivre un lien est maintenue (pas pendant une transition).
   */
  updateLinkZones(): void {
    if (this.linkZonesObject) {
      this.linkZonesObject.removeFromParent();
      disposeObject(this.linkZonesObject);
      this.linkZonesObject = undefined;
    }
    const root = this.core.scenes.current?.root;
    const page = this.core.pages.getCurrentPage();
    if (this.linkZonesShown && root && page && this.core.canInteract()) {
      const zones = new Group();
      zones.name = 'link-zones';
      for (const element of [...page.shapes, ...page.edges]) {
        const link = element.link;
        // Un lien vers une page absente ne mène nulle part : pas de zone.
        if (!isNavigableLink(link) || (link.type === 'page' && !this.core.pages.pageById(link.pageId))) continue;
        const bounds = 'bounds' in element ? element.bounds : this.core.sceneView.drawnBounds(element.id);
        if (!bounds) continue;
        const zone = linkZone(bounds, this.core.camera.state.zoom, this.core.settings.selection.accentColor);
        // Posée sur le dessus d'un volume, et toujours visible (pas cachée par les blocs).
        zone.position.z = ((this.core.sceneView.sceneObject(element.id)?.userData.top as number) ?? 0) + 0.2;
        zone.traverse((o) => {
          if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
        });
        zones.add(zone);
      }
      root.add(zones);
      this.linkZonesObject = zones;
    }
    this.core.rendering.requestRender();
  }
}

/** Ouvre une URL externe (SPEC §11.4) : nouvel onglet, sans accès retour à cette page. */
function defaultOpenUrl(href: string): void {
  window.open(href, '_blank', 'noopener,noreferrer');
}
