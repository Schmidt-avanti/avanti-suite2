
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
  id?: string;
  "Full Name"?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  customer?: { name: string; id?: string };
  creator?: TaskCreator | null;
  created_at: string;
  customer_id?: string;
  created_by?: string;
}

