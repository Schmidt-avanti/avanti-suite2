
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
        <DialogHeader className="flex flex-row items-center justify-between bg-blue-50 p-5 pb-3 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="text-blue-900 h-5 w-5" />
            <DialogTitle className="text-lg font-semibold text-blue-900">{article?.title}</DialogTitle>
          </div>
          <DialogClose asChild>
            <button className="rounded-full p-1 hover:bg-blue-100 transition">
              <X className="w-5 h-5 text-blue-900" />
              <span className="sr-only">Schließen</span>
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="overflow-y-auto p-6 bg-white min-h-[200px] max-h-[70vh]">
          <div
            className="prose prose-blue max-w-none"
            style={{ fontFamily: 'Georgia, Times, "Times New Roman", serif', fontSize: '15px', lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: article?.content || "" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
