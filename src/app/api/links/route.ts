import { DASHBOARD_LINKS_RESPONSE } from "@/data/dashboard-links";

const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

export const dynamic = "force-static";

export function GET() {
  return Response.json(DASHBOARD_LINKS_RESPONSE, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
