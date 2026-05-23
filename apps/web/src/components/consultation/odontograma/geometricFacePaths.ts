/** Segmentos do círculo de 5 faces (viewBox 40×40, centro 20,20) */
const CX = 20;
const CY = 20;
const R_OUT = 18;
const R_IN = 7;

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function ringSegment(startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(R_OUT, startDeg);
  const [x2, y2] = polar(R_OUT, endDeg);
  const [x3, y3] = polar(R_IN, endDeg);
  const [x4, y4] = polar(R_IN, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${R_IN} ${R_IN} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

/** V=topo, D=direita, L=baixo, M=esquerda; O=centro */
export const GEO_SEGMENTS: { face: 'V' | 'D' | 'L' | 'M'; d: string }[] = [
  { face: 'V', d: ringSegment(-40, 40) },
  { face: 'D', d: ringSegment(40, 140) },
  { face: 'L', d: ringSegment(140, 220) },
  { face: 'M', d: ringSegment(220, 320) },
];

export const GEO_CENTER = { cx: CX, cy: CY, r: R_IN - 0.5 };
