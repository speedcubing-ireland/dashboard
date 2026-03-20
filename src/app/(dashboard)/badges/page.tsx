"use client";

import { ArrowLeft02Icon, SettingsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
import { BadgePreview } from "@/components/badges/preview";
import { BadgeSettings } from "@/components/badges/settings";
import { CompetitionSummary } from "@/components/badges/summary";
import { WCIFLoader } from "@/components/badges/wcif-loader";
import { ProgressButton } from "@/components/common/progress-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  extractUrl,
  generateQRBytes,
  preloadFlags,
  prepareImages,
} from "@/services/assets";
import { generateAllBadges } from "@/services/pdf/generator";
import { useBadgeStore } from "@/stores/badge-config";
import { getErrorMessage } from "@/utils/error";
import { buildPersonSchedule } from "@/utils/schedule";

export default function BadgesPage() {
  const { wcif, activities, config, error, setWcif, setActivities } =
    useBadgeStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to change competition? Current data will be cleared.",
      )
    ) {
      setWcif(null);
      setActivities({});
    }
  };

  const handleGenerateAll = async () => {
    if (!wcif || !activities) {
      toast.error("Please load WCIF data first");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const accepted = wcif.persons.filter(
        (p) => p.registration?.status === "accepted",
      );
      const sorted = [...accepted].sort((a, b) => {
        if (!a.wcaId && b.wcaId) return -1;
        if (a.wcaId && !b.wcaId) return 1;
        return a.name.localeCompare(b.name);
      });

      const personsInfo = sorted.map((p) => buildPersonSchedule(p, activities));
      const flags = await preloadFlags(personsInfo.map((i) => i.countryCode));

      let qrCode: Uint8Array | undefined;
      if (config.showWcaLiveQrCode && config.qrCodeText) {
        const url = extractUrl(config.qrCodeText);
        if (url) {
          try {
            qrCode = await generateQRBytes(url, 200);
          } catch {}
        }
      }

      const images = await prepareImages(config, flags, qrCode);
      const pdfDoc = await generateAllBadges(
        personsInfo,
        config,
        images,
        (curr, total) => setProgress(Math.floor((curr / total) * 5) * 20),
      );
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${wcif.shortName || "badges"}-badges.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Generated ${personsInfo.length} badges`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate badges"));
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Badge Generator</h1>
          {wcif && <p className="text-muted-foreground">{wcif.name}</p>}
        </div>
        {wcif && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              title="Change Competition"
            >
              <HugeiconsIcon
                icon={ArrowLeft02Icon}
                strokeWidth={2}
                className="size-4"
              />
            </Button>
            <Sheet onOpenChange={setIsSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <HugeiconsIcon
                    icon={SettingsIcon}
                    strokeWidth={2}
                    className="mr-2 size-4"
                  />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-2xl overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle>Badge Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <BadgeSettings />
                </div>
              </SheetContent>
            </Sheet>
            <ProgressButton
              onClick={handleGenerateAll}
              isProcessing={isGenerating}
              progress={progress}
            >
              Generate All Badges
            </ProgressButton>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <WCIFLoader />

      {wcif && (
        <>
          <CompetitionSummary />
          <BadgePreview isSettingsOpen={isSettingsOpen} />
        </>
      )}
    </div>
  );
}
