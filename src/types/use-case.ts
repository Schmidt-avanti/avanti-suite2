
export const USE_CASE_TYPES = {
  KNOWLEDGE_REQUEST: "knowledge_request",
  FORWARDING: "forwarding_use_case",
  DIRECT: "direct_use_case",
  KNOWLEDGE_ARTICLE: "knowledge_article",
} as const;

export type UseCaseType = (typeof USE_CASE_TYPES)[keyof typeof USE_CASE_TYPES];

export const useCaseTypeLabels: Record<UseCaseType, string> = {
  knowledge_request: "Informationsanfrage",
  forwarding_use_case: "Weiterleitung",
  direct_use_case: "Direkte Bearbeitung",
  knowledge_article: "Wissensartikel",
};
