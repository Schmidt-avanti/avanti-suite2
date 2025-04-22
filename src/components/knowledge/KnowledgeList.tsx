
import React from 'react';
import { FileText, Book, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface KnowledgeListProps {
  items?: any[];
  type: 'articles' | 'cases';
  onItemClick: (id: string) => void;
}

const KnowledgeList: React.FC<KnowledgeListProps> = ({ items = [], type, onItemClick }) => {
  if (!items.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Keine Einträge gefunden
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Button
          key={item.id}
          variant="outline"
          className="w-full justify-between hover:bg-muted/50"
          onClick={() => onItemClick(item.id)}
        >
          <div className="flex items-center gap-3">
            {type === 'articles' ? (
              <FileText className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Book className="h-4 w-4 text-muted-foreground" />
            )}
            <span>{item.title}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="text-sm">
              {formatDistanceToNow(new Date(item.created_at), { 
                addSuffix: true,
                locale: de 
              })}
            </span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </Button>
      ))}
    </div>
  );
};

export default KnowledgeList;
