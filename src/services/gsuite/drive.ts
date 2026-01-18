import { useGSuiteAuthStore } from "@/stores/gsuite-auth";
import { driveRequest, fetchAll } from "./client";

interface Drive {
  id: string;
  name: string;
}

export interface BatchRequest {
  method: string;
  path: string;
  body?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

interface BatchResponsePart {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface DriveListResponse {
  drives?: Drive[];
  nextPageToken?: string;
}

export async function executeBatchRequest(
  accessToken: string,
  requests: BatchRequest[],
): Promise<BatchResponsePart[]> {
  if (requests.length === 0) return [];
  if (requests.length > 100) {
    throw new Error("Batch requests cannot exceed 100 requests");
  }

  const boundary = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const store = useGSuiteAuthStore.getState();

  if (store.isAuthenticated && store.isTokenExpired()) {
    store.logout();
    throw new Error("Session expired");
  }

  const parts: string[] = [];

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    const url = new URL(`https://www.googleapis.com/drive/v3${req.path}`);
    if (req.params) {
      Object.entries(req.params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }

    parts.push(`--${boundary}`);
    parts.push("Content-Type: application/http");
    parts.push("Content-Transfer-Encoding: binary");
    parts.push(`Content-ID: <item${i + 1}>`);
    parts.push("");
    parts.push(`${req.method} ${url.toString()} HTTP/1.1`);
    parts.push(`Authorization: Bearer ${accessToken}`);
    if (req.body) {
      parts.push("Content-Type: application/json");
      const bodyBytes = new TextEncoder().encode(req.body);
      parts.push(`Content-Length: ${bodyBytes.length}`);
      parts.push("");
      parts.push(req.body);
    } else {
      parts.push("");
    }
  }

  parts.push(`--${boundary}--`);

  const body = parts.join("\r\n");

  const response = await fetch("https://www.googleapis.com/batch/drive/v3", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    if (response.status === 401) {
      store.logout();
    }
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Batch request failed: HTTP ${response.status} - ${errorText}`,
    );
  }

  const responseText = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const responseBoundaryMatch = contentType.match(/boundary=([^;,\s]+)/);
  const responseBoundary = responseBoundaryMatch
    ? responseBoundaryMatch[1].trim()
    : boundary;

  const responseParts: BatchResponsePart[] = [];

  const boundaryPattern = new RegExp(
    `--${responseBoundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?`,
    "g",
  );
  const responsePartStrings = responseText
    .split(boundaryPattern)
    .filter((part) => part.trim() && !part.includes("Content-Type: multipart"));

  for (const part of responsePartStrings) {
    if (!part.trim()) continue;

    const httpMatch = part.match(
      /HTTP\/1\.1\s+(\d+)\s+([^\r\n]+)[\r\n]+([\s\S]*)/,
    );
    if (httpMatch) {
      const status = parseInt(httpMatch[1], 10);
      const rest = httpMatch[3];

      const doubleNewline = rest.indexOf("\r\n\r\n");
      const headerBodySplit =
        doubleNewline >= 0 ? doubleNewline : rest.indexOf("\n\n");

      const headersText =
        headerBodySplit >= 0 ? rest.substring(0, headerBodySplit) : "";
      const bodyText =
        headerBodySplit >= 0
          ? rest.substring(
              headerBodySplit + (rest.includes("\r\n\r\n") ? 4 : 2),
            )
          : rest;

      const headers: Record<string, string> = {};
      headersText.split(/\r?\n/).forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      });

      responseParts.push({
        status,
        headers,
        body: bodyText.trim(),
      });
    }
  }

  return responseParts;
}

export function getAllSharedDrives(accessToken: string): Promise<Drive[]> {
  return fetchAll<Drive>(async (token, params) => {
    const response = await driveRequest<DriveListResponse>("/drives", token, {
      params: {
        pageSize: 100,
        useDomainAdminAccess: true,
        ...params,
      },
    });

    return {
      items: response.drives,
      nextPageToken: response.nextPageToken,
    };
  }, accessToken);
}
