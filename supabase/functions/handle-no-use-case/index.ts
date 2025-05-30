/// <reference path="../types/deno.d.ts" />
/// <reference path="../types/http-server.d.ts" />
/// <reference path="../types/supabase.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface TaskWithoutUseCaseRequest {
  taskId: string;
  action?: 'discard' | 'manual' | 'create_use_case';
  rememberId?: boolean;
  customerId?: string;
  message?: string;
}

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { taskId, action, rememberId, customerId, message } = await req.json() as TaskWithoutUseCaseRequest;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: taskId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch task details to confirm it exists and lacks a use case
    const { data: task, error: taskError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: taskError?.message || 'Task not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (task.matched_use_case_id) {
      return new Response(
        JSON.stringify({ error: 'Task already has a use case assigned' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If no action is specified, send notifications to admins and return
    if (!action) {
      await notifyAdmins(supabaseClient, task);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin notifications sent for task without use case'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle the specified action
    if (action === 'discard') {
      await handleDiscardTask(supabaseClient, taskId);
      return new Response(
        JSON.stringify({ success: true, message: 'Task discarded successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } 
    else if (action === 'manual') {
      await handleManualProcessing(supabaseClient, taskId, message);
      return new Response(
        JSON.stringify({ success: true, message: 'Task marked for manual processing' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } 
    else if (action === 'create_use_case') {
      if (!customerId) {
        return new Response(
          JSON.stringify({ error: 'Customer ID is required to create a use case' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await createNewUseCase(supabaseClient, taskId, customerId, task, rememberId || false);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'New use case created and assigned to task',
          useCaseId: result.useCaseId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action specified' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Define types for task and admin
interface Task {
  id: string;
  readable_id: string;
  title: string;
  description?: string;
  customer_id: string;
  created_at: string;
  team?: string;
  project?: string;
  matched_use_case_id?: string;
  status?: string;
}

interface Admin {
  id: string;
  email: string;
}

interface SupabaseClient {
  from: (table: string) => any;
}

// Function to notify admin users about tasks without use cases
async function notifyAdmins(supabaseClient: SupabaseClient, task: Task) {
  try {
    // Get all admin users
    const { data: adminUsers, error: adminError } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin');

    if (adminError || !adminUsers || adminUsers.length === 0) {
      console.error('Error fetching admin users:', adminError);
      return;
    }

    // Create notifications for each admin
    const notificationPromises = adminUsers.map((admin: Admin) => {
      return supabaseClient
        .from('notifications')
        .insert({
          user_id: admin.id,
          message: `Task #${task.readable_id} was created without a use case and requires attention.`,
          task_id: task.id,
          metadata: {
            type: 'no_use_case',
            task_title: task.title,
            customer_id: task.customer_id,
            created_at: task.created_at,
            team: task.team || 'Unassigned',
            project: task.project || 'None'
          }
        });
    });

    await Promise.all(notificationPromises);
    console.log(`Sent notifications to ${adminUsers.length} admin users for task ${task.id}`);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

// Function to handle discarding a task
async function handleDiscardTask(supabaseClient: SupabaseClient, taskId: string) {
  // Update task status to 'discarded'
  const { error } = await supabaseClient
    .from('tasks')
    .update({ 
      status: 'completed',
      closing_comment: 'Task discarded - no appropriate use case',
      discarded: true
    })
    .eq('id', taskId);

  if (error) {
    console.error('Error discarding task:', error);
    throw new Error('Failed to discard task');
  }

  return { success: true };
}

// Function to handle manual processing
async function handleManualProcessing(supabaseClient: SupabaseClient, taskId: string, message?: string) {
  // Add a message to the task indicating manual processing
  const { error: messageError } = await supabaseClient
    .from('task_messages')
    .insert({
      task_id: taskId,
      content: message || 'This task has been marked for manual processing due to missing use case.',
      role: 'system',
      is_notification: true
    });

  if (messageError) {
    console.error('Error adding manual processing message:', messageError);
  }

  // Update task status to indicate manual processing
  const { error: taskError } = await supabaseClient
    .from('tasks')
    .update({ 
      status: 'in_progress',
      manual_processing: true,
      manual_processing_reason: 'No matching use case'
    })
    .eq('id', taskId);

  if (taskError) {
    console.error('Error updating task for manual processing:', taskError);
    throw new Error('Failed to update task for manual processing');
  }

  return { success: true };
}

// Function to create a new use case based on the task
async function createNewUseCase(supabaseClient: SupabaseClient, taskId: string, customerId: string, task: Task, rememberAction: boolean) {
  try {
    // Create a new use case based on the task
    const { data: useCase, error: useCaseError } = await supabaseClient
      .from('use_cases')
      .insert({
        title: `Auto-created: ${task.title}`,
        description: task.description || 'Automatically created from task without use case',
        customer_id: customerId,
        is_active: true,
        type: 'direct_use_case',
        auto_created: true,
        created_from_task_id: taskId
      })
      .select()
      .single();

    if (useCaseError || !useCase) {
      console.error('Error creating use case:', useCaseError);
      throw new Error('Failed to create use case');
    }

    // Update the task with the new use case ID
    const { error: taskUpdateError } = await supabaseClient
      .from('tasks')
      .update({ 
        matched_use_case_id: useCase.id,
        match_confidence: 1.0, // High confidence since we're manually creating it
        match_reasoning: 'Manually created use case specifically for this task'
      })
      .eq('id', taskId);

    if (taskUpdateError) {
      console.error('Error updating task with new use case:', taskUpdateError);
      throw new Error('Failed to update task with new use case');
    }

    // If remember action is enabled, store the customer's preference
    if (rememberAction) {
      const { error: preferenceError } = await supabaseClient
        .from('customer_preferences')
        .insert({
          customer_id: customerId,
          preference_type: 'no_use_case_action',
          preference_value: 'create_use_case',
          created_at: new Date().toISOString()
        });

      if (preferenceError) {
        console.error('Error saving customer preference:', preferenceError);
        // Don't throw here, this is not critical
      }
    }

    return { success: true, useCaseId: useCase.id };
  } catch (error) {
    console.error('Error in createNewUseCase:', error);
    throw error;
  }
}
