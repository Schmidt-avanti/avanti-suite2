
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Define constants for valid use case types
const USE_CASE_TYPES = ['knowledge_request', 'forwarding_use_case', 'direct_use_case'] as const;

// Schema for chat_response object
const chatResponseSchema = z.object({
  title: z.string().min(1),
  info_block: z.string().min(1),
  steps_block: z.string().min(1),
  activities_block: z.string().min(1),
  result_block: z.string().min(1),
  tone: z.string().min(1),
});

// Schema for process_map steps
const processMapStepSchema = z.object({
  step: z.string(),
  action: z.string(),
  tool: z.string(),
  note: z.string().optional(),
});

// Schema for decision_logic items
const decisionLogicItemSchema = z.object({
  condition: z.string(),
  yes: z.string(),
  no: z.string(),
});

// Main schema for the complete use case response
export const useCaseResponseSchema = z.object({
  // Normalize type to handle potential case mismatches
  type: z.string()
    .refine(val => USE_CASE_TYPES.includes(val as any), {
      message: `type must be one of: ${USE_CASE_TYPES.join(', ')}`,
    })
    .transform(val => val.toLowerCase() as any),
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

// Helper type to extract the inferred type from the schema
export type UseCaseResponse = z.infer<typeof useCaseResponseSchema>;

/**
 * Validates a response against the UseCaseResponse schema
 * @param data The data to validate
 * @returns Result object with isValid flag and data or errors
 */
export function validateResponse(data: unknown) {
  console.log("Starting validation of response data");
  
  // Log the type field specifically as it's a common issue
  if (data && typeof data === 'object' && 'type' in data) {
    console.log(`Response type field: "${(data as any).type}"`, 
      `(typeof: ${typeof (data as any).type})`);
  }
  
  const result = useCaseResponseSchema.safeParse(data);
  
  if (!result.success) {
    console.error("Validation failed:", result.error.format());
    
    return {
      isValid: false,
      errors: result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        received: err.path.reduce((obj, key) => 
          obj && typeof obj === 'object' ? obj[key] : undefined, data)
      }))
    };
  }
  
  console.log("Validation successful");
  return {
    isValid: true,
    data: result.data
  };
}
