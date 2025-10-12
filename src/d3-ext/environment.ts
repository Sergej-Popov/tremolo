import * as d3 from 'd3';
import type { Selection } from 'd3';
import {
    getSvgRoot,
    getWorkspaceRoot,
    getZoomTransform,
    isDebugMode,
    setSvgRootRef,
    setWorkspaceRootRef,
} from './state';

export function setSvgRoot(svg: SVGSVGElement | null, workspace?: SVGGElement | null) {
    setSvgRootRef(svg);
    if (workspace) setWorkspaceRootRef(workspace);
    const svgRoot = getSvgRoot();
    if (!svgRoot) return;
    const svgSel = d3.select(svgRoot);
    const container: Selection<SVGGElement | SVGSVGElement, unknown, null, undefined> = workspace
        ? d3.select(workspace)
        : svgSel;
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

export function setGridVisible(show: boolean) {
    const svgRoot = getSvgRoot();
    if (!svgRoot) return;
    const grid = d3.select(svgRoot).select('.grid-overlay');
    if (show || isDebugMode()) {
        grid.style('display', 'block').style('opacity', '1');
    } else {
        grid.style('display', 'none');
    }
}

export function toWorkspaceCoords(event: MouseEvent | d3.D3DragEvent<any, any, any>): [number, number] {
    const svgRoot = getSvgRoot();
    if (!svgRoot) return [0, 0];
    const domEvent: MouseEvent = (event as any).sourceEvent ?? event;
    const pt = svgRoot.createSVGPoint();
    pt.x = domEvent.clientX;
    pt.y = domEvent.clientY;
    const svgPoint = pt.matrixTransform(svgRoot.getScreenCTM()!.inverse());
    const transform = getZoomTransform();
    return transform.invert([svgPoint.x, svgPoint.y]);
}
