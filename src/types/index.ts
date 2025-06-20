
// Update UserRole type to match database constraint
export type UserRole = 'admin' | 'agent' | 'customer';

// Define TaskActivityAction type that was missing
export type TaskActivityAction = 'open' | 'close' | 'status_change' | 'assign' | 'comment';

// Timer related types have been removed

// Adding email thread interface
export interface EmailThread {
  id: string;
  task_id: string;
  subject: string | null;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  content: string;
  attachments?: string[];
  created_at: string;
  thread_id?: string | null;
  reply_to_id?: string | null;
  message_id?: string | null;
}

// Existing types (to fix build errors)
export type TaskStatus = 'new' | 'in_progress' | 'followup' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  source?: string;
  readable_id?: string;
  customer?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    "Full Name": string;
  };
  assignee?: {
    id: string;
    "Full Name": string;
  };
  follow_up_date?: string;
  closing_comment?: string;
  attachments?: any[];
  endkunde_id?: string;
  endkunde_email?: string; 
  from_email?: string;     
  description?: string;    
  matched_use_case_id?: string;
  
  // Adding the missing properties to fix TypeScript errors
  customer_id: string;
  created_by?: string;
  assigned_to?: string;
  
  // Task time tracking
  total_time_seconds?: number;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  fullName?: string; // Add this property to fix the error
}

export interface Customer {
  id: string;
  name: string;
  branch?: string;
  created_at: string;
  is_active?: boolean;
  cost_center?: string;
  billing_email?: string;
  billing_address?: string;
  contact_person?: string;
  avanti_email?: string; // Add this field for the custom email
  
  // Adding the missing properties that were causing TypeScript errors
  street?: string;
  zip?: string;
  city?: string;
  email?: string;
  industry?: string;
  has_invoice_address?: boolean;
  invoice_street?: string;
  invoice_zip?: string;
  invoice_city?: string;
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
  customer_id?: string;
  card_holder?: string;
  expiry_month?: number;
  expiry_year?: number;
  billing_address?: string;
  billing_zip?: string;
  billing_city?: string;
}
