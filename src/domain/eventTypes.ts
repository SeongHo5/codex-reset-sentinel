export const ACTIONABLE_EVENT_TYPES = [
  "RESET_PLANNED",
  "RESET_DONE",
  "RESET_DELAYED",
  "RESET_CANCELLED",
  "LIMIT_POLICY_CHANGED",
] as const;

export const NON_ACTIONABLE_EVENT_TYPES = ["RELATED_NO_ACTION", "UNRELATED"] as const;

export type ActionableEventType = (typeof ACTIONABLE_EVENT_TYPES)[number];
export type NonActionableEventType = (typeof NON_ACTIONABLE_EVENT_TYPES)[number];
export type EventType = ActionableEventType | NonActionableEventType;

export function isActionableEventType(eventType: EventType): eventType is ActionableEventType {
  return (ACTIONABLE_EVENT_TYPES as readonly string[]).includes(eventType);
}

export function isEventType(value: unknown): value is EventType {
  return (
    typeof value === "string" &&
    ([...ACTIONABLE_EVENT_TYPES, ...NON_ACTIONABLE_EVENT_TYPES] as readonly string[]).includes(value)
  );
}
