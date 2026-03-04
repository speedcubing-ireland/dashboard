import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
} from "pdf-lib";
import {
  A4L_HEIGHT,
  A4L_WIDTH,
  A6L_HEIGHT,
  A6L_WIDTH,
  A7_WIDTH,
  COLUMN_RATIOS,
  EVENT_ICON_MAP,
  LAYOUT,
  WEEK_DAYS,
} from "@/constants";
import type { BadgeConfig } from "@/types/badge";
import type { AssignmentInfo, PersonScheduleInfo } from "@/types/wcif";
import { flipY, mmToPoints, rgbColor } from "@/utils/pdf";
import { chooseFont, parseLocalName, removeStageWord } from "@/utils/schedule";
import { embedFont, getTextWidth, preloadFonts } from "./fonts";

export interface BadgeContext {
  doc: PDFDocument;
  fonts: Record<string, PDFFont>;
  backgroundImage: PDFImage | null;
  logoImage: PDFImage | null;
  wcaLogoImage: PDFImage | null;
  flagImages: Map<string, PDFImage>;
  qrCodeImage: PDFImage | null;
  config: BadgeConfig;
}

type ScheduleColumn =
  | "time"
  | "event"
  | "stage"
  | "group"
  | "station"
  | "staff";

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
    page.drawText(char, { x, y, size, font, color: rgb(0, 0, 0) });
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
    color: rgbColor(fillColor[0], fillColor[1], fillColor[2]),
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 0.1,
  });

  const textY = flipY(pageHeight, y + yPad);
  const regularFont = await embedFont(ctx.doc, "NotoSans-Regular");
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
  const font = await embedFont(ctx.doc, fontName);

  if (localName && ctx.config.includeLocalNames) {
    const localFont = await embedFont(ctx.doc, chooseFont(localName));
    const parts = [latinName, " (", localName, ")"];
    const widths = [
      latinName ? getTextWidth(latinName, font, fontSize) : 0,
      getTextWidth(" (", font, fontSize),
      getTextWidth(localName, localFont, fontSize),
      getTextWidth(")", font, fontSize),
    ];
    const total = widths.reduce((a, b) => a + b, 0);
    const scale = Math.min(1, mmToPoints(w) / total);
    const scaled = fontSize * scale;

    let baseX =
      align === "center"
        ? mmToPoints(x + w / 2) - (total * scale) / 2
        : mmToPoints(x);
    const fonts = [font, font, localFont, font];

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        page.drawText(parts[i], { x: baseX, y, size: scaled, font: fonts[i] });
        baseX += getTextWidth(parts[i], fonts[i], scaled);
      }
    }
  } else {
    const textWidth = getTextWidth(latinName, font, fontSize);
    const scale = Math.min(1, mmToPoints(w) / textWidth);
    const scaled = fontSize * scale;
    const scaledWidth = getTextWidth(latinName, font, scaled);
    const drawX =
      align === "center"
        ? mmToPoints(x + w / 2) - scaledWidth / 2
        : mmToPoints(x);
    page.drawText(latinName, { x: drawX, y, size: scaled, font });
  }
}

async function splitNameIntoLines(
  ctx: BadgeContext,
  text: string,
  fontSize: number,
): Promise<[string, string]> {
  const font = await embedFont(ctx.doc, "NotoSans-Bold");
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
    const m = p.match(/(.*)\\s*[(（](.+)[)）]/);
    if (m && ctx.config.includeLocalNames) {
      const local = m[2].trim();
      const localFont = embedFont(ctx.doc, chooseFont(local));
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

async function drawNameSide(
  ctx: BadgeContext,
  page: PDFPage,
  info: PersonScheduleInfo,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  pageHeight: number,
): Promise<void> {
  if (ctx.backgroundImage) {
    const areaW = mmToPoints(width);
    const areaH = mmToPoints(height);
    const drawW = areaW;
    const drawH = areaH;
    const drawX = mmToPoints(offsetX);
    const drawY = flipY(pageHeight, offsetY) - drawH;
    page.drawImage(ctx.backgroundImage, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
  }

  if (!info.blank) {
    const lines = await splitNameIntoLines(
      ctx,
      info.name,
      10 * LAYOUT.fontSizeMultiplier,
    );
    const lineSpacing = mmToPoints(9);
    const y1 = flipY(pageHeight, offsetY + 71);
    await drawName(
      ctx,
      page,
      lines[0],
      "center",
      offsetX + 3,
      y1,
      width - 6,
      10,
    );
    await drawName(
      ctx,
      page,
      lines[1],
      "center",
      offsetX + 3,
      y1 - lineSpacing,
      width - 6,
      10,
    );
  }

  page.drawLine({
    start: { x: mmToPoints(offsetX + 5), y: flipY(pageHeight, offsetY + 83) },
    end: {
      x: mmToPoints(offsetX + width - 5),
      y: flipY(pageHeight, offsetY + 83),
    },
    thickness: mmToPoints(0.25),
    color: rgb(0, 0, 0),
  });

  const regularFont = await embedFont(ctx.doc, "NotoSans-Regular");
  if (!info.blank) {
    let idText = info.wcaid || "NEWCOMER";
    const color = info.wcaid ? rgb(0, 0, 0) : rgbColor(196, 0, 0);
    if (ctx.config.includeCompetitorId) idText += ` - ID ${info.compid}`;
    const textWidth = getTextWidth(idText, regularFont, 13);
    page.drawText(idText, {
      x: mmToPoints(offsetX + width / 2) - textWidth / 2,
      y: flipY(pageHeight, offsetY + 88),
      size: 13,
      font: regularFont,
      color,
    });
  }

  const logoH = mmToPoints(10);
  const logoY = flipY(pageHeight, offsetY + height - 13) - logoH;

  if (ctx.wcaLogoImage) {
    const r = ctx.wcaLogoImage.width / ctx.wcaLogoImage.height;
    page.drawImage(ctx.wcaLogoImage, {
      x: mmToPoints(offsetX + 3),
      y: logoY,
      width: mmToPoints(10 * r),
      height: logoH,
    });
  }

  if (ctx.logoImage) {
    const r = ctx.logoImage.width / ctx.logoImage.height;
    page.drawImage(ctx.logoImage, {
      x: mmToPoints(offsetX + width - 10 * r - 3),
      y: logoY,
      width: mmToPoints(10 * r),
      height: logoH,
    });
  }

  if (!info.blank) {
    const flag = ctx.flagImages.get(info.countryCode);
    if (flag) {
      const r = flag.width / flag.height;
      const flagW = r * 5;
      const flagH = mmToPoints(5);
      page.drawImage(flag, {
        x: mmToPoints(offsetX + (width - flagW) / 2),
        y: flipY(pageHeight, offsetY + height - 15) - flagH,
        width: mmToPoints(flagW),
        height: flagH,
      });
      if (!["np", "tw"].includes(info.countryCode)) {
        page.drawRectangle({
          x: mmToPoints(offsetX + (width - flagW) / 2),
          y: flipY(pageHeight, offsetY + height - 15) - flagH,
          width: mmToPoints(flagW),
          height: flagH,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.1,
        });
      }
    }
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
  const regularFont = await embedFont(ctx.doc, "NotoSans-Regular");
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

    const qrFont = await embedFont(ctx.doc, "NotoSans-Regular");
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
): Promise<void> {
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
    color: rgb(0.8, 0.8, 0.8),
  });
}

function drawCuttingLines(page: PDFPage): void {
  page.drawLine({
    start: { x: mmToPoints(A4L_WIDTH / 2), y: 0 },
    end: { x: mmToPoints(A4L_WIDTH / 2), y: mmToPoints(A4L_HEIGHT) },
    thickness: 0.25,
    color: rgb(0.5, 0.5, 0.5),
    dashArray: [1],
  });
  page.drawLine({
    start: { x: 0, y: mmToPoints(A4L_HEIGHT / 2) },
    end: { x: mmToPoints(A4L_WIDTH), y: mmToPoints(A4L_HEIGHT / 2) },
    thickness: 0.25,
    color: rgb(0.5, 0.5, 0.5),
    dashArray: [1],
  });
}

async function embedImages(
  doc: PDFDocument,
  images: {
    background?: Uint8Array;
    logo?: Uint8Array;
    wcaLogo?: Uint8Array;
    flags: Map<string, Uint8Array>;
    qrCode?: Uint8Array;
  },
) {
  const flagImages = new Map<string, PDFImage>();
  const embed = async (bytes?: Uint8Array) =>
    bytes ? doc.embedPng(bytes) : null;

  const [bg, logo, wca, qr] = await Promise.all([
    embed(images.background),
    embed(images.logo),
    embed(images.wcaLogo),
    embed(images.qrCode),
  ]);

  for (const [code, bytes] of images.flags) {
    try {
      flagImages.set(code, await doc.embedPng(bytes));
    } catch {}
  }

  return {
    backgroundImage: bg,
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
    logo?: Uint8Array;
    wcaLogo?: Uint8Array;
    flag?: Uint8Array;
    qrCode?: Uint8Array;
  },
): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const flagMap = new Map<string, Uint8Array>();
  if (images.flag) flagMap.set(info.countryCode, images.flag);

  const embedded = await embedImages(doc, { ...images, flags: flagMap });
  const page = doc.addPage([mmToPoints(A6L_WIDTH), mmToPoints(A6L_HEIGHT)]);
  const pageHeight = mmToPoints(A6L_HEIGHT);
  const scheduleWidth = A6L_WIDTH - A7_WIDTH;
  const nameWidth = A7_WIDTH;

  const ctx: BadgeContext = {
    doc,
    fonts: await preloadFonts(doc),
    config,
    ...embedded,
  };

  await drawScheduleSide(
    ctx,
    page,
    info,
    0,
    0,
    scheduleWidth,
    A6L_HEIGHT,
    pageHeight,
  );
  await drawNameSide(
    ctx,
    page,
    info,
    scheduleWidth,
    0,
    nameWidth,
    A6L_HEIGHT,
    pageHeight,
  );

  const dividerX = mmToPoints(scheduleWidth);
  page.drawLine({
    start: { x: dividerX, y: pageHeight },
    end: { x: dividerX, y: 0 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  return doc;
}

export async function generateAllBadges(
  persons: PersonScheduleInfo[],
  config: BadgeConfig,
  images: {
    background?: Uint8Array;
    logo?: Uint8Array;
    wcaLogo?: Uint8Array;
    flags: Map<string, Uint8Array>;
    qrCode?: Uint8Array;
  },
  onProgress?: (current: number, total: number) => void,
): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const embedded = await embedImages(doc, images);
  const ctx: BadgeContext = {
    doc,
    fonts: await preloadFonts(doc),
    config,
    ...embedded,
  };

  if (config.template === "portrait-book") {
    for (let i = 0; i < persons.length; i++) {
      const page = doc.addPage([mmToPoints(A6L_WIDTH), mmToPoints(A6L_HEIGHT)]);
      const pageHeight = mmToPoints(A6L_HEIGHT);
      const scheduleWidth = A6L_WIDTH - A7_WIDTH;
      const nameWidth = A7_WIDTH;

      await drawScheduleSide(
        ctx,
        page,
        persons[i],
        0,
        0,
        scheduleWidth,
        A6L_HEIGHT,
        pageHeight,
      );
      await drawNameSide(
        ctx,
        page,
        persons[i],
        scheduleWidth,
        0,
        nameWidth,
        A6L_HEIGHT,
        pageHeight,
      );

      const dividerX = mmToPoints(scheduleWidth);
      page.drawLine({
        start: { x: dividerX, y: pageHeight },
        end: { x: dividerX, y: 0 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      if (onProgress) {
        onProgress(i + 1, persons.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  } else {
    let page: PDFPage | undefined;

    for (let i = 0; i < persons.length; i++) {
      if (i % 4 === 0) {
        if (page) drawCuttingLines(page);
        page = doc.addPage([mmToPoints(A4L_WIDTH), mmToPoints(A4L_HEIGHT)]);
        drawCuttingLines(page);
      }

      if (!page) throw new Error("Page failed to initialize");

      const col = i % 2;
      const row = Math.floor((i % 4) / 2);
      const offsetX = col * (A4L_WIDTH / 2) + (A4L_WIDTH / 2 - A6L_WIDTH) / 2;
      const offsetY =
        row * (A4L_HEIGHT / 2) + (A4L_HEIGHT / 2 - A6L_HEIGHT) / 2;

      await drawBadge(
        ctx,
        page,
        persons[i],
        offsetX,
        offsetY,
        mmToPoints(A4L_HEIGHT),
      );

      if (onProgress) {
        onProgress(i + 1, persons.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (page) drawCuttingLines(page);
  }

  return doc;
}
