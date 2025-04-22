
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KnowledgeArticlePreviewProps {
  content: string;
  loading?: boolean;
}

const KnowledgeArticlePreview = ({ content, loading }: KnowledgeArticlePreviewProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vorschau</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          {content.split('\n').map((paragraph, index) => (
            paragraph.trim() && (
              <p key={index} className="mb-4 text-gray-700">
                {paragraph}
              </p>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default KnowledgeArticlePreview;
