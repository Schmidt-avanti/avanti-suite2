
/**
 * Chat response structure that represents how responses
 * should be formatted for the chat interface
 */
export type ChatResponse = {
  title: string;
  info_block: string;
  steps_block: string;
  activities_block: string;
  result_block: string;
  tone: string;
}

/**
 * Step in a process map that outlines the workflow
 */
export type ProcessMapStep = {
  step: string;
  action: string;
  tool: string;
  note?: string;
}

/**
 * Represents a decision point with yes/no paths
 */
export type DecisionLogicItem = {
  condition: string;
  yes: string;
  no: string;
}

/**
 * The complete structure of a use case response
 * returned from the OpenAI API
 */
export type UseCaseResponse = {
  type: 'knowledge_request' | 'forwarding_use_case' | 'direct_use_case';
  title: string;
  information_needed: string;
  steps: string;
  typical_activities: string;
  expected_result: string;
  chat_response: ChatResponse;
  next_question: string;
  process_map?: ProcessMapStep[];
  decision_logic?: DecisionLogicItem[];
  response_id?: string;
}
