// Print the browser's actual line breaks and local font metrics onto the folding mesh.
export function printNote(sheet: HTMLElement) {
  const width = sheet.offsetWidth, height = sheet.offsetHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.scale(2, 2);
  const paper = getComputedStyle(sheet);
  const color = paper.getPropertyValue('--paper').trim();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  const spacing = parseFloat(paper.getPropertyValue('--rule-spacing'));
  ctx.fillStyle = paper.getPropertyValue('--rule-color');
  for (let y = spacing - 1; spacing > 0 && y < height; y += spacing) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.fillStyle = paper.getPropertyValue('--margin-color');
  ctx.fillRect(parseFloat(paper.getPropertyValue('--margin-x')), 0, 1, height);
  const origin = sheet.getBoundingClientRect();
  for (const el of sheet.querySelectorAll<HTMLElement>('[data-print]')) {
    const node = el.firstChild;
    if (!(node instanceof Text)) continue;
    const style = getComputedStyle(el);
    ctx.fillStyle = style.color;
    ctx.font = [style.fontWeight, style.fontSize, style.fontFamily].join(' ');
    const metrics = ctx.measureText('Mg');
    const range = document.createRange();
    let line = '', x = 0, y = -1;
    const draw = () => ctx.fillText(line, x, y + metrics.fontBoundingBoxAscent);
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue;
      const top = rect.top - origin.top;
      if (top !== y) {
        if (line) draw();
        x = rect.left - origin.left;
        y = top;
        line = '';
      }
      line += node.data[i];
    }
    if (line) draw();
  }
  return { src: canvas.toDataURL('image/png'), width, height, paperColor: color };
}
