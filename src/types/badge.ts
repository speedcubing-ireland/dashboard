import { ASSET_PATHS } from "@/constants";
export type BadgeTemplate = "portrait-book" | "portrait-book-2x2";
export type BadgeRole = "competitor" | "delegate" | "volunteer" | "media";

export interface BadgeConfig {
  template: BadgeTemplate;
  includeTimes: boolean;
  includeStaffing: boolean;
  includeStations: boolean;
  includeStages: boolean;
  removeStageWord: boolean;
  includeCompetitorId: boolean;
  includeLocalNames: boolean;
  hideStaffOnlyAssignments: boolean;
  showWcaLiveQrCode: boolean;
  customScheduleColors: boolean;
  customScheduleColorsCode: string;
  colorFromStage: boolean;
  backgroundImage: string | null;
  logoImage: string | null;
  wcaLogoImage: string | null;
  qrCodeText: string;
  printWithBleed: boolean;
  bleedBackgroundImage: string | null;
}

export const DEFAULT_BADGE_CONFIG: BadgeConfig = {
  template: "portrait-book",
  includeTimes: true,
  includeStaffing: true,
  includeStations: false,
  includeStages: false,
  removeStageWord: false,
  includeCompetitorId: true,
  includeLocalNames: true,
  hideStaffOnlyAssignments: false,
  showWcaLiveQrCode: true,
  customScheduleColors: false,
  customScheduleColorsCode: "",
  colorFromStage: false,
  backgroundImage: ASSET_PATHS.backgroundImage,
  logoImage: ASSET_PATHS.siLogo,
  wcaLogoImage: ASSET_PATHS.wcaLogo,
  qrCodeText:
    "Live results and group assignments available at: https://tinyurl.com/297vt66h",
  printWithBleed: true,
  bleedBackgroundImage: null,
};
