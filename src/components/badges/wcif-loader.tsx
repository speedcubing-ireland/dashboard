import { useEffect, useRef, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { fetchWCIF } from "@/services/wca/official";
import { getUpcomingIrishCompetitions } from "@/services/wca/unofficial";
import { useBadgeStore } from "@/stores/badge-config";
import type { APICompetition } from "@/types/competition";
import type { WCIF } from "@/types/wcif";
import { getErrorMessage } from "@/utils/error";
import { reorganizeActivities } from "@/utils/schedule";

export function WCIFLoader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [upcomingComps, setUpcomingComps] = useState<APICompetition[]>([]);
  const [loadingComps, setLoadingComps] = useState(true);
  const [loadingCompId, setLoadingCompId] = useState<string | null>(null);
  const { wcif, setWcif, setActivities, setError, setLoading } =
    useBadgeStore();

  useEffect(() => {
    getUpcomingIrishCompetitions()
      .then(setUpcomingComps)
      .catch(() => {})
      .finally(() => setLoadingComps(false));
  }, []);

  const loadFromAPI = async (id: string) => {
    setIsLoading(true);
    setLoadingCompId(id);
    setLoading(true);
    setError(null);

    try {
      const data = (await fetchWCIF(id)) as WCIF;
      setWcif(data);
      setActivities(reorganizeActivities(data));
      toast.success("WCIF loaded from WCA API");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setLoadingCompId(null);
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data: WCIF = JSON.parse(text);

      if (!data.persons || !data.schedule || !data.events) {
        throw new Error("Invalid WCIF structure");
      }

      setWcif(data);
      setActivities(reorganizeActivities(data));
      toast.success("WCIF loaded");
    } catch (e) {
      const msg = getErrorMessage(e, "Failed to load");
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (wcif) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Load Competition Data</CardTitle>
        <CardDescription>
          Get started by loading your competition's WCIF data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingComps.length > 0 && (
          <>
            <div>
              <h3 className="text-sm font-medium mb-2">
                Upcoming Irish Competitions
              </h3>
              <div className="space-y-2">
                {upcomingComps.map((c) => (
                  <Button
                    key={c.id}
                    onClick={() => loadFromAPI(c.id)}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                  >
                    <div className="flex flex-col items-start flex-1">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.date.from)} - {formatDate(c.date.till)} •{" "}
                        {c.city}
                      </span>
                    </div>
                    {loadingCompId === c.id && (
                      <span className="ml-2 text-xs">Loading...</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}
        {loadingComps && (
          <p className="text-sm text-muted-foreground text-center">
            Loading competitions...
          </p>
        )}
        <div>
          <h3 className="text-sm font-medium mb-2">Other Options</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json,.wcif"
              onChange={handleFileSelect}
              disabled={isLoading}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Loading..." : "Upload WCIF File"}
            </Button>
            <Button
              onClick={() => {
                const id = prompt("Enter Competition ID:");
                if (id) loadFromAPI(id);
              }}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Load by Competition ID
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
