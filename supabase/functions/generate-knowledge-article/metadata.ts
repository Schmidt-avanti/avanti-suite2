// Utility to normalize and extract customer metadata for prompt injection
export function prepareMetadata(raw: any): { industry?: string; contract_type?: string } {
  if (!raw) return {};
  return {
    industry: raw.industry ?? '',
    contract_type: raw.contract_type ?? ''
  };
}
