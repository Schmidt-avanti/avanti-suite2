import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, X } from 'lucide-react';

interface KnowledgeArticlePreviewProps {
  content: string;
  onSave: (newContent: string) => void;
}

export const KnowledgeArticlePreview: React.FC<KnowledgeArticlePreviewProps> = ({ content, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (!isEditing) {
      setEditContent(content);
    }
  }, [content, isEditing]);

  const handleSave = () => {
    onSave(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setEditContent(content);
    setIsEditing(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Wissensartikel</CardTitle>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleStartEditing} disabled={!content.trim()}>
                Bearbeiten
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[600px] font-mono text-sm resize-y"
            placeholder="Markdown-Inhalt hier bearbeiten..."
          />
          <div className="text-xs text-muted-foreground mt-2">
            <span className="font-semibold">Formatierung:</span> `# H1` | `## H2` | `**fett**` | `*kursiv*` | `- Liste` | `[Link](url)`
          </div>
        </>
        ) : (
          !content.trim() ? (
            <div className="text-center text-muted-foreground py-12">
              <p>Noch kein Artikel erstellt.</p>
              <p className="text-sm mt-2">Verwenden Sie den Chat, um einen Artikel zu generieren.</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none overflow-y-auto max-h-[70vh]">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};
