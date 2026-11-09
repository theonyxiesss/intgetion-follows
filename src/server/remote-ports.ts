import { HttpError } from "@intgetion/kit";
import type { Ports } from "../ports";

export type Endpoint = { url: string; token: string };

export type RemoteConfig = {
  /** notifications service: `POST /v1/deliver`. */
  notifications: Endpoint;
  /** platform: jobs and hidden jobs until those are wired by HTTP. */
  platform: Endpoint;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/** Revives the Sets the platform sends as arrays. */
function hiddenSets(value: unknown) {
  const raw = (value ?? {}) as { hiddenJobIds?: string[]; hiddenCompanyIds?: string[] };
  return { hiddenJobIds: new Set(raw.hiddenJobIds ?? []), hiddenCompanyIds: new Set(raw.hiddenCompanyIds ?? []) };
}

/**
 * Jobs and hidden jobs go to the platform callback `POST /api/internal/follows/:op`
 * with `{args}`; notices to the notifications service. Over HTTP a refused
 * notice rolls the alert claim back, so the next run tries again.
 */
export function httpPorts(config: RemoteConfig): Ports {
  const doFetch = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 10_000;

  async function post(to: Endpoint, path: string, body: unknown) {
    const response = await doFetch(`${to.url.replace(/\/+$/, "")}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${to.token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await response.json().catch(() => null)) as
      | { result?: unknown; error?: { code: string; message: string } }
      | null;
    if (!response.ok) {
      if (response.status < 500 && json?.error) throw new HttpError(response.status, json.error.code, json.error.message);
      throw new Error(`${path} answered ${response.status}`);
    }
    return json;
  }
  const call = async (op: string, ...args: unknown[]) =>
    (await post(config.platform, `/api/internal/follows/${op}`, { args }))?.result;
  const port =
    <F extends (...a: never[]) => unknown>(op: string) =>
    ((...args: unknown[]) => call(op, ...args)) as unknown as F;

  return {
    jobs: {
      getVisibleCompany: port("jobs.visible-company"),
      listPublishedJobsForCompany: port("jobs.company-jobs"),
    },
    feedback: {
      getHiddenSetsForViewer: (async (userId: string) => hiddenSets(await call("feedback.hidden-sets", userId))) as never,
    },
    deliver: async (input) => {
      const { now, ...rest } = input as typeof input & { now?: Date };
      void now;
      await post(config.notifications, "/v1/deliver", rest);
    },
  };
}
