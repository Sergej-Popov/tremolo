import { getSelectedElement } from './state';

export interface BackgroundRemovalOptions {
    tolerance?: number | null;
    feather?: number;
    color?: string | null;
}

export interface BackgroundRemovalResult {
    dataUrl: string;
    tolerance: number;
    feather: number;
    color: string | null;
}

export const minBackgroundTolerance = 12;
export const maxBackgroundTolerance = 140;
export const defaultBackgroundTolerance = 48;
export const minBackgroundFeather = 0;
export const maxBackgroundFeather = 0.8;
export const defaultBackgroundFeather = 0.35;

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
    const normalized = hex.trim();
    if (!normalized.startsWith('#')) return null;
    const value = normalized.slice(1);
    if (value.length === 3) {
        const r = parseInt(value[0] + value[0], 16);
        const g = parseInt(value[1] + value[1], 16);
        const b = parseInt(value[2] + value[2], 16);
        if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
        return { r, g, b };
    }
    if (value.length === 6) {
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
        return { r, g, b };
    }
    return null;
}

function rgbToHex(r: number, g: number, b: number) {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

function sampleEdgeStatistics(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    overrideTolerance?: number,
) {
    const sampleColors: number[] = [];
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let samples = 0;
    const stepX = Math.max(1, Math.floor(width / 50));
    const stepY = Math.max(1, Math.floor(height / 50));
    const record = (x: number, y: number) => {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        sampleColors.push(r, g, b);
        sumR += r;
        sumG += g;
        sumB += b;
        samples += 1;
    };
    for (let x = 0; x < width; x += stepX) {
        record(x, 0);
        if (height > 1) record(x, height - 1);
    }
    for (let y = 0; y < height; y += stepY) {
        record(0, y);
        if (width > 1) record(width - 1, y);
    }
    if (samples === 0) {
        const tol = overrideTolerance ?? defaultBackgroundTolerance;
        return { avgR: 255, avgG: 255, avgB: 255, toleranceSq: tol * tol };
    }
    const avgR = sumR / samples;
    const avgG = sumG / samples;
    const avgB = sumB / samples;
    let variance = 0;
    for (let i = 0; i < sampleColors.length; i += 3) {
        const dr = sampleColors[i] - avgR;
        const dg = sampleColors[i + 1] - avgG;
        const db = sampleColors[i + 2] - avgB;
        variance += (dr * dr + dg * dg + db * db) / 3;
    }
    variance /= samples;
    const autoTol = Math.max(minBackgroundTolerance, Math.min(maxBackgroundTolerance, Math.sqrt(variance) * 3 + 18));
    const baseTol = overrideTolerance ?? autoTol;
    const clamped = Math.max(minBackgroundTolerance, Math.min(maxBackgroundTolerance, baseTol));
    return { avgR, avgG, avgB, toleranceSq: clamped * clamped };
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed'));
        img.src = src;
    });
}

async function generateTransparentImage(
    src: string,
    options: BackgroundRemovalOptions = {},
): Promise<BackgroundRemovalResult | null> {
    const image = await loadImageElement(src);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const requestedTolerance = options.tolerance == null ? null : clamp(options.tolerance, minBackgroundTolerance, maxBackgroundTolerance);
    const requestedFeather = clamp(options.feather ?? defaultBackgroundFeather, minBackgroundFeather, maxBackgroundFeather);
    const requestedColor = options.color ? parseHexColor(options.color) : null;
    const { avgR, avgG, avgB, toleranceSq } = sampleEdgeStatistics(data, width, height, requestedTolerance ?? undefined);
    const baseColor = requestedColor ?? { r: avgR, g: avgG, b: avgB };
    const resolvedTolerance = requestedTolerance ?? Math.sqrt(toleranceSq);
    const limit = resolvedTolerance * resolvedTolerance;
    const visited = new Uint8Array(width * height);
    const queue = new Uint32Array(width * height);
    let head = 0;
    let tail = 0;
    const tryVisit = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const idx = y * width + x;
        if (visited[idx]) return;
        const p = idx * 4;
        const dr = data[p] - baseColor.r;
        const dg = data[p + 1] - baseColor.g;
        const db = data[p + 2] - baseColor.b;
        if ((dr * dr + dg * dg + db * db) <= limit) {
            visited[idx] = 1;
            queue[tail++] = idx;
        }
    };
    for (let x = 0; x < width; x++) {
        tryVisit(x, 0);
        tryVisit(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        tryVisit(0, y);
        tryVisit(width - 1, y);
    }
    const directions = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
    ];
    while (head < tail) {
        const idx = queue[head++];
        const x = idx % width;
        const y = Math.floor(idx / width);
        for (const dir of directions) {
            tryVisit(x + dir.dx, y + dir.dy);
        }
    }
    for (let i = 0; i < width * height; i++) {
        if (visited[i]) {
            data[i * 4 + 3] = 0;
        }
    }
    const feather = requestedFeather;
    if (feather > 0) {
        const clampFeather = Math.min(Math.max(feather, 0), 1);
        const neighborOffsets = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 1 },
            { dx: 1, dy: 1 },
        ];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (visited[idx]) continue;
                let touching = false;
                for (const off of neighborOffsets) {
                    const nx = x + off.dx;
                    const ny = y + off.dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (visited[ny * width + nx]) {
                        touching = true;
                        break;
                    }
                }
                if (touching) {
                    const alphaIndex = idx * 4 + 3;
                    data[alphaIndex] = Math.round(data[alphaIndex] * (1 - clampFeather));
                }
            }
        }
    }
    const colorHex = requestedColor ? rgbToHex(baseColor.r, baseColor.g, baseColor.b) : null;
    ctx.putImageData(imageData, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), tolerance: resolvedTolerance, feather, color: colorHex };
}

export async function removeBackgroundFromSelectedImage(
    options: BackgroundRemovalOptions = {},
): Promise<BackgroundRemovalResult | null> {
    const selectedElement = getSelectedElement();
    if (!selectedElement || !selectedElement.classed('pasted-image')) return null;
    const image = selectedElement.select<SVGImageElement>('image');
    if (image.empty()) return null;
    const data = selectedElement.datum() as any;
    const href = image.attr('href');
    if (!href) return null;
    const baseSrc = data.originalSrc ?? href;
    try {
        const processed = await generateTransparentImage(baseSrc, options);
        if (!processed) return null;
        if (!data.originalSrc) {
            data.originalSrc = href;
        }
        data.src = processed.dataUrl;
        data.backgroundRemoved = true;
        data.removalTolerance = processed.tolerance;
        data.removalFeather = processed.feather;
        data.removalColor = processed.color;
        image.attr('href', processed.dataUrl);
        selectedElement.classed('background-removed', true);
        return processed;
    } catch (err) {
        console.error('Failed to remove background', err);
        return null;
    }
}

export function restoreSelectedImageBackground() {
    const selectedElement = getSelectedElement();
    if (!selectedElement || !selectedElement.classed('pasted-image')) return false;
    const data = selectedElement.datum() as any;
    if (!data.originalSrc) return false;
    const image = selectedElement.select<SVGImageElement>('image');
    if (image.empty()) return false;
    image.attr('href', data.originalSrc);
    data.src = data.originalSrc;
    data.backgroundRemoved = false;
    selectedElement.classed('background-removed', false);
    return true;
}
