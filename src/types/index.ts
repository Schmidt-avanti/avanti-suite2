
export type TaskStatus = 'new' | 'in_progress' | 'blocked' | 'completed' | 'followup';

export interface Customer {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  readable_id: string;
  created_at: string;
  title: string;
  description: string;
  status: TaskStatus;
  customer_id: string;
  customer?: Customer;
  created_by: string;
  creator?: {
    "Full Name": string;
  };
  assigned_to: string;
  assignee?: {
    "Full Name": string;
  };
  closing_comment: string | null;
  attachments: string[] | null;
  source: string | null;
  endkunde_id: string | null;
  endkunde_email: string | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  timestamp: string;
  action: string;
  status_from: TaskStatus | null;
  status_to: TaskStatus | null;
}

export interface TaskMessage {
  id: string;
  created_at: string;
  task_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_by: string;
}

export interface UseCase {
  id: string;
  title: string;
  description: string;
  customer_id: string;
  prompt: string;
  active: boolean;
}

export interface EmailThread {
  id: string;
  task_id: string;
  sender: string;
  recipient: string;
  subject?: string;
  content: string;
  attachments?: string[];
  created_at: string;
  direction: 'inbound' | 'outbound';
  reply_to_id?: string;
}
