
import { ProcessedResponse, ChatResponse, USE_CASE_TYPES } from "./types.ts";

export function processResponse(content: string): ProcessedResponse {
  console.log("Processing raw content:", content);

  // Remove JSON code block markers if present
  if (content.startsWith('```json\n') && content.endsWith('\n```')) {
    content = content.slice(8, -4);
  }

  let parsedContent: ProcessedResponse;
  try {
    parsedContent = JSON.parse(content);
    console.log("Successfully parsed content");

    // Handle string steps_block conversion
    if (typeof parsedContent.chat_response?.steps_block === 'string') {
      console.log("Converting string steps_block to array");
      const stepsString = parsedContent.chat_response.steps_block as string;
      const steps = stepsString
        .split(/→|->|\n|;/)
        .map(step => step.trim())
        .filter(step => step.length > 0);
      
      parsedContent.chat_response.steps_block = steps;
      console.log("Converted steps:", steps);
    }

    // Ensure valid type
    if (!Object.values(USE_CASE_TYPES).includes(parsedContent.type as any)) {
      console.log("Invalid type detected, defaulting to direct_use_case");
      parsedContent.type = USE_CASE_TYPES.DIRECT;
    }

    return parsedContent;

  } catch (err) {
    console.error("JSON parsing error:", err);
    console.error("Content that failed to parse:", content);
    throw new Error("Failed to parse OpenAI response as JSON");
  }
}
