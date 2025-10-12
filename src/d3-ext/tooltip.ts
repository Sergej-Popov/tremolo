import * as d3 from 'd3';
import { BaseType, Selection } from 'd3';
import { isDebugMode } from './state';

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

export const tooltip = function <GElement extends BaseType, Datum, PElement extends BaseType, PDatum>(
    selection: Selection<GElement, Datum, PElement, PDatum>,
    contentCallback: (event: any, datum: Datum) => string,
) {
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

export const debugTooltip = function <GElement extends BaseType, Datum, PElement extends BaseType, PDatum>(
    selection: Selection<GElement, Datum, PElement, PDatum>,
) {
    selection.on('.debugTooltip', null);
    if (!isDebugMode()) return;
    selection.call(tooltip, (event: MouseEvent, d: any) => {
        const target = event.target as SVGElement;
        const x1Attr = target.attributes.getNamedItem('x1');
        const y1Attr = target.attributes.getNamedItem('y1');
        const x2Attr = target.attributes.getNamedItem('x2');
        const y2Attr = target.attributes.getNamedItem('y2');

        const x1 = x1Attr ? x1Attr.value : '0';
        const y1 = y1Attr ? y1Attr.value : '0';
        const x2 = x2Attr ? x2Attr.value : '0';
        const y2 = y2Attr ? y2Attr.value : '0';
        const coordinates = `${x1}:${y1} - ${x2}:${y2}`;
        return `${d}, [${coordinates}]`;
    });
};
