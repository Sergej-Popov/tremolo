import * as d3 from 'd3';
import { BaseType, Selection } from 'd3';

export const tooltip = function <GElement extends BaseType, Datum, PElement extends BaseType, PDatum>(selection: Selection<GElement, Datum, PElement, PDatum>, contentCallback: (any, Datum) => string) {
    const tooltipDiv = d3.select('body').append('div')
        .attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('opacity', 0)
        .style('background-color', 'lightgray')
        .style('padding', '5px')
        .style('border-radius', '5px')
        .style('pointer-events', 'none');

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

interface TransformValues {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotate: number;
}

const defaultTransform = (): TransformValues => ({
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
});

function buildTransform(transform: TransformValues, bbox: DOMRect): string {
    const { translateX, translateY, scaleX, scaleY, rotate } = transform;
    const cx = bbox.width / 2;
    const cy = bbox.height / 2;
    return `translate(${translateX + scaleX * cx}, ${translateY + scaleY * cy}) rotate(${rotate}) scale(${scaleX}, ${scaleY}) translate(${-cx}, ${-cy})`;
}

function applyTransform(element: Selection<any, any, any, any>, transform: TransformValues) {
    (element.datum() as any).transform = transform;
    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    element.attr('transform', buildTransform(transform, bbox));
}

export function makeDraggable(selection: Selection<any, any, any, any>) {
    interface DragDatum { offsetX: number, offsetY: number, transform: TransformValues };

    selection.call(
        d3.drag()
            .on('start', function (event: MouseEvent) {
                const element = d3.select(this);
                const overlay = element.select('.crop-controls');
                if (!overlay.empty() && overlay.style('display') !== 'none') {
                    finishCrop(element);
                }
                const data: any = element.datum();
                const transform: TransformValues = data.transform ?? defaultTransform();

                const offsetX = event.x - transform.translateX;
                const offsetY = event.y - transform.translateY;

                element.datum<DragDatum>({ offsetX, offsetY, transform });
            })
            .on('drag', function (event: MouseEvent) {
                const element = d3.select<any, DragDatum>(this);
                const { offsetX, offsetY, transform } = element.datum();

                const newTransform: TransformValues = {
                    ...transform,
                    translateX: event.x - offsetX,
                    translateY: event.y - offsetY,
                };

                applyTransform(element, newTransform);
            })
    );
}

let selectedElement: Selection<any, any, any, any> | null = null;
let globalInit = false;

interface ResizeOptions {
    lockAspectRatio?: boolean;
    rotatable?: boolean;
}

function addResizeHandle(element: Selection<any, any, any, any>, options: ResizeOptions = {}) {
    const { lockAspectRatio = false } = options;
    const handleRadius = 6;

    if (!element.select('.resize-handle').empty()) return;

    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const data: any = element.datum();
    const transform: TransformValues = data.transform ?? defaultTransform();
    data.transform = transform;
    const { scaleX, scaleY } = transform;

    const handle = element.append('circle')
        .attr('class', 'resize-handle')
        .attr('cx', bbox.width)
        .attr('cy', bbox.height)
        .attr('r', handleRadius / Math.max(scaleX, scaleY))
        .style('cursor', 'nwse-resize')
        .attr('fill', 'white')
        .attr('stroke', 'black')
        .style('vector-effect', 'non-scaling-stroke');

    handle.call(
        d3.drag<SVGCircleElement, unknown>()
            .on('start', function (event: MouseEvent) {
                const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);

                const overlay = element.select('.crop-controls');
                if (!overlay.empty() && overlay.style('display') !== 'none') {
                    finishCrop(element);
                }

                const bbox = (element.node() as SVGGraphicsElement).getBBox();
                const data = element.datum() as any;
                const transform: TransformValues = data.transform ?? defaultTransform();
                data.transform = transform;
                const { scaleX, scaleY } = transform;

                const startX = event.x;
                const startY = event.y;

                d3.select(this)
                    .attr('r', handleRadius / Math.max(scaleX, scaleY))
                    .datum({ startX, startY, transform, width: bbox.width, height: bbox.height });
            })
            .on('drag', function (event: MouseEvent) {
                const data = d3.select<any, any>(this).datum();
                const { transform } = data;

                const dx = event.x - data.startX;
                const dy = event.y - data.startY;

                let newScaleX = Math.max(0.1, (data.width * transform.scaleX + dx) / data.width);
                let newScaleY = Math.max(0.1, (data.height * transform.scaleY + dy) / data.height);

                if (lockAspectRatio || (event as any).sourceEvent?.shiftKey) {
                    const ratio = Math.max(newScaleX, newScaleY);
                    newScaleX = ratio;
                    newScaleY = ratio;
                }

                const newTransform: TransformValues = { ...transform, scaleX: newScaleX, scaleY: newScaleY };
                applyTransform(element, newTransform);

                d3.select(this)
                    .attr('cx', data.width)
                    .attr('cy', data.height)
                    .attr('r', handleRadius / Math.max(newScaleX, newScaleY));
            })
    );
}

function addRotateHandle(element: Selection<any, any, any, any>) {
    const handleSize = 10;

    if (!element.select('.rotate-handle').empty()) return;

    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    element.append('text')
        .attr('class', 'rotate-handle')
        .attr('x', bbox.width)
        .attr('y', -handleSize)
        .text('\u21bb')
        .attr('font-size', handleSize)
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
                    const centerX = transform.translateX + transform.scaleX * bbox.width / 2;
                    const centerY = transform.translateY + transform.scaleY * bbox.height / 2;
                    const startAngle = Math.atan2(event.y - centerY, event.x - centerX) - transform.rotate * Math.PI / 180;

                    d3.select(this).datum({ centerX, centerY, startAngle, transform });
                })
                .on('drag', function (event: MouseEvent) {
                    const data = d3.select<any, any>(this).datum();
                    const { centerX, centerY, startAngle, transform } = data;
                    const angle = Math.atan2(event.y - centerY, event.x - centerX) - startAngle;

                    const newTransform: TransformValues = { ...transform, rotate: angle * 180 / Math.PI };
                    applyTransform(element, newTransform);
                })
        );
}

function addOutline(element: Selection<any, any, any, any>) {
    if (!element.select('.selection-outline').empty()) return;

    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const data = element.datum() as any;
    const { scaleX, scaleY } = (data.transform ?? defaultTransform());

    element.append('rect')
        .attr('class', 'selection-outline')
        .attr('x', bbox.x)
        .attr('y', bbox.y)
        .attr('width', bbox.width)
        .attr('height', bbox.height)
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
            if (selectedElement && !selectedElement.node()?.contains(event.target as Node)) {
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
        .attr('cx', x + width / 2)
        .attr('cy', y);
    overlay.select('.crop-handle-e')
        .attr('cx', x + width)
        .attr('cy', y + height / 2);
    overlay.select('.crop-handle-s')
        .attr('cx', x + width / 2)
        .attr('cy', y + height);
    overlay.select('.crop-handle-w')
        .attr('cx', x)
        .attr('cy', y + height / 2);

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
            if (event.key === 'c' && selectedElement && selectedElement.classed('croppable')) {
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
                overlay.append('circle')
                    .attr('class', `crop-handle crop-handle-${dir}`)
                    .attr('r', 6)
                    .attr('fill', 'white')
                    .attr('stroke', 'black')
                    .style('vector-effect', 'non-scaling-stroke');
            }

            overlay.append('rect').attr('class', 'crop-shade-top');
            overlay.append('rect').attr('class', 'crop-shade-right');
            overlay.append('rect').attr('class', 'crop-shade-bottom');
            overlay.append('rect').attr('class', 'crop-shade-left');

            const rect = overlay.select<SVGRectElement>('.crop-rect');

            const handleN = overlay.select<SVGCircleElement>('.crop-handle-n');
            handleN.call(
                d3.drag<SVGCircleElement, unknown>()
                    .on('start', function (event: MouseEvent) {
                        const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                        if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                        const y = parseFloat(rect.attr('y') ?? '0');
                        const height = parseFloat(rect.attr('height') ?? '0');
                        d3.select(this).datum({ startY: event.y, y, height });
                    })
                    .on('drag', function (event: MouseEvent) {
                        const data = d3.select<any, any>(this).datum();
                        let newY = Math.min(data.y + data.height - 1, event.y);
                        let newHeight = data.height + (data.y - newY);
                        rect.attr('y', newY).attr('height', newHeight);
                        updateCropOverlay(element);
                    })
            );

            const handleS = overlay.select<SVGCircleElement>('.crop-handle-s');
            handleS.call(
                d3.drag<SVGCircleElement, unknown>()
                    .on('start', function (event: MouseEvent) {
                        const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                        if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                        const height = parseFloat(rect.attr('height') ?? '0');
                        d3.select(this).datum({ startY: event.y, height });
                    })
                    .on('drag', function (event: MouseEvent) {
                        const data = d3.select<any, any>(this).datum();
                        let newHeight = Math.max(1, data.height + event.y - data.startY);
                        rect.attr('height', newHeight);
                        updateCropOverlay(element);
                    })
            );

            const handleE = overlay.select<SVGCircleElement>('.crop-handle-e');
            handleE.call(
                d3.drag<SVGCircleElement, unknown>()
                    .on('start', function (event: MouseEvent) {
                        const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                        if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                        const width = parseFloat(rect.attr('width') ?? '0');
                        d3.select(this).datum({ startX: event.x, width });
                    })
                    .on('drag', function (event: MouseEvent) {
                        const data = d3.select<any, any>(this).datum();
                        let newWidth = Math.max(1, data.width + event.x - data.startX);
                        rect.attr('width', newWidth);
                        updateCropOverlay(element);
                    })
            );

            const handleW = overlay.select<SVGCircleElement>('.crop-handle-w');
            handleW.call(
                d3.drag<SVGCircleElement, unknown>()
                    .on('start', function (event: MouseEvent) {
                        const stopProp = (event as any).sourceEvent?.stopPropagation || (event as any).stopPropagation;
                        if (typeof stopProp === 'function') stopProp.call(event.sourceEvent ?? event);
                        const x = parseFloat(rect.attr('x') ?? '0');
                        const width = parseFloat(rect.attr('width') ?? '0');
                        d3.select(this).datum({ startX: event.x, x, width });
                    })
                    .on('drag', function (event: MouseEvent) {
                        const data = d3.select<any, any>(this).datum();
                        let newX = Math.min(data.x + data.width - 1, event.x);
                        let newWidth = data.width + (data.x - newX);
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

