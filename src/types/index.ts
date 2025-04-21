
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
  description?: string;
  createdAt: string;
}

export interface UserCustomerAssignment {
  id: string;
  userId: string;
  customerId: string;
  role: 'admin' | 'agent';
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'inProgress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerId: string;
  assignedToId?: string;
  createdById: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
