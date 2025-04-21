
type ChatResponse = {
  title: string;
  info_block: string;
  steps_block: string;
  activities_block: string;
  result_block: string;
  tone: string;
}

type ProcessMapStep = {
  step: string;
  action: string;
  tool: string;
  note?: string;
}

type DecisionLogicItem = {
  condition: string;
  yes: string;
  no: string;
}

export type UseCaseResponse = {
  type: string;
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
