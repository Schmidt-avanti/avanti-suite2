
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { X, BookOpen } from "lucide-react";

interface KnowledgeArticleModalProps {
  open: boolean;
  onClose: () => void;
  article: {
    title: string;
    content: string;
  } | null;
}

export function KnowledgeArticleModal({ open, onClose, article }: KnowledgeArticleModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-xl w-full rounded-2xl p-0 overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* Violetter Modal-Header */}
        <DialogHeader className="flex flex-row items-center justify-between bg-[#e6e4f2] p-5 pb-3 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="text-[#100a29]" />
            <DialogTitle className="text-lg font-semibold text-[#100a29]">{article?.title}</DialogTitle>
          </div>
          <DialogClose asChild>
            <button className="rounded-full p-1 hover:bg-muted transition">
              <X className="w-5 h-5 text-[#100a29]" />
              <span className="sr-only">Schließen</span>
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="overflow-y-auto p-6 bg-white min-h-[200px]">
          <div
            className="prose prose-sm font-serif max-w-none"
            style={{
              fontFamily: 'Georgia, Times, "Times New Roman", serif',
              fontSize: '15px',
              color: '#232142'
            }}
            dangerouslySetInnerHTML={{ __html: article?.content || "" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
