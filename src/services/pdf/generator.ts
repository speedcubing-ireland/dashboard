import fontkit from "@pdf-lib/fontkit";
import {
  cmyk,
  PDFDocument,
  type PDFFont,
  type PDFImage,
  PDFName,
  type PDFPage,
  PDFString,
} from "pdf-lib";
import {
  A4L_HEIGHT,
  A4L_WIDTH,
  A6L_HEIGHT,
  A6L_WIDTH,
  A7_WIDTH,
  ASSET_PATHS,
  BLEED,
  COLUMN_RATIOS,
  EVENT_ICON_MAP,
  LAYOUT,
  WEEK_DAYS,
} from "@/constants";
import type { BadgeConfig, BadgeRole } from "@/types/badge";
import type { AssignmentInfo, PersonScheduleInfo } from "@/types/wcif";
import { cmykColorFromRgb, flipY, mmToPoints } from "@/utils/pdf";
import { chooseFont, parseLocalName, removeStageWord } from "@/utils/schedule";
import {
  chooseRenderableFont,
  embedFont,
  getTextWidth,
  preloadFonts,
} from "./fonts";

export interface BadgeContext {
  doc: PDFDocument;
  fonts: Record<string, PDFFont>;
  backgroundImage: PDFImage | null;
  roleBackgroundImages: Partial<Record<BadgeRole, PDFImage>>;
  roleBleedBackgroundImages: Partial<Record<BadgeRole, PDFImage>>;
  bleedBackgroundImage: PDFImage | null;
  logoImage: PDFImage | null;
  wcaLogoImage: PDFImage | null;
  flagImages: Map<string, PDFImage>;
  qrCodeImage: PDFImage | null;
  config: BadgeConfig;
  // Bleed margin in mm (0 when printing without bleed).
  bleed: number;
}

// Which outer edges of a badge sit on the sheet's trim edge and therefore
// need the background extended into the bleed area. The left edge is never
// bled as it is the fold in the middle of the badge.
interface BleedEdges {
  top: boolean;
  right: boolean;
  bottom: boolean;
}

const NO_BLEED: BleedEdges = { top: false, right: false, bottom: false };

// Illustrator coordinates for the variable fields in the 2026 badge artwork.
// All positions are relative to the A7 name-side trim, measured from its top-left.
const BADGE_NAME_LAYOUT = {
  firstNameFontSize: 24.17,
  firstNameTop: 68.66,
  secondNameFontSize: 17.03,
  secondNameTop: 78.43,
  nameCenterX: A7_WIDTH / 2,
  nameMaxWidth: 66,
  detailsFontSize: 9.43,
  detailsTop: 87.16,
  wcaIdCenterX: 16.497,
  wcaIdMaxWidth: 23.069,
  competitorIdCenterX: 57.752,
  competitorIdMaxWidth: 15.386,
  flagX: 37.125 - 8.26 / 2,
  flagTop: 89.291 - 4.13 / 2,
  flagWidth: 8.26,
  flagHeight: 4.13,
} as const;

let fogra39ProfilePromise: Promise<Uint8Array> | null = null;

type ScheduleColumn =
  | "time"
  | "event"
  | "stage"
  | "group"
  | "station"
  | "staff";

const TEXT_FONT_FALLBACKS = [
  "NotoSans-Regular",
  "NotoSans-Bold",
  "NotoSansSC",
  "NotoSansArabic",
  "NotoSansThai",
  "NotoSansArmenian",
  "NotoSansGeorgian",
];

function getTextFontCandidates(preferred: string, text: string): string[] {
  return [...new Set([preferred, chooseFont(text), ...TEXT_FONT_FALLBACKS])];
}

function getVisibleColumns(config: BadgeConfig): ScheduleColumn[] {
  const cols: ScheduleColumn[] = [];
  if (config.includeTimes) cols.push("time");
  cols.push("event");
  if (config.includeStages) cols.push("stage");
  cols.push("group");
  if (config.includeStations) cols.push("station");
  if (config.includeStaffing) cols.push("staff");
  return cols;
}

function getColumnWidths(
  config: BadgeConfig,
  totalWidth: number,
): Record<string, number> {
  const visible = getVisibleColumns(config);
  const totalRatio = visible.reduce((sum, col) => sum + COLUMN_RATIOS[col], 0);
  const widths: Record<string, number> = {};
  for (const col of visible) {
    widths[col] = (totalWidth * COLUMN_RATIOS[col]) / totalRatio;
  }
  return widths;
}

function getFillColor(
  config: BadgeConfig,
  assignment: AssignmentInfo,
  alt: number,
): [number, number, number] {
  if (config.customScheduleColors) return [255, 255, 255];
  if (config.colorFromStage) return assignment.stageColor;
  return alt % 2 === 0 ? [220, 220, 220] : [255, 255, 255];
}

function buildRoleText(a: AssignmentInfo): string {
  const parts: string[] = [];
  const short =
    (a.judging.length ? 1 : 0) +
      (a.running.length ? 1 : 0) +
      (a.scrambling.length ? 1 : 0) >
    1;
  if (a.judging.length)
    parts.push(`${short ? "J" : "Judge"}: ${a.judging.join(", ")}`);
  if (a.running.length)
    parts.push(`${short ? "R" : "Run"}: ${a.running.join(", ")}`);
  if (a.scrambling.length)
    parts.push(`${short ? "S" : "Scram"}: ${a.scrambling.join(", ")}`);
  return parts.join(" ");
}

async function drawEventIcon(
  ctx: BadgeContext,
  page: PDFPage,
  code: string,
  fontSize: number,
  x: number,
  y: number,
  scale = 1,
): Promise<number> {
  const char = EVENT_ICON_MAP[code];
  if (!char) return 0;
  try {
    const font = await embedFont(ctx.doc, "cubing-icons");
    font.encodeText(char);
    const size = fontSize * LAYOUT.iconSizeRatio * scale;
    let width = font.widthOfTextAtSize(char, size);
    if (!width || Number.isNaN(width)) width = size;
    page.drawText(char, { x, y, size, font, color: cmyk(0, 0, 0, 1) });
    return width;
  } catch {
    return 0;
  }
}

interface TextBoxOptions {
  rect: { x: number; y: number; w: number; h: number };
  align?: "left" | "center";
  fillColor?: [number, number, number];
  eventCode?: string;
  scale?: number;
}

async function drawTextBox(
  ctx: BadgeContext,
  page: PDFPage,
  text: string,
  opts: TextBoxOptions,
  pageHeight: number,
): Promise<void> {
  const { rect, align = "left", fillColor = [255, 255, 255], eventCode } = opts;
  const { h, w, x, y } = rect;

  const fontSize = h * LAYOUT.fontSizeMultiplier;
  const xPad = h * LAYOUT.xPaddingRatio;
  const yPad = h * LAYOUT.yPaddingRatio;

  const boxY = flipY(pageHeight, y);
  const boxH = mmToPoints(h);
  page.drawRectangle({
    x: mmToPoints(x),
    y: boxY - boxH,
    width: mmToPoints(w),
    height: boxH,
    color: cmykColorFromRgb(fillColor[0], fillColor[1], fillColor[2]),
    borderColor: cmyk(0, 0, 0, 0.5),
    borderWidth: 0.1,
  });

  const textY = flipY(pageHeight, y + yPad);
  const regularFont = await chooseRenderableFont(
    ctx.doc,
    text,
    getTextFontCandidates("NotoSans-Regular", text),
  );
  const textWidth = getTextWidth(text, regularFont, fontSize);

  const iconWidth = eventCode
    ? await (async () => {
        try {
          const iconFont = await embedFont(ctx.doc, "cubing-icons");
          const s = fontSize * LAYOUT.iconSizeRatio;
          return (
            iconFont.widthOfTextAtSize(EVENT_ICON_MAP[eventCode] || "", s) || s
          );
        } catch {
          return 0;
        }
      })()
    : 0;

  const iconSpacing = iconWidth > 0 ? fontSize * LAYOUT.iconSpacingRatio : 0;
  const availableWidth =
    w - (iconWidth > 0 ? ((iconWidth + iconSpacing) * 25.4) / 72 + xPad : xPad);
  const hScale =
    opts.scale ?? Math.min(1, mmToPoints(availableWidth) / textWidth);
  const scaledSize = fontSize * hScale;

  let textX = 0,
    iconX = 0;
  if (align === "center") {
    const total =
      iconWidth * hScale +
      iconSpacing * hScale +
      getTextWidth(text, regularFont, scaledSize);
    const center = mmToPoints(x + w / 2);
    iconX = center - total / 2;
    textX =
      iconX + (iconWidth > 0 ? iconWidth * hScale + iconSpacing * hScale : 0);
  } else {
    iconX = mmToPoints(x + xPad);
    textX =
      iconX + (iconWidth > 0 ? iconWidth * hScale + iconSpacing * hScale : 0);
  }

  if (eventCode)
    await drawEventIcon(ctx, page, eventCode, fontSize, iconX, textY, hScale);
  page.drawText(text, {
    x: textX,
    y: textY,
    size: scaledSize,
    font: regularFont,
  });
}

async function drawName(
  ctx: BadgeContext,
  page: PDFPage,
  text: string,
  align: "left" | "center",
  x: number,
  y: number,
  w: number,
  h: number,
  fontName = "NotoSans-Bold",
): Promise<void> {
  const { latinName, localName } = parseLocalName(text);
  const fontSize = h * LAYOUT.fontSizeMultiplier;
  const baseFont = await chooseRenderableFont(
    ctx.doc,
    latinName,
    getTextFontCandidates(fontName, latinName),
  );

  if (localName && ctx.config.includeLocalNames) {
    const localFont = await chooseRenderableFont(
      ctx.doc,
      localName,
      getTextFontCandidates(chooseFont(localName), localName),
    );
    const parts = [latinName, " (", localName, ")"];
    const fonts = [baseFont, baseFont, localFont, baseFont];
    const widths = [
      latinName ? getTextWidth(latinName, baseFont, fontSize) : 0,
      getTextWidth(" (", baseFont, fontSize),
      getTextWidth(localName, localFont, fontSize),
      getTextWidth(")", baseFont, fontSize),
    ];
    const total = widths.reduce((a, b) => a + b, 0);
    const scale = Math.min(1, mmToPoints(w) / total);
    const scaled = fontSize * scale;

    let baseX =
      align === "center"
        ? mmToPoints(x + w / 2) - (total * scale) / 2
        : mmToPoints(x);

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        page.drawText(parts[i], { x: baseX, y, size: scaled, font: fonts[i] });
        baseX += getTextWidth(parts[i], fonts[i], scaled);
      }
    }
  } else {
    const textWidth = getTextWidth(latinName, baseFont, fontSize);
    const scale = Math.min(1, mmToPoints(w) / textWidth);
    const scaled = fontSize * scale;
    const scaledWidth = getTextWidth(latinName, baseFont, scaled);
    const drawX =
      align === "center"
        ? mmToPoints(x + w / 2) - scaledWidth / 2
        : mmToPoints(x);
    page.drawText(latinName, { x: drawX, y, size: scaled, font: baseFont });
  }
}

async function splitNameIntoLines(
  ctx: BadgeContext,
  text: string,
  fontSize: number,
): Promise<[string, string]> {
  const font = await chooseRenderableFont(
    ctx.doc,
    text,
    getTextFontCandidates("NotoSans-Bold", text),
  );
  const bracketIdx = text.indexOf("(");
  let parts: string[];
  if (bracketIdx !== -1) {
    parts = text.substring(0, bracketIdx - 1).split(" ");
    parts.push(text.slice(bracketIdx));
  } else {
    parts = text.split(" ");
  }

  if (parts.length < 2) return ["", text];

  const lengths = parts.map((p) => {
    const m = p.match(/(.*)\s*[(（](.+)[)）]/);
    if (m && ctx.config.includeLocalNames) {
      const local = m[2].trim();
      const localFont = chooseRenderableFont(
        ctx.doc,
        local,
        getTextFontCandidates(chooseFont(local), local),
      );
      return Promise.resolve(localFont).then(
        (lf) =>
          getTextWidth(`${m[1].trim()} `, font, fontSize) +
          getTextWidth("(", font, fontSize) +
          getTextWidth(local, lf, fontSize) +
          getTextWidth(")", font, fontSize),
      );
    }
    return Promise.resolve(getTextWidth(p, font, fontSize));
  });

  const widths = await Promise.all(lengths);
  const target = widths.reduce((a, b) => a + b, 0) / 2;
  const spaceWidth = getTextWidth(" ", font, fontSize);

  let second = parts[parts.length - 1];
  let secondLen = widths[widths.length - 1];

  for (let i = parts.length - 2; i >= 0; i--) {
    const next = secondLen + spaceWidth + widths[i];
    if (Math.abs(secondLen - target) <= Math.abs(next - target)) {
      return [parts.slice(0, i + 1).join(" "), second];
    }
    second = `${parts[i]} ${second}`;
    secondLen = next;
  }

  return ["", text];
}

async function drawCenteredFittedText(
  ctx: BadgeContext,
  page: PDFPage,
  text: string,
  centerX: number,
  top: number,
  maxWidth: number,
  fontSize: number,
  fontCandidates: string[],
  offsetX: number,
  offsetY: number,
  pageHeight: number,
): Promise<void> {
  if (!text) return;

  const font = await chooseRenderableFont(ctx.doc, text, [
    ...fontCandidates,
    ...getTextFontCandidates(fontCandidates[0], text),
  ]);
  const naturalWidth = getTextWidth(text, font, fontSize);
  const size =
    naturalWidth > 0
      ? fontSize * Math.min(1, mmToPoints(maxWidth) / naturalWidth)
      : fontSize;
  const width = getTextWidth(text, font, size);
  const ascent = font.heightAtSize(size, { descender: false });

  page.drawText(text, {
    x: mmToPoints(offsetX + centerX) - width / 2,
    y: flipY(pageHeight, offsetY + top) - ascent,
    size,
    font,
    color: cmyk(0, 0, 0, 1),
  });
}

async function drawNameSide(
  ctx: BadgeContext,
  page: PDFPage,
  info: PersonScheduleInfo,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  pageHeight: number,
  bleedEdges: BleedEdges = NO_BLEED,
): Promise<void> {
  const roleBackground =
    ctx.roleBackgroundImages[info.badgeRole] ?? ctx.backgroundImage;
  const dedicatedBleedBackground =
    ctx.bleed > 0 && bleedEdges.top && bleedEdges.right && bleedEdges.bottom
      ? ctx.roleBleedBackgroundImages[info.badgeRole]
      : undefined;

  if (dedicatedBleedBackground) {
    page.drawImage(dedicatedBleedBackground, {
      x: mmToPoints(offsetX),
      y: flipY(pageHeight, offsetY + height + ctx.bleed),
      width: mmToPoints(width + ctx.bleed),
      height: mmToPoints(height + 2 * ctx.bleed),
    });
  } else if (roleBackground) {
    // Extend the background past the trim edge into the bleed area on the
    // edges that sit on the sheet boundary when no dedicated artwork exists.
    const topExt = bleedEdges.top ? ctx.bleed : 0;
    const bottomExt = bleedEdges.bottom ? ctx.bleed : 0;
    const rightExt = bleedEdges.right ? ctx.bleed : 0;
    const drawX = mmToPoints(offsetX);
    const drawY = flipY(pageHeight, offsetY + height + bottomExt);
    page.drawImage(roleBackground, {
      x: drawX,
      y: drawY,
      width: mmToPoints(width + rightExt),
      height: mmToPoints(height + topExt + bottomExt),
    });
  }

  // The media artwork is already complete and is printed on both sides.
  if (info.badgeRole === "media") return;

  if (!info.blank) {
    const lines = await splitNameIntoLines(
      ctx,
      info.name.toUpperCase(),
      BADGE_NAME_LAYOUT.secondNameFontSize,
    );
    const displayLines: [string, string] = lines[0] ? lines : [lines[1], ""];
    await drawCenteredFittedText(
      ctx,
      page,
      displayLines[0],
      BADGE_NAME_LAYOUT.nameCenterX,
      BADGE_NAME_LAYOUT.firstNameTop,
      BADGE_NAME_LAYOUT.nameMaxWidth,
      BADGE_NAME_LAYOUT.firstNameFontSize,
      ["InputSans-Bold"],
      offsetX,
      offsetY,
      pageHeight,
    );
    await drawCenteredFittedText(
      ctx,
      page,
      displayLines[1],
      BADGE_NAME_LAYOUT.nameCenterX,
      BADGE_NAME_LAYOUT.secondNameTop,
      BADGE_NAME_LAYOUT.nameMaxWidth,
      BADGE_NAME_LAYOUT.secondNameFontSize,
      ["InputSans-Bold"],
      offsetX,
      offsetY,
      pageHeight,
    );
  }

  if (!info.blank) {
    await drawCenteredFittedText(
      ctx,
      page,
      info.wcaid || "NEWCOMER",
      BADGE_NAME_LAYOUT.wcaIdCenterX,
      BADGE_NAME_LAYOUT.detailsTop,
      BADGE_NAME_LAYOUT.wcaIdMaxWidth,
      BADGE_NAME_LAYOUT.detailsFontSize,
      ["InputSansCondensed-Bold"],
      offsetX,
      offsetY,
      pageHeight,
    );
    if (ctx.config.includeCompetitorId) {
      await drawCenteredFittedText(
        ctx,
        page,
        `ID #${info.compid}`,
        BADGE_NAME_LAYOUT.competitorIdCenterX,
        BADGE_NAME_LAYOUT.detailsTop,
        BADGE_NAME_LAYOUT.competitorIdMaxWidth,
        BADGE_NAME_LAYOUT.detailsFontSize,
        ["InputSansCondensed-Bold"],
        offsetX,
        offsetY,
        pageHeight,
      );
    }
  }

  if (!info.blank) {
    const flag = ctx.flagImages.get(info.countryCode);
    if (flag) {
      page.drawImage(flag, {
        x: mmToPoints(offsetX + BADGE_NAME_LAYOUT.flagX),
        y:
          flipY(pageHeight, offsetY + BADGE_NAME_LAYOUT.flagTop) -
          mmToPoints(BADGE_NAME_LAYOUT.flagHeight),
        width: mmToPoints(BADGE_NAME_LAYOUT.flagWidth),
        height: mmToPoints(BADGE_NAME_LAYOUT.flagHeight),
      });
    }
  }
}

function drawMediaSpread(
  ctx: BadgeContext,
  page: PDFPage,
  offsetX: number,
  offsetY: number,
  pageHeight: number,
): void {
  const trimBackground = ctx.roleBackgroundImages.media;
  const bleedBackground = ctx.roleBleedBackgroundImages.media;

  // Paint both full-bleed copies first, then cover their overlap at the fold
  // with the two exact trim images. This preserves bleed on both outer edges.
  if (ctx.bleed > 0 && bleedBackground) {
    for (const halfX of [offsetX, offsetX + A7_WIDTH]) {
      page.drawImage(bleedBackground, {
        x: mmToPoints(halfX - ctx.bleed),
        y: flipY(pageHeight, offsetY + A6L_HEIGHT + ctx.bleed),
        width: mmToPoints(A7_WIDTH + 2 * ctx.bleed),
        height: mmToPoints(A6L_HEIGHT + 2 * ctx.bleed),
      });
    }
  }

  const trimImage = trimBackground ?? bleedBackground;
  if (!trimImage) return;
  for (const halfX of [offsetX, offsetX + A7_WIDTH]) {
    page.drawImage(trimImage, {
      x: mmToPoints(halfX),
      y: flipY(pageHeight, offsetY + A6L_HEIGHT),
      width: mmToPoints(A7_WIDTH),
      height: mmToPoints(A6L_HEIGHT),
    });
  }
}

function shouldShowAssignment(a: AssignmentInfo, config: BadgeConfig): boolean {
  return !(
    a.competing === -1 &&
    (!config.includeStaffing || config.hideStaffOnlyAssignments)
  );
}

async function drawSchedule(
  ctx: BadgeContext,
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  info: PersonScheduleInfo,
  pageHeight: number,
  maxHeight?: number,
): Promise<number> {
  if (info.blank) return 0;

  const widths = getColumnWidths(ctx.config, w);
  const columns = getVisibleColumns(ctx.config);
  const headerH = 2.5,
    assignH = 3.5,
    dayH = 4;
  const headerMap: Record<string, string> = {
    time: "Time",
    event: "Event",
    stage: "Stage",
    group: "Group",
    station: "Station",
    staff: "Staff Groups",
  };

  let row = y;
  let col = x;
  for (const c of columns) {
    const w = widths[c];
    await drawTextBox(
      ctx,
      page,
      headerMap[c],
      { rect: { x: col, y: row, w, h: headerH } },
      pageHeight,
    );
    col += w;
  }
  row += headerH;

  for (const day of info.sortedSchedule) {
    if (maxHeight && row + dayH - y > maxHeight) break;
    await drawTextBox(
      ctx,
      page,
      WEEK_DAYS[day.day] || "Unknown",
      { rect: { x, y: row, w, h: dayH }, align: "center" },
      pageHeight,
    );
    row += dayH;

    let alt = 0;
    for (const a of day.sortedAssignments) {
      if (maxHeight && row + assignH - y > maxHeight) break;
      if (!shouldShowAssignment(a, ctx.config)) continue;

      const fill = getFillColor(ctx.config, a, alt++);
      let col = x;
      for (const c of columns) {
        let text = "";
        let ev: string | undefined;
        const colW = widths[c];

        if (c === "time") text = a.timeText;
        else if (c === "event") {
          text = a.eventText;
          ev = a.eventCode;
        } else if (c === "stage")
          text = ctx.config.removeStageWord
            ? removeStageWord(a.stageText)
            : a.stageText;
        else if (c === "group")
          text =
            a.competing === -1 && ctx.config.includeStaffing
              ? "-"
              : `${a.competing}`;
        else if (c === "station")
          text =
            a.competing === -1
              ? "-"
              : a.stationNumber === null
                ? "any"
                : `${a.stationNumber}`;
        else if (c === "staff") text = buildRoleText(a);

        await drawTextBox(
          ctx,
          page,
          text,
          {
            rect: { x: col, y: row, w: colW, h: assignH },
            fillColor: fill,
            eventCode: ev,
          },
          pageHeight,
        );
        col += colW;
      }
      row += assignH;
    }
  }

  return row - y;
}

async function drawScheduleSide(
  ctx: BadgeContext,
  page: PDFPage,
  info: PersonScheduleInfo,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  pageHeight: number,
): Promise<void> {
  if (info.badgeRole === "media") {
    const background = ctx.roleBackgroundImages.media;
    if (background) {
      page.drawImage(background, {
        x: mmToPoints(offsetX),
        y: flipY(pageHeight, offsetY + height),
        width: mmToPoints(width),
        height: mmToPoints(height),
      });
    }
    return;
  }

  if (info.badgeOnly) return;

  let schedH = 0;
  if (!info.blank) {
    await drawName(
      ctx,
      page,
      info.name,
      "left",
      offsetX + 3,
      flipY(pageHeight, offsetY + 7),
      width - 12,
      4,
      "NotoSans-Bold",
    );

    const compidText = `${info.compid}`;
    const regularFont = await chooseRenderableFont(
      ctx.doc,
      compidText,
      getTextFontCandidates("NotoSans-Regular", compidText),
    );
    const compidWidth = getTextWidth(compidText, regularFont, 7);
    page.drawText(compidText, {
      x: mmToPoints(offsetX + width - 6) - compidWidth / 2,
      y: flipY(pageHeight, offsetY + 6),
      size: 7,
      font: regularFont,
    });

    const startY = offsetY + 10;
    const maxH = height - 10 - 5;
    schedH = await drawSchedule(
      ctx,
      page,
      offsetX + 3,
      startY,
      width - 6,
      info,
      pageHeight,
      maxH,
    );
  }

  const space = height - 10 - schedH;
  if (
    ctx.config.showWcaLiveQrCode &&
    ctx.qrCodeImage &&
    ctx.config.qrCodeText &&
    space >= 18
  ) {
    const qrSize = mmToPoints(15);
    page.drawImage(ctx.qrCodeImage, {
      x: mmToPoints(offsetX + width - 18),
      y: flipY(pageHeight, offsetY + height - 18) - qrSize,
      width: qrSize,
      height: qrSize,
    });

    const qrFont = await chooseRenderableFont(
      ctx.doc,
      ctx.config.qrCodeText,
      getTextFontCandidates("NotoSans-Regular", ctx.config.qrCodeText),
    );
    const maxTextW = mmToPoints(width - 30);
    const words = ctx.config.qrCodeText.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (getTextWidth(test, qrFont, 8) > maxTextW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const textStartY = offsetY + height - 13.5;
    const rightEdge = mmToPoints(offsetX + width - 20);
    lines.forEach((l, i) => {
      page.drawText(l, {
        x: rightEdge - getTextWidth(l, qrFont, 8),
        y: flipY(pageHeight, textStartY + i * 4),
        size: 8,
        font: qrFont,
      });
    });
  }
}

async function drawBadge(
  ctx: BadgeContext,
  page: PDFPage,
  info: PersonScheduleInfo,
  offsetX: number,
  offsetY: number,
  pageHeight: number,
  bleedEdges: BleedEdges = NO_BLEED,
): Promise<void> {
  if (info.badgeRole === "media") {
    drawMediaSpread(ctx, page, offsetX, offsetY, pageHeight);
    return;
  }

  const scheduleWidth = A6L_WIDTH - A7_WIDTH;
  const nameWidth = A7_WIDTH;
  await drawScheduleSide(
    ctx,
    page,
    info,
    offsetX,
    offsetY,
    scheduleWidth,
    A6L_HEIGHT,
    pageHeight,
  );
  await drawNameSide(
    ctx,
    page,
    info,
    offsetX + scheduleWidth,
    offsetY,
    nameWidth,
    A6L_HEIGHT,
    pageHeight,
    bleedEdges,
  );
  page.drawLine({
    start: {
      x: mmToPoints(offsetX + scheduleWidth),
      y: flipY(pageHeight, offsetY),
    },
    end: {
      x: mmToPoints(offsetX + scheduleWidth),
      y: flipY(pageHeight, offsetY + A6L_HEIGHT),
    },
    thickness: 0.5,
    color: cmyk(0, 0, 0, 0.2),
  });
}

function drawCuttingLines(page: PDFPage, bleed = 0): void {
  const cx = mmToPoints(bleed + A4L_WIDTH / 2);
  const cy = mmToPoints(bleed + A4L_HEIGHT / 2);
  const left = mmToPoints(bleed);
  const right = mmToPoints(bleed + A4L_WIDTH);
  const bottom = mmToPoints(bleed);
  const top = mmToPoints(bleed + A4L_HEIGHT);
  page.drawLine({
    start: { x: cx, y: bottom },
    end: { x: cx, y: top },
    thickness: 0.25,
    color: cmyk(0, 0, 0, 0.5),
    dashArray: [1],
  });
  page.drawLine({
    start: { x: left, y: cy },
    end: { x: right, y: cy },
    thickness: 0.25,
    color: cmyk(0, 0, 0, 0.5),
    dashArray: [1],
  });
}

function setPrintBoxes(
  page: PDFPage,
  bleed: number,
  trimW: number,
  trimH: number,
): void {
  if (!bleed) return;

  page.setBleedBox(
    0,
    0,
    mmToPoints(trimW + 2 * bleed),
    mmToPoints(trimH + 2 * bleed),
  );
  page.setTrimBox(
    mmToPoints(bleed),
    mmToPoints(bleed),
    mmToPoints(trimW),
    mmToPoints(trimH),
  );
}

async function loadFogra39Profile(): Promise<Uint8Array> {
  fogra39ProfilePromise ??= fetch(ASSET_PATHS.fogra39Profile).then(
    async (res) => {
      if (!res.ok) throw new Error("Failed to load Coated FOGRA39 ICC profile");
      return new Uint8Array(await res.arrayBuffer());
    },
  );
  return fogra39ProfilePromise;
}

async function embedFogra39OutputIntent(doc: PDFDocument): Promise<void> {
  const profile = await loadFogra39Profile();
  const context = doc.context;
  const profileStream = context.flateStream(profile, {
    N: 4,
    Alternate: "DeviceCMYK",
  });
  const profileRef = context.register(profileStream);
  const outputIntent = context.obj({
    Type: "OutputIntent",
    S: "GTS_PDFX",
    OutputConditionIdentifier: PDFString.of("FOGRA39"),
    OutputCondition: PDFString.of("Coated FOGRA39 (ISO 12647-2:2004)"),
    RegistryName: PDFString.of("https://www.color.org"),
    Info: PDFString.of("Coated FOGRA39 (ISO 12647-2:2004)"),
    DestOutputProfile: profileRef,
  });
  const outputIntentRef = context.register(outputIntent);

  doc.catalog.set(PDFName.of("OutputIntents"), context.obj([outputIntentRef]));
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

async function embedImages(
  doc: PDFDocument,
  images: {
    background?: Uint8Array;
    roleBackgrounds?: Partial<Record<BadgeRole, Uint8Array>>;
    roleBleedBackgrounds?: Partial<Record<BadgeRole, Uint8Array>>;
    bleedBackground?: Uint8Array;
    logo?: Uint8Array;
    wcaLogo?: Uint8Array;
    flags: Map<string, Uint8Array>;
    qrCode?: Uint8Array;
  },
) {
  const flagImages = new Map<string, PDFImage>();
  const roleBackgroundImages: Partial<Record<BadgeRole, PDFImage>> = {};
  const roleBleedBackgroundImages: Partial<Record<BadgeRole, PDFImage>> = {};
  const embed = async (bytes?: Uint8Array) => {
    if (!bytes) return null;
    if (isJpeg(bytes)) return doc.embedJpg(bytes);
    if (isPng(bytes)) return doc.embedPng(bytes);

    try {
      return await doc.embedPng(bytes);
    } catch {
      return doc.embedJpg(bytes);
    }
  };

  const [bg, bleedBg, logo, wca, qr] = await Promise.all([
    embed(images.background),
    embed(images.bleedBackground),
    embed(images.logo),
    embed(images.wcaLogo),
    embed(images.qrCode),
  ]);

  for (const [code, bytes] of images.flags) {
    try {
      const flag = await embed(bytes);
      if (flag) flagImages.set(code, flag);
    } catch {}
  }

  for (const [role, bytes] of Object.entries(images.roleBackgrounds ?? {})) {
    const image = await embed(bytes);
    if (image) roleBackgroundImages[role as BadgeRole] = image;
  }
  for (const [role, bytes] of Object.entries(
    images.roleBleedBackgrounds ?? {},
  )) {
    const image = await embed(bytes);
    if (image) roleBleedBackgroundImages[role as BadgeRole] = image;
  }

  return {
    backgroundImage: bg,
    roleBackgroundImages,
    roleBleedBackgroundImages,
    bleedBackgroundImage: bleedBg,
    logoImage: logo,
    wcaLogoImage: wca,
    flagImages,
    qrCodeImage: qr,
  };
}

export async function generateSingleBadge(
  info: PersonScheduleInfo,
  config: BadgeConfig,
  images: {
    background?: Uint8Array;
    roleBackgrounds?: Partial<Record<BadgeRole, Uint8Array>>;
    roleBleedBackgrounds?: Partial<Record<BadgeRole, Uint8Array>>;
    bleedBackground?: Uint8Array;
    logo?: Uint8Array;
    wcaLogo?: Uint8Array;
    flag?: Uint8Array;
    qrCode?: Uint8Array;
  },
): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  await embedFogra39OutputIntent(doc);

  const flagMap = new Map<string, Uint8Array>();
  if (images.flag) flagMap.set(info.countryCode, images.flag);

  const embedded = await embedImages(doc, { ...images, flags: flagMap });
  const bleed = config.printWithBleed ? BLEED : 0;
  const page = doc.addPage([
    mmToPoints(A6L_WIDTH + 2 * bleed),
    mmToPoints(A6L_HEIGHT + 2 * bleed),
  ]);
  setPrintBoxes(page, bleed, A6L_WIDTH, A6L_HEIGHT);
  const pageHeight = mmToPoints(A6L_HEIGHT + 2 * bleed);
  const scheduleWidth = A6L_WIDTH - A7_WIDTH;
  const nameWidth = A7_WIDTH;

  const ctx: BadgeContext = {
    doc,
    fonts: await preloadFonts(doc),
    config,
    bleed,
    ...embedded,
  };

  if (info.badgeRole === "media") {
    drawMediaSpread(ctx, page, bleed, bleed, pageHeight);
  } else {
    await drawScheduleSide(
      ctx,
      page,
      info,
      bleed,
      bleed,
      scheduleWidth,
      A6L_HEIGHT,
      pageHeight,
    );
    await drawNameSide(
      ctx,
      page,
      info,
      bleed + scheduleWidth,
      bleed,
      nameWidth,
      A6L_HEIGHT,
      pageHeight,
      // A single badge fills the sheet: name side bleeds on all outer edges.
      { top: true, right: true, bottom: true },
    );
  }

  const dividerX = mmToPoints(bleed + scheduleWidth);
  if (info.badgeRole !== "media") {
    page.drawLine({
      start: { x: dividerX, y: pageHeight },
      end: { x: dividerX, y: 0 },
      thickness: 0.5,
      color: cmyk(0, 0, 0, 0.2),
    });
  }

  return doc;
}

export async function generateAllBadges(
  persons: PersonScheduleInfo[],
  config: BadgeConfig,
  images: {
    background?: Uint8Array;
    roleBackgrounds?: Partial<Record<BadgeRole, Uint8Array>>;
    roleBleedBackgrounds?: Partial<Record<BadgeRole, Uint8Array>>;
    bleedBackground?: Uint8Array;
    logo?: Uint8Array;
    wcaLogo?: Uint8Array;
    flags: Map<string, Uint8Array>;
    qrCode?: Uint8Array;
  },
  onProgress?: (current: number, total: number) => void,
): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  await embedFogra39OutputIntent(doc);

  const embedded = await embedImages(doc, images);
  const bleed = config.printWithBleed ? BLEED : 0;
  const ctx: BadgeContext = {
    doc,
    fonts: await preloadFonts(doc),
    config,
    bleed,
    ...embedded,
  };

  const template = config.printWithBleed ? "portrait-book" : config.template;

  if (template === "portrait-book") {
    const pageHeight = mmToPoints(A6L_HEIGHT + 2 * bleed);
    for (let i = 0; i < persons.length; i++) {
      const page = doc.addPage([
        mmToPoints(A6L_WIDTH + 2 * bleed),
        mmToPoints(A6L_HEIGHT + 2 * bleed),
      ]);
      setPrintBoxes(page, bleed, A6L_WIDTH, A6L_HEIGHT);
      const scheduleWidth = A6L_WIDTH - A7_WIDTH;
      const nameWidth = A7_WIDTH;

      if (persons[i].badgeRole === "media") {
        drawMediaSpread(ctx, page, bleed, bleed, pageHeight);
      } else {
        await drawScheduleSide(
          ctx,
          page,
          persons[i],
          bleed,
          bleed,
          scheduleWidth,
          A6L_HEIGHT,
          pageHeight,
        );
        await drawNameSide(
          ctx,
          page,
          persons[i],
          bleed + scheduleWidth,
          bleed,
          nameWidth,
          A6L_HEIGHT,
          pageHeight,
          // One badge per sheet: name side bleeds on all outer edges.
          { top: true, right: true, bottom: true },
        );
      }

      const dividerX = mmToPoints(bleed + scheduleWidth);
      if (persons[i].badgeRole !== "media") {
        page.drawLine({
          start: { x: dividerX, y: pageHeight },
          end: { x: dividerX, y: 0 },
          thickness: 0.5,
          color: cmyk(0, 0, 0, 0.2),
        });
      }

      if (onProgress) {
        onProgress(i + 1, persons.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  } else {
    let page: PDFPage | undefined;
    const pageHeight = mmToPoints(A4L_HEIGHT + 2 * bleed);

    for (let i = 0; i < persons.length; i++) {
      if (i % 4 === 0) {
        page = doc.addPage([
          mmToPoints(A4L_WIDTH + 2 * bleed),
          mmToPoints(A4L_HEIGHT + 2 * bleed),
        ]);
        drawCuttingLines(page, bleed);
      }

      if (!page) throw new Error("Page failed to initialize");

      const col = i % 2;
      const row = Math.floor((i % 4) / 2);
      const offsetX =
        bleed + col * (A4L_WIDTH / 2) + (A4L_WIDTH / 2 - A6L_WIDTH) / 2;
      const offsetY =
        bleed + row * (A4L_HEIGHT / 2) + (A4L_HEIGHT / 2 - A6L_HEIGHT) / 2;

      // Only edges on the outer trim of the sheet get bled; internal cuts
      // between badges are butt cuts. Row 0 is the top row (y grows down).
      await drawBadge(ctx, page, persons[i], offsetX, offsetY, pageHeight, {
        top: row === 0,
        right: col === 1,
        bottom: row === 1,
      });

      if (onProgress) {
        onProgress(i + 1, persons.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  return doc;
}
