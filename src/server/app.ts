import { ZodError, type z } from "zod";
import { HttpError, httpErrorResponse, notFound, reportError, validationError } from "@intgetion/kit";
import { isUuid, requireCaller, requireServiceToken } from "./auth";

export type AppConfig = { serviceToken: string };

const MAX_JSON = 8 * 1024;

async function parsed<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await request.text();
  if (text.length > MAX_JSON) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Body too large");
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw validationError([{ path: [], message: "invalid_json" }]);
  }
  return schema.parse(json);
}

const user = (request: Request) => requireCaller(request).userId;
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

type Route = { method: string; pattern: RegExp; run: (request: Request, params: string[]) => Promise<Response> };
import * as follows from "../modules/follows/service";

const slugOf = (raw: string | undefined) => {
  const slug = decodeURIComponent(raw ?? "");
  if (!slug || slug.length > 120) throw notFound();
  return slug;
};
void isUuid;

const routes: Route[] = [
  {
    method: "POST",
    pattern: /^\/v1\/companies\/([^/]+)\/follow$/,
    run: async (request, [slug]) => {
      await follows.followCompany(user(request), slugOf(slug));
      return json({ following: true });
    },
  },
  {
    method: "DELETE",
    pattern: /^\/v1\/companies\/([^/]+)\/follow$/,
    run: async (request, [slug]) => {
      await follows.unfollowCompany(user(request), slugOf(slug));
      return json({ following: false });
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/me\/follows$/,
    run: async (request) => json({ items: await follows.listFollows(user(request)) }),
  },
  {
    method: "GET",
    pattern: /^\/v1\/companies\/([^/]+)\/followers$/,
    run: async (_request, [companyId]) => {
      if (!companyId || !isUuid(companyId)) throw notFound();
      return json({ count: await follows.countFollowers(companyId) });
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/companies\/([^/]+)\/following$/,
    run: async (request, [companyId]) => {
      if (!companyId || !isUuid(companyId)) throw notFound();
      return json({ following: await follows.isFollowing(user(request), companyId) });
    },
  },
  {
    // Cron, daily with the saved-search alerts (D240).
    method: "POST",
    pattern: /^\/v1\/tasks\/company-alerts$/,
    run: async () => json(await follows.runCompanyAlerts()),
  },
];

export function toResponse(error: unknown): Response {
  if (error instanceof HttpError) return httpErrorResponse(error);
  if (error instanceof ZodError) return httpErrorResponse(validationError(error.issues));
  reportError(error, "follows-service");
  return Response.json({ error: { code: "INTERNAL", message: "Internal error" } }, { status: 500 });
}

export function createApp(config: AppConfig) {
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") return Response.json({ ok: true });
      requireServiceToken(request, config.serviceToken);
      for (const route of routes) {
        if (route.method !== request.method) continue;
        const match = route.pattern.exec(url.pathname);
        if (!match) continue;
        return await route.run(request, match.slice(1));
      }
      throw notFound();
    } catch (error) {
      return toResponse(error);
    }
  };
}
