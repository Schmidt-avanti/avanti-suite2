
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { PlusIcon } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Task = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  customer: {
    name: string;
  } | null;
  creator: {
    "Full Name": string;
  } | null;
};

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        let query = supabase
          .from('tasks')
          .select(`
            id,
            title,
            status,
            created_at,
            customer:customer_id(name),
            creator:created_by(*)
          `)
          .order('created_at', { ascending: false });

        // Apply status filter if selected
        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }

        // Apply role-based filtering
        if (user?.role === 'agent') {
          // Agents see tasks for their assigned customers
          const { data: assignedCustomers } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id);

          if (assignedCustomers && assignedCustomers.length > 0) {
            const customerIds = assignedCustomers.map(ac => ac.customer_id);
            query = query.in('customer_id', customerIds);
          }
        } else if (user?.role === 'client') {
          // Clients see only their own tasks
          // First, get the customer ID for this client
          const { data: userAssignment } = await supabase
            .from('user_customer_assignments')
            .select('customer_id')
            .eq('user_id', user.id)
            .single();
            
          if (userAssignment) {
            query = query.eq('customer_id', userAssignment.customer_id);
          }
        }

        const { data, error } = await query;

        if (error) throw error;
        
        // Transform the data to match the Task type
        // Handle the case where creator may have an error
        const transformedData = data?.map(task => {
          // Check if creator is an error (doesn't have "Full Name" property)
          const creatorData = typeof task.creator === 'object' && task.creator !== null && !('error' in task.creator) 
            ? task.creator 
            : null;
            
          return {
            id: task.id,
            title: task.title,
            status: task.status,
            created_at: task.created_at,
            customer: task.customer,
            creator: creatorData
          };
        }) || [];
        
        setTasks(transformedData as Task[]);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user, statusFilter]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Offen';
      case 'in_progress': return 'In Bearbeitung';
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Aufgaben</h1>
        <div className="flex space-x-2">
          <div className="flex items-center">
            <Select
              value={statusFilter || ''}
              onValueChange={(value) => setStatusFilter(value || null)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alle Status</SelectItem>
                <SelectItem value="pending">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="completed">Abgeschlossen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => navigate('/tasks/create')}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Neue Aufgabe
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Erstellt von</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Datum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Lädt...</TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Keine Aufgaben gefunden</TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow 
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.customer?.name || '-'}</TableCell>
                  <TableCell>{task.creator ? task.creator["Full Name"] : '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(task.created_at).toLocaleDateString('de-DE')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Tasks;
