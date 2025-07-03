import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import {
  MessageSquare,
  Clock,
  CalendarIcon,
  Paperclip,
  FileText,
  UserCircle,
  Loader2,
  Send,
  AlertCircle,
  CheckCircle,
  BugIcon,
  Sparkles,
  Upload,
  ImageIcon,
  X,
  Pencil,
  Trash2,
} from "lucide-react";

interface DevTaskDetailProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  taskId: string | null;
  onTaskUpdated: () => void;
}

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

interface DevTaskComment {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
  created_by: string;
  profile?: {
    id: string;
    email: string;
    "Full Name"?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface DevTaskAuditLog {
  id: string;
  task_id: string;
  created_by: string;
  action: string;
  previous_value: any;
  new_value: any;
  created_at: string;
  profile?: {
    id: string;
    email: string;
    "Full Name"?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface DevTaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  size: number; // Geändert von file_size zu size
  storage_path: string; // Geändert von file_path zu storage_path
  created_by: string; // Geändert von uploaded_by zu created_by
  created_at: string;
}

export function DevTaskDetail({ isOpen, setIsOpen, taskId, onTaskUpdated }: DevTaskDetailProps) {
  const { user } = useAuth();
  const [task, setTask] = useState<DevTask | null>(null);
  const [comments, setComments] = useState<DevTaskComment[]>([]);
  const [auditLogs, setAuditLogs] = useState<DevTaskAuditLog[]>([]);
  const [attachments, setAttachments] = useState<DevTaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [createdByUser, setCreatedByUser] = useState<any>(null);
  
  // Für Datei-Uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateInput, setDueDateInput] = useState<string>("");
  const [updatingDueDate, setUpdatingDueDate] = useState(false);

  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [confirmDeleteAttachment, setConfirmDeleteAttachment] = useState<DevTaskAttachment | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<DevTaskComment | null>(null);

  // Lade Aufgabendetails, Kommentare, Audit-Logs und Anhänge
  const loadTaskDetails = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);

      // Task-Daten laden
      const { data: taskData, error: taskError } = await supabase
        .from("dev_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;
      setTask(taskData);

      // Informationen zum Ersteller der Aufgabe laden
      if (taskData.created_by && typeof taskData.created_by === 'string') {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select('id, email, "Full Name"')
          .eq("id", taskData.created_by)
          .single();
          
        if (!profileError) {
          setCreatedByUser(profileData);
        } else {
          console.error("Fehler beim Laden des Benutzer-Profils:", profileError);
        }
      }

      // Kommentare laden (ohne impliziten Join)
      const { data: commentsData, error: commentsError } = await supabase
        .from("dev_task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Benutzerprofile für Kommentare laden
      if (commentsData && commentsData.length > 0) {
        // Alle Benutzer-IDs sammeln (created_by enthält die Benutzer-ID)
        // Filtere ungültige IDs heraus, um 400-Fehler zu vermeiden
        const userIds = [...new Set(commentsData
          .map(comment => comment.created_by)
          .filter(id => id && typeof id === 'string'))];

        // Benutzerprofile in einem Schritt laden
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select('id, email, "Full Name"')
          .in("id", userIds);

        if (profilesError) throw profilesError;

        // Benutzerprofile zu Kommentaren hinzufügen
        const commentsWithProfiles = commentsData.map(comment => {
          const profile = profilesData?.find(p => p.id === comment.created_by);
          return { ...comment, profile };
        });

        setComments(commentsWithProfiles);
      } else {
        setComments([]);
      }

      // Audit-Logs laden (ohne impliziten Join)
      const { data: auditData, error: auditError } = await supabase
        .from("dev_task_audit_logs")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (auditError) throw auditError;

      // Benutzerprofile für Audit-Logs laden
      if (auditData && auditData.length > 0) {
        // Alle Benutzer-IDs sammeln
        // Filtere ungültige IDs heraus, um 400-Fehler zu vermeiden
        const userIds = [...new Set(auditData
          .map(log => log.user_id)
          .filter(id => id && typeof id === 'string'))];

        // Benutzerprofile in einem Schritt laden
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select('id, email, "Full Name"')
          .in("id", userIds);

        if (profilesError) throw profilesError;

        // Benutzerprofile zu Audit-Logs hinzufügen
        const logsWithProfiles = auditData.map(log => {
          const profile = profilesData?.find(p => p.id === log.user_id);
          return { ...log, profile };
        });

        setAuditLogs(logsWithProfiles);
      } else {
        setAuditLogs([]);
      }

      // Anhänge laden
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("dev_task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (attachmentsError) {
        console.error("Fehler beim Laden der Anhänge:", attachmentsError);
        toast.error("Anhänge konnten nicht geladen werden");
        setAttachments([]);
      } else {
        console.log("Geladene Anhänge:", attachmentsData);
        setAttachments(attachmentsData || []);
      }

    } catch (error) {
      console.error("Fehler beim Laden der Aufgabendetails:", error);
      toast.error("Aufgabendetails konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [taskId, supabase]);

  useEffect(() => {
    if (taskId && isOpen) {
      loadTaskDetails();
    }
  }, [taskId, isOpen]);

  const handleAddComment = async () => {
    if (!taskId || !user || !newComment.trim()) return;

    try {
      setSubmittingComment(true);

      // Kommentar in Datenbank speichern (ohne impliziten Join)
      // Verwende created_by statt user_id gemäß der Datenbankstruktur
      const { data: commentData, error: commentError } = await supabase
        .from("dev_task_comments")
        .insert({
          task_id: taskId,
          content: newComment.trim(),
          created_by: user.id,
        })
        .select("*")
        .single();
        
      if (commentError) throw commentError;
      
      // Profildaten separat laden
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select('id, email, "Full Name"')
        .eq("id", user.id)
        .single();
        
      if (profileError) throw profileError;
      
      // Profildaten zum Kommentar hinzufügen
      const commentWithProfile = {
        ...commentData,
        profile: profileData
      };
      
      // Kommentar mit Profil zur lokalen Liste hinzufügen
      setComments([...comments, commentWithProfile]);
      
      // Audit-Log für den neuen Kommentar erstellen
      await supabase
        .from("dev_task_audit_logs")
        .insert({
          task_id: taskId,
          user_id: user.id,
          action: "comment_added",
          new_value: {
            comment_id: commentData.id,
            content: newComment.trim(),
          },
          previous_value: null,
        });
      
      setNewComment("");
      toast.success("Kommentar hinzugefügt");
    } catch (error) {
      console.error("Fehler beim Hinzufügen des Kommentars:", error);
      toast.error("Kommentar konnte nicht hinzugefügt werden");
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Handling von Datei-Uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setUploadProgress(prev => [...prev, ...newFiles.map(() => 0)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
    setUploadProgress(prev => {
      const newProgress = [...prev];
      newProgress.splice(index, 1);
      return newProgress;
    });
  };

  // Behandlung von Clipboard-Paste für Screenshots
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          // Eindeutigen Namen für den Screenshot generieren
          const fileName = `screenshot-${Date.now()}.png`;
          // Datei als File-Objekt mit generiertem Namen erstellen
          const file = new File([blob], fileName, { type: "image/png" });
          setUploadedFiles(prev => [...prev, file]);
          setUploadProgress(prev => [...prev, 0]);
          toast.success("Screenshot aus Zwischenablage hinzugefügt");
        }
      }
    }
  };

  // Anhänge hochladen
  const uploadAttachments = async () => {
    if (!task || uploadedFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      
      const attachmentPromises = uploadedFiles.map(async (file, index) => {
        // Eindeutigen Dateinamen erstellen
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${index}.${fileExt}`;
        const filePath = `${task.id}/${fileName}`;

        // Datei zu Supabase Storage hochladen
        const { error: uploadError } = await supabase
          .storage
          .from('dev_task_attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Fehler beim Hochladen:", uploadError);
          return null;
        }

        // Metadaten zur Datei in der Datenbank speichern
        const { error: metaError } = await supabase
          .from('dev_task_attachments')
          .insert({
            task_id: task.id,
            file_name: file.name,
            file_type: file.type,
            size: file.size,
            storage_path: filePath,
            created_by: user?.id
          });

        if (metaError) {
          console.error("Fehler beim Speichern der Metadaten:", metaError);
          return null;
        }

        // Fortschritt aktualisieren
        setUploadProgress(prev => {
          const newProgress = [...prev];
          newProgress[index] = 100;
          return newProgress;
        });

        // Audit-Log für das Hochladen des Anhangs
        await supabase.from("dev_task_audit_logs").insert({
          task_id: task.id,
          user_id: user?.id,
          action: "attachment_added",
          previous_value: null,
          new_value: { file_name: file.name, storage_path: filePath },
        });

        return true;
      });

      await Promise.all(attachmentPromises);
      
      // Aktualisieren der Anhänge-Liste
      await loadTaskDetails();
      
      // Formular zurücksetzen
      setUploadedFiles([]);
      setUploadProgress([]);
      toast.success("Anhänge erfolgreich hochgeladen!");
    } catch (error) {
      console.error("Fehler beim Hochladen der Anhänge:", error);
      toast.error("Fehler beim Hochladen der Anhänge");
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case "critical_bug":
        return { 
          label: "Kritischer Fehler", 
          color: "bg-red-500 text-white", 
          icon: <AlertCircle className="h-4 w-4 mr-1" />
        };
      case "bug":
        return { 
          label: "Bug", 
          color: "bg-orange-500 text-white", 
          icon: <BugIcon className="h-4 w-4 mr-1" />
        };
      case "feature":
        return { 
          label: "Feature", 
          color: "bg-blue-500 text-white", 
          icon: <Sparkles className="h-4 w-4 mr-1" />
        };
      default:
        return { 
          label: category, 
          color: "bg-gray-500 text-white", 
          icon: null
        };
    }
  };
  
  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case "high":
        return { label: "Hoch", color: "bg-red-200 text-red-800" };
      case "medium":
        return { label: "Mittel", color: "bg-yellow-200 text-yellow-800" };
      case "low":
        return { label: "Niedrig", color: "bg-green-200 text-green-800" };
      default:
        return { label: priority, color: "bg-gray-200 text-gray-800" };
    }
  };
  
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "new":
        return { label: "Neu", color: "bg-blue-200 text-blue-800" };
      case "planned":
        return { label: "Eingeplant", color: "bg-purple-200 text-purple-800" };
      case "in_progress":
        return { label: "In Arbeit", color: "bg-amber-200 text-amber-800" };
      case "testing":
        return { label: "Im Test", color: "bg-teal-200 text-teal-800" };
      case "done":
        return { label: "Erledigt", color: "bg-green-200 text-green-800" };
      case "archived":
        return { label: "Archiviert", color: "bg-gray-200 text-gray-800" };
      case "rejected":
        return { label: "Abgelehnt", color: "bg-red-200 text-red-800" };
      default:
        return { label: status, color: "bg-gray-200 text-gray-800" };
    }
  };
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const getActionText = (action: string, previousValue: any, newValue: any) => {
    switch (action) {
      case "created":
        return "hat die Aufgabe erstellt";
      case "status_changed":
        return `hat den Status von "${getStatusInfo(previousValue.status).label}" zu "${getStatusInfo(newValue.status).label}" geändert`;
      case "comment_added":
        return "hat einen Kommentar hinzugefügt";
      case "priority_changed":
        return `hat die Priorität von "${getPriorityInfo(previousValue.priority).label}" zu "${getPriorityInfo(newValue.priority).label}" geändert`;
      case "due_date_changed":
        return `hat den Zieltermin von "${previousValue.due_date ? new Date(previousValue.due_date).toLocaleDateString('de-DE') : 'keinem'}" zu "${newValue.due_date ? new Date(newValue.due_date).toLocaleDateString('de-DE') : 'keinem'}" geändert`;
      case "attachment_added":
        return "hat einen Anhang hinzugefügt";
      case "attachment_deleted":
        return "hat einen Anhang gelöscht";
      case "comment_deleted":
        return "hat einen Kommentar gelöscht";
      default:
        return `hat eine Änderung vorgenommen (${action})`;
    }
  };

  const getUserInitials = (profile: any) => {
    if (!profile) return "?";
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`;
    }
    if (profile.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  const getUserName = (profile: any) => {
    if (!profile) return "Unbekannter Benutzer";
    if (profile["Full Name"]) {
      return profile["Full Name"];
    }
    return profile.email || "Unbekannter Benutzer";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  // Zieltermin-Update Funktion
  const handleDueDateUpdate = async () => {
    if (!task || !dueDateInput) return;
    try {
      setUpdatingDueDate(true);
      const { error } = await supabase
        .from("dev_tasks")
        .update({ due_date: dueDateInput, updated_at: new Date().toISOString() })
        .eq("id", task.id);
      if (error) throw error;
      // Audit-Log
      await supabase.from("dev_task_audit_logs").insert({
        task_id: task.id,
        user_id: user?.id,
        action: "due_date_changed",
        previous_value: { due_date: task.due_date },
        new_value: { due_date: dueDateInput },
      });
      setEditingDueDate(false);
      setDueDateInput("");
      await loadTaskDetails();
      toast.success("Zieltermin aktualisiert");
    } catch (e) {
      toast.error("Fehler beim Aktualisieren des Zieltermins");
    } finally {
      setUpdatingDueDate(false);
    }
  };

  // Funktion zum Löschen eines Anhangs (mit Audit-Log)
  const handleDeleteAttachment = async (attachment: DevTaskAttachment) => {
    setDeletingAttachmentId(attachment.id);
    try {
      // 1. Datei aus Storage löschen
      const { error: storageError } = await supabase
        .storage
        .from('dev_task_attachments')
        .remove([attachment.storage_path]);
      if (storageError) throw storageError;
      // 2. Eintrag aus DB löschen
      const { error: dbError } = await supabase
        .from('dev_task_attachments')
        .delete()
        .eq('id', attachment.id);
      if (dbError) throw dbError;
      // 3. Audit-Log
      await supabase.from("dev_task_audit_logs").insert({
        task_id: attachment.task_id,
        user_id: user?.id,
        action: "attachment_deleted",
        previous_value: { file_name: attachment.file_name, storage_path: attachment.storage_path },
        new_value: null,
      });
      toast.success("Anhang gelöscht");
      await loadTaskDetails();
    } catch (e) {
      toast.error("Fehler beim Löschen des Anhangs");
    } finally {
      setDeletingAttachmentId(null);
      setConfirmDeleteAttachment(null);
    }
  };

  // Funktion zum Löschen eines Kommentars (mit Audit-Log)
  const handleDeleteComment = async (comment: DevTaskComment) => {
    setDeletingCommentId(comment.id);
    try {
      const { error } = await supabase
        .from('dev_task_comments')
        .delete()
        .eq('id', comment.id);
      if (error) throw error;
      // Audit-Log
      await supabase.from("dev_task_audit_logs").insert({
        task_id: comment.task_id,
        user_id: user?.id,
        action: "comment_deleted",
        previous_value: { comment_id: comment.id, content: comment.content },
        new_value: null,
      });
      toast.success("Kommentar gelöscht");
      await loadTaskDetails();
    } catch (e) {
      toast.error("Fehler beim Löschen des Kommentars");
    } finally {
      setDeletingCommentId(null);
      setConfirmDeleteComment(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto"
        aria-describedby="task-detail-description"
      >
        <DialogTitle className="sr-only">{task?.title || "Aufgabendetails"}</DialogTitle>
        <DialogDescription id="task-detail-description" className="sr-only">
          Details der Aufgabe mit Kommentaren, Anhängen und Aktivitätsprotokoll
        </DialogDescription>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : task ? (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{task.title}</h2>
                <div className="flex space-x-2">
                  {task.category && (
                    <Badge className={getCategoryInfo(task.category).color}>
                      <span className="flex items-center">
                        {getCategoryInfo(task.category).icon}
                        {getCategoryInfo(task.category).label}
                      </span>
                    </Badge>
                  )}
                  {task.priority && (
                    <Badge className={getPriorityInfo(task.priority).color}>
                      {getPriorityInfo(task.priority).label}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center">
                  <UserCircle className="h-4 w-4 mr-1" />
                  <span>Erstellt von {createdByUser ? getUserName(createdByUser) : "Unbekannt"}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatDateTime(task.created_at)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <Badge className={getStatusInfo(task.status).color}>
                  {getStatusInfo(task.status).label}
                </Badge>
                
                {task.due_date && (
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                    {editingDueDate ? (
                      <>
                        <input
                          type="date"
                          value={dueDateInput || task.due_date?.slice(0, 10) || ""}
                          onChange={e => setDueDateInput(e.target.value)}
                          className="border rounded px-2 py-1 text-sm mr-2"
                          disabled={updatingDueDate}
                        />
                        <Button size="sm" onClick={handleDueDateUpdate} disabled={updatingDueDate}>
                          {updatingDueDate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingDueDate(false)} disabled={updatingDueDate}>
                          Abbrechen
                        </Button>
                      </>
                    ) : (
                      <>
                        <span>Zieltermin: {new Date(task.due_date).toLocaleDateString('de-DE')}</span>
                        <Button size="icon" variant="ghost" className="ml-1" onClick={() => { setEditingDueDate(true); setDueDateInput(task.due_date?.slice(0, 10) || ""); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {task.description && (
                <div className="mt-2 text-sm">
                  <p className="whitespace-pre-line">{task.description}</p>
                </div>
              )}
            </DialogHeader>
            
            <Separator />
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="comments">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Kommentare ({comments.length})
                </TabsTrigger>
                <TabsTrigger value="attachments">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Anhänge ({attachments.length})
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Clock className="h-4 w-4 mr-2" />
                  Aktivität
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="comments" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getUserInitials(comment.profile)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{getUserName(comment.profile)}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(comment.created_at)}
                          </span>
                          {/* Nur eigene Kommentare oder Admins dürfen löschen (hier: user.id === comment.created_by) */}
                          {user && comment.created_by === user.id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setConfirmDeleteComment(comment)}
                              disabled={deletingCommentId === comment.id}
                              title="Kommentar löschen"
                            >
                              {deletingCommentId === comment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-line">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {comments.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p>Noch keine Kommentare</p>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 items-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user ? user.email?.substring(0, 2).toUpperCase() : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Schreibe einen Kommentar... (Strg+Enter zum Senden)"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="resize-none min-h-[80px]"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        Strg+Enter zum Senden
                      </span>
                      <Button 
                        size="sm" 
                        onClick={handleAddComment}
                        disabled={submittingComment || !newComment.trim()}
                      >
                        {submittingComment ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Senden
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="attachments" onPaste={handlePaste}>
                {/* Anhänge */}
                <div className="space-y-3">
                  {/* Upload-Bereich */}
                  <div className="border rounded-md p-4 mb-4">
                    <div className="flex flex-col space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        multiple
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Dateien auswählen
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Oder füge einen Screenshot aus der Zwischenablage mit Strg+V / Cmd+V ein
                      </p>
                      
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                              <div className="flex items-center">
                                <ImageIcon className="h-4 w-4 mr-2" />
                                <span className="text-sm truncate max-w-[200px]">
                                  {file.name}
                                </span>
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeFile(index)}
                                disabled={isUploading}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          
                          <Button 
                            type="button"
                            onClick={uploadAttachments}
                            disabled={isUploading || uploadedFiles.length === 0}
                            className="mt-2"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Wird hochgeladen...
                              </>
                            ) : (
                              <>Hochladen</>  
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Liste vorhandener Anhänge */}
                  <h3 className="text-sm font-medium mb-2">Vorhandene Anhänge</h3>
                  {attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachments.map((attachment) => {
                        const { data: urlData } = supabase
                          .storage
                          .from('dev_task_attachments')
                          .getPublicUrl(attachment.storage_path);
                        const isImage = attachment.file_type.startsWith('image/');
                        return (
                          <div key={attachment.id} className="flex items-center space-x-2">
                            <button
                              type="button"
                              className="border rounded-md p-3 flex items-center space-x-3 hover:bg-muted/50 transition-colors w-full text-left"
                              onClick={() => {
                                setPreviewUrl(urlData.publicUrl);
                                setPreviewType(attachment.file_type);
                              }}
                            >
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {(attachment.size / 1024).toFixed(1)} KB •
                                  {new Date(attachment.created_at).toLocaleDateString('de-DE')}
                                </p>
                              </div>
                            </button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setConfirmDeleteAttachment(attachment)}
                              disabled={deletingAttachmentId === attachment.id}
                              title="Anhang löschen"
                            >
                              {deletingAttachmentId === attachment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p>Keine Anhänge vorhanden</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-2 mt-4">
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex space-x-3 p-2 hover:bg-muted/30 rounded-md">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{getUserInitials(log.profile)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-sm font-medium">{getUserName(log.profile)}</span>
                            <span className="text-sm ml-2">
                              {getActionText(log.action, log.previous_value, log.new_value)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {auditLogs.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p>Keine Aktivitäten protokolliert</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>Aufgabe konnte nicht geladen werden</p>
          </div>
        )}
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Dateivorschau</DialogTitle>
            </DialogHeader>
            {previewType && previewType.startsWith('image/') ? (
              <img src={previewUrl} alt="Vorschau" className="max-w-full max-h-[60vh] mx-auto" />
            ) : (
              <div className="text-center">
                <p>Keine Bildvorschau möglich.</p>
                <a href={previewUrl} download className="underline text-blue-600">Herunterladen</a>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewUrl(null)}>Schließen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Modal für Anhang-Lösch-Bestätigung */}
      {confirmDeleteAttachment && (
        <Dialog open={!!confirmDeleteAttachment} onOpenChange={() => setConfirmDeleteAttachment(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Anhang löschen</DialogTitle>
            </DialogHeader>
            <p>Möchtest du den Anhang <b>{confirmDeleteAttachment.file_name}</b> wirklich löschen?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteAttachment(null)} disabled={deletingAttachmentId === confirmDeleteAttachment.id}>Abbrechen</Button>
              <Button variant="destructive" onClick={() => handleDeleteAttachment(confirmDeleteAttachment)} disabled={deletingAttachmentId === confirmDeleteAttachment.id}>
                {deletingAttachmentId === confirmDeleteAttachment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Löschen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Modal für Kommentar-Lösch-Bestätigung */}
      {confirmDeleteComment && (
        <Dialog open={!!confirmDeleteComment} onOpenChange={() => setConfirmDeleteComment(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Kommentar löschen</DialogTitle>
            </DialogHeader>
            <p>Möchtest du diesen Kommentar wirklich löschen?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteComment(null)} disabled={deletingCommentId === confirmDeleteComment.id}>Abbrechen</Button>
              <Button variant="destructive" onClick={() => handleDeleteComment(confirmDeleteComment)} disabled={deletingCommentId === confirmDeleteComment.id}>
                {deletingCommentId === confirmDeleteComment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Löschen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
