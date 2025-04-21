
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const chatResponseSchema = z.object({
  title: z.string().min(1),
  info_block: z.string().min(1),
  steps_block: z.string().min(1),
  activities_block: z.string().min(1),
  result_block: z.string().min(1),
  tone: z.string().min(1),
});

const processMapStepSchema = z.object({
  step: z.string(),
  action: z.string(),
  tool: z.string(),
  note: z.string().optional(),
});

const decisionLogicItemSchema = z.object({
  condition: z.string(),
  yes: z.string(),
  no: z.string(),
});

export const useCaseResponseSchema = z.object({
  type: z.string(),
  title: z.string().min(1),
  information_needed: z.string().min(1),
  steps: z.string().min(1),
  typical_activities: z.string().min(1),
  expected_result: z.string().min(1),
  chat_response: chatResponseSchema,
  next_question: z.string(),
  process_map: z.array(processMapStepSchema).optional(),
  decision_logic: z.array(decisionLogicItemSchema).optional(),
  response_id: z.string().optional(),
});

export function validateResponse(data: unknown) {
  const result = useCaseResponseSchema.safeParse(data);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    };
  }
  return {
    isValid: true,
    data: result.data
  };
}
