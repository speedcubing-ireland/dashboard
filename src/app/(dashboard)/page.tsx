"use client";

import {
  ArrowRight01Icon,
  Award01Icon,
  CalendarIcon,
  CubeIcon,
  IdentityCardIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_LINKS,
  type DashboardLink,
  type DashboardLinkIcon,
} from "@/data/dashboard-links";

const LINK_ICONS = {
  "identity-card": IdentityCardIcon,
  calendar: CalendarIcon,
  cube: CubeIcon,
  award: Award01Icon,
} satisfies Record<DashboardLinkIcon, typeof IdentityCardIcon>;

interface FeatureCardProps {
  link: DashboardLink;
}

function FeatureCard({ link }: FeatureCardProps) {
  const Icon = LINK_ICONS[link.icon];

  return (
    <div className="group flex flex-col h-full relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 p-3 w-fit rounded-lg bg-primary/10 text-primary">
        <HugeiconsIcon icon={Icon} strokeWidth={2} className="size-6" />
      </div>

      <div className="space-y-2 mb-6 flex-1 text-left">
        <h3 className="font-semibold text-xl">{link.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {link.description}
        </p>
      </div>

      <div className="mt-auto">
        <Button
          asChild
          className="w-full group-hover:border-primary/50 transition-colors"
          variant="outline"
        >
          <Link
            href={link.href}
            className="flex items-center justify-center gap-2"
          >
            {link.actionLabel}
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
        {DASHBOARD_LINKS.map((link) => (
          <FeatureCard key={link.id} link={link} />
        ))}
      </div>
    </div>
  );
}
