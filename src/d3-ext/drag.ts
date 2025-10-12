import * as d3 from 'd3';
import type { Selection } from 'd3';
import { setGridVisible, toWorkspaceCoords } from './environment';
import { debugLog } from './debug';
import { defaultTransform, type TransformValues } from './metrics';
import { applyTransform, getTightBoundingBox } from './transforms';
import { linePath } from './paths';
import { getWorkspaceRoot } from './state';
import { finishCrop } from './crop';

interface FrameAttachment {
    selection: Selection<any, any, any, any>;
    kind: 'transform' | 'line';
    transform?: TransformValues;
    line?: { x1: number; y1: number; x2: number; y2: number };
    elementId?: string;
    followConnections?: boolean;
    lineBaseTransform?: TransformValues;
}

interface DragDatum {
    dragOffsetX: number;
    dragOffsetY: number;
    transform: TransformValues;
    startX: number;
    startY: number;
    moved?: boolean;
    attachments?: FrameAttachment[] | null;
}

export function makeDraggable(selection: Selection<any, any, any, any>) {
    selection.call(
        d3.drag<SVGGraphicsElement, any>()
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
                const workspaceRoot = getWorkspaceRoot();
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
            }),
    );
}
