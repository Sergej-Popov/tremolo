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

export function makeDraggable(selection: Selection<any, any, any, any>) {
    interface CoordinatesDatum { offsetX: number, offsetY: number, scaleX: number, scaleY: number };

    selection.call(
        d3.drag()
            .on('start', function (event: MouseEvent) {
                const element = d3.select(this);
                const transform = element.attr('transform') || '';

                const translateMatch = /translate\(([^,]+),([^)]+)\)/.exec(transform) || ["", "0", "0"];
                const scaleMatch = /scale\(([^,]+),([^)]+)\)/.exec(transform) || ["", "1", "1"];

                const currentX = parseFloat(translateMatch[1]) || 0;
                const currentY = parseFloat(translateMatch[2]) || 0;
                const scaleX = parseFloat(scaleMatch[1]) || 1;
                const scaleY = parseFloat(scaleMatch[2]) || 1;

                const offsetX = event.x - currentX;
                const offsetY = event.y - currentY;

                element.datum<CoordinatesDatum>({ offsetX, offsetY, scaleX, scaleY });
            })
            .on('drag', function (event: MouseEvent) {
                const element = d3.select<any, CoordinatesDatum>(this);
                const { offsetX, offsetY, scaleX, scaleY } = element.datum();

                element.attr('transform', `translate(${event.x - offsetX}, ${event.y - offsetY}) scale(${scaleX}, ${scaleY})`);
            })
    );
}

let selectedElement: Selection<any, any, any, any> | null = null;
let globalInit = false;

function addResizeHandle(element: Selection<any, any, any, any>) {
    const handleRadius = 6;

    if (!element.select('.resize-handle').empty()) return;

    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const transform = element.attr('transform') || '';
    const scaleMatch = /scale\(([^,]+),([^)]+)\)/.exec(transform) || ["", "1", "1"];
    const scaleX = parseFloat(scaleMatch[1]) || 1;
    const scaleY = parseFloat(scaleMatch[2]) || 1;

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

                const transform = element.attr('transform') || '';
                const scaleMatch = /scale\(([^,]+),([^)]+)\)/.exec(transform) || ["", "1", "1"];
                const translateMatch = /translate\(([^,]+),([^)]+)\)/.exec(transform) || ["", "0", "0"];
                const bbox = (element.node() as SVGGraphicsElement).getBBox();

                const scaleX = parseFloat(scaleMatch[1]) || 1;
                const scaleY = parseFloat(scaleMatch[2]) || 1;
                const translateX = parseFloat(translateMatch[1]) || 0;
                const translateY = parseFloat(translateMatch[2]) || 0;

                const startX = event.x;
                const startY = event.y;

                d3.select(this)
                    .attr('r', handleRadius / Math.max(scaleX, scaleY))
                    .datum({ startX, startY, scaleX, scaleY, translateX, translateY, width: bbox.width, height: bbox.height });
            })
            .on('drag', function (event: MouseEvent) {
                const data = d3.select<any, any>(this).datum();

                const dx = event.x - data.startX;
                const dy = event.y - data.startY;

                let newScaleX = Math.max(0.1, (data.width * data.scaleX + dx) / data.width);
                let newScaleY = Math.max(0.1, (data.height * data.scaleY + dy) / data.height);

                if ((event as any).sourceEvent?.shiftKey) {
                    const ratio = Math.max(newScaleX, newScaleY);
                    newScaleX = ratio;
                    newScaleY = ratio;
                }

                element.attr('transform', `translate(${data.translateX}, ${data.translateY}) scale(${newScaleX}, ${newScaleY})`);

                d3.select(this)
                    .attr('cx', data.width)
                    .attr('cy', data.height)
                    .attr('r', handleRadius / Math.max(newScaleX, newScaleY));
            })
    );
}

function addOutline(element: Selection<any, any, any, any>) {
    if (!element.select('.selection-outline').empty()) return;

    const bbox = (element.node() as SVGGraphicsElement).getBBox();
    const transform = element.attr('transform') || '';
    const scaleMatch = /scale\(([^,]+),([^)]+)\)/.exec(transform) || ["", "1", "1"];
    const scaleX = parseFloat(scaleMatch[1]) || 1;
    const scaleY = parseFloat(scaleMatch[2]) || 1;

    element.append('rect')
        .attr('class', 'selection-outline')
        .attr('x', bbox.x)
        .attr('y', bbox.y)
        .attr('width', bbox.width)
        .attr('height', bbox.height)
        .attr('fill', 'none')
        .attr('stroke', 'blue')
        .attr('stroke-width', 1 / Math.max(scaleX, scaleY))
        .style('pointer-events', 'none')
        .style('vector-effect', 'non-scaling-stroke');
}

function clearSelection() {
    if (!selectedElement) return;
    selectedElement.selectAll('.selection-outline').remove();
    selectedElement.selectAll('.resize-handle').remove();
    selectedElement = null;
}

export function makeResizable(selection: Selection<any, any, any, any>) {
    if (!globalInit) {
        d3.select(window).on('keydown.makeResizable', (event: KeyboardEvent) => {
            if (event.key === 'Delete' && selectedElement) {
                selectedElement.remove();
                selectedElement = null;
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
            addResizeHandle(element);
        });
}
