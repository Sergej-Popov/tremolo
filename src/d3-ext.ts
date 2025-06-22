import * as d3 from 'd3';
import { BaseType, Selection } from 'd3';

let zoomTransform: d3.ZoomTransform = d3.zoomIdentity;
let svgRoot: SVGSVGElement | null = null;

let debugEnabled = false;

export function generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return (crypto as any).randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function setDebugMode(enabled: boolean) {
    debugEnabled = enabled;
}

export function setZoomTransform(transform: d3.ZoomTransform) {
    zoomTransform = transform;
}

export function setSvgRoot(svg: SVGSVGElement | null) {
    svgRoot = svg;
    if (!svgRoot) return;
    const sel = d3.select(svgRoot);
    let defs = sel.select('defs');
    if (defs.empty()) defs = sel.append('defs');
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
    let grid = sel.select<SVGRectElement>('.grid-overlay');
    if (grid.empty()) {
        grid = sel.insert('rect', ':first-child')
            .attr('class', 'grid-overlay')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', 'url(#drag-grid-pattern)')
            .style('pointer-events', 'none')
            .style('display', 'none');
    }
}

function setGridVisible(visible: boolean) {
    if (!svgRoot) return;
    d3.select(svgRoot).select('.grid-overlay')
        .style('display', visible ? 'block' : 'none');
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
    if (selectedElement && element.node() === selectedElement.node()) {
        dispatchSelectionChange();
    }
}

export function makeDraggable(selection: Selection<any, any, any, any>) {
    interface DragDatum {
        dragOffsetX: number;
        dragOffsetY: number;
        transform: TransformValues;
        startX: number;
        startY: number;
    };

    selection.call(
        d3.drag()
            .on('start', function (event: MouseEvent) {
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
                element.datum<DragDatum>({ ...data, dragOffsetX, dragOffsetY, transform, startX: transform.translateX, startY: transform.translateY });
                setGridVisible(event.ctrlKey);
            })
            .on('drag', function (event: MouseEvent) {
                const element = d3.select<any, DragDatum>(this);
                const data = element.datum();
                const { dragOffsetX, dragOffsetY, transform, startX, startY } = data;

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

                applyTransform(element, newTransform);
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
}

export function updateSelectedColor(color: string) {
    if (selectedElement && selectedElement.classed('sticky-note')) {
        selectedElement.select('rect').attr('fill', color);
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

export interface ElementCopy {
    type: 'image' | 'video' | 'sticky' | 'board';
    data: any;
}

export function getSelectedElementData(): ElementCopy | null {
    if (!selectedElement) return null;
    let type: ElementCopy['type'] | null = null;
    if (selectedElement.classed('pasted-image')) type = 'image';
    else if (selectedElement.classed('embedded-video')) type = 'video';
    else if (selectedElement.classed('sticky-note')) type = 'sticky';
    else if (selectedElement.classed('guitar-board')) type = 'board';
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

                const bbox = (element.node() as SVGGraphicsElement).getBBox();
                const data = element.datum() as any;
                const width = data.width ?? bbox.width;
                const height = data.height ?? bbox.height;
                const transform: TransformValues = data.transform ?? defaultTransform();
                data.transform = transform;
                const [startX, startY] = toWorkspaceCoords(event);
                debugLog('resize start', width, height);

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

                const shift = (event as any).sourceEvent?.shiftKey;
                if (lockAspectRatio ? !shift : shift) {
                    const ratio = Math.max(newScaleX, newScaleY);
                    newScaleX = ratio;
                    newScaleY = ratio;
                }

                if (element.classed('sticky-note')) {
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
            })
            .on('end', function () {
                if (element.classed('sticky-note') && typeof options.onResizeEnd === 'function') {
                    options.onResizeEnd(element);
                }
                updateDebugCross(element);
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
                        data.cumulative = angle * Math.PI / 180;
                    }

                    const newTransform: TransformValues = { ...transform, rotate: angle };
                    applyTransform(element, newTransform);
                    updateDebugCross(element);
                    debugLog('rotate', newTransform.rotate);
                })
        );
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
            const alignControls = document.getElementById('sticky-align-controls');
            const target = event.target as Node;
            const isSvg = target instanceof SVGElement;
            if (
                selectedElement &&
                isSvg &&
                !selectedElement.node()?.contains(target) &&
                !(controls && controls.contains(target)) &&
                !(colorSelect && colorSelect.contains(target)) &&
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
            addResizeHandle(element, options);
            if (options.rotatable) {
                addRotateHandle(element);
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

