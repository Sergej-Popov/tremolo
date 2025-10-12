import * as d3 from 'd3';
import type { Selection } from 'd3';
import { HANDLE_ICON_SIZE, SELECTION_STROKE_WIDTH } from './constants';
import { computeDecorationMetrics, defaultTransform, type TransformValues } from './metrics';
import { getSelectedElement } from './state';

interface CropValues {
    x: number;
    y: number;
    width: number;
    height: number;
}

let cropInit = false;
let clipIdCounter = 0;

export function updateCropOverlay(element: Selection<any, any, any, any>) {
    const image = element.select('image');
    const overlay = element.select('.crop-controls');
    const rect = overlay.select<SVGRectElement>('.crop-rect');
    const data = (element.datum() as any) || {};
    const transform: TransformValues = data.transform ?? defaultTransform();
    const metrics = computeDecorationMetrics(transform);

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

    rect
        .attr('stroke-width', SELECTION_STROKE_WIDTH)
        .attr('vector-effect', 'non-scaling-stroke');

    overlay.selectAll<SVGTextElement, any>('.crop-handle')
        .attr('font-size', HANDLE_ICON_SIZE / metrics.combinedScale)
        .style('font-size', `${HANDLE_ICON_SIZE / metrics.combinedScale}px`);
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

export function finishCrop(element: Selection<any, any, any, any>) {
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
            const selectedElement = getSelectedElement();
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
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', bbox.width)
                .attr('height', bbox.height)
                .attr('fill', 'rgba(0,0,0,0)')
                .attr('stroke', '#7fbbf7')
                .attr('stroke-width', 1)
                .attr('vector-effect', 'non-scaling-stroke');

            const handleClasses = ['n', 'e', 's', 'w'];
            const metrics = computeDecorationMetrics(defaultTransform());
            for (const dir of handleClasses) {
                const char = dir === 'n' || dir === 's' ? '\u2195' : '\u2194';
                overlay.append('text')
                    .attr('class', `crop-handle crop-handle-${dir}`)
                    .text(char)
                    .attr('font-size', HANDLE_ICON_SIZE / metrics.combinedScale)
                    .style('font-size', `${HANDLE_ICON_SIZE / metrics.combinedScale}px`)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .style('user-select', 'none')
                    .attr('vector-effect', 'non-scaling-stroke');
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
                    }),
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
                    }),
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
                    }),
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
                    }),
            );

            element.datum<any>({ ...(element.datum() || {}), crop: { x: 0, y: 0, width: bbox.width, height: bbox.height }, clipId });

            element.on('dblclick.makeCroppable', (event: MouseEvent) => {
                event.stopPropagation();
                toggleCrop(element);
            });
        });
}
