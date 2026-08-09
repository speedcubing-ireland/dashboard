import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBadgeStore } from "@/stores/badge-config";
import type { BadgeTemplate } from "@/types/badge";

export function BadgeSettings() {
  const { config, updateConfig } = useBadgeStore();
  const bgRef = useRef<HTMLInputElement>(null);
  const bleedBgRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const wcaLogoRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    file: File,
    type: "background" | "bleedBackground" | "logo" | "wcaLogo",
  ) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;

      if (type === "background" || type === "bleedBackground") {
        // The bleed background carries a 3mm margin on the right, top and
        // bottom (but not the folded left edge), giving a taller aspect ratio.
        const expected = type === "bleedBackground" ? 77.25 / 111 : 74.25 / 105;
        const img = new Image();
        img.onload = () => {
          const actual = img.width / img.height;
          if (Math.abs(actual - expected) > 0.02) {
            toast.error(
              `Background aspect ratio mismatch. Expected ${expected.toFixed(4)}, got ${actual.toFixed(4)}`,
            );
            return;
          }
          updateConfig(
            type === "bleedBackground"
              ? { bleedBackgroundImage: result }
              : { backgroundImage: result },
          );
          toast.success("Background uploaded");
        };
        img.src = result;
      } else {
        updateConfig({
          [type === "logo" ? "logoImage" : "wcaLogoImage"]: result,
        });
        toast.success(`${type} uploaded`);
      }
    };
    reader.readAsDataURL(file);
  };

  const SwitchRow = ({
    id,
    label,
    checked,
    onChange,
  }: {
    id: string;
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>Select badge template layout</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={config.printWithBleed ? "portrait-book" : config.template}
            onValueChange={(v) =>
              updateConfig({ template: v as BadgeTemplate })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait-book">Portrait Book (A6)</SelectItem>
              <SelectItem
                value="portrait-book-2x2"
                disabled={config.printWithBleed}
              >
                Portrait Book 2x2 (A4)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Print Options</CardTitle>
          <CardDescription>Add bleed for professional printing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchRow
            id="bleed"
            label="Print with Bleed (3mm)"
            checked={config.printWithBleed}
            onChange={(v) => {
              updateConfig({
                printWithBleed: v,
                ...(v && config.template === "portrait-book-2x2"
                  ? { template: "portrait-book" as const }
                  : {}),
              });
              if (v && config.template === "portrait-book-2x2") {
                toast.info("Bleed exports use the single-badge A6 layout");
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Adds a 3mm bleed around each single-badge sheet without crop marks.
            The 2x2 A4 layout is disabled while bleed is enabled. Upload a
            dedicated bleed background below for pixel-perfect edges, otherwise
            the standard background is stretched to fill the bleed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Options</CardTitle>
          <CardDescription>
            Configure what information appears on badges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchRow
            id="times"
            label="Include Times"
            checked={config.includeTimes}
            onChange={(v) => updateConfig({ includeTimes: v })}
          />
          <SwitchRow
            id="staffing"
            label="Include Staffing"
            checked={config.includeStaffing}
            onChange={(v) => updateConfig({ includeStaffing: v })}
          />
          <SwitchRow
            id="stations"
            label="Include Stations"
            checked={config.includeStations}
            onChange={(v) => updateConfig({ includeStations: v })}
          />
          <SwitchRow
            id="stages"
            label="Include Stages"
            checked={config.includeStages}
            onChange={(v) => updateConfig({ includeStages: v })}
          />
          {config.includeStages && (
            <SwitchRow
              id="remove-stage"
              label="Remove 'Stage' from Text"
              checked={config.removeStageWord}
              onChange={(v) => updateConfig({ removeStageWord: v })}
            />
          )}
          <SwitchRow
            id="hide-staff"
            label="Hide Staff-Only Assignments"
            checked={config.hideStaffOnlyAssignments}
            onChange={(v) => updateConfig({ hideStaffOnlyAssignments: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badge Content</CardTitle>
          <CardDescription>Configure badge content options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchRow
            id="comp-id"
            label="Include Competitor ID"
            checked={config.includeCompetitorId}
            onChange={(v) => updateConfig({ includeCompetitorId: v })}
          />
          <SwitchRow
            id="local-names"
            label="Include Local Names"
            checked={config.includeLocalNames}
            onChange={(v) => updateConfig({ includeLocalNames: v })}
          />
          <SwitchRow
            id="qr"
            label="Show QR Code"
            checked={config.showWcaLiveQrCode}
            onChange={(v) => updateConfig({ showWcaLiveQrCode: v })}
          />
          {config.showWcaLiveQrCode && (
            <div className="space-y-2">
              <Label htmlFor="qr-text">QR Code Text</Label>
              <Textarea
                id="qr-text"
                value={config.qrCodeText}
                onChange={(e) => updateConfig({ qrCodeText: e.target.value })}
                placeholder="Live results at: https://..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                QR code generated from URL in text
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Color Options</CardTitle>
          <CardDescription>Configure schedule color options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchRow
            id="custom-colors"
            label="Custom Schedule Colors"
            checked={config.customScheduleColors}
            onChange={(v) => updateConfig({ customScheduleColors: v })}
          />
          {config.customScheduleColors && (
            <div className="space-y-2">
              <Label htmlFor="colors-code">Custom Colors Code</Label>
              <Input
                id="colors-code"
                value={config.customScheduleColorsCode}
                onChange={(e) =>
                  updateConfig({ customScheduleColorsCode: e.target.value })
                }
                placeholder="JavaScript code"
              />
            </div>
          )}
          <SwitchRow
            id="color-stage"
            label="Color from Stage"
            checked={config.colorFromStage}
            onChange={(v) => updateConfig({ colorFromStage: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>Upload images for badges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Background Image</Label>
            <div className="flex gap-2">
              <Input
                ref={bgRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleUpload(e.target.files[0], "background")
                }
                className="hidden"
              />
              <Button
                onClick={() => bgRef.current?.click()}
                variant="outline"
                size="sm"
              >
                Upload
              </Button>
              {config.backgroundImage && (
                <span className="text-sm text-muted-foreground self-center">
                  Uploaded
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              A7 size (74.25mm x 105mm)
            </p>
          </div>
          {config.printWithBleed && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Bleed Background Image</Label>
                <div className="flex gap-2">
                  <Input
                    ref={bleedBgRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleUpload(e.target.files[0], "bleedBackground")
                    }
                    className="hidden"
                  />
                  <Button
                    onClick={() => bleedBgRef.current?.click()}
                    variant="outline"
                    size="sm"
                  >
                    Upload
                  </Button>
                  {config.bleedBackgroundImage && (
                    <span className="text-sm text-muted-foreground self-center">
                      Uploaded
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional. 77.25mm x 111mm - includes 3mm bleed on the right,
                  top and bottom (not the folded left edge).
                </p>
              </div>
            </>
          )}
          <Separator />
          <div className="space-y-2">
            <Label>Organization Logo</Label>
            <div className="flex gap-2">
              <Input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) =>
                  e.target.files?.[0] && handleUpload(e.target.files[0], "logo")
                }
                className="hidden"
              />
              <Button
                onClick={() => logoRef.current?.click()}
                variant="outline"
                size="sm"
              >
                Upload
              </Button>
              {config.logoImage && (
                <span className="text-sm text-muted-foreground self-center">
                  {config.logoImage.startsWith("/") ? "Default" : "Uploaded"}
                </span>
              )}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>WCA Logo</Label>
            <div className="flex gap-2">
              <Input
                ref={wcaLogoRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleUpload(e.target.files[0], "wcaLogo")
                }
                className="hidden"
              />
              <Button
                onClick={() => wcaLogoRef.current?.click()}
                variant="outline"
                size="sm"
              >
                Upload
              </Button>
              {config.wcaLogoImage && (
                <span className="text-sm text-muted-foreground self-center">
                  {config.wcaLogoImage.startsWith("/") ? "Default" : "Uploaded"}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
