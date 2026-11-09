import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { setPorts, type Delivery, type Ports } from "./ports";

/** The platform users table, as tests insert into it (test stub columns). */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUid: uuid("auth_uid"),
  locale: text("locale").notNull().default("en"),
  status: text("status").notNull().default("active"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  termsVersion: text("terms_version"),
});

/** Delivered notices, in order; `tx` tells it came with the claim. */
export const delivered: { input: Delivery; inTransaction: boolean }[] = [];

/** Stand-ins: nothing hidden, no jobs; delivery is recorded. */
export function useTestPorts(overrides: Partial<Ports> = {}): void {
  setPorts({
    jobs: {
      getVisibleCompany: (async () => null) as never,
      listPublishedJobsForCompany: (async () => []) as never,
    },
    feedback: {
      getHiddenSetsForViewer: (async () => ({ hiddenJobIds: new Set(), hiddenCompanyIds: new Set() })) as never,
    },
    deliver: async (input, tx) => {
      delivered.push({ input, inTransaction: tx !== undefined });
    },
    ...overrides,
  });
}
