import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DevTaskFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onTaskCreated: () => void;
}

export function DevTaskForm({ isOpen, setIsOpen, onTaskCreated }: DevTaskFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("feature");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Für Datei-Uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Bitte gib einen Titel ein");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Aufgabe in dev_tasks erstellen
      const { data: task, error: taskError } = await supabase
        .from("dev_tasks")
        .insert({
          title,
          description,
          category,
          priority,
          due_date: dueDate || null,
          status: "new",
          created_by: user?.id,
        })
        .select()
        .single();

      if (taskError) {
        throw taskError;
      }

      // Audit-Log für das Anlegen der Aufgabe
      await supabase.from("dev_task_audit_logs").insert({
        task_id: task.id,
        user_id: user?.id,
        action: "created",
        previous_value: null,
        new_value: {
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          due_date: task.due_date
        }
      });

      // 2. Dateien hochladen, wenn vorhanden
      if (uploadedFiles.length > 0 && task) {
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

          // URL der hochgeladenen Datei ermitteln
          const { data: urlData } = supabase
            .storage
            .from('dev_task_attachments')
            .getPublicUrl(filePath);

          // Metadaten zur Datei in der Datenbank speichern
          const { error: metaError } = await supabase
            .from('Development Task Attachments')
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

          return true;
        });

        await Promise.all(attachmentPromises);
        setIsUploading(false);
      }

      // Erfolgsmeldung und Formular zurücksetzen
      toast.success("Aufgabe erfolgreich erstellt!");
      resetForm();
      onTaskCreated();
      setIsOpen(false);
      
    } catch (error) {
      console.error("Fehler beim Erstellen der Aufgabe:", error);
      toast.error("Fehler beim Erstellen der Aufgabe");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("feature");
    setPriority("medium");
    setDueDate("");
    setUploadedFiles([]);
    setUploadProgress([]);
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>Neue Entwicklungsaufgabe erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input 
              id="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Aufgabentitel eingeben"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung der Aufgabe"
              rows={4}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical_bug">Kritischer Fehler</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priorität</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priorität wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="low">Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="due-date">Zieltermin (optional)</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Anhänge</Label>
            <div className="border rounded-md p-4">
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
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting || isUploading}
            >
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isUploading}
            >
              {(isSubmitting || isUploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Aufgabe erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
