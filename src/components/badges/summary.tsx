import { BadgeCheck } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBadgeStore } from "@/stores/badge-config";

export function CompetitionSummary() {
  const { wcif } = useBadgeStore();

  if (!wcif) return null;

  const accepted = wcif.persons.filter(
    (p) => p.registration?.status === "accepted",
  );
  const newcomers = accepted.filter((p) => !p.wcaId).length;
  const countries = new Set(accepted.map((p) => p.countryIso2)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={BadgeCheck} strokeWidth={2} className="size-5" />
          Competition Summary
        </CardTitle>
        <CardDescription>{wcif.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">{accepted.length}</div>
            <div className="text-sm text-muted-foreground">Competitors</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{newcomers}</div>
            <div className="text-sm text-muted-foreground">Newcomers</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{countries}</div>
            <div className="text-sm text-muted-foreground">Countries</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
