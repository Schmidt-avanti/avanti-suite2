
export interface PromptTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export interface NewPromptTemplate {
  name: string;
  type: string;
  content: string;
}
