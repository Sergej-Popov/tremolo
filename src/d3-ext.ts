import * as d3 from 'd3';
import { BaseType, Selection } from 'd3';
import { createHighlighter, type Highlighter } from 'shiki';

let zoomTransform: d3.ZoomTransform = d3.zoomIdentity;
let svgRoot: SVGSVGElement | null = null;
let workspaceRoot: SVGGElement | null = null;

let debugEnabled = false;

export function generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return (crypto as any).randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function setDebugMode(enabled: boolean) {
    debugEnabled = enabled;
    setGridVisible(enabled);
}

export function setZoomTransform(transform: d3.ZoomTransform) {
    zoomTransform = transform;
}

export function setSvgRoot(svg: SVGSVGElement | null, workspace?: SVGGElement | null) {
    svgRoot = svg;
    if (workspace) workspaceRoot = workspace;
    if (!svgRoot) return;
    const svgSel = d3.select(svgRoot);
    const container = workspaceRoot ? d3.select(workspaceRoot) : svgSel;
    let defs = svgSel.select('defs');
    if (defs.empty()) defs = svgSel.append('defs');
    if (defs.select('#drag-grid-pattern').empty()) {
        const pattern = defs.append('pattern')
            .attr('id', 'drag-grid-pattern')
            .attr('width', 10)
            .attr('height', 10)
            .attr('patternUnits', 'userSpaceOnUse');
        pattern.append('path')
            .attr('d', 'M10 0 L0 0 0 10')
            .attr('fill', 'none')
            .attr('stroke', '#ccc')
            .attr('stroke-width', 0.5);
    }
    let grid = container.select<SVGRectElement>('.grid-overlay');
    if (grid.empty()) {
        grid = container.insert('rect', ':first-child')
            .attr('class', 'grid-overlay')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', 'url(#drag-grid-pattern)')
            .style('pointer-events', 'none')
            .style('display', 'none');
    }
}

function setGridVisible(show: boolean) {
    if (!svgRoot) return;
    const grid = d3.select(svgRoot).select('.grid-overlay');
    if (show || debugEnabled) {
        grid.style('display', 'block').style('opacity', '1');
    } else {
        grid.style('display', 'none');
    }
}

function toWorkspaceCoords(event: MouseEvent | d3.D3DragEvent<any, any, any>): [number, number] {
    if (!svgRoot) return [0, 0];
    const domEvent: MouseEvent = (event as any).sourceEvent ?? event;
    const pt = svgRoot.createSVGPoint();
    pt.x = domEvent.clientX;
    pt.y = domEvent.clientY;
    const svgPoint = pt.matrixTransform(svgRoot.getScreenCTM()!.inverse());
    return zoomTransform.invert([svgPoint.x, svgPoint.y]);
}

export function isDebugMode(): boolean {
    return debugEnabled;
}

export function debugLog(...args: unknown[]) {
    if (debugEnabled) {
        console.log(...args);
    }
}

function ensureTooltip() {
    let div = d3.select<HTMLElement, unknown>('#tooltip');
    if (div.empty()) {
        div = d3.select('body').append('div').attr('id', 'tooltip');
    }
    return div
        .attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('background-color', 'lightgray')
        .style('padding', '5px')
        .style('border-radius', '5px')
        .style('pointer-events', 'none');
}

export function hideTooltip() {
    d3.select('#tooltip').style('opacity', 0);
}

export const tooltip = function <GElement extends BaseType, Datum, PElement extends BaseType, PDatum>(selection: Selection<GElement, Datum, PElement, PDatum>, contentCallback: (any, Datum) => string) {
    const tooltipDiv = ensureTooltip();
    tooltipDiv.style('opacity', 0);

    selection
        .on('mouseover', function (event: MouseEvent, d) {
            tooltipDiv
                .style('opacity', 1)
                .html(contentCallback(event, d))
                .style('left', `${event.pageX || 0 + 10}px`)
                .style('top', `${event.pageY || 0 - 20}px`);
        })
        .on('mousemove', function (event: MouseEvent) {
            tooltipDiv
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 20}px`);
        })
        .on('mouseout', function () {
            tooltipDiv.style('opacity', 0);
        });
};

export const debugTooltip = function <GElement extends BaseType, Datum, PElement extends BaseType, PDatum>(selection: Selection<GElement, Datum, PElement, PDatum>) {
    selection.on('.debugTooltip', null);
    if (!debugEnabled) return;
    selection.call(tooltip, (event: MouseEvent, d: any) => {
        const target = event.target as SVGElement;

        const x1Attr = target.attributes.getNamedItem("x1");
        const y1Attr = target.attributes.getNamedItem("y1");
        const x2Attr = target.attributes.getNamedItem("x2");
        const y2Attr = target.attributes.getNamedItem("y2");


        const x1 = x1Attr ? x1Attr.value : '0';
        const y1 = y1Attr ? y1Attr.value : '0';
        const x2 = x2Attr ? x2Attr.value : '0';
        const y2 = y2Attr ? y2Attr.value : '0';

        const coordinates = `${x1}:${y1} - ${x2}:${y2}`;

        return `${d}, [${coordinates}]`
    });
}

export interface TransformValues {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotate: number;
}

export const defaultTransform = (): TransformValues => ({
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
});

function transformPoint(x: number, y: number, t: TransformValues, size: { width: number; height: number }) {
    const cx = (size.width * t.scaleX) / 2;
    const cy = (size.height * t.scaleY) / 2;
    const rad = t.rotate * Math.PI / 180;
    let px = x * t.scaleX;
    let py = y * t.scaleY;
    const rx = Math.cos(rad) * (px - cx) - Math.sin(rad) * (py - cy) + cx;
    const ry = Math.sin(rad) * (px - cx) + Math.cos(rad) * (py - cy) + cy;
    return { x: rx + t.translateX, y: ry + t.translateY };
}

export function linePath(d: {
    x1: number; y1: number; x2: number; y2: number;
    style?: 'direct' | 'arc' | 'corner';
    startConn?: { position: string } | undefined;
    endConn?: { position: string } | undefined;
}): string {
    const off = 100;
    if (d.style === 'arc') {
        const dir = (pos?: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) => {
            if (pos === 'n') return { dx: 0, dy: -off };
            if (pos === 's') return { dx: 0, dy: off };
            if (pos === 'e') return { dx: off, dy: 0 };
            if (pos === 'w') return { dx: -off, dy: 0 };
            return { dx: Math.sign(x2 - x1) * off, dy: Math.sign(y2 - y1) * off };
        };
        const s = dir(d.startConn?.position, d.x1, d.y1, d.x2, d.y2);
        const e = dir(d.endConn?.position, d.x2, d.y2, d.x1, d.y1);
        const c1x = d.x1 + s.dx;
        const c1y = d.y1 + s.dy;
        const c2x = d.x2 + e.dx;
        const c2y = d.y2 + e.dy;
        return `M${d.x1},${d.y1} C${c1x},${c1y} ${c2x},${c2y} ${d.x2},${d.y2}`;
    } else if (d.style === 'corner') {
        const dir = (pos?: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) => {
            if (pos === 'n') return { dx: 0, dy: -off };
            if (pos === 's') return { dx: 0, dy: off };
            if (pos === 'e') return { dx: off, dy: 0 };
            if (pos === 'w') return { dx: -off, dy: 0 };
            return { dx: Math.sign(x2 - x1) * off, dy: Math.sign(y2 - y1) * off };
        };
        const s = dir(d.startConn?.position, d.x1, d.y1, d.x2, d.y2);
        const e = dir(d.endConn?.position, d.x2, d.y2, d.x1, d.y1);
        const p1x = d.x1 + s.dx;
        const p1y = d.y1 + s.dy;
        const p2x = d.x2 + e.dx;
        const p2y = d.y2 + e.dy;
        const midX = Math.abs(p1x - d.x2) < Math.abs(p1y - d.y2) ? p1x : p2x;
        const midY = Math.abs(p1y - d.y2) < Math.abs(p1x - d.x2) ? p1y : p2y;
        return `M${d.x1},${d.y1} L${p1x},${p1y} L${midX},${midY} L${p2x},${p2y} L${d.x2},${d.y2}`;
    }
    return `M${d.x1},${d.y1} L${d.x2},${d.y2}`;
}

function getHandleCoords(element: Selection<any, any, any, any>, pos: string, width: number, height: number, t: TransformValues) {
    let x = 0, y = 0;
    if (pos === 'n') { x = width / 2; y = 0; }
    if (pos === 'e') { x = width; y = height / 2; }
    if (pos === 's') { x = width / 2; y = height; }
    if (pos === 'w') { x = 0; y = height / 2; }
    return transformPoint(x, y, t, { width, height });
}

function updateConnectedLines(element: Selection<any, any, any, any>) {
    if (!workspaceRoot) return;
    const data: any = element.datum() || {};
    const width = data.width ?? (element.node() as SVGGraphicsElement).getBBox().width;
    const height = data.height ?? (element.node() as SVGGraphicsElement).getBBox().height;
    const t: TransformValues = data.transform ?? defaultTransform();
    const lines = d3.select(workspaceRoot).selectAll<SVGGElement, any>('.line-element');
    lines.each(function (ld) {
        const g = d3.select(this);
        if (ld.startConn && ld.startConn.elementId === data.id) {
            const p = getHandleCoords(element, ld.startConn.position, width, height, t);
            ld.x1 = p.x;
            ld.y1 = p.y;
            g.select('circle.start').attr('cx', ld.x1).attr('cy', ld.y1);
        }
        if (ld.endConn && ld.endConn.elementId === data.id) {
            const p = getHandleCoords(element, ld.endConn.position, width, height, t);
            ld.x2 = p.x;
            ld.y2 = p.y;
            g.select('circle.end').attr('cx', ld.x2).attr('cy', ld.y2);
        }
        g.select('path').attr('d', linePath(ld));
        const pth = g.select<SVGPathElement>('path').node();
        if (pth) {
            const mid = pth.getPointAtLength(pth.getTotalLength() / 2);
            g.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    });
}

export function adjustStickyFont(el: HTMLDivElement, fixedSize?: number | null) {
    let size = fixedSize ?? 16;
    el.classList.remove('scrollable');
    el.style.overflow = 'hidden';
    el.style.fontSize = `${size}px`;
    el.onwheel = null;
    el.onmousedown = null;

    if (fixedSize == null) {
        while ((el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) && size > 6) {
            size -= 1;
            el.style.fontSize = `${size}px`;
        }
    }

    if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
        el.classList.add('scrollable');
        el.style.overflow = 'auto';
        el.onwheel = (e) => e.stopPropagation();
    }
}

let highlighterPromise: Promise<Highlighter> | null = null;
export const highlightLangs = [
    'javascript',
    'typescript',
    'python',
    'java',
    'c',
    'cpp',
    'csharp',
    'go',
    'ruby',
    'php',
    'rust',
    'markdown'
] as const;
export const highlightThemes = [
    'github-dark',
    'github-light'
] as const;

export interface HighlightResult { html: string; background: string }

export async function highlightCode(code: string, lang: string, theme: string): Promise<HighlightResult> {
    try {
        if (!highlighterPromise) {
            highlighterPromise = createHighlighter({ themes: highlightThemes as unknown as string[], langs: highlightLangs });
        }
        const highlighter = await highlighterPromise;
        const raw = highlighter.codeToHtml(code, { lang, theme });
        const bgMatch = raw.match(/background-color:([^;]+);/);
        const html = raw.replace(/^<pre[^>]*>/, '').replace(/<\/pre>$/, '');
        return { html, background: bgMatch ? bgMatch[1] : '#f5f5f5' };
    } catch {
        return { html: code.replace(/</g, '&lt;'), background: '#f5f5f5' };
    }
}

export function addDebugCross(element: Selection<any, any, any, any>, size = 12) {
    const data: any = element.datum() || {};
    const width = data.width ?? (element.node() as SVGGraphicsElement).getBBox().width;
    const height = data.height ?? (element.node() as SVGGraphicsElement).getBBox().height;
    const cross = element.append('text')
        .attr('class', 'component-debug-cross')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', size)
        .attr('fill', 'red')
        .style('pointer-events', 'none')
        .text('+');
    cross.style('display', debugEnabled ? 'block' : 'none');
    return cross;
}

export function updateDebugCross(element: Selection<any, any, any, any>, size = 12) {
    const cross = element.select<SVGTextElement>('.component-debug-cross');
    if (cross.empty()) return;
    const data: any = element.datum() || {};
    const width = data.width ?? (element.node() as SVGGraphicsElement).getBBox().width;
    const height = data.height ?? (element.node() as SVGGraphicsElement).getBBox().height;
    cross
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('font-size', size)
        .style('display', debugEnabled ? 'block' : 'none');
}

function buildTransform(transform: TransformValues, size: { width: number; height: number }): string {
    const { translateX, translateY, scaleX, scaleY, rotate } = transform;
    const cx = (size.width * scaleX) / 2;
    const cy = (size.height * scaleY) / 2;
    return `translate(${translateX}, ${translateY}) rotate(${rotate}, ${cx}, ${cy}) scale(${scaleX}, ${scaleY})`;
}

export function applyTransform(element: Selection<any, any, any, any>, transform: TransformValues) {
    const data: any = element.datum() || {};
    data.transform = transform;
    const width = data.width ?? (element.node() as SVGGraphicsElement).getBBox().width;
    const height = data.height ?? (element.node() as SVGGraphicsElement).getBBox().height;
    element.attr('transform', buildTransform(transform, { width, height }));
    const handles = element.selectAll<SVGCircleElement, any>('.connect-handle');
    handles.each(function () {
        const h = d3.select(this);
        const pos = h.attr('data-pos');
        let x = 0, y = 0;
        if (pos === 'n') { x = width / 2; y = 0; }
        if (pos === 'e') { x = width; y = height / 2; }
        if (pos === 's') { x = width / 2; y = height; }
        if (pos === 'w') { x = 0; y = height / 2; }
        h.attr('cx', x).attr('cy', y);
        const p = transformPoint(x, y, transform, { width, height });
        h.attr('data-abs-x', p.x).attr('data-abs-y', p.y);
    });
    updateConnectedLines(element);
    if (selectedElement && element.node() === selectedElement.node()) {
        dispatchSelectionChange();
    }
}

interface FrameAttachment {
    selection: Selection<any, any, any, any>;
    kind: 'transform' | 'line';
    transform?: TransformValues;
    line?: { x1: number; y1: number; x2: number; y2: number };
    elementId?: string;
    followConnections?: boolean;
    lineBaseTransform?: TransformValues;
}

interface HiddenElementState {
    node: SVGGraphicsElement;
    displayAttr: string | null;
    styleDisplay: string;
}

const DECORATION_SELECTOR = '.resize-handle, .rotate-handle, .connect-handle, .selection-outline, .component-debug-cross, .crop-controls';
const frameStrokePatterns: Record<'solid' | 'dashed' | 'dotted', { dash: string | null; linecap: 'butt' | 'round' }> = {
    solid: { dash: null, linecap: 'butt' },
    dashed: { dash: '8 4', linecap: 'butt' },
    dotted: { dash: '2 4', linecap: 'round' },
};

function applyFrameStrokeAttributes(rect: Selection<SVGRectElement, any, any, any>, style: 'solid' | 'dashed' | 'dotted') {
    const config = frameStrokePatterns[style] ?? frameStrokePatterns.solid;
    rect.attr('stroke-dasharray', config.dash ?? null).attr('stroke-linecap', config.linecap);
}

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

function getTightBoundingBox(node: SVGGraphicsElement): BoundingBox | null {
    const element = d3.select(node);
    const hidden: HiddenElementState[] = [];
    element.selectAll<SVGGraphicsElement, unknown>(DECORATION_SELECTOR).each(function () {
        const child = this as SVGGraphicsElement;
        hidden.push({
            node: child,
            displayAttr: child.getAttribute('display'),
            styleDisplay: child.style.display,
        });
        child.style.display = 'none';
    });
    try {
        const bbox = node.getBBox();
        const matrix = node.getScreenCTM() || node.getCTM();
        if (!matrix) {
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height,
            };
        }

        const transformPoint = (x: number, y: number) => ({
            x: matrix.a * x + matrix.c * y + matrix.e,
            y: matrix.b * x + matrix.d * y + matrix.f,
        });

        const topLeft = transformPoint(bbox.x, bbox.y);
        const topRight = transformPoint(bbox.x + bbox.width, bbox.y);
        const bottomLeft = transformPoint(bbox.x, bbox.y + bbox.height);
        const bottomRight = transformPoint(bbox.x + bbox.width, bbox.y + bbox.height);

        const xs = [topLeft.x, topRight.x, bottomLeft.x, bottomRight.x];
        const ys = [topLeft.y, topRight.y, bottomLeft.y, bottomRight.y];

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    } catch {
        return null;
    } finally {
        hidden.forEach(({ node: child, displayAttr, styleDisplay }) => {
            if (displayAttr !== null) {
                child.setAttribute('display', displayAttr);
            } else {
                child.removeAttribute('display');
            }
            child.style.display = styleDisplay;
        });
    }
}

export function makeDraggable(selection: Selection<any, any, any, any>) {
    interface DragDatum {
        dragOffsetX: number;
        dragOffsetY: number;
        transform: TransformValues;
        startX: number;
        startY: number;
        moved?: boolean;
        attachments?: FrameAttachment[] | null;
    };

    selection.call(
        d3.drag()
            .on('start', function (event: MouseEvent) {
                const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                const element = d3.select(this);
                const overlay = element.select('.crop-controls');
                if (!overlay.empty() && overlay.style('display') !== 'none') {
                    finishCrop(element);
                }
                const data: any = element.datum() || {};
                const transform: TransformValues = data.transform ?? defaultTransform();

                const [startX, startY] = toWorkspaceCoords(event);
                const dragOffsetX = startX - transform.translateX;
                const dragOffsetY = startY - transform.translateY;

                debugLog('drag start', transform.translateX, transform.translateY);
                let attachments: FrameAttachment[] | null = null;
                if (element.classed('frame-element') && workspaceRoot) {
                    const frameNode = element.node() as SVGGraphicsElement;
                    const frameBox = getTightBoundingBox(frameNode);
                    if (frameBox) {
                        const workspace = d3.select(workspaceRoot);
                        const selector = '.pasted-image, .embedded-video, .embedded-audio, .sticky-note, .code-block, .line-element, .drawing, .guitar-board, .frame-element';
                        const collected: FrameAttachment[] = [];
                        const attachedIds: Set<string> = new Set();
                        const epsilon = 0.5;
                        workspace.selectAll<SVGGElement, any>(selector).each(function (ld: any) {
                            if (this === frameNode) return;
                            const el = d3.select(this);
                            const box = getTightBoundingBox(this as SVGGraphicsElement);
                            if (!box) return;
                            if (
                                box.x >= frameBox.x - epsilon &&
                                box.y >= frameBox.y - epsilon &&
                                box.x + box.width <= frameBox.x + frameBox.width + epsilon &&
                                box.y + box.height <= frameBox.y + frameBox.height + epsilon
                            ) {
                                if (ld?.type === 'line') {
                                    const base: TransformValues = ld?.transform ? { ...ld.transform } : { ...defaultTransform() };
                                    collected.push({
                                        selection: el,
                                        kind: 'line',
                                        line: {
                                            x1: (ld?.x1 ?? 0) + base.translateX,
                                            y1: (ld?.y1 ?? 0) + base.translateY,
                                            x2: (ld?.x2 ?? 0) + base.translateX,
                                            y2: (ld?.y2 ?? 0) + base.translateY,
                                        },
                                        elementId: ld?.id,
                                        lineBaseTransform: base,
                                    });
                                } else {
                                    const base: TransformValues = ld?.transform ? { ...ld.transform } : { ...defaultTransform() };
                                    const attachment: FrameAttachment = {
                                        selection: el,
                                        kind: 'transform',
                                        transform: base,
                                        elementId: ld?.id,
                                    };
                                    collected.push(attachment);
                                    if (attachment.elementId) attachedIds.add(attachment.elementId);
                                }
                            }
                        });
                        collected.forEach(att => {
                            if (att.kind === 'line') {
                                const data = att.selection.datum() as any;
                                const startFollow = data?.startConn && attachedIds.has(data.startConn.elementId);
                                const endFollow = data?.endConn && attachedIds.has(data.endConn.elementId);
                                if (startFollow && endFollow) {
                                    att.followConnections = true;
                                }
                            }
                        });
                        attachments = collected.length ? collected : null;
                    }
                }

                Object.assign(data, {
                    dragOffsetX,
                    dragOffsetY,
                    transform,
                    startX: transform.translateX,
                    startY: transform.translateY,
                    moved: false,
                    attachments,
                });
                element.datum(data);
                setGridVisible(event.ctrlKey);
            })
            .on('drag', function (event: MouseEvent) {
                const element = d3.select<any, DragDatum>(this);
                const data = element.datum();
                const { dragOffsetX, dragOffsetY, transform, startX, startY, moved } = data;

                const [mx, my] = toWorkspaceCoords(event);
                let newX = mx - dragOffsetX;
                let newY = my - dragOffsetY;
                const source = (event as any).sourceEvent as MouseEvent | undefined;
                const ctrl = source?.ctrlKey;
                const shift = source?.shiftKey;
                if (shift) {
                    const dx = Math.abs(newX - startX);
                    const dy = Math.abs(newY - startY);
                    if (dx > dy) newY = startY; else newX = startX;
                }
                if (ctrl) {
                    newX = Math.round(newX / 10) * 10;
                    newY = Math.round(newY / 10) * 10;
                }
                const newTransform: TransformValues = {
                    ...transform,
                    translateX: newX,
                    translateY: newY,
                };

                if (!moved && (newX !== startX || newY !== startY)) {
                    window.dispatchEvent(new CustomEvent('element-move-start', { detail: element.node() }));
                    data.moved = true;
                }

                applyTransform(element, newTransform);
                const dx = newX - startX;
                const dy = newY - startY;
                if (data.attachments) {
                    data.attachments.forEach(att => {
                        if (att.kind === 'transform' && att.transform) {
                            const base = att.transform;
                            const nextTransform: TransformValues = {
                                ...base,
                                translateX: base.translateX + dx,
                                translateY: base.translateY + dy,
                            };
                            applyTransform(att.selection, nextTransform);
                        } else if (att.kind === 'line' && att.line && !att.followConnections) {
                            const lineData = att.selection.datum() as any;
                            const base = att.lineBaseTransform ?? defaultTransform();
                            const newX1Abs = att.line.x1 + dx;
                            const newY1Abs = att.line.y1 + dy;
                            const newX2Abs = att.line.x2 + dx;
                            const newY2Abs = att.line.y2 + dy;
                            lineData.x1 = newX1Abs - base.translateX;
                            lineData.y1 = newY1Abs - base.translateY;
                            lineData.x2 = newX2Abs - base.translateX;
                            lineData.y2 = newY2Abs - base.translateY;
                            lineData.transform = { ...base };
                            att.selection.select('path').attr('d', linePath(lineData));
                            att.selection.select('circle.start').attr('cx', lineData.x1).attr('cy', lineData.y1);
                            att.selection.select('circle.end').attr('cx', lineData.x2).attr('cy', lineData.y2);
                            const path = att.selection.select<SVGPathElement>('path').node();
                            if (path) {
                                const mid = path.getPointAtLength(path.getTotalLength() / 2);
                                att.selection.select<SVGTextElement>('text.line-label')
                                    .attr('x', mid.x)
                                    .attr('y', mid.y);
                            }
                        }
                    });
                }
                setGridVisible(!!ctrl);
                debugLog('drag', newTransform.translateX, newTransform.translateY);
            })
            .on('end', function () {
                setGridVisible(false);
            })
    );
}

let selectedElement: Selection<any, any, any, any> | null = null;
let globalInit = false;

function dispatchSelectionChange() {
    window.dispatchEvent(new CustomEvent('stickyselectionchange', { detail: selectedElement?.node() || null }));
    window.dispatchEvent(new CustomEvent('lineselectionchange', {
        detail: selectedElement && selectedElement.classed('line-element') ? selectedElement.node() : null,
    }));
}

export function updateSelectedColor(color: string) {
    if (selectedElement && selectedElement.classed('sticky-note')) {
        selectedElement.select('rect').attr('fill', color);
        const data = selectedElement.datum() as any;
        data.color = color;
    }
}

export function updateSelectedFrameColor(color: string) {
    if (selectedElement && selectedElement.classed('frame-element')) {
        selectedElement.select<SVGRectElement>('rect.frame-rect').attr('fill', color);
        const data = selectedElement.datum() as any;
        data.color = color;
    }
}

export function updateSelectedFrameLineStyle(style: 'solid' | 'dashed' | 'dotted') {
    if (selectedElement && selectedElement.classed('frame-element')) {
        const rect = selectedElement.select<SVGRectElement>('rect.frame-rect');
        applyFrameStrokeAttributes(rect, style);
        const data = selectedElement.datum() as any;
        data.lineStyle = style;
    }
}

export function updateSelectedAlignment(align: 'left' | 'center' | 'right') {
    if (selectedElement && selectedElement.classed('sticky-note')) {
        selectedElement.select<HTMLElement>('foreignObject > .sticky-text')
            .style('text-align', align);
        const data = selectedElement.datum() as any;
        data.align = align;
    }
}

export function updateSelectedFontSize(size: number | 'auto') {
    if (selectedElement && selectedElement.classed('sticky-note')) {
        const div = selectedElement.select<HTMLDivElement>('foreignObject > .sticky-text').node();
        const data = selectedElement.datum() as any;
        data.fontSize = size === 'auto' ? null : size;
        if (div) adjustStickyFont(div, size === 'auto' ? null : size);
    }
}

export async function updateSelectedCodeLang(lang: string) {
    if (selectedElement && selectedElement.classed('code-block')) {
        const data = selectedElement.datum() as any;
        data.lang = lang;
        const pre = selectedElement.select<HTMLPreElement>('foreignObject > pre').node();
        if (pre) {
            const { html, background } = await highlightCode(data.code, lang, data.theme ?? 'github-dark');
            pre.innerHTML = html;
            pre.style.backgroundColor = background;
            pre.style.fontSize = `${data.fontSize ?? 14}px`;
        }
    }
}

export async function updateSelectedCodeTheme(theme: string) {
    if (selectedElement && selectedElement.classed('code-block')) {
        const data = selectedElement.datum() as any;
        data.theme = theme;
        const pre = selectedElement.select<HTMLPreElement>('foreignObject > pre').node();
        if (pre) {
            const { html, background } = await highlightCode(data.code, data.lang, theme);
            pre.innerHTML = html;
            pre.style.backgroundColor = background;
            pre.style.fontSize = `${data.fontSize ?? 14}px`;
        }
    }
}

export function updateSelectedCodeFontSize(size: number) {
    if (selectedElement && selectedElement.classed('code-block')) {
        const data = selectedElement.datum() as any;
        data.fontSize = size;
        selectedElement.select<HTMLPreElement>('foreignObject > pre')
            .style('font-size', `${size}px`);
    }
}

export function updateSelectedLineStyle(style: 'direct' | 'arc' | 'corner') {
    if (selectedElement && selectedElement.classed('line-element')) {
        const data = selectedElement.datum() as any;
        data.style = style;
        selectedElement.select('path').attr('d', linePath(data));
        applyLineAppearance(selectedElement as any);
        const p = selectedElement.select<SVGPathElement>('path').node();
        if (p) {
            const mid = p.getPointAtLength(p.getTotalLength() / 2);
            selectedElement.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    }
}

export function updateSelectedLineColor(color: string) {
    if (selectedElement && selectedElement.classed('line-element')) {
        const data = selectedElement.datum() as any;
        data.color = color;
        applyLineAppearance(selectedElement as any);
        const p = selectedElement.select<SVGPathElement>('path').node();
        if (p) {
            const mid = p.getPointAtLength(p.getTotalLength() / 2);
            selectedElement.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    }
}

export function updateSelectedStartConnectionStyle(style: 'circle' | 'arrow' | 'triangle' | 'none') {
    if (selectedElement && selectedElement.classed('line-element')) {
        const data = selectedElement.datum() as any;
        data.startStyle = style;
        applyLineAppearance(selectedElement as any);
        const p = selectedElement.select<SVGPathElement>('path').node();
        if (p) {
            const mid = p.getPointAtLength(p.getTotalLength() / 2);
            selectedElement.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    }
}

export function updateSelectedEndConnectionStyle(style: 'circle' | 'arrow' | 'triangle' | 'none') {
    if (selectedElement && selectedElement.classed('line-element')) {
        const data = selectedElement.datum() as any;
        data.endStyle = style;
        applyLineAppearance(selectedElement as any);
        const p = selectedElement.select<SVGPathElement>('path').node();
        if (p) {
            const mid = p.getPointAtLength(p.getTotalLength() / 2);
            selectedElement.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    }
}

export interface BackgroundRemovalOptions {
    tolerance?: number | null;
    feather?: number;
}

export interface BackgroundRemovalResult {
    dataUrl: string;
    tolerance: number;
    feather: number;
}

export const minBackgroundTolerance = 12;
export const maxBackgroundTolerance = 140;
export const defaultBackgroundTolerance = 48;
export const minBackgroundFeather = 0;
export const maxBackgroundFeather = 0.8;
export const defaultBackgroundFeather = 0.35;

function sampleEdgeStatistics(data: Uint8ClampedArray, width: number, height: number, overrideTolerance?: number) {
    const sampleColors: number[] = [];
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let samples = 0;
    const stepX = Math.max(1, Math.floor(width / 50));
    const stepY = Math.max(1, Math.floor(height / 50));
    const record = (x: number, y: number) => {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        sampleColors.push(r, g, b);
        sumR += r;
        sumG += g;
        sumB += b;
        samples += 1;
    };
    for (let x = 0; x < width; x += stepX) {
        record(x, 0);
        if (height > 1) record(x, height - 1);
    }
    for (let y = 0; y < height; y += stepY) {
        record(0, y);
        if (width > 1) record(width - 1, y);
    }
    if (samples === 0) {
        const tol = overrideTolerance ?? defaultBackgroundTolerance;
        return { avgR: 255, avgG: 255, avgB: 255, toleranceSq: tol * tol };
    }
    const avgR = sumR / samples;
    const avgG = sumG / samples;
    const avgB = sumB / samples;
    let variance = 0;
    for (let i = 0; i < sampleColors.length; i += 3) {
        const dr = sampleColors[i] - avgR;
        const dg = sampleColors[i + 1] - avgG;
        const db = sampleColors[i + 2] - avgB;
        variance += (dr * dr + dg * dg + db * db) / 3;
    }
    variance /= samples;
    const autoTol = Math.max(minBackgroundTolerance, Math.min(maxBackgroundTolerance, Math.sqrt(variance) * 3 + 18));
    const baseTol = overrideTolerance ?? autoTol;
    const clamped = Math.max(minBackgroundTolerance, Math.min(maxBackgroundTolerance, baseTol));
    return { avgR, avgG, avgB, toleranceSq: clamped * clamped };
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed'));
        img.src = src;
    });
}

async function generateTransparentImage(src: string, options: BackgroundRemovalOptions = {}): Promise<BackgroundRemovalResult | null> {
    const image = await loadImageElement(src);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const requestedTolerance = options.tolerance == null ? null : clamp(options.tolerance, minBackgroundTolerance, maxBackgroundTolerance);
    const requestedFeather = clamp(options.feather ?? defaultBackgroundFeather, minBackgroundFeather, maxBackgroundFeather);
    const { avgR, avgG, avgB, toleranceSq } = sampleEdgeStatistics(data, width, height, requestedTolerance ?? undefined);
    const resolvedTolerance = requestedTolerance ?? Math.sqrt(toleranceSq);
    const limit = resolvedTolerance * resolvedTolerance;
    const visited = new Uint8Array(width * height);
    const queue = new Uint32Array(width * height);
    let head = 0;
    let tail = 0;
    const tryVisit = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const idx = y * width + x;
        if (visited[idx]) return;
        const p = idx * 4;
        const dr = data[p] - avgR;
        const dg = data[p + 1] - avgG;
        const db = data[p + 2] - avgB;
        if ((dr * dr + dg * dg + db * db) <= limit) {
            visited[idx] = 1;
            queue[tail++] = idx;
        }
    };
    for (let x = 0; x < width; x++) {
        tryVisit(x, 0);
        tryVisit(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        tryVisit(0, y);
        tryVisit(width - 1, y);
    }
    const directions = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
    ];
    while (head < tail) {
        const idx = queue[head++];
        const x = idx % width;
        const y = Math.floor(idx / width);
        for (const dir of directions) {
            tryVisit(x + dir.dx, y + dir.dy);
        }
    }
    for (let i = 0; i < width * height; i++) {
        if (visited[i]) {
            data[i * 4 + 3] = 0;
        }
    }
    const feather = requestedFeather;
    if (feather > 0) {
        const clampFeather = Math.min(Math.max(feather, 0), 1);
        const neighborOffsets = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 1 },
            { dx: 1, dy: 1 },
        ];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (visited[idx]) continue;
                let touching = false;
                for (const off of neighborOffsets) {
                    const nx = x + off.dx;
                    const ny = y + off.dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (visited[ny * width + nx]) {
                        touching = true;
                        break;
                    }
                }
                if (touching) {
                    const alphaIndex = idx * 4 + 3;
                    data[alphaIndex] = Math.round(data[alphaIndex] * (1 - clampFeather));
                }
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), tolerance: resolvedTolerance, feather };
}

export async function removeBackgroundFromSelectedImage(options: BackgroundRemovalOptions = {}): Promise<BackgroundRemovalResult | null> {
    if (!selectedElement || !selectedElement.classed('pasted-image')) return null;
    const image = selectedElement.select<SVGImageElement>('image');
    if (image.empty()) return null;
    const data = selectedElement.datum() as any;
    const href = image.attr('href');
    if (!href) return null;
    const baseSrc = data.originalSrc ?? href;
    try {
        const processed = await generateTransparentImage(baseSrc, options);
        if (!processed) return null;
        if (!data.originalSrc) {
            data.originalSrc = href;
        }
        data.src = processed.dataUrl;
        data.backgroundRemoved = true;
        data.removalTolerance = processed.tolerance;
        data.removalFeather = processed.feather;
        image.attr('href', processed.dataUrl);
        selectedElement.classed('background-removed', true);
        return processed;
    } catch (err) {
        console.error('Failed to remove background', err);
        return null;
    }
}

export function restoreSelectedImageBackground() {
    if (!selectedElement || !selectedElement.classed('pasted-image')) return false;
    const data = selectedElement.datum() as any;
    if (!data.originalSrc) return false;
    const image = selectedElement.select<SVGImageElement>('image');
    if (image.empty()) return false;
    image.attr('href', data.originalSrc);
    data.src = data.originalSrc;
    data.backgroundRemoved = false;
    selectedElement.classed('background-removed', false);
    return true;
}

export function applyLineAppearance(element: Selection<SVGGElement, any, any, any>) {
    const data = element.datum() as any;
    const color = data.color ?? 'black';
    element.select('path').attr('stroke', color).attr('d', linePath(data));
    let defs = element.select<SVGDefsElement>('defs');
    if (defs.empty()) defs = element.append('defs');
    defs.selectAll('*').remove();
    const hasStart = data.startStyle && data.startStyle !== 'none';
    const hasEnd = data.endStyle && data.endStyle !== 'none';
    if (hasStart || hasEnd) {
        const common = {
            markerWidth: 10,
            markerHeight: 10,
            refY: 5
        } as const;
        let startMarker: Selection<SVGMarkerElement, unknown, any, any> | null = null;
        let endMarker: Selection<SVGMarkerElement, unknown, any, any> | null = null;
        if (hasStart) {
            startMarker = defs.append('marker')
                .attr('id', `${data.id}-start`)
                .attr('markerWidth', common.markerWidth)
                .attr('markerHeight', common.markerHeight)
                .attr('refY', common.refY)
                .attr('orient', 'auto-start-reverse');
        }
        if (hasEnd) {
            endMarker = defs.append('marker')
                .attr('id', `${data.id}-end`)
                .attr('markerWidth', common.markerWidth)
                .attr('markerHeight', common.markerHeight)
                .attr('refY', common.refY)
                .attr('orient', 'auto');
        }

        const drawShape = (m: Selection<SVGMarkerElement, unknown, any, any> | null, style: string, start: boolean) => {
            if (!m) return;
            if (style === 'circle') {
                m.attr('refX', 5)
                    .append('circle').attr('cx', 5).attr('cy', 5).attr('r', 3).attr('fill', color);
            } else if (style === 'arrow') {
                m.attr('refX', 10)
                    .append('path').attr('d', 'M0,0 L10,5 L0,10').attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5);
            } else if (style === 'triangle') {
                m.attr('refX', 9)
                    .append('path').attr('d', 'M0,1 L9,5 L0,9 Z').attr('fill', color);
            }
        };
        drawShape(startMarker, data.startStyle, true);
        drawShape(endMarker, data.endStyle, false);
        element.select('path')
            .attr('marker-start', hasStart ? `url(#${data.id}-start)` : null)
            .attr('marker-end', hasEnd ? `url(#${data.id}-end)` : null);
    } else {
        element.select('path').attr('marker-start', null).attr('marker-end', null);
    }
    const p = element.select<SVGPathElement>('path').node();
    if (p) {
        const mid = p.getPointAtLength(p.getTotalLength() / 2);
        element.select<SVGTextElement>('text.line-label')
            .attr('x', mid.x)
            .attr('y', mid.y);
    }
}


export interface ElementCopy {
    type: 'image' | 'video' | 'audio' | 'sticky' | 'board' | 'drawing' | 'code' | 'line' | 'frame' | 'meta';
    data: any;
}

export function getSelectedElementData(): ElementCopy | null {
    if (!selectedElement) return null;
    let type: ElementCopy['type'] | null = null;
    if (selectedElement.classed('pasted-image')) type = 'image';
    else if (selectedElement.classed('embedded-video')) type = 'video';
    else if (selectedElement.classed('embedded-audio')) type = 'audio';
    else if (selectedElement.classed('sticky-note')) type = 'sticky';
    else if (selectedElement.classed('code-block')) type = 'code';
    else if (selectedElement.classed('guitar-board')) type = 'board';
    else if (selectedElement.classed('drawing')) type = 'drawing';
    else if (selectedElement.classed('line-element')) type = 'line';
    else if (selectedElement.classed('frame-element')) type = 'frame';
    if (!type) return null;
    const data = { ...(selectedElement.datum() as any) };
    if (type === 'board') {
        data.notes = selectedElement.selectAll('.note').data();
    }
    return { type, data };
}

export function isStickySelected(): boolean {
    return !!selectedElement && selectedElement.classed('sticky-note');
}

export function isCodeSelected(): boolean {
    return !!selectedElement && selectedElement.classed('code-block');
}

interface ResizeOptions {
    lockAspectRatio?: boolean;
    rotatable?: boolean;
    onResizeEnd?: (element: Selection<any, any, any, any>) => void;
}

function addResizeHandle(element: Selection<any, any, any, any>, options: ResizeOptions = {}) {
    const { lockAspectRatio = true } = options;
    const handleSize = 16;

    if (!element.select('.resize-handle').empty()) return;

    const data: any = element.datum();
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const width = data.width ?? bbox.width;
    const height = data.height ?? bbox.height;
    const transform: TransformValues = data.transform ?? defaultTransform();
    data.transform = transform;

    const handle = element.append('text')
        .attr('class', 'resize-handle')
        .attr('x', width + handleSize / transform.scaleX)
        .attr('y', height + handleSize / transform.scaleY)
        .text('\u2921')
        .attr('font-size', handleSize / Math.max(transform.scaleX, transform.scaleY))
        .style('cursor', 'nwse-resize')
        .style('user-select', 'none')
        .style('vector-effect', 'non-scaling-stroke');

    if (!element.select('.component-debug-cross').empty()) {
        updateDebugCross(element);
    } else if (debugEnabled) {
        addDebugCross(element);
    }

    handle.call(
        d3.drag<SVGTextElement, unknown>()
            .on('start', function (event: MouseEvent) {
                const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);

                const overlay = element.select('.crop-controls');
                if (!overlay.empty() && overlay.style('display') !== 'none') {
                    finishCrop(element);
                }

                window.dispatchEvent(new CustomEvent('element-resize-start', { detail: element.node() }));

                const bbox = (element.node() as SVGGraphicsElement).getBBox();
                const data = element.datum() as any;
                const width = data.width ?? bbox.width;
                const height = data.height ?? bbox.height;
                const transform: TransformValues = data.transform ?? defaultTransform();
                data.transform = transform;
                const [startX, startY] = toWorkspaceCoords(event);
                debugLog('resize start', width, height);
                setGridVisible((event as any).sourceEvent?.ctrlKey);

                d3.select(this)
                    .datum({ startX, startY, transform, width, height, origWidth: width, origHeight: height });
            })
            .on('drag', function (event: MouseEvent) {
                const data = d3.select<any, any>(this).datum();
                const { transform } = data;

                const [mx, my] = toWorkspaceCoords(event);
                const dx = mx - data.startX;
                const dy = my - data.startY;

                let newScaleX = Math.max(0.1, (data.width * transform.scaleX + dx) / data.width);
                let newScaleY = Math.max(0.1, (data.height * transform.scaleY + dy) / data.height);

                const source = (event as any).sourceEvent as MouseEvent | undefined;
                const shift = source?.shiftKey;
                const ctrl = source?.ctrlKey;
                if (lockAspectRatio ? !shift : shift) {
                    const ratio = Math.max(newScaleX, newScaleY);
                    newScaleX = ratio;
                    newScaleY = ratio;
                }

                if (ctrl) {
                    const snapWidth = Math.round((data.width * newScaleX) / 10) * 10;
                    const snapHeight = Math.round((data.height * newScaleY) / 10) * 10;
                    newScaleX = snapWidth / data.width;
                    newScaleY = snapHeight / data.height;
                }

                if (element.classed('sticky-note') || element.classed('code-block')) {
                    const stickyData = element.datum() as any;
                    const width = data.origWidth * newScaleX;
                    const height = data.origHeight * newScaleY;
                    stickyData.width = width;
                    stickyData.height = height;
                    element.select('rect').attr('width', width).attr('height', height);
                    element.select('foreignObject').attr('width', width).attr('height', height);
                    element.select('.selection-outline').attr('width', width).attr('height', height);
                    element.select('.rotate-handle')
                        .attr('x', width + handleSize)
                        .attr('font-size', handleSize);
                    const newTransform: TransformValues = { ...transform, scaleX: 1, scaleY: 1 };
                    applyTransform(element, newTransform);
                    d3.select(this)
                        .attr('x', width + handleSize)
                        .attr('y', height + handleSize)
                        .attr('font-size', handleSize);
                    updateDebugCross(element);
                    debugLog('resize drag', width, height);
                } else {
                    const newTransform: TransformValues = { ...transform, scaleX: newScaleX, scaleY: newScaleY };
                    applyTransform(element, newTransform);

                    const scaledWidth = data.width * newScaleX;
                    const scaledHeight = data.height * newScaleY;

                    d3.select(this)
                        .attr('x', data.width + handleSize / newScaleX)
                        .attr('y', data.height + handleSize / newScaleY)
                        .attr('font-size', handleSize / Math.max(newScaleX, newScaleY));

                    const rotateHandle = element.select('.rotate-handle');
                    if (!rotateHandle.empty()) {
                        rotateHandle
                            .attr('x', data.width + handleSize / newScaleX)
                            .attr('y', -handleSize / newScaleY)
                            .attr('font-size', handleSize / Math.max(newScaleX, newScaleY));
                    }

                    updateDebugCross(element);
                    debugLog('resize drag', newScaleX, newScaleY);
                }
                setGridVisible(!!ctrl);
            })
            .on('end', function () {
                window.dispatchEvent(new CustomEvent('element-resize-end', { detail: element.node() }));
                if ((element.classed('sticky-note') || element.classed('code-block')) && typeof options.onResizeEnd === 'function') {
                    options.onResizeEnd(element);
                }
                updateDebugCross(element);
                setGridVisible(false);
                debugLog('resize end');
            })
    );
}

function addRotateHandle(element: Selection<any, any, any, any>) {
    const handleSize = 16;

    if (!element.select('.rotate-handle').empty()) return;

    const data: any = element.datum();
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const width = data.width ?? bbox.width;
    const height = data.height ?? bbox.height;
    const transform: TransformValues = data.transform ?? defaultTransform();
    data.transform = transform;
    element.append('text')
        .attr('class', 'rotate-handle')
        .attr('x', width + handleSize / transform.scaleX)
        .attr('y', -handleSize / transform.scaleY)
        .text('\u21bb')
        .attr('font-size', handleSize / Math.max(transform.scaleX, transform.scaleY))
        .style('cursor', 'grab')
        .style('user-select', 'none')
        .style('vector-effect', 'non-scaling-stroke')
        .call(
            d3.drag<SVGTextElement, unknown>()
                .on('start', function (event: MouseEvent) {
                    const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                    if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);

                    const overlay = element.select('.crop-controls');
                    if (!overlay.empty() && overlay.style('display') !== 'none') {
                        finishCrop(element);
                    }
                    window.dispatchEvent(new CustomEvent('element-rotate-start', { detail: element.node() }));

                    const data = element.datum() as any;
                    const transform: TransformValues = data.transform ?? defaultTransform();
                    data.transform = transform;
                const bbox = (element.node() as SVGGraphicsElement).getBBox();
                const width = data.width ?? bbox.width;
                const height = data.height ?? bbox.height;
                const centerX = transform.translateX + (width * transform.scaleX) / 2;
                const centerY = transform.translateY + (height * transform.scaleY) / 2;
                const [sx, sy] = toWorkspaceCoords(event);
                const startAngle = Math.atan2(sy - centerY, sx - centerX);
                const cumulative = transform.rotate * Math.PI / 180;
                debugLog('rotate start', startAngle);

                    d3.select(this).datum({ centerX, centerY, lastAngle: startAngle, cumulative, transform });
                })
                .on('drag', function (event: MouseEvent) {
                    const data = d3.select<any, any>(this).datum();
                    const { centerX, centerY, transform } = data;
                    const [px, py] = toWorkspaceCoords(event);
                    const current = Math.atan2(py - centerY, px - centerX);
                    let delta = current - data.lastAngle;
                    if (delta > Math.PI) delta -= 2 * Math.PI;
                    if (delta < -Math.PI) delta += 2 * Math.PI;
                    data.cumulative += delta;
                    data.lastAngle = current;

                    let angle = data.cumulative * 180 / Math.PI;
                    const ctrl = (event as any).sourceEvent?.ctrlKey;
                    if (ctrl) {
                        angle = Math.round(angle / 15) * 15;
                    }

                    const newTransform: TransformValues = { ...transform, rotate: angle };
                    applyTransform(element, newTransform);
                    updateDebugCross(element);
                    debugLog('rotate', newTransform.rotate);
                })
        );
}

export function ensureConnectHandles(element: Selection<any, any, any, any>) {
    if (!element.select('.connect-handle').empty()) return;
    const data: any = element.datum() || {};
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const width = data.width ?? bbox.width;
    const height = data.height ?? bbox.height;
    const transform = data.transform ?? defaultTransform();
    const { scaleX, scaleY } = transform;
    const r = 4 / Math.max(scaleX, scaleY);
    const points = [
        { p: 'n', x: width / 2, y: 0 },
        { p: 'e', x: width, y: height / 2 },
        { p: 's', x: width / 2, y: height },
        { p: 'w', x: 0, y: height / 2 },
    ];
    points.forEach(pt => {
        const h = element.append('circle')
            .attr('class', `connect-handle connect-handle-${pt.p}`)
            .attr('cx', pt.x)
            .attr('cy', pt.y)
            .attr('r', r)
            .attr('data-pos', pt.p)
            .attr('data-parent', data.id)
            .style('pointer-events', 'all')
            .style('fill', '#7fbbf7');
        const abs = transformPoint(pt.x, pt.y, transform, { width, height });
        h.attr('data-abs-x', abs.x).attr('data-abs-y', abs.y);
        h.call(
            d3.drag<SVGCircleElement, unknown>()
                .on('start', function (event) {
                    const [sx, sy] = toWorkspaceCoords(event);
                    window.dispatchEvent(new CustomEvent('lineconnectstart', { detail: { elementId: data.id, position: pt.p, x: sx, y: sy } }));
                })
                .on('drag', function (event) {
                    const [mx, my] = toWorkspaceCoords(event);
                    window.dispatchEvent(new CustomEvent('lineconnectdrag', { detail: { x: mx, y: my } }));
                })
                .on('end', function (event) {
                    const [ex, ey] = toWorkspaceCoords(event);
                    window.dispatchEvent(new CustomEvent('lineconnectend', { detail: { x: ex, y: ey } }));
                })
        );
    });
}

export function removeConnectHandles(element: Selection<any, any, any, any>) {
    element.selectAll('.connect-handle').remove();
}

function addOutline(element: Selection<any, any, any, any>) {
    if (!element.select('.selection-outline').empty()) return;

    const data = element.datum() as any;
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const width = data.width ?? bbox.width;
    const height = data.height ?? bbox.height;
    const { scaleX, scaleY } = (data.transform ?? defaultTransform());

    element.append('rect')
        .attr('class', 'selection-outline')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
    .attr('stroke', '#7fbbf7')
        .attr('stroke-width', 1 / Math.max(scaleX, scaleY))
        .style('pointer-events', 'none')
        .style('vector-effect', 'non-scaling-stroke');
}

function clearSelection() {
    if (!selectedElement) return;
    // finish active crop before clearing selection
    const overlay = selectedElement.select('.crop-controls');
    if (!overlay.empty() && overlay.style('display') !== 'none') {
        finishCrop(selectedElement);
    }
    selectedElement.selectAll('.selection-outline').remove();
    selectedElement.selectAll('.resize-handle').remove();
    selectedElement.selectAll('.rotate-handle').remove();
    selectedElement.selectAll('.connect-handle').remove();
    selectedElement = null;
    dispatchSelectionChange();
}

export function makeResizable(selection: Selection<any, any, any, any>, options: ResizeOptions = {}) {
    if (!globalInit) {
        d3.select(window).on('keydown.makeResizable', (event: KeyboardEvent) => {
            if (event.key === 'Delete' && selectedElement) {
                selectedElement.remove();
                selectedElement = null;
            } else if (event.key === 'r' && selectedElement) {
                const data = selectedElement.datum() as any;
                const transform: TransformValues = data.transform ?? defaultTransform();
                const newTransform: TransformValues = { ...transform, rotate: 0 };
                applyTransform(selectedElement, newTransform);
            }
        });

        d3.select(window).on('click.makeResizable', (event: MouseEvent) => {
            const controls = document.getElementById('board-controls');
            const colorSelect = document.getElementById('sticky-color-select');
            const frameColorSelect = document.getElementById('frame-color-select');
            const alignControls = document.getElementById('sticky-align-controls');
            const target = event.target as Node;
            const isSvg = target instanceof SVGElement;
            if (
                selectedElement &&
                isSvg &&
                !selectedElement.node()?.contains(target) &&
                !(controls && controls.contains(target)) &&
                !(colorSelect && colorSelect.contains(target)) &&
                !(frameColorSelect && frameColorSelect.contains(target)) &&
                !(alignControls && alignControls.contains(target))
            ) {
                clearSelection();
            }
        });

        globalInit = true;
    }

    selection
        .style('cursor', 'pointer')
        .on('click.makeResizable', function (event: MouseEvent) {
            event.stopPropagation();
            const element = d3.select(this);

            if (selectedElement && selectedElement.node() !== this) {
                clearSelection();
            }

            selectedElement = element;
            addOutline(element);
            if (!element.classed('line-element')) {
                addResizeHandle(element, options);
                ensureConnectHandles(element);
                if (options.rotatable) {
                    addRotateHandle(element);
                }
            }
            if (debugEnabled) {
                if (element.select('.component-debug-cross').empty()) {
                    addDebugCross(element);
                } else {
                    updateDebugCross(element);
                }
            }
            dispatchSelectionChange();
        });
}

interface CropValues {
    x: number;
    y: number;
    width: number;
    height: number;
}

let cropInit = false;
let clipIdCounter = 0;

function updateCropOverlay(element: Selection<any, any, any, any>) {
    const image = element.select('image');
    const overlay = element.select('.crop-controls');
    const rect = overlay.select<SVGRectElement>('.crop-rect');

    const imgWidth = parseFloat(image.attr('width') ?? '0');
    const imgHeight = parseFloat(image.attr('height') ?? '0');
    const x = parseFloat(rect.attr('x') ?? '0');
    const y = parseFloat(rect.attr('y') ?? '0');
    const width = parseFloat(rect.attr('width') ?? '0');
    const height = parseFloat(rect.attr('height') ?? '0');

    if ([imgWidth, imgHeight, x, y, width, height].some(v => isNaN(v))) {
        return;
    }

    overlay.select('.crop-handle-n')
        .attr('x', x + width / 2)
        .attr('y', y);
    overlay.select('.crop-handle-e')
        .attr('x', x + width)
        .attr('y', y + height / 2);
    overlay.select('.crop-handle-s')
        .attr('x', x + width / 2)
        .attr('y', y + height);
    overlay.select('.crop-handle-w')
        .attr('x', x)
        .attr('y', y + height / 2);

    overlay.select('.crop-shade-top')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', imgWidth)
        .attr('height', y);

    overlay.select('.crop-shade-bottom')
        .attr('x', 0)
        .attr('y', y + height)
        .attr('width', imgWidth)
        .attr('height', imgHeight - y - height);

    overlay.select('.crop-shade-left')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', x)
        .attr('height', height);

    overlay.select('.crop-shade-right')
        .attr('x', x + width)
        .attr('y', y)
        .attr('width', imgWidth - x - width)
        .attr('height', height);
}

function startCrop(element: Selection<any, any, any, any>) {
    window.dispatchEvent(new CustomEvent('element-crop-start', { detail: element.node() }));
    const data = element.datum() as any || {};
    let crop: CropValues = data.crop;
    if (!crop) {
        const image = element.select('image');
        const bbox = (image.node() as SVGGraphicsElement).getBBox();
        crop = { x: 0, y: 0, width: bbox.width, height: bbox.height };
        data.crop = crop;
        element.datum(data);
    }
    const image = element.select('image');
    image.attr('clip-path', null).style('opacity', 0.5);
    crop.x = crop.x ?? 0;
    crop.y = crop.y ?? 0;
    crop.width = crop.width ?? 0;
    crop.height = crop.height ?? 0;
    const overlay = element.select('.crop-controls');
    const rect = overlay.select('.crop-rect');
    rect
        .attr('x', crop.x)
        .attr('y', crop.y)
        .attr('width', crop.width)
        .attr('height', crop.height);

    overlay.style('display', null);

    updateCropOverlay(element);
}

function finishCrop(element: Selection<any, any, any, any>) {
    const overlay = element.select('.crop-controls');
    const rect = overlay.select('.crop-rect');
    const clipRect = element.select('.clip-rect');
    const data = element.datum() as any;
    const image = element.select('image');

    const x = parseFloat(rect.attr('x') ?? '0');
    const y = parseFloat(rect.attr('y') ?? '0');
    const width = parseFloat(rect.attr('width') ?? '0');
    const height = parseFloat(rect.attr('height') ?? '0');

    data.crop = { x, y, width, height } as CropValues;

    clipRect
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height);

    overlay.style('display', 'none');
    image.attr('clip-path', `url(#${data.clipId})`).style('opacity', null);
}

function toggleCrop(element: Selection<any, any, any, any>) {
    const overlay = element.select('.crop-controls');
    if (overlay.style('display') === 'none') {
        startCrop(element);
    } else {
        finishCrop(element);
    }
}

export function makeCroppable(selection: Selection<any, any, any, any>) {
    if (!cropInit) {
        d3.select(window).on('keydown.makeCroppable', (event: KeyboardEvent) => {
            if (event.key === 'c' && !event.ctrlKey && selectedElement && selectedElement.classed('croppable')) {
                event.preventDefault();
                toggleCrop(selectedElement);
            }
        });

        cropInit = true;
    }

    selection
        .classed('croppable', true)
        .each(function () {
            const element = d3.select(this);
            const image = element.select('image');
            const bbox = (image.node() as SVGGraphicsElement).getBBox();

            const clipId = `clip-${clipIdCounter++}`;
            const clip = element.append('clipPath')
                .attr('id', clipId);
            clip.append('rect')
                .attr('class', 'clip-rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', bbox.width)
                .attr('height', bbox.height);

            image.attr('clip-path', `url(#${clipId})`);

            const overlay = element.append('g')
                .attr('class', 'crop-controls')
                .style('display', 'none');

            overlay.append('rect')
                .attr('class', 'crop-rect')
                .attr('fill', 'none')
                .attr('stroke', '#7fbbf7')
                .attr('stroke-width', 1);

            const handleClasses = ['n', 'e', 's', 'w'];
            for (const dir of handleClasses) {
                const char = dir === 'n' || dir === 's' ? '\u2195' : '\u2194';
                overlay.append('text')
                    .attr('class', `crop-handle crop-handle-${dir}`)
                    .text(char)
                    .attr('font-size', 16)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .style('user-select', 'none')
                    .style('vector-effect', 'non-scaling-stroke');
            }

            overlay.append('rect').attr('class', 'crop-shade-top');
            overlay.append('rect').attr('class', 'crop-shade-right');
            overlay.append('rect').attr('class', 'crop-shade-bottom');
            overlay.append('rect').attr('class', 'crop-shade-left');

            const rect = overlay.select<SVGRectElement>('.crop-rect');

            const handleN = overlay.select<SVGTextElement>('.crop-handle-n');
            handleN.call(
                d3.drag<SVGTextElement, unknown>()
                    .on('start', function (event: any) {
                        const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                        if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                        const y = parseFloat(rect.attr('y') ?? '0');
                        const height = parseFloat(rect.attr('height') ?? '0');
                        const imgH = parseFloat(image.attr('height') ?? '0');
                        (this as any).__drag = { y, height, imgH };
                    })
                    .on('drag', function (event: any) {
                        const drag = (this as any).__drag;
                        if (!drag) return;
                        let newY = Math.min(drag.y + drag.height - 1, Math.max(0, event.y));
                        let newHeight = drag.height + (drag.y - newY);
                        if (newY + newHeight > drag.imgH) {
                            newY = drag.imgH - newHeight;
                        }
                        rect.attr('y', newY).attr('height', newHeight);
                        updateCropOverlay(element);
                    })
            );

            const handleS = overlay.select<SVGTextElement>('.crop-handle-s');
            handleS.call(
                d3.drag<SVGTextElement, unknown>()
                    .on('start', function (event: any) {
                        const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                        if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                        const height = parseFloat(rect.attr('height') ?? '0');
                        const imgH = parseFloat(image.attr('height') ?? '0');
                        const y = parseFloat(rect.attr('y') ?? '0');
                        (this as any).__drag = { startY: event.y, height, imgH, y };
                    })
                    .on('drag', function (event: any) {
                        const drag = (this as any).__drag;
                        if (!drag) return;
                        let newHeight = Math.max(1, drag.height + event.y - drag.startY);
                        if (drag.y + newHeight > drag.imgH) {
                            newHeight = drag.imgH - drag.y;
                        }
                        rect.attr('height', newHeight);
                        updateCropOverlay(element);
                    })
            );

            const handleE = overlay.select<SVGTextElement>('.crop-handle-e');
            handleE.call(
                d3.drag<SVGTextElement, unknown>()
                    .on('start', function (event: any) {
                        const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                        if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                        const width = parseFloat(rect.attr('width') ?? '0');
                        const imgW = parseFloat(image.attr('width') ?? '0');
                        const x = parseFloat(rect.attr('x') ?? '0');
                        (this as any).__drag = { startX: event.x, width, imgW, x };
                    })
                    .on('drag', function (event: any) {
                        const drag = (this as any).__drag;
                        if (!drag) return;
                        let newWidth = Math.max(1, drag.width + event.x - drag.startX);
                        if (drag.x + newWidth > drag.imgW) {
                            newWidth = drag.imgW - drag.x;
                        }
                        rect.attr('width', newWidth);
                        updateCropOverlay(element);
                    })
            );

            const handleW = overlay.select<SVGTextElement>('.crop-handle-w');
            handleW.call(
                d3.drag<SVGTextElement, unknown>()
                    .on('start', function (event: any) {
                        const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                        if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                        const x = parseFloat(rect.attr('x') ?? '0');
                        const width = parseFloat(rect.attr('width') ?? '0');
                        const imgW = parseFloat(image.attr('width') ?? '0');
                        (this as any).__drag = { startX: event.x, x, width, imgW };
                    })
                    .on('drag', function (event: any) {
                        const drag = (this as any).__drag;
                        if (!drag) return;
                        let newX = Math.min(drag.x + drag.width - 1, Math.max(0, event.x));
                        let newWidth = drag.width + (drag.x - newX);
                        if (newX + newWidth > drag.imgW) {
                            newX = drag.imgW - newWidth;
                        }
                        rect.attr('x', newX).attr('width', newWidth);
                        updateCropOverlay(element);
                    })
            );

            element.datum<any>({ ...(element.datum() || {}), crop: { x: 0, y: 0, width: bbox.width, height: bbox.height }, clipId });

            element.on('dblclick.makeCroppable', (event: MouseEvent) => {
                event.stopPropagation();
                toggleCrop(element);
            });
        });
}

