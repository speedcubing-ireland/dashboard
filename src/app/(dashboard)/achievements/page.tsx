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
        <CardContent>
          <Button asChild>
            <Link
              href={ACHIEVEMENTS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Achievements
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
