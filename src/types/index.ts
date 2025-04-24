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
  source?: string;
  customer?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    "Full Name": string;
  };
  attachments?: any[]; // Added missing attachments property
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

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  task_id?: string;
  created_at: string;
  read_at: string | null;
};

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'paypal' | 'creditcard';
  value: string;
  created_at: string;
  updated_at: string;
  last_used: string | null;
  active: boolean;
  customer_id: string;
  card_holder?: string;
  expiry_month?: number;
  expiry_year?: number;
  billing_address?: string;
  billing_zip?: string;
  billing_city?: string;
}
