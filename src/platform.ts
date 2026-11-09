/** The names follows used from other modules, answered by ports. */
import { modulePorts, type Delivery } from "./ports";

type Args<F> = F extends (...args: infer A) => unknown ? A : never;
type P = ReturnType<typeof modulePorts>;

export const getVisibleCompany = (...a: Args<P["jobs"]["getVisibleCompany"]>) =>
  modulePorts().jobs.getVisibleCompany(...a);
export const listPublishedJobsForCompany = (...a: Args<P["jobs"]["listPublishedJobsForCompany"]>) =>
  modulePorts().jobs.listPublishedJobsForCompany(...a);
export const getHiddenSetsForViewer = (...a: Args<P["feedback"]["getHiddenSetsForViewer"]>) =>
  modulePorts().feedback.getHiddenSetsForViewer(...a);
/** Same argument order as notifications' `deliverInTransaction(tx, input)`. */
export const deliverInTransaction = (tx: unknown, input: Delivery) => modulePorts().deliver(input, tx);
