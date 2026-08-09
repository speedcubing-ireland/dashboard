import { cmyk } from "pdf-lib";

export function mmToPoints(mm: number): number {
  return (mm * 72.0) / 25.4;
}

export function flipY(pageHeight: number, y: number): number {
  return pageHeight - mmToPoints(y);
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

export function base64ToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function cmykColorFromRgb(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const key = 1 - Math.max(red, green, blue);

  if (key === 1) return cmyk(0, 0, 0, 1);

  return cmyk(
    (1 - red - key) / (1 - key),
    (1 - green - key) / (1 - key),
    (1 - blue - key) / (1 - key),
    key,
  );
}
