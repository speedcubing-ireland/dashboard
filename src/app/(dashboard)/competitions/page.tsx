"use client";

import { ChartIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StatisticsTable } from "@/components/competitions/statistics-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStatistics } from "@/hooks/use-statistics";

export default function CompetitionsPage() {
  const {
    statsData,
    generating,
    showRawNumbers,
    setShowRawNumbers,
    generateStatistics,
  } = useStatistics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competition Statistics</h1>
          <p className="text-muted-foreground">
            Generate detailed statistics for upcoming Irish competitions
          </p>
        </div>
        {statsData && (
          <Button onClick={generateStatistics} disabled={generating}>
            {generating ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="mr-2 size-4 animate-spin"
                />
                Generating...
              </>
            ) : (
              "Refresh Statistics"
            )}
          </Button>
        )}
      </div>

      {!statsData && (
        <Card>
          <CardHeader>
            <CardTitle>No Statistics Generated</CardTitle>
            <CardDescription>
              Click the button below to fetch competition data from the WCA API
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 py-8">
            <div className="p-4 rounded-full bg-primary/10">
              <HugeiconsIcon
                icon={ChartIcon}
                className="size-12 text-primary"
                strokeWidth={1.5}
              />
            </div>
            <Button
              onClick={generateStatistics}
              disabled={generating}
              size="lg"
            >
              {generating ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    className="mr-2 size-4 animate-spin"
                  />
                  Fetching Competition Data...
                </>
              ) : (
                "Generate Statistics"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {statsData && (
        <StatisticsTable
          data={statsData}
          showRawNumbers={showRawNumbers}
          onToggleRawNumbers={setShowRawNumbers}
        />
      )}
    </div>
  );
}
