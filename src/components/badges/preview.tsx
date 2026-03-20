import {
  ArrowDown01Icon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  extractUrl,
  generateQRBytes,
  loadFlagBytes,
  prepareImages,
} from "@/services/assets";
import {
  generateAllBadges,
  generateSingleBadge,
} from "@/services/pdf/generator";
import { useBadgeStore } from "@/stores/badge-config";
import type { PersonScheduleInfo } from "@/types/wcif";
import { cn } from "@/utils/cn";
import { getErrorMessage } from "@/utils/error";
import { buildPersonSchedule } from "@/utils/schedule";

interface BadgePreviewProps {
  isSettingsOpen?: boolean;
}

export function BadgePreview({ isSettingsOpen = false }: BadgePreviewProps) {
  const { wcif, activities, config } = useBadgeStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blankDialogOpen, setBlankDialogOpen] = useState(false);
  const [blankCount, setBlankCount] = useState("1");
  const [isGeneratingBlank, setIsGeneratingBlank] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const lastPreviewKeyRef = useRef<string | null>(null);
  const generatePreviewRef = useRef<() => Promise<void>>(() =>
    Promise.resolve(),
  );

  const accepted = useMemo(
    () =>
      wcif?.persons.filter((p) => p.registration?.status === "accepted") ?? [],
    [wcif],
  );

  const filtered = useMemo(() => {
    if (!query) return accepted;
    const q = query.toLowerCase();
    return accepted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.wcaId?.toLowerCase().includes(q) ||
        p.countryIso2.toLowerCase().includes(q) ||
        p.registrantId.toString().includes(q),
    );
  }, [accepted, query]);

  const selected = useMemo(
    () =>
      selectedId ? accepted.find((p) => p.registrantId === selectedId) : null,
    [accepted, selectedId],
  );

  const personInfo: PersonScheduleInfo | null = useMemo(
    () =>
      selected && activities ? buildPersonSchedule(selected, activities) : null,
    [selected, activities],
  );

  const previewKey = useMemo(() => {
    if (!personInfo) return null;
    const configHash = JSON.stringify({
      includeLocalNames: config.includeLocalNames,
      showWcaLiveQrCode: config.showWcaLiveQrCode,
      qrCodeText: config.qrCodeText,
      backgroundImage: config.backgroundImage,
      logoImage: config.logoImage,
      wcaLogoImage: config.wcaLogoImage,
    });
    return `${personInfo.compid}-${configHash}`;
  }, [personInfo, config]);

  useEffect(() => {
    if (accepted.length > 0 && selectedId === null) {
      setSelectedId(accepted[0].registrantId);
    }
  }, [accepted, selectedId]);

  const generatePreview = useCallback(async () => {
    if (!personInfo || !wcif) return;

    setIsGenerating(true);
    try {
      const flagMap = new Map<string, Uint8Array>();
      if (personInfo.countryCode) {
        try {
          flagMap.set(
            personInfo.countryCode,
            await loadFlagBytes(personInfo.countryCode),
          );
        } catch {}
      }

      let qrCode: Uint8Array | undefined;
      if (config.showWcaLiveQrCode && config.qrCodeText) {
        const url = extractUrl(config.qrCodeText);
        if (url) {
          try {
            qrCode = await generateQRBytes(url, 200);
          } catch {}
        }
      }

      const images = await prepareImages(config, flagMap, qrCode);
      const pdfDoc = await generateSingleBadge(personInfo, config, {
        background: images.background,
        logo: images.logo,
        wcaLogo: images.wcaLogo,
        flag: flagMap.get(personInfo.countryCode),
        qrCode: images.qrCode,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate preview"));
    } finally {
      setIsGenerating(false);
    }
  }, [personInfo, wcif, config]);

  generatePreviewRef.current = generatePreview;

  useEffect(() => {
    if (isSettingsOpen || !previewKey || selectedId === null || isGenerating)
      return;
    if (previewKey !== lastPreviewKeyRef.current) {
      lastPreviewKeyRef.current = previewKey;
      generatePreviewRef.current?.();
    }
  }, [selectedId, previewKey, isGenerating, isSettingsOpen]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const handleGenerateBlankLanyards = useCallback(async () => {
    const count = parseInt(blankCount, 10);
    if (!Number.isFinite(count) || count <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    setIsGeneratingBlank(true);
    try {
      const persons: PersonScheduleInfo[] = Array.from(
        { length: count },
        (_, i) => ({
          blank: true,
          name: "",
          wcaid: null,
          compid: `blank-${i + 1}`,
          countryCode: "",
          personalSchedule: {},
          sortedSchedule: [],
        }),
      );

      let qrCode: Uint8Array | undefined;
      if (config.showWcaLiveQrCode && config.qrCodeText) {
        const url = extractUrl(config.qrCodeText);
        if (url) {
          try {
            qrCode = await generateQRBytes(url, 200);
          } catch {}
        }
      }

      const images = await prepareImages(config, new Map(), qrCode);
      const pdfDoc = await generateAllBadges(persons, config, {
        background: images.background,
        logo: images.logo,
        wcaLogo: images.wcaLogo,
        flags: new Map(),
        qrCode: images.qrCode,
      });
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${wcif?.shortName || "badges"}-blank-lanyards-${count}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Generated ${count} blank lanyard${count === 1 ? "" : "s"}`,
      );
      setBlankDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate blank lanyards"));
    } finally {
      setIsGeneratingBlank(false);
    }
  }, [blankCount, config, wcif]);

  if (!wcif) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Badge Preview</CardTitle>
          <CardDescription>Load WCIF data to preview badges</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Badge Preview</CardTitle>
            <CardDescription>
              Select a competitor to preview their badge
            </CardDescription>
          </div>
          {selected && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={generatePreview}
                disabled={isGenerating}
                title="Refresh"
              >
                <HugeiconsIcon
                  icon={Refresh01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </Button>
              <Dialog open={blankDialogOpen} onOpenChange={setBlankDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isGeneratingBlank}>
                    Blank Lanyard
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Blank Lanyards</DialogTitle>
                    <DialogDescription>
                      Enter how many blank lanyards to generate using the
                      current badge settings.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="blank-count">Number of lanyards</Label>
                      <Input
                        id="blank-count"
                        type="number"
                        min={1}
                        value={blankCount}
                        onChange={(e) => setBlankCount(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setBlankDialogOpen(false)}
                      disabled={isGeneratingBlank}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateBlankLanyards}
                      disabled={isGeneratingBlank}
                    >
                      {isGeneratingBlank ? "Generating..." : "Generate"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selected
                ? `${selected.name} ${selected.wcaId ? `(${selected.wcaId})` : "(Newcomer)"}`
                : "Select competitor..."}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                strokeWidth={2}
                className="ml-2 size-4 shrink-0 opacity-50"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search..."
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>No competitors found.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((p) => (
                    <CommandItem
                      key={p.registrantId}
                      value={`${p.name} ${p.wcaId || ""} ${p.countryIso2}`}
                      onSelect={() => {
                        setSelectedId(p.registrantId);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2}
                        className={cn(
                          "mr-2 size-4",
                          selectedId === p.registrantId
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.wcaId || "Newcomer"} • {p.countryIso2} • ID{" "}
                          {p.registrantId}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {isGenerating && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Generating preview...
          </div>
        )}

        {previewUrl && !isGenerating && (
          <div className="border rounded-lg overflow-hidden bg-muted/50">
            <iframe
              src={previewUrl}
              className="w-full h-[560px]"
              title="Badge Preview"
            />
          </div>
        )}

        {!selected && !isGenerating && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">
              Select a competitor above to preview their badge
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
