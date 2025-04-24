
// Add to existing types
export interface TaskTime {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface TaskTimeSummary {
  task_id: string;
  user_id: string;
  total_seconds: number;
  total_hours: number;
  session_count: number;
}

// Existing types (to fix build errors)
export type TaskStatus = 'new' | 'in_progress' | 'followup' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  customer?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    "Full Name": string;
  };
}

// Add missing types that are causing errors
export type UserRole = 'admin' | 'agent' | 'client';

export type TaskActivityAction = 'open' | 'close' | 'status_change' | 'comment';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  branch?: string;
  createdAt: string;
  isActive?: boolean;
  cost_center?: string;
  billing_email?: string;
  billing_address?: string;
  contact_person?: string;
}
