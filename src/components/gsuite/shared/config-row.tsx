import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function ConfigRow({
  label,
  count = 0,
  checked,
  onChange,
  destructive,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: (v: boolean) => void;
  destructive?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 ${destructive ? "border-destructive/50" : ""}`}
    >
      <div className="grid gap-1">
        <Label className={`text-base ${destructive ? "text-destructive" : ""}`}>
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{count} affected</p>
      </div>
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => onChange(c === true)}
        disabled={!count}
      />
    </div>
  );
}
