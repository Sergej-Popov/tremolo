export function adjustStickyFont(el: HTMLDivElement, fixedSize?: number | null) {
    let size = fixedSize ?? 16;
    el.classList.remove('scrollable');
    el.style.overflow = 'hidden';
    el.style.fontSize = `${size}px`;
    el.onwheel = null;
    el.onmousedown = null;

    if (fixedSize == null) {
        while ((el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) && size > 6) {
            size -= 1;
            el.style.fontSize = `${size}px`;
        }
    }

    if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
        el.classList.add('scrollable');
        el.style.overflow = 'auto';
        el.onwheel = (e) => e.stopPropagation();
    }
}
