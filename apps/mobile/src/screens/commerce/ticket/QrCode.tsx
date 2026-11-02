/**
 * VTID-05512 — a copy of VTID-05511's ticket QR (PR #1575, not on this
 * lane's base; deduplicated once both land). The ticket QR, twin of the web `QRCodeSVG` (qrcode.react) as
 * `EventTicket` renders it: `level="H"`, `includeMargin={false}`, one dark
 * square per module on a light background, drawn with react-native-svg from
 * the same Nayuki encoder qrcode.react bundles (./qrcodegen.js, vendored).
 */
import type { ReactElement } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { qrcodegen } from './qrcodegen';

/** The module matrix (`true` = dark) for `value` at error-correction level H. */
export function qrMatrix(value: string): boolean[][] {
  const qr = qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.HIGH);
  return Array.from({ length: qr.size }, (_, y) => Array.from({ length: qr.size }, (__, x) => qr.getModule(x, y)));
}

/** qrcode.react's `generatePath`: one `M x y h1v1H x z` run per dark run of each row. */
export function qrPath(matrix: boolean[][]): string {
  const ops: string[] = [];
  matrix.forEach((row, y) => {
    let start: number | null = null;
    row.forEach((cell, x) => {
      if (!cell && start !== null) {
        ops.push(`M${start} ${y}h${x - start}v1H${start}z`);
        start = null;
        return;
      }
      if (x === row.length - 1) {
        if (!cell) return;
        if (start === null) ops.push(`M${x},${y} h1v1H${x}z`);
        else ops.push(`M${start},${y} h${x + 1 - start}v1H${start}z`);
        return;
      }
      if (cell && start === null) start = x;
    });
  });
  return ops.join('');
}

export function QrCode({ value, size, fg, bg, testID = 'ticket-qr' }: { value: string; size: number; fg: string; bg: string; testID?: string }): ReactElement {
  const matrix = qrMatrix(value);
  const n = matrix.length;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} testID={testID} accessibilityRole="image">
      <Rect width={n} height={n} fill={bg} />
      <Path d={qrPath(matrix)} fill={fg} />
    </Svg>
  );
}
