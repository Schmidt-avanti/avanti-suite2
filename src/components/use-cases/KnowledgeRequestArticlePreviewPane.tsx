import React from "react";
import KnowledgeArticlePreview from "@/components/knowledge-articles/KnowledgeArticlePreview";

interface KnowledgeRequestArticlePreviewPaneProps {
  articleHtml: string;
  loading?: boolean;
  reviewNotice?: string;
}

/**
 * Zeigt einen generierten Wissensartikel im Zwei-Spalten-Layout mit optionalem Review-Hinweis.
 */
const KnowledgeRequestArticlePreviewPane: React.FC<KnowledgeRequestArticlePreviewPaneProps> = ({
  articleHtml,
  loading = false,
  reviewNotice = "Bitte prüfe den generierten Wissensartikel sorgfältig und ergänze bei Bedarf individuelle Besonderheiten.\n\nDer Artikel basiert auf typischen gesetzlichen und branchenspezifischen Vorgaben."
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      {/* Linke Spalte: Hauptinhalt */}
      <div className="lg:w-1/2 w-full">
        <KnowledgeArticlePreview content={articleHtml} loading={loading} />
      </div>
      {/* Rechte Spalte: Review Hinweis */}
      <div className="lg:w-1/2 w-full flex flex-col items-start justify-start">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg shadow mb-4">
          <div className="font-semibold text-yellow-800 mb-2">Hinweis für dich</div>
          <div className="text-sm text-yellow-700 whitespace-pre-line">{reviewNotice}</div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeRequestArticlePreviewPane;
