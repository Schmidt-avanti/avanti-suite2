
import React from "react";
import { FileText, Book, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface KnowledgeListProps {
  items?: any[];
  type: "articles" | "cases";
  onItemClick: (id: string) => void;
}

const getCardColors = (type: "articles" | "cases") => {
  if (type === "articles") {
    return {
      iconBg: "bg-avanti-100 text-avanti-700",
      label: "Wissensartikel",
      labelBg: "bg-blue-100 text-blue-700",
      icon: <FileText className="w-5 h-5" />,
    };
  } else {
    return {
      iconBg: "bg-purple-100 text-purple-700",
      label: "Use Case",
      labelBg: "bg-purple-100 text-purple-700",
      icon: <Book className="w-5 h-5" />,
    };
  }
};

function getExcerpt(content: string) {
  // Max 93 Zeichen, aber nur Textauszug (kürzt HTML-Inhalte auf Klartext)
  const plain = content?.replace(/(<([^>]+)>)/gi, "").replace(/\s+/g, " ").trim();
  if (!plain) return "";
  return plain.length > 93 ? plain.slice(0, 93).trim() + " …" : plain;
}

const KnowledgeList: React.FC<KnowledgeListProps> = ({
  items = [],
  type,
  onItemClick,
}) => {
  if (!items.length) {
    return (
      <div className="text-center py-14 text-muted-foreground text-base">
        Keine Einträge gefunden
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
      {items.map((item) => {
        const colors = getCardColors(type);
        const contentExcerpt = "content" in item ? getExcerpt(item.content) : (item.information_needed ? getExcerpt(item.information_needed) : "");
        return (
          <button
            key={item.id}
            type="button"
            tabIndex={0}
            className={`group relative flex flex-col items-stretch text-left bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/60`}
            onClick={() => onItemClick(item.id)}
          >
            <div className="flex flex-row items-center justify-between pt-4 px-5 pb-1">
              <div className={`flex-shrink-0 rounded-lg p-2 ${colors.iconBg}`}>
                {colors.icon}
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${colors.labelBg} select-none`}
              >
                {colors.label}
              </span>
            </div>
            <div className="flex-1 flex flex-col px-5 py-2">
              <h3 className="font-semibold text-lg text-[#100a29] mb-1 leading-snug line-clamp-2">{item.title}</h3>
              {contentExcerpt && (
                <div className="text-base text-gray-600 mb-1 line-clamp-2">{contentExcerpt}</div>
              )}
            </div>
            <div className="flex items-center justify-between px-5 pb-4 pt-1">
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(item.created_at), {
                  addSuffix: true,
                  locale: de,
                })}
              </span>
              <span
                className="inline-flex items-center justify-center rounded-full transition-colors group-hover:bg-avanti-100 h-7 w-7"
              >
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-avanti-700" />
              </span>
            </div>
            <span className="absolute inset-0 rounded-xl ring-primary/40 ring-0 focus-visible:ring-2 transition" aria-hidden="true"></span>
          </button>
        );
      })}
    </div>
  );
};

export default KnowledgeList;
