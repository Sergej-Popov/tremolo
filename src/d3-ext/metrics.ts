import { getZoomTransform } from './state';

export interface TransformValues {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotate: number;
}

export const defaultTransform = (): TransformValues => ({
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
});

export function transformPoint(x: number, y: number, t: TransformValues, size: { width: number; height: number }) {
    const cx = (size.width * t.scaleX) / 2;
    const cy = (size.height * t.scaleY) / 2;
    const rad = (t.rotate * Math.PI) / 180;
    let px = x * t.scaleX;
    let py = y * t.scaleY;
    const rx = Math.cos(rad) * (px - cx) - Math.sin(rad) * (py - cy) + cx;
    const ry = Math.sin(rad) * (px - cx) + Math.cos(rad) * (py - cy) + cy;
    return { x: rx + t.translateX, y: ry + t.translateY };
}

export function computeDecorationMetrics(transform: TransformValues) {
    const zoomScale = Math.max(Math.abs(getZoomTransform().k), 1e-6);
    const scaleX = transform.scaleX ?? 1;
    const scaleY = transform.scaleY ?? 1;
    const safeScaleX = scaleX === 0 ? (scaleX >= 0 ? 1e-6 : -1e-6) : scaleX;
    const safeScaleY = scaleY === 0 ? (scaleY >= 0 ? 1e-6 : -1e-6) : scaleY;
    const dominantScale = Math.max(Math.abs(safeScaleX), Math.abs(safeScaleY), 1e-6);
    const combinedScale = Math.max(dominantScale * zoomScale, 1e-6);
    return {
        zoomScale,
        combinedScale,
        offsetScaleX: safeScaleX * zoomScale,
        offsetScaleY: safeScaleY * zoomScale,
    };
}
