export function exportSvgImage(svg: SVGSVGElement, filename = 'tremolo-board.png') {
  const rect = svg.getBoundingClientRect();
  const width = rect.width + 80;
  const height = rect.height + 80;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('width', width.toString());
  wrapper.setAttribute('height', height.toString());

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', 'translate(40,40)');
  while (clone.firstChild) {
    g.appendChild(clone.firstChild);
  }
  wrapper.appendChild(g);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(wrapper);
  const img = new Image();
  img.onload = () => {
    const scale = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
}
