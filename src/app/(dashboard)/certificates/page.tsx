import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CERTIFICATES_URL = "https://speedcubing-ireland.github.io/wca-certificates";

export default function CertificatesPage() {
  return (
    <div className="container max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Certificates</CardTitle>
          <CardDescription>
            Open the Speedcubing Ireland WCA certificates tool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link
              href={CERTIFICATES_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Certificates
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
