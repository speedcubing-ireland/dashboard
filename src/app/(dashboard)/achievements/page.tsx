import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ACHIEVEMENTS_URL = "https://achievements.speedcubingireland.com";
const ACHIEVEMENTS_ADMIN_URL =
  "https://si-api.blueglacier-893fcb86.northeurope.azurecontainerapps.io";

export default function AchievementsPage() {
  return (
    <div className="container max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
          <CardDescription>
            Open the Speedcubing Ireland achievements site to view competitor
            badges and progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link
              href={ACHIEVEMENTS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Public Site
            </Link>
          </Button>
          <Button asChild>
            <Link
              href={ACHIEVEMENTS_ADMIN_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Admin Site
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
