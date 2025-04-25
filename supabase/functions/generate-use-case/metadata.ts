
import { CustomerMetadata } from "./types.ts";

export function prepareMetadata(raw: any): CustomerMetadata {
  if (!raw) return {};
  
  const metadata = {
    industry: raw.industry ?? "",
    sw_tasks: raw.tools?.task_management ?? "",
    sw_knowledge: raw.tools?.knowledge_base ?? "",
    sw_CRM: raw.tools?.crm ?? "",
  };
  
  console.log("Prepared metadata:", metadata);
  return metadata;
}
