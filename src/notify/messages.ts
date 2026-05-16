import type { EventType } from "../domain/eventTypes.js";

export const SUPPORTED_ALERT_LOCALES = ["ko", "en"] as const;
export type AlertLocale = (typeof SUPPORTED_ALERT_LOCALES)[number];

export function normalizeAlertLocale(value: string | undefined): AlertLocale {
  return value === "en" ? "en" : "ko";
}

export function confidenceLabel(confidence: "HIGH" | "MEDIUM" | "LOW", locale: AlertLocale): string {
  const labels = {
    ko: { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" },
    en: { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" },
  } as const;
  return labels[locale][confidence];
}

export function eventLabel(eventType: EventType, locale: AlertLocale): string {
  const labels = {
    ko: {
      RESET_PLANNED: "사용량 제한 리셋 예정",
      RESET_DONE: "사용량 제한 리셋 완료",
      RESET_DELAYED: "리셋 지연/변경",
      RESET_CANCELLED: "리셋 취소/미진행",
      LIMIT_POLICY_CHANGED: "제한 정책 변경",
      RELATED_NO_ACTION: "관련 있으나 알림 불필요",
      UNRELATED: "관련 없음",
    },
    en: {
      RESET_PLANNED: "Usage limit reset planned",
      RESET_DONE: "Usage limit reset done",
      RESET_DELAYED: "Reset delayed or changed",
      RESET_CANCELLED: "Reset cancelled or skipped",
      LIMIT_POLICY_CHANGED: "Limit policy changed",
      RELATED_NO_ACTION: "Related but no action",
      UNRELATED: "Unrelated",
    },
  } as const;
  return labels[locale][eventType];
}
