"use client";

import { CheckmarkCircle01Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CalendarPage() {
  const [copied, setCopied] = useState(false);
  const calendarUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar`
      : "/api/calendar";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      toast.success("Calendar URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Competitions Calendar
        </h1>
        <p className="text-muted-foreground">
          Subscribe to the Irish WCA competitions calendar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribe to Calendar</CardTitle>
          <CardDescription>
            Add this calendar to your calendar app to stay updated on Irish
            competitions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="calendar-url" className="text-sm font-medium">
              Calendar URL
            </label>
            <div className="flex gap-2">
              <Input
                id="calendar-url"
                value={calendarUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                <HugeiconsIcon
                  icon={copied ? CheckmarkCircle01Icon : Copy01Icon}
                  className="h-4 w-4"
                />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => {
                const fullUrl = calendarUrl.startsWith("/")
                  ? `${window.location.origin}${calendarUrl}`
                  : calendarUrl;
                const webcalUrl = fullUrl.replace(/^https?:/, "webcal:");
                const workspaceDomain =
                  process.env.NEXT_PUBLIC_GOOGLE_WORKSPACE_DOMAIN || "";
                const googleUrl = workspaceDomain
                  ? `https://calendar.google.com/a/${workspaceDomain}/render?cid=${encodeURIComponent(webcalUrl)}`
                  : `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
                window.open(googleUrl, "_blank");
              }}
            >
              Add to Google Calendar
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                const webcalUrl = (
                  calendarUrl.startsWith("/")
                    ? `${window.location.origin}${calendarUrl}`
                    : calendarUrl
                ).replace(/^https?:/, "webcal:");
                window.location.href = webcalUrl;
              }}
            >
              Subscribe (iOS / App)
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">How to Subscribe</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>In Google Calendar:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Click the "+" next to "Other calendars"</li>
                <li>Select "From URL"</li>
                <li>Paste the calendar URL above</li>
                <li>Click "Add calendar"</li>
              </ol>
              <p className="pt-2">
                For other calendar apps, look for an option to "Subscribe" or
                "Add calendar from URL" and paste the URL above.
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <p className="text-sm">
                Your calendar app will automatically refresh the events
                periodically based on your app's settings.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
