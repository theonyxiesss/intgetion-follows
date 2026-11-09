import { describe, expect, it, vi } from "vitest";
import { useTestPorts } from "../test-support";
import { createApp } from "./app";
import { httpPorts } from "./remote-ports";

useTestPorts();
const token = "test-token";
const app = createApp({ serviceToken: token });
const user = "11111111-1111-4111-8111-111111111111";
const auth = { authorization: `Bearer ${token}` };
const call = (path: string, init: RequestInit = {}) => app(new Request(`http://svc${path}`, init));

describe("follows http", () => {
  it("serves health without a token and refuses a missing one", async () => {
    expect((await call("/health")).status).toBe(200);
    expect((await call("/v1/me/follows")).status).toBe(401);
  });
  it("needs the person", async () => {
    expect((await call("/v1/me/follows", { headers: auth })).status).toBe(401);
  });
  it("answers 404 for an unknown company, a bad id and unknown routes", async () => {
    const headers = { ...auth, "x-user-id": user };
    expect((await call("/v1/companies/no-such/follow", { method: "POST", headers })).status).toBe(404);
    expect((await call("/v1/companies/nope/followers", { headers })).status).toBe(404);
    expect((await call("/v1/nothing", { headers: auth })).status).toBe(404);
  });
});

describe("remote ports", () => {
  it("revives hidden sets, delivers to notifications and keeps an owner's 4xx", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const path = String(url);
      if (path.endsWith("/feedback.hidden-sets")) return Response.json({ result: { hiddenJobIds: ["j"], hiddenCompanyIds: [] } });
      if (path === "http://n/v1/deliver") return Response.json({ error: { code: "NOT_FOUND", message: "no user" } }, { status: 404 });
      return new Response("down", { status: 503 });
    });
    const ports = httpPorts({
      notifications: { url: "http://n/", token: "a" },
      platform: { url: "http://p", token: "b" },
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect((await ports.feedback.getHiddenSetsForViewer(user)).hiddenJobIds.has("j")).toBe(true);
    await expect(
      ports.deliver({ userId: user, type: "company.new_jobs", locale: "en", payload: {}, now: new Date() } as never),
    ).rejects.toMatchObject({ status: 404 });
  });
});
