
export interface CustomerMetadata {
  industry?: string;
  sw_tasks?: string;
  sw_knowledge?: string;
  sw_CRM?: string;
}

export interface OpenAIPayload {
  model: string;
  instructions: string;
  input: string;
  metadata: CustomerMetadata;
}

export interface UseCaseResponse {
  output: Array<{
    content: Array<{
      text: string;
    }>;
  }>;
}

export interface ChatResponse {
  steps_block: string[];
  title?: string;
  info_block?: string;
  activities_block?: string;
  result_block?: string;
  tone?: string;
}

export interface ProcessedResponse {
  type: string;
  title: string;
  information_needed: string;
  steps: string;
  typical_activities: string;
  expected_result: string;
  chat_response: ChatResponse;
  next_question: string;
  response_id?: string;
}

export const USE_CASE_TYPES = {
  KNOWLEDGE_REQUEST: "knowledge_request",
  FORWARDING: "forwarding_use_case",
  DIRECT: "direct_use_case"
} as const;
