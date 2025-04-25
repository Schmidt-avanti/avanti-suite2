
import { OpenAIPayload, UseCaseResponse } from "./types.ts";

const BASE_URL = "https://api.openai.com/v1/responses";

export async function callOpenAI(
  openAIApiKey: string,
  payload: OpenAIPayload
): Promise<UseCaseResponse> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAIApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error response:", errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { raw: errorText };
    }
    
    if (errorData?.error?.code === 'model_not_found') {
      throw new Error("Invalid model configuration. Please contact support.");
    }
    
    throw new Error(`OpenAI API Error (${response.status})`);
  }

  return response.json();
}
