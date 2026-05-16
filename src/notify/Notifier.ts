import type { ClassifiedCandidate } from "../domain/searchCandidate.js";

export type Notification = {
  candidate: ClassifiedCandidate;
  checkedAt: string;
};

export interface Notifier {
  notify(notification: Notification): Promise<void>;
}
