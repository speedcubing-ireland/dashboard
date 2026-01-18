import { rgb } from "pdf-lib";

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

export function rgbColor(r: number, g: number, b: number) {
  return rgb(r / 255, g / 255, b / 255);
}
