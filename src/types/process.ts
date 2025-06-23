export interface ProcessStep {  id: string;  type: 'instruction' | 'ai_interpret' | 'end' | 'agent_choice';  text_to_agent: string;  next_step_id?: string;  possible_outcomes?: {    label: string;    next_step_id: string;  }[];}export interface ValidationResult {
  // Frontend-Format
  isComplete: boolean;
  criticalIssues: string[];
  overallIssues: string[];
  stepIssues: Array<{
    stepId: string;
    issues: string[];
  }>;
  
  // Backend-Format (optional)
  is_complete?: boolean;
  feedback?: string;
  missing_fields?: string[];
  
  // Fehlerbehandlung
  error?: string;
}

export interface ProcessMap {  schema_version: string;  start_step_id: string;  steps: Record<string, ProcessStep>;}
