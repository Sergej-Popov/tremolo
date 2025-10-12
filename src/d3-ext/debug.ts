import * as d3 from 'd3';
import type { Selection } from 'd3';
import { isDebugMode, setDebugModeState } from './state';
import { setGridVisible } from './environment';

export function setDebugMode(enabled: boolean) {
    setDebugModeState(enabled);
    setGridVisible(enabled);
}

export function debugLog(...args: unknown[]) {
    if (isDebugMode()) {
        console.log(...args);
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
    cross.style('display', isDebugMode() ? 'block' : 'none');
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
        .style('display', isDebugMode() ? 'block' : 'none');
}
