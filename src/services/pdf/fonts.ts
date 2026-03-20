import type { PDFDocument, PDFFont } from "pdf-lib";
import { FONT_URLS } from "@/constants";

const fontCache = new Map<string, ArrayBuffer>();
const embeddedCache = new WeakMap<PDFDocument, Map<string, PDFFont>>();
const characterSetCache = new WeakMap<PDFFont, Set<number>>();

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

function getCharacterSet(font: PDFFont): Set<number> {
  const cached = characterSetCache.get(font);
  if (cached) return cached;

  const set = new Set(font.getCharacterSet());
  characterSetCache.set(font, set);
  return set;
}

export function fontSupportsText(font: PDFFont, text: string): boolean {
  if (!text) return true;

  const set = getCharacterSet(font);
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    if (!set.has(codePoint)) return false;
  }
  return true;
}

function getTextCodePoints(text: string): number[] {
  const seen = new Set<number>();
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    seen.add(codePoint);
  }
  return [...seen];
}

function truncateText(text: string, maxLength = 40): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function formatMissingCodePoints(codePoints: number[]): string {
  return codePoints
    .map((codePoint) => {
      const char = String.fromCodePoint(codePoint);
      return `'${char}' (${formatCodePoint(codePoint)})`;
    })
    .join(", ");
}

export async function chooseRenderableFont(
  doc: PDFDocument,
  text: string,
  candidates: string[],
): Promise<PDFFont> {
  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];
  const codePoints = getTextCodePoints(text);
  const supportedByAnyFont = new Set<number>();
  let foundEmbeddableFont = false;

  for (const name of uniqueCandidates) {
    try {
      const font = await embedFont(doc, name);
      foundEmbeddableFont = true;

      const characterSet = getCharacterSet(font);
      let supportsAllCodePoints = true;
      for (const codePoint of codePoints) {
        if (characterSet.has(codePoint)) {
          supportedByAnyFont.add(codePoint);
          continue;
        }
        supportsAllCodePoints = false;
      }

      if (supportsAllCodePoints) return font;
    } catch {
      // Continue trying fallback fonts.
    }
  }

  if (!foundEmbeddableFont) {
    throw new Error(
      `Unable to embed any candidate fonts: ${uniqueCandidates.join(", ")}`,
    );
  }

  const unsupportedCodePoints = codePoints.filter(
    (codePoint) => !supportedByAnyFont.has(codePoint),
  );
  const preview = truncateText(text);

  if (unsupportedCodePoints.length > 0) {
    throw new Error(
      `Cannot render "${preview}". Missing glyphs: ${formatMissingCodePoints(unsupportedCodePoints)}.`,
    );
  }

  throw new Error(`Cannot render "${preview}" with a single available font.`);
}
