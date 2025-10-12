import * as d3 from 'd3';
import type { Selection } from 'd3';
import { CONNECT_HANDLE_RADIUS, HANDLE_ICON_SIZE, SELECTION_STROKE_WIDTH } from './constants';
import { computeDecorationMetrics, defaultTransform, transformPoint, type TransformValues } from './metrics';
import { linePath } from './paths';
import { getWorkspaceRoot, isElementSelected, notifySelectionChange } from './state';

export function updateSelectionDecorations(
    element: Selection<any, any, any, any>,
    options: { width?: number; height?: number; transform?: TransformValues } = {},
) {
    const data: any = element.datum() || {};
    const node = element.node() as SVGGraphicsElement;
    const bbox = node.getBBox();
    const width = options.width ?? data.width ?? bbox.width;
    const height = options.height ?? data.height ?? bbox.height;
    const transform: TransformValues = options.transform ?? data.transform ?? defaultTransform();
    const metrics = computeDecorationMetrics(transform);

    element.selectAll<SVGRectElement, any>('.selection-outline')
        .attr('width', width)
        .attr('height', height)
        .attr('stroke-width', SELECTION_STROKE_WIDTH)
        .attr('vector-effect', 'non-scaling-stroke');

    const handleFontSize = HANDLE_ICON_SIZE / metrics.combinedScale;
    const resizeHandles = element.selectAll<SVGTextElement, any>('.resize-handle');
    resizeHandles
        .attr('x', width + HANDLE_ICON_SIZE / metrics.offsetScaleX)
        .attr('y', height + HANDLE_ICON_SIZE / metrics.offsetScaleY)
        .attr('font-size', handleFontSize)
        .style('font-size', `${handleFontSize}px`)
        .attr('vector-effect', 'non-scaling-stroke');

    const rotateHandles = element.selectAll<SVGTextElement, any>('.rotate-handle');
    rotateHandles
        .attr('x', width + HANDLE_ICON_SIZE / metrics.offsetScaleX)
        .attr('y', -HANDLE_ICON_SIZE / metrics.offsetScaleY)
        .attr('font-size', handleFontSize)
        .style('font-size', `${handleFontSize}px`)
        .attr('vector-effect', 'non-scaling-stroke');

    const connectRadius = CONNECT_HANDLE_RADIUS / metrics.combinedScale;
    element.selectAll<SVGCircleElement, any>('.connect-handle').each(function () {
        const handle = d3.select(this);
        const pos = handle.attr('data-pos');
        let x = 0;
        let y = 0;
        if (pos === 'n') { x = width / 2; y = 0; }
        if (pos === 'e') { x = width; y = height / 2; }
        if (pos === 's') { x = width / 2; y = height; }
        if (pos === 'w') { x = 0; y = height / 2; }
        handle.attr('cx', x).attr('cy', y).attr('r', connectRadius);
        const abs = transformPoint(x, y, transform, { width, height });
        handle.attr('data-abs-x', abs.x).attr('data-abs-y', abs.y);
    });
}

function getHandleCoords(
    element: Selection<any, any, any, any>,
    pos: string,
    width: number,
    height: number,
    t: TransformValues,
) {
    let x = 0;
    let y = 0;
    if (pos === 'n') { x = width / 2; y = 0; }
    if (pos === 'e') { x = width; y = height / 2; }
    if (pos === 's') { x = width / 2; y = height; }
    if (pos === 'w') { x = 0; y = height / 2; }
    return transformPoint(x, y, t, { width, height });
}

export function updateConnectedLines(element: Selection<any, any, any, any>) {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) return;
    const data: any = element.datum() || {};
    const width = data.width ?? (element.node() as SVGGraphicsElement).getBBox().width;
    const height = data.height ?? (element.node() as SVGGraphicsElement).getBBox().height;
    const transform: TransformValues = data.transform ?? defaultTransform();
    const lines = d3.select(workspaceRoot).selectAll<SVGGElement, any>('.line-element');
    lines.each(function (lineDatum) {
        const g = d3.select(this);
        if (lineDatum.startConn && lineDatum.startConn.elementId === data.id) {
            const p = getHandleCoords(element, lineDatum.startConn.position, width, height, transform);
            lineDatum.x1 = p.x;
            lineDatum.y1 = p.y;
            g.select('circle.start').attr('cx', lineDatum.x1).attr('cy', lineDatum.y1);
        }
        if (lineDatum.endConn && lineDatum.endConn.elementId === data.id) {
            const p = getHandleCoords(element, lineDatum.endConn.position, width, height, transform);
            lineDatum.x2 = p.x;
            lineDatum.y2 = p.y;
            g.select('circle.end').attr('cx', lineDatum.x2).attr('cy', lineDatum.y2);
        }
        g.select('path').attr('d', linePath(lineDatum));
        const path = g.select<SVGPathElement>('path').node();
        if (path) {
            const mid = path.getPointAtLength(path.getTotalLength() / 2);
            g.select<SVGTextElement>('text.line-label')
                .attr('x', mid.x)
                .attr('y', mid.y);
        }
    });
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

    updateSelectionDecorations(element, { width, height, transform });
    updateConnectedLines(element);
    if (isElementSelected(element.node())) {
        notifySelectionChange();
    }
}

const DECORATION_SELECTOR = '.resize-handle, .rotate-handle, .connect-handle, .selection-outline, .component-debug-cross, .crop-controls';

interface HiddenElementState {
    node: SVGGraphicsElement;
    displayAttr: string | null;
    styleDisplay: string;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function getTightBoundingBox(node: SVGGraphicsElement): BoundingBox | null {
    const element = d3.select(node);
    const hidden: HiddenElementState[] = [];
    element.selectAll<SVGGraphicsElement, unknown>(DECORATION_SELECTOR).each(function () {
        const child = this as SVGGraphicsElement;
        hidden.push({
            node: child,
            displayAttr: child.getAttribute('display'),
            styleDisplay: child.style.display,
        });
        child.style.display = 'none';
    });
    try {
        const bbox = node.getBBox();
        const matrix = node.getScreenCTM() || node.getCTM();
        if (!matrix) {
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height,
            };
        }

        const transformPointFn = (x: number, y: number) => ({
            x: matrix.a * x + matrix.c * y + matrix.e,
            y: matrix.b * x + matrix.d * y + matrix.f,
        });

        const topLeft = transformPointFn(bbox.x, bbox.y);
        const topRight = transformPointFn(bbox.x + bbox.width, bbox.y);
        const bottomLeft = transformPointFn(bbox.x, bbox.y + bbox.height);
        const bottomRight = transformPointFn(bbox.x + bbox.width, bbox.y + bbox.height);

        const xs = [topLeft.x, topRight.x, bottomLeft.x, bottomRight.x];
        const ys = [topLeft.y, topRight.y, bottomLeft.y, bottomRight.y];

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    } catch {
        return null;
    } finally {
        hidden.forEach(({ node: child, displayAttr, styleDisplay }) => {
            if (displayAttr !== null) {
                child.setAttribute('display', displayAttr);
            } else {
                child.removeAttribute('display');
            }
            child.style.display = styleDisplay;
        });
    }
}
