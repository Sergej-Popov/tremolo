import * as d3 from 'd3';
import type { Selection } from 'd3';
import { HANDLE_ICON_SIZE } from './constants';
import { setGridVisible, toWorkspaceCoords } from './environment';
import { debugLog, addDebugCross, updateDebugCross } from './debug';
import { highlightCode } from './highlight';
import { adjustStickyFont } from './text';
import { applyLineAppearance, applyFrameStrokeAttributes } from './lines';
import { linePath } from './paths';
import { defaultTransform, type TransformValues } from './metrics';
import { updateSelectionDecorations, applyTransform } from './transforms';
import {
    getSelectedElement,
    setSelectedElement,
    notifySelectionChange,
    isDebugMode,
} from './state';
import { finishCrop, updateCropOverlay } from './crop';

// Selection management

function addOutline(element: Selection<any, any, any, any>) {
    if (!element.select('.selection-outline').empty()) return;

    const data = element.datum() as any;
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const width = data.width ?? bbox.width;
    const height = data.height ?? bbox.height;
    const transform = data.transform ?? defaultTransform();

    element.append('rect')
        .attr('class', 'selection-outline')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .attr('stroke', '#7fbbf7')
        .style('pointer-events', 'none')
        .attr('vector-effect', 'non-scaling-stroke');

    updateSelectionDecorations(element, { width, height, transform });
}

export function clearSelection() {
    const selectedElement = getSelectedElement();
    if (!selectedElement) return;
    const overlay = selectedElement.select('.crop-controls');
    if (!overlay.empty() && overlay.style('display') !== 'none') {
        finishCrop(selectedElement);
    }
    selectedElement.selectAll('.selection-outline').remove();
    selectedElement.selectAll('.resize-handle').remove();
    selectedElement.selectAll('.rotate-handle').remove();
    selectedElement.selectAll('.connect-handle').remove();
    setSelectedElement(null);
    notifySelectionChange();
}

export function applySelectionToElement(element: Selection<any, any, any, any>) {
    const node = element.node();
    if (!node) return;

    const selectedElement = getSelectedElement();
    const alreadySelected = !!selectedElement && selectedElement.node() === node;
    if (!alreadySelected && selectedElement) {
        clearSelection();
    }

    setSelectedElement(element);

    addOutline(element);
    if (!element.classed('line-element')) {
        addResizeHandle(element, getResizeOptions(node));
        ensureConnectHandles(element);
        const options = getResizeOptions(node);
        if (options.rotatable) {
            addRotateHandle(element);
        }
    }

    if (isDebugMode()) {
        if (element.select('.component-debug-cross').empty()) {
            addDebugCross(element);
        } else {
            updateDebugCross(element);
        }
    }

    updateSelectionDecorations(element);
    notifySelectionChange();
}

// Resize handle management will be defined later in this module but referenced above.
interface ResizeOptions {
    lockAspectRatio?: boolean;
    rotatable?: boolean;
    onResizeEnd?: (element: Selection<any, any, any, any>) => void;
}

const resizeOptionsByElement = new WeakMap<Element, ResizeOptions>();

function getResizeOptions(node: Element | null): ResizeOptions {
    if (!node) return {};
    return resizeOptionsByElement.get(node) ?? {};
}

// Connect handle helpers

export function ensureConnectHandles(element: Selection<any, any, any, any>) {
    if (!element.select('.connect-handle').empty()) return;
    const data: any = element.datum() || {};
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const width = data.width ?? bbox.width;
    const height = data.height ?? bbox.height;
    const transform: TransformValues = data.transform ?? defaultTransform();
    const points = [
        { p: 'n', x: width / 2, y: 0 },
        { p: 'e', x: width, y: height / 2 },
        { p: 's', x: width / 2, y: height },
        { p: 'w', x: 0, y: height / 2 },
    ];
    points.forEach(pt => {
        const handle = element.append('circle')
            .attr('class', `connect-handle connect-handle-${pt.p}`)
            .attr('data-pos', pt.p)
            .attr('data-parent', data.id)
            .style('pointer-events', 'all')
            .style('fill', '#7fbbf7');
        handle.call(
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
                }),
        );
    });

    updateSelectionDecorations(element, { width, height, transform });
}

export function removeConnectHandles(element: Selection<any, any, any, any>) {
    element.selectAll('.connect-handle').remove();
}

// Selection update helpers

export function updateSelectedColor(color: string) {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('sticky-note')) {
        selectedElement.select('rect').attr('fill', color);
        const data = selectedElement.datum() as any;
        data.color = color;
    }
}

export function updateSelectedFrameColor(color: string) {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('frame-element')) {
        selectedElement.select<SVGRectElement>('rect.frame-rect').attr('fill', color);
        const data = selectedElement.datum() as any;
        data.color = color;
    }
}

export function updateSelectedFrameLineStyle(style: 'solid' | 'dashed' | 'dotted') {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('frame-element')) {
        const rect = selectedElement.select<SVGRectElement>('rect.frame-rect');
        applyFrameStrokeAttributes(rect, style);
        const data = selectedElement.datum() as any;
        data.lineStyle = style;
    }
}

export function updateSelectedAlignment(align: 'left' | 'center' | 'right') {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('sticky-note')) {
        selectedElement.select<HTMLElement>('foreignObject > .sticky-text')
            .style('text-align', align);
        const data = selectedElement.datum() as any;
        data.align = align;
    }
}

export function updateSelectedFontSize(size: number | 'auto') {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('sticky-note')) {
        const div = selectedElement.select<HTMLDivElement>('foreignObject > .sticky-text').node();
        const data = selectedElement.datum() as any;
        data.fontSize = size === 'auto' ? null : size;
        if (div) adjustStickyFont(div, size === 'auto' ? null : size);
    }
}

export async function updateSelectedCodeLang(lang: string) {
    const selectedElement = getSelectedElement();
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
    const selectedElement = getSelectedElement();
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
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('code-block')) {
        const data = selectedElement.datum() as any;
        data.fontSize = size;
        selectedElement.select<HTMLPreElement>('foreignObject > pre')
            .style('font-size', `${size}px`);
    }
}

export function updateSelectedLineStyle(style: 'direct' | 'arc' | 'corner') {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('line-element')) {
        const data = selectedElement.datum() as any;
        data.style = style;
        selectedElement.select('path').attr('d', linePath(data));
        applyLineAppearance(selectedElement as any);
        const path = selectedElement.select<SVGPathElement>('path').node();
        if (path) {
            const mid = path.getPointAtLength(path.getTotalLength() / 2);
            selectedElement.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    }
}

export function updateSelectedLineColor(color: string) {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('line-element')) {
        const data = selectedElement.datum() as any;
        data.color = color;
        applyLineAppearance(selectedElement as any);
        const path = selectedElement.select<SVGPathElement>('path').node();
        if (path) {
            const mid = path.getPointAtLength(path.getTotalLength() / 2);
            selectedElement.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    }
}

export function updateSelectedStartConnectionStyle(style: 'circle' | 'arrow' | 'triangle' | 'none') {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('line-element')) {
        const data = selectedElement.datum() as any;
        data.startStyle = style;
        applyLineAppearance(selectedElement as any);
        const path = selectedElement.select<SVGPathElement>('path').node();
        if (path) {
            const mid = path.getPointAtLength(path.getTotalLength() / 2);
            selectedElement.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    }
}

export function updateSelectedEndConnectionStyle(style: 'circle' | 'arrow' | 'triangle' | 'none') {
    const selectedElement = getSelectedElement();
    if (selectedElement && selectedElement.classed('line-element')) {
        const data = selectedElement.datum() as any;
        data.endStyle = style;
        applyLineAppearance(selectedElement as any);
        const path = selectedElement.select<SVGPathElement>('path').node();
        if (path) {
            const mid = path.getPointAtLength(path.getTotalLength() / 2);
            selectedElement.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    }
}

export interface ElementCopy {
    type: 'image' | 'video' | 'audio' | 'sticky' | 'board' | 'drawing' | 'code' | 'line' | 'frame' | 'meta';
    data: any;
}

export function getSelectedElementData(): ElementCopy | null {
    const selectedElement = getSelectedElement();
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
    const selectedElement = getSelectedElement();
    return !!selectedElement && selectedElement.classed('sticky-note');
}

export function isCodeSelected(): boolean {
    const selectedElement = getSelectedElement();
    return !!selectedElement && selectedElement.classed('code-block');
}

// Resize & rotate handle logic

const intrinsicResizeClasses = new Set([
    'sticky-note',
    'code-block',
    'pasted-image',
    'embedded-video',
    'embedded-audio',
    'frame-element',
]);

function supportsIntrinsicResize(element: Selection<any, any, any, any>): boolean {
    return Array.from(intrinsicResizeClasses).some(cls => element.classed(cls));
}

function applyElementSize(element: Selection<any, any, any, any>, width: number, height: number) {
    const data = element.datum() as any || {};
    const prevWidth = data.width ?? (element.node() as SVGGraphicsElement).getBBox().width;
    const prevHeight = data.height ?? (element.node() as SVGGraphicsElement).getBBox().height;

    data.width = width;
    data.height = height;
    element.datum(data);

    if (element.classed('sticky-note')) {
        element.select('rect').attr('width', width).attr('height', height);
        element.select('foreignObject').attr('width', width).attr('height', height);
    } else if (element.classed('code-block')) {
        element.select('rect').attr('width', width).attr('height', height);
        element.select('foreignObject').attr('width', width).attr('height', height);
    } else if (element.classed('pasted-image')) {
        element.select('image').attr('width', width).attr('height', height);

        const clipRect = element.select<SVGRectElement>('.clip-rect');
        if (!clipRect.empty()) {
            const scaleX = prevWidth ? width / Math.max(prevWidth, 1e-6) : 1;
            const scaleY = prevHeight ? height / Math.max(prevHeight, 1e-6) : 1;
            if (data.crop) {
                data.crop = {
                    x: (data.crop.x ?? 0) * scaleX,
                    y: (data.crop.y ?? 0) * scaleY,
                    width: (data.crop.width ?? width) * scaleX,
                    height: (data.crop.height ?? height) * scaleY,
                };
                clipRect
                    .attr('x', data.crop.x)
                    .attr('y', data.crop.y)
                    .attr('width', data.crop.width)
                    .attr('height', data.crop.height);
            }
        }
    } else if (element.classed('embedded-video') || element.classed('embedded-audio')) {
        element.select('rect').attr('width', width).attr('height', height);
        const fo = element.select<SVGForeignObjectElement>('foreignObject');
        if (!fo.empty()) {
            const padX = parseFloat(fo.attr('x') ?? '0');
            const padY = parseFloat(fo.attr('y') ?? '0');
            const innerWidth = Math.max(0, width - padX * 2);
            const innerHeight = Math.max(0, height - padY * 2);
            fo.attr('width', innerWidth).attr('height', innerHeight);
        }
    } else if (element.classed('frame-element')) {
        element.select<SVGRectElement>('rect.frame-rect')
            .attr('width', width)
            .attr('height', height);
    }

    const overlay = element.select('.crop-controls');
    if (!overlay.empty() && overlay.style('display') !== 'none') {
        updateCropOverlay(element);
    }
}

function addResizeHandle(element: Selection<any, any, any, any>, options: ResizeOptions = {}) {
    const { lockAspectRatio = true } = options;

    if (!element.select('.resize-handle').empty()) return;

    const data: any = element.datum();
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const width = data.width ?? bbox.width;
    const height = data.height ?? bbox.height;
    const transform: TransformValues = data.transform ?? defaultTransform();
    data.transform = transform;

    const handle = element.append('text')
        .attr('class', 'resize-handle')
        .text('\u2921')
        .style('cursor', 'nwse-resize')
        .style('user-select', 'none')
        .attr('vector-effect', 'non-scaling-stroke');

    updateSelectionDecorations(element, { width, height, transform });

    if (!element.select('.component-debug-cross').empty()) {
        updateDebugCross(element);
    } else if (isDebugMode()) {
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
                    .datum({ startX, startY, transform, width, height });
            })
            .on('drag', function (event: MouseEvent) {
                const dragData = d3.select<any, any>(this).datum();
                const { transform, width, height } = dragData;

                const [mx, my] = toWorkspaceCoords(event);
                const dx = mx - dragData.startX;
                const dy = my - dragData.startY;

                let newScaleX = Math.max(0.1, (width * transform.scaleX + dx) / Math.max(width, 1e-6));
                let newScaleY = Math.max(0.1, (height * transform.scaleY + dy) / Math.max(height, 1e-6));

                const source = (event as any).sourceEvent as MouseEvent | undefined;
                const shift = source?.shiftKey;
                const ctrl = source?.ctrlKey;
                if (lockAspectRatio ? !shift : shift) {
                    const ratio = Math.max(newScaleX, newScaleY);
                    newScaleX = ratio;
                    newScaleY = ratio;
                }

                if (ctrl) {
                    const snapWidth = Math.round((width * newScaleX) / 10) * 10;
                    const snapHeight = Math.round((height * newScaleY) / 10) * 10;
                    newScaleX = snapWidth / Math.max(width, 1e-6);
                    newScaleY = snapHeight / Math.max(height, 1e-6);
                }

                const elementData = element.datum() as any;

                if (supportsIntrinsicResize(element)) {
                    const actualWidth = width * newScaleX;
                    const actualHeight = height * newScaleY;
                    applyElementSize(element, actualWidth, actualHeight);
                    const newTransform: TransformValues = { ...transform, scaleX: 1, scaleY: 1 };
                    elementData.transform = newTransform;
                    applyTransform(element, newTransform);
                    debugLog('resize drag', actualWidth, actualHeight);
                } else {
                    const newTransform: TransformValues = { ...transform, scaleX: newScaleX, scaleY: newScaleY };
                    elementData.transform = newTransform;
                    applyTransform(element, newTransform);

                    d3.select(this)
                        .attr('x', data.width + HANDLE_ICON_SIZE / newScaleX)
                        .attr('y', data.height + HANDLE_ICON_SIZE / newScaleY)
                        .attr('font-size', HANDLE_ICON_SIZE / Math.max(newScaleX, newScaleY));

                    const rotateHandle = element.select('.rotate-handle');
                    if (!rotateHandle.empty()) {
                        rotateHandle
                            .attr('x', data.width + HANDLE_ICON_SIZE / newScaleX)
                            .attr('y', -HANDLE_ICON_SIZE / newScaleY)
                            .attr('font-size', HANDLE_ICON_SIZE / Math.max(newScaleX, newScaleY));
                    }

                    updateDebugCross(element);
                    setGridVisible(!!ctrl);
                }
            })
            .on('end', function () {
                window.dispatchEvent(new CustomEvent('element-resize-end', { detail: element.node() }));
                const options = getResizeOptions(element.node());
                if (supportsIntrinsicResize(element) && typeof options.onResizeEnd === 'function') {
                    options.onResizeEnd(element);
                }
                updateDebugCross(element);
                setGridVisible(false);
                debugLog('resize end');
            }),
    );
}

function addRotateHandle(element: Selection<any, any, any, any>) {
    if (!element.select('.rotate-handle').empty()) return;

    const data: any = element.datum();
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const width = data.width ?? bbox.width;
    const height = data.height ?? bbox.height;
    const transform: TransformValues = data.transform ?? defaultTransform();
    data.transform = transform;
    element.append('text')
        .attr('class', 'rotate-handle')
        .text('\u27f3')
        .style('cursor', 'grab')
        .style('user-select', 'none')
        .attr('vector-effect', 'non-scaling-stroke')
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
                    const cumulative = (transform.rotate * Math.PI) / 180;
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

                    let angle = (data.cumulative * 180) / Math.PI;
                    const ctrl = (event as any).sourceEvent?.ctrlKey;
                    if (ctrl) {
                        angle = Math.round(angle / 15) * 15;
                    }

                    const newTransform: TransformValues = { ...transform, rotate: angle };
                    applyTransform(element, newTransform);
                    updateDebugCross(element);
                    debugLog('rotate', newTransform.rotate);
                }),
        );

    updateSelectionDecorations(element, { width, height, transform });
}

let globalInit = false;

export function makeResizable(selection: Selection<any, any, any, any>, options: ResizeOptions = {}) {
    if (!globalInit) {
        d3.select(window).on('keydown.makeResizable', (event: KeyboardEvent) => {
            const selectedElement = getSelectedElement();
            if (event.key === 'Delete' && selectedElement) {
                selectedElement.remove();
                setSelectedElement(null);
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
            const toolbar = document.getElementById('board-toolbar');
            const target = event.target as Node;
            const isSvg = target instanceof SVGElement;
            const selectedElement = getSelectedElement();
            if (
                selectedElement &&
                isSvg &&
                !selectedElement.node()?.contains(target) &&
                !(controls && controls.contains(target)) &&
                !(colorSelect && colorSelect.contains(target)) &&
                !(frameColorSelect && frameColorSelect.contains(target)) &&
                !(alignControls && alignControls.contains(target)) &&
                !(toolbar && toolbar.contains(target))
            ) {
                clearSelection();
            }
        });

        d3.select(window).on('pointerdown.makeResizableSelect', (event: PointerEvent) => {
            if (event.button !== 0) return;
            const target = event.target as Element | null;
            if (!target) return;
            const ancestor = findResizableAncestor(target);
            if (!ancestor) return;
            const selectedElement = getSelectedElement();
            if (selectedElement && selectedElement.node() === ancestor) {
                return;
            }
            applySelectionToElement(d3.select(ancestor));
        });

        globalInit = true;
    }

    let pointerHandled = false;

    selection.each(function () {
        const existing = resizeOptionsByElement.get(this) ?? {};
        const merged: ResizeOptions = { ...existing, ...(options ?? {}) };
        resizeOptionsByElement.set(this, merged);
    });

    const selectFromEvent = (event: Event | null, node: Element) => {
        if (event && !(event instanceof PointerEvent)) {
            event.stopPropagation();
        }
        applySelectionToElement(d3.select(node));
    };

    selection
        .style('cursor', 'pointer')
        .on('pointerdown.makeResizable', function (event: PointerEvent) {
            pointerHandled = true;
            selectFromEvent(event, this);
        })
        .on('click.makeResizable', function (event: MouseEvent) {
            if (!pointerHandled) {
                selectFromEvent(event, this);
            } else {
                event.stopPropagation();
            }
            pointerHandled = false;
        });
}

function findResizableAncestor(start: Element | null): Element | null {
    let current: Element | null = start;
    while (current) {
        if (resizeOptionsByElement.has(current)) {
            return current;
        }
        const parentElement = current.parentElement;
        if (parentElement) {
            current = parentElement;
            continue;
        }
        const parentNode = current.parentNode;
        current = parentNode instanceof Element ? parentNode : null;
    }
    return null;
}
