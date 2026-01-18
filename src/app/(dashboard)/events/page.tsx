"use client";

import { AnalyticsUpIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { ProgressButton } from "@/components/common/progress-button";
import { AnalysisResults } from "@/components/events/analysis-results";
import { CompetitionSelector } from "@/components/events/competition-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePastCompetitions } from "@/hooks/use-past-competitions";
import {
  analyzeEventRegistrations,
  EVENT_TYPES_CLIPBOARD,
  type EventAnalysis,
  fetchSelectedCompetitionsData,
  getRegistrationRate,
  type RegistrationRateType,
} from "@/services/competition-data";

export default function EventsPage() {
  const {
    competitions,
    selected,
    loading,
    searchTerm,
    setSearchTerm,
    toggle,
    selectAll,
    deselectAll,
  } = usePastCompetitions();

  const [analysis, setAnalysis] = useState<EventAnalysis[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    name: string;
  } | null>(null);
  const [rateType, setRateType] = useState<RegistrationRateType>("mean");

  const progressPercent = progress
    ? (progress.current / progress.total) * 100
    : 0;

  const handleAnalyze = async () => {
    if (selected.length === 0) return;
    setAnalyzing(true);
    setProgress(null);
    setAnalysis([]);

    try {
      const data = await fetchSelectedCompetitionsData(
        competitions,
        selected,
        (current, total, name) => setProgress({ current, total, name }),
      );
      setAnalysis(analyzeEventRegistrations(data, selected));
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setAnalyzing(false);
      setProgress(null);
    }
  };

  const handleCopy = () => {
    if (analysis.length === 0) return;
    const rows = analysis.map((e) => {
      const rate = getRegistrationRate(e, rateType);
      const name = EVENT_TYPES_CLIPBOARD[e.eventId] ?? e.eventName;
      return e.competitionsWithEvent > 0 ? `${name}\t${rate}%` : `${name}\t`;
    });
    navigator.clipboard.writeText(rows.join("\n"));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <HugeiconsIcon
          icon={Loading03Icon}
          className="size-12 animate-spin text-primary"
        />
        <p className="text-muted-foreground">Loading competitions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Popularity Analysis</h1>
        <p className="text-muted-foreground">
          Analyze registration rates by event type across all competitions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <CompetitionSelector
            competitions={competitions}
            selected={selected}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onToggle={toggle}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
          />

          <ProgressButton
            onClick={handleAnalyze}
            disabled={selected.length === 0}
            isProcessing={analyzing}
            progress={progressPercent}
            size="lg"
            className="w-full"
          >
            {analyzing ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="mr-2 size-4 animate-spin"
                />
                {progress
                  ? `${progress.current}/${progress.total}`
                  : "Starting..."}
              </>
            ) : (
              "Analyze Events"
            )}
          </ProgressButton>

          {progress && (
            <p className="text-sm text-muted-foreground text-center truncate">
              {progress.name}
            </p>
          )}
        </div>

        <div className="lg:col-span-2">
          {analysis.length === 0 && !analyzing ? (
            <Card>
              <CardHeader>
                <CardTitle>No Analysis Results</CardTitle>
                <CardDescription>
                  Select competitions from the list and click "Analyze Events"
                  to see registration rates
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 py-8">
                <div className="p-4 rounded-full bg-primary/10">
                  <HugeiconsIcon
                    icon={AnalyticsUpIcon}
                    className="size-12 text-primary"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {selected.length === 0
                    ? "Start by selecting competitions from the list on the left"
                    : `${selected.length} competition${selected.length === 1 ? "" : "s"} selected — ready to analyze`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <AnalysisResults
              analysis={analysis}
              rateType={rateType}
              onRateTypeChange={setRateType}
              onCopy={handleCopy}
            />
          )}
        </div>
      </div>
    </div>
  );
}
