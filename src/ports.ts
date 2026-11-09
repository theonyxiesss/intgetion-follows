/**
 * What follows needs from other modules. Types are the owners' own signatures.
 * In-process the platform wires the real functions; over HTTP see
 * `server/remote-ports.ts`.
 */
import type * as Jobs from "@intgetion/jobs";
import type * as Feedback from "@intgetion/feedback";
import type * as Notifications from "@intgetion/notifications";

/** One scheduled notice, as notifications delivers it. */
export type Delivery = Parameters<typeof Notifications.deliverInTransaction>[1];

export type Ports = {
  jobs: {
    getVisibleCompany: typeof Jobs.getVisibleCompany;
    listPublishedJobsForCompany: typeof Jobs.listPublishedJobsForCompany;
  };
  feedback: { getHiddenSetsForViewer: typeof Feedback.getHiddenSetsForViewer };
  /**
   * notifications: deliver inside the transaction that claims the alert slot;
   * an in-process adapter writes with `tx`, so the claim and the notice commit together.
   */
  deliver: (input: Delivery, tx?: unknown) => Promise<void>;
};

let ports: Ports | null = null;

export function setPorts(next: Ports): void {
  ports = next;
}

export function modulePorts(): Ports {
  if (!ports) throw new Error("follows ports are not configured");
  return ports;
}
