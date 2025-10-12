import * as d3 from 'd3';
import type { Selection } from 'd3';

export type AnySelection = Selection<any, any, any, any>;

let zoomTransform: d3.ZoomTransform = d3.zoomIdentity;
let svgRoot: SVGSVGElement | null = null;
let workspaceRoot: SVGGElement | null = null;
let debugEnabled = false;
let selectedElement: AnySelection | null = null;

export function generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return (crypto as any).randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getZoomTransform(): d3.ZoomTransform {
    return zoomTransform;
}

export function setZoomTransformState(transform: d3.ZoomTransform) {
    zoomTransform = transform;
}

export function getSvgRoot(): SVGSVGElement | null {
    return svgRoot;
}

export function setSvgRootRef(svg: SVGSVGElement | null) {
    svgRoot = svg;
}

export function getWorkspaceRoot(): SVGGElement | null {
    return workspaceRoot;
}

export function setWorkspaceRootRef(root: SVGGElement | null) {
    workspaceRoot = root;
}

export function isDebugMode(): boolean {
    return debugEnabled;
}

export function setDebugModeState(enabled: boolean) {
    debugEnabled = enabled;
}

export function getSelectedElement(): AnySelection | null {
    return selectedElement;
}

export function setSelectedElement(selection: AnySelection | null) {
    selectedElement = selection;
}

export function isElementSelected(node: Element | null): boolean {
    return !!selectedElement && selectedElement.node() === node;
}

export function notifySelectionChange() {
    window.dispatchEvent(new CustomEvent('stickyselectionchange', { detail: selectedElement?.node() || null }));
    window.dispatchEvent(new CustomEvent('lineselectionchange', {
        detail: selectedElement && selectedElement.classed('line-element') ? selectedElement.node() : null,
    }));
}
