const EXPORT_SCALE = 4;

export async function exportBoardPng(
  svg: SVGSVGElement,
  filename = 'tremolo-board.png',
) {
  const rect = svg.getBoundingClientRect();
  const width = rect.width + 80;
  const height = rect.height + 80;

  const clone = svg.cloneNode(true) as SVGSVGElement;

  const inlineImage = async (img: SVGImageElement) => {
    const href = img.getAttribute('href');
    if (!href || href.startsWith('data:')) return;
    try {
      const res = await fetch(href);
      const blob = await res.blob();
      const reader = new FileReader();
      const data: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read fail'));
        reader.readAsDataURL(blob);
      });
      img.setAttribute('href', data);
    } catch {
      // ignore failures and keep original href
    }
  };

  const images = Array.from(clone.querySelectorAll('image'));
  await Promise.all(images.map(inlineImage));

  await Promise.all(Array.from(clone.querySelectorAll('.embedded-video')).map(async (video) => {
    const fo = video.querySelector('foreignObject');
    const iframe = fo?.querySelector('iframe');
    const match = iframe?.getAttribute('src')?.match(/embed\/(.*?)(?:\?|$)/);
    if (fo && match) {
      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('x', fo.getAttribute('x') || '0');
      img.setAttribute('y', fo.getAttribute('y') || '0');
      img.setAttribute('width', fo.getAttribute('width') || '0');
      img.setAttribute('height', fo.getAttribute('height') || '0');
      img.setAttribute('href', `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`);
      await inlineImage(img);
      fo.replaceWith(img);
    }
  }));

  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('width', width.toString());
  wrapper.setAttribute('height', height.toString());

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', 'translate(40,40)');
  while (clone.firstChild) g.appendChild(clone.firstChild);
  wrapper.appendChild(g);

  const svgStr = new XMLSerializer().serializeToString(wrapper);
  const img = new Image();
  img.onload = () => {
    const scale = (window.devicePixelRatio || 1) * EXPORT_SCALE;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
}
