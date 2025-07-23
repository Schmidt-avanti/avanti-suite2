import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { DevTaskForm } from "@/components/admin/DevTaskForm";
import { DevTaskDetail } from "@/components/admin/DevTaskDetail";
import { useAuth } from "@/contexts/AuthContext";

interface DevTask {
  id: string;
  title: string;
  description: string | null;
  category: "critical_bug" | "bug" | "feature";
  priority: "high" | "medium" | "low";
  status: "new" | "planned" | "in_progress" | "testing" | "done" | "archived" | "rejected";
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const statusColumns = [
  { id: "new", name: "Neu" },
  { id: "planned", name: "Eingeplant" },
  { id: "in_progress", name: "In Arbeit" },
  { id: "testing", name: "Im Test" },
  { id: "done", name: "Erledigt" },
  { id: "archived", name: "Archiviert" }
];

const DevelopmentPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dev_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Fehler beim Laden der Entwicklungsaufgaben");
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by category tab
    const matchesCategory = 
      activeTab === "all" || 
      (activeTab === "critical" && task.category === "critical_bug") ||
      (activeTab === "bugs" && task.category === "bug") ||
      (activeTab === "features" && task.category === "feature");
    
    return matchesSearch && matchesCategory;
  });

  const getTasksByStatus = (status: string) => {
    // Aufgaben nach due_date aufsteigend sortieren, ohne due_date ans Ende
    return filteredTasks
      .filter(task => task.status === status)
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "critical_bug":
        return "bg-red-500";
      case "bug":
        return "bg-orange-500";
      case "feature":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-200";
      case "medium":
        return "bg-yellow-200";
      case "low":
        return "bg-green-200";
      default:
        return "bg-gray-200";
    }
  };

  // Drag and drop functionality for task status updates
  const handleDragStart = (e: React.DragEvent, taskId: string, currentStatus: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.setData("currentStatus", currentStatus);
    
    // Set styling for the dragged element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add("opacity-50");
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove("opacity-50");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Add visual feedback for drop target
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add("bg-muted");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove("bg-muted");
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove("bg-muted");
    }
    
    const taskId = e.dataTransfer.getData("taskId");
    const currentStatus = e.dataTransfer.getData("currentStatus");
    
    // Don't do anything if dropping in the same column
    if (currentStatus === newStatus) return;
    
    try {
      // Optimistic update in the UI
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus as any } : task
        )
      );
      
      // Update in the database
      const { error } = await supabase
        .from("dev_tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", taskId);
        
      if (error) {
        throw error;
      }
      
      // Audit-Log für die Statusänderung erstellen
      if (user) {
        await supabase
          .from("dev_task_audit_logs")
          .insert({
            task_id: taskId,
            user_id: user.id,
            action: "status_changed",
            previous_value: { status: currentStatus },
            new_value: { status: newStatus },
          });
      }
      
      toast.success(`Aufgabe verschoben nach "${statusColumns.find(col => col.id === newStatus)?.name || newStatus}"`); 
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      toast.error("Status konnte nicht aktualisiert werden");
      
      // Revert the optimistic update on error
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId ? { ...task, status: currentStatus as any } : task
        )
      );
    }
  };
  
  // Öffnet die Detailansicht einer Aufgabe
  const openTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Development Board</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Neue Aufgabe
        </Button>
      </div>
      
      <DevTaskForm 
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onTaskCreated={fetchTasks}
      />
      
      <DevTaskDetail
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        taskId={selectedTaskId}
        onTaskUpdated={fetchTasks}
      />

      <div className="flex items-center justify-between mb-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="critical">Kritische Fehler</TabsTrigger>
            <TabsTrigger value="bugs">Bugs</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Suchen..."
            className="pl-8 w-[250px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Lade Aufgaben...</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
          {statusColumns.map((column) => (
            <div
              key={column.id}
              className="bg-white border border-gray-300 p-3 rounded-lg min-w-[320px] max-w-[340px] flex flex-col shadow-sm"
              style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <h3 className="font-medium mb-4 sticky top-0 bg-white z-10 pb-2 border-b border-gray-200">{column.name} ({getTasksByStatus(column.id).length})</h3>
              <div className="flex flex-col gap-3">
                {getTasksByStatus(column.id).map((task) => (
                  <Card 
                    key={task.id}
                    className="cursor-pointer shadow-md border border-muted bg-white hover:bg-muted/10 transition"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id, task.status)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openTaskDetail(task.id)}
                  >
                    <CardHeader className="p-3 pb-1">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2 items-center">
                          <div className={`h-3 w-3 rounded-full ${getCategoryColor(task.category)}`} />
                          <CardTitle className="text-sm">{task.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className={`text-xs px-2 py-1 rounded-md ${getPriorityColor(task.priority)}`}> 
                          {task.priority === "high" ? "Hoch" : task.priority === "medium" ? "Mittel" : "Niedrig"}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.due_date).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DevelopmentPage;
