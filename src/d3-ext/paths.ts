export interface LinePathDatum {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    style?: 'direct' | 'arc' | 'corner';
    startConn?: { position: string } | undefined;
    endConn?: { position: string } | undefined;
}

export function linePath(d: LinePathDatum): string {
    const off = 100;
    if (d.style === 'arc') {
        const dir = (pos?: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) => {
            if (pos === 'n') return { dx: 0, dy: -off };
            if (pos === 's') return { dx: 0, dy: off };
            if (pos === 'e') return { dx: off, dy: 0 };
            if (pos === 'w') return { dx: -off, dy: 0 };
            return { dx: Math.sign(x2 - x1) * off, dy: Math.sign(y2 - y1) * off };
        };
        const s = dir(d.startConn?.position, d.x1, d.y1, d.x2, d.y2);
        const e = dir(d.endConn?.position, d.x2, d.y2, d.x1, d.y1);
        const c1x = d.x1 + s.dx;
        const c1y = d.y1 + s.dy;
        const c2x = d.x2 + e.dx;
        const c2y = d.y2 + e.dy;
        return `M${d.x1},${d.y1} C${c1x},${c1y} ${c2x},${c2y} ${d.x2},${d.y2}`;
    }
    if (d.style === 'corner') {
        const dir = (pos?: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) => {
            if (pos === 'n') return { dx: 0, dy: -off };
            if (pos === 's') return { dx: 0, dy: off };
            if (pos === 'e') return { dx: off, dy: 0 };
            if (pos === 'w') return { dx: -off, dy: 0 };
            return { dx: Math.sign(x2 - x1) * off, dy: Math.sign(y2 - y1) * off };
        };
        const s = dir(d.startConn?.position, d.x1, d.y1, d.x2, d.y2);
        const e = dir(d.endConn?.position, d.x2, d.y2, d.x1, d.y1);
        const p1x = d.x1 + s.dx;
        const p1y = d.y1 + s.dy;
        const p2x = d.x2 + e.dx;
        const p2y = d.y2 + e.dy;
        const midX = Math.abs(p1x - d.x2) < Math.abs(p1y - d.y2) ? p1x : p2x;
        const midY = Math.abs(p1y - d.y2) < Math.abs(p1x - d.x2) ? p1y : p2y;
        return `M${d.x1},${d.y1} L${p1x},${p1y} L${midX},${midY} L${p2x},${p2y} L${d.x2},${d.y2}`;
    }
    return `M${d.x1},${d.y1} L${d.x2},${d.y2}`;
}
