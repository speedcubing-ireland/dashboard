import type { PDFDocument, PDFFont } from "pdf-lib";
import { FONT_URLS } from "@/constants";

const fontCache = new Map<string, ArrayBuffer>();
const embeddedCache = new WeakMap<PDFDocument, Map<string, PDFFont>>();

async function loadFont(path: string): Promise<ArrayBuffer> {
  const cached = fontCache.get(path);
  if (cached) return cached;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load font: ${path}`);
  const buffer = await res.arrayBuffer();
  fontCache.set(path, buffer);
  return buffer;
}

export async function embedFont(
  doc: PDFDocument,
  name: string,
): Promise<PDFFont> {
  let docFonts = embeddedCache.get(doc);
  if (!docFonts) {
    docFonts = new Map();
    embeddedCache.set(doc, docFonts);
  }

  const existing = docFonts.get(name);
  if (existing) return existing;

  const path = FONT_URLS[name];
  if (!path) throw new Error(`Font not found: ${name}`);

  const bytes = await loadFont(path);
  const font = await doc.embedFont(bytes);
  docFonts.set(name, font);
  return font;
}

export async function preloadFonts(
  doc: PDFDocument,
): Promise<Record<string, PDFFont>> {
  const fonts: Record<string, PDFFont> = {};
  for (const name of ["NotoSans-Regular", "NotoSans-Bold"]) {
    fonts[name] = await embedFont(doc, name);
  }
  return fonts;
}

export function getTextWidth(
  text: string,
  font: PDFFont,
  size: number,
): number {
  return font.widthOfTextAtSize(text, size);
}
