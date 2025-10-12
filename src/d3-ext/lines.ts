import * as d3 from 'd3';
import type { Selection } from 'd3';
import { linePath } from './paths';

const frameStrokePatterns: Record<'solid' | 'dashed' | 'dotted', { dash: string | null; linecap: 'butt' | 'round' }> = {
    solid: { dash: null, linecap: 'butt' },
    dashed: { dash: '8 4', linecap: 'butt' },
    dotted: { dash: '2 4', linecap: 'round' },
};

export function applyFrameStrokeAttributes(
    rect: Selection<SVGRectElement, any, any, any>,
    style: 'solid' | 'dashed' | 'dotted',
) {
    const config = frameStrokePatterns[style] ?? frameStrokePatterns.solid;
    rect.attr('stroke-dasharray', config.dash ?? null).attr('stroke-linecap', config.linecap);
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
            refY: 5,
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

        const drawShape = (m: Selection<SVGMarkerElement, unknown, any, any> | null, style: string) => {
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
        drawShape(startMarker, data.startStyle);
        drawShape(endMarker, data.endStyle);
        element.select('path')
            .attr('marker-start', hasStart ? `url(#${data.id}-start)` : null)
            .attr('marker-end', hasEnd ? `url(#${data.id}-end)` : null);
    } else {
        element.select('path').attr('marker-start', null).attr('marker-end', null);
    }
    const path = element.select<SVGPathElement>('path').node();
    if (path) {
        const mid = path.getPointAtLength(path.getTotalLength() / 2);
        element.select<SVGTextElement>('text.line-label')
            .attr('x', mid.x)
            .attr('y', mid.y);
    }
}
