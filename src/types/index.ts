export type UserRole = 'admin' | 'agent' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  branch?: string;
  createdAt: string;
  isActive?: boolean;
}

export interface UserCustomerAssignment {
  id: string;
  userId: string;
  customerId: string;
  role: 'admin' | 'agent';
  createdAt: string;
}

export interface TaskCreator {
  id: string;
  "Full Name": string;
}

export type TaskStatus = 'new' | 'in_progress' | 'followup' | 'completed';

// Interface for the raw data received from Supabase
export interface SupabaseTaskResponse {
  id: string;
  title: string;
  status: string;
  created_at: string;
  customer: {
    id: string;
    name: string;
  } | null;
  creator: {
    id: string;
    "Full Name": string;
  } | null;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  customer?: {
    id: string;
    name: string;
  };
  creator?: TaskCreator | null;
}

export type TaskActivityAction = 'create' | 'open' | 'close' | 'status_change';

export interface TaskActivity {
  id: string;
  task_id: string;
  action: TaskActivityAction;
  status_from?: TaskStatus;
  status_to?: TaskStatus;
  timestamp: string;
  user_id: string;
}
