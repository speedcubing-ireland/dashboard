"use client";

import {
  ArrowRight01Icon,
  CalendarIcon,
  CubeIcon,
  IdentityCardIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: typeof IdentityCardIcon;
  href: string;
  actionLabel: string;
}

function FeatureCard({
  title,
  description,
  icon: Icon,
  href,
  actionLabel,
}: FeatureCardProps) {
  return (
    <div className="group flex flex-col h-full relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 p-3 w-fit rounded-lg bg-primary/10 text-primary">
        <HugeiconsIcon icon={Icon} strokeWidth={2} className="size-6" />
      </div>

      <div className="space-y-2 mb-6 flex-1 text-left">
        <h3 className="font-semibold text-xl">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-auto">
        <Button
          asChild
          className="w-full group-hover:border-primary/50 transition-colors"
          variant="outline"
        >
          <Link href={href} className="flex items-center justify-center gap-2">
            {actionLabel}
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="size-4 transition-transform group-hover:translate-x-1"
            />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12 py-12">
      <div className="space-y-4 max-w-4xl px-4">
        <h1 className="font-bold tracking-tight">
          <span className="block text-4xl sm:text-6xl">
            Speedcubing Ireland
          </span>
          <span className="block text-2xl sm:text-3xl text-primary mt-2">
            Tools Dashboard
          </span>
        </h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl w-full px-6">
        <FeatureCard
          title="Badge Generator"
          description="Generate badges for competitor's lanyards"
          icon={IdentityCardIcon}
          href="/badges"
          actionLabel="Open Generator"
        />

        <FeatureCard
          title="Certificates"
          description="Open the WCA certificates site"
          icon={IdentityCardIcon}
          href="/certificates"
          actionLabel="Open Certificates"
        />

        <FeatureCard
          title="Competitions"
          description="Upcoming competitions and their status"
          icon={CalendarIcon}
          href="/competitions"
          actionLabel="View Competitions"
        />

        <FeatureCard
          title="Events"
          description="Popularity of events at competitions"
          icon={CubeIcon}
          href="/events"
          actionLabel="View Events"
        />

        <FeatureCard
          title="Calendar"
          description="Subscribe to Irish WCA competitions calendar"
          icon={CalendarIcon}
          href="/calendar"
          actionLabel="Subscribe"
        />
      </div>
    </div>
  );
}
