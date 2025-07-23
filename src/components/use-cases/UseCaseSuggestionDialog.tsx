import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface SuggestedUseCase {
  id: string;
  title: string;
  type?: string; // e.g., information_request, direct_use_case
  information_needed?: string | null;
  // Fields for the recommended use case
  confidence?: number | null;
  reasoning?: string | null;
}

interface UseCaseSuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recommendedUseCase: SuggestedUseCase | null;
  alternativeUseCases: SuggestedUseCase[];
  onSelectUseCase: (useCaseId: string) => void;
  onRejectAll: () => void;
  taskDescription: string;
  showLowConfidenceMessage?: boolean; // New prop for low confidence scenario
}

const CONFIDENCE_THRESHOLD = 70;

export const UseCaseSuggestionDialog: React.FC<UseCaseSuggestionDialogProps> = ({
  isOpen,
  onClose,
  recommendedUseCase,
  alternativeUseCases,
  onSelectUseCase,
  onRejectAll,
  taskDescription,
  showLowConfidenceMessage,
}) => {
  if (!isOpen) return null;

  const hasHighConfidenceRecommendation = recommendedUseCase?.confidence !== null && recommendedUseCase?.confidence !== undefined && recommendedUseCase.confidence >= CONFIDENCE_THRESHOLD;
  const hasAnyRecommendation = recommendedUseCase !== null;
  const hasAlternatives = alternativeUseCases.length > 0;

  // Determine Dialog Title and Description based on props and data
  let dialogTitle = "Use Case Vorschläge";
  let dialogDescriptionContent = `Basierend auf Ihrer Beschreibung "<em>${taskDescription.substring(0, 100)}${taskDescription.length > 100 ? '...' : ''}</em>". Bitte wählen Sie den passendsten aus oder lehnen Sie alle ab.`;
  let showTopRejectButton = false;

  if (showLowConfidenceMessage) {
    dialogTitle = "Kein eindeutiger Use Case gefunden";
    if (hasAnyRecommendation || hasAlternatives) {
      dialogDescriptionContent = `Basierend auf Ihrer Beschreibung "<em>${taskDescription.substring(0, 100)}${taskDescription.length > 100 ? '...' : ''}</em>" konnten wir keinen eindeutig passenden Prozess identifizieren. Hier sind einige Vorschläge, die dennoch relevant sein könnten.`;
    } else {
      // This case should ideally be handled before opening the dialog (e.g. in CreateTask.tsx)
      // but as a fallback:
      dialogDescriptionContent = `Basierend auf Ihrer Beschreibung "<em>${taskDescription.substring(0, 100)}${taskDescription.length > 100 ? '...' : ''}</em>" wurden keine passenden Use Cases gefunden.`;
      showTopRejectButton = true; // Allow direct rejection if nothing is shown
    }
  } else if (!hasHighConfidenceRecommendation && (hasAnyRecommendation || hasAlternatives)) {
    // Fallback if showLowConfidenceMessage is not set, but it's a low confidence scenario by data
    dialogTitle = "Kein eindeutiger Use Case gefunden";
    dialogDescriptionContent = `Basierend auf Ihrer Beschreibung "<em>${taskDescription.substring(0, 100)}${taskDescription.length > 100 ? '...' : ''}</em>". Wir schlagen vor, ohne spezifischen Use Case fortzufahren, oder einen der folgenden, weniger wahrscheinlichen Vorschläge zu prüfen.`;
    showTopRejectButton = true;
  } else if (!hasAnyRecommendation && !hasAlternatives) {
    // Fallback: No recommendations, no alternatives (dialog should ideally not open)
    dialogTitle = "Keine Use Cases gefunden";
    dialogDescriptionContent = `Basierend auf Ihrer Beschreibung "<em>${taskDescription.substring(0, 100)}${taskDescription.length > 100 ? '...' : ''}</em>" wurden keine Use Cases gefunden.`;
    showTopRejectButton = true;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription dangerouslySetInnerHTML={{ __html: dialogDescriptionContent }} />
        </DialogHeader>

        {/* Case: Top button for rejecting all if it's a low confidence scenario without a clear primary path */}
        {showTopRejectButton && (!hasAnyRecommendation && !hasAlternatives) && (
          <div className="space-y-4 py-4">
            <Button onClick={onRejectAll} variant="default" className="w-full">
              Ohne spezifischen Use Case fortfahren
            </Button>
          </div>
        )}
        {/* Header for suggestions if low confidence and suggestions exist */}
        {(showLowConfidenceMessage || (!hasHighConfidenceRecommendation && showTopRejectButton)) && (hasAnyRecommendation || hasAlternatives) && !showTopRejectButton && (
           <h3 className="text-lg font-semibold mb-2 mt-4 pt-4 border-t">Vorschläge (ggf. geringe Übereinstimmung):</h3>
        )}

        <div className={`space-y-4 py-2 ${!hasHighConfidenceRecommendation ? 'max-h-[40vh]' : 'max-h-[60vh]'} overflow-y-auto`}>
          {/* Recommended Use Case - Show if it exists */}
          {recommendedUseCase && (
            <Card className={hasHighConfidenceRecommendation ? "border-primary border-2" : "border-dashed"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{recommendedUseCase.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={(hasHighConfidenceRecommendation && !showLowConfidenceMessage) ? "default" : "secondary"}>
                      {(hasHighConfidenceRecommendation && !showLowConfidenceMessage) ? "Empfehlung" : "Vorschlag"}
                    </Badge>
                    {recommendedUseCase.confidence !== null && recommendedUseCase.confidence !== undefined && (
                      <Badge 
                        variant="outline"
                        className={`${
                          recommendedUseCase.confidence > 90 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }`}
                      >
                        {recommendedUseCase.confidence}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button onClick={() => onSelectUseCase(recommendedUseCase.id)} className="w-full mt-4" variant={(hasHighConfidenceRecommendation && !showLowConfidenceMessage) ? "default" : "outline"}>
                  Diesen Use Case auswählen
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Alternative Use Cases */}
          {alternativeUseCases.length > 0 && (
            <div>
              {/* Title for alternatives, shown if there was a high-confidence recommendation OR if it's a low-confidence scenario and there was no recommended one shown above this section */}
              {((hasHighConfidenceRecommendation && !showLowConfidenceMessage) || (showLowConfidenceMessage && !recommendedUseCase)) && (
                 <h3 className="text-lg font-semibold mb-2 mt-6">Alternative Vorschläge</h3>
              )}
              {alternativeUseCases.map((uc) => (
                <Card key={uc.id} className={`mb-3 ${!hasHighConfidenceRecommendation ? 'border-dashed' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{uc.title}</CardTitle>
                      {uc.confidence !== null && uc.confidence !== undefined && (
                        <Badge 
                          variant="outline"
                          className={`${
                            uc.confidence > 90 
                              ? 'bg-green-100 text-green-800 border-green-300' 
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}
                        >
                          {uc.confidence}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => onSelectUseCase(uc.id)} 
                      variant="outline" 
                      className="w-full mt-4">
                      Diesen Use Case auswählen
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No suggestions at all */} 
          {!hasAnyRecommendation && alternativeUseCases.length === 0 && (
             <p className="text-center text-muted-foreground py-4">Keine spezifischen Use Cases gefunden.</p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={onClose} variant="ghost">Abbrechen</Button>
          {/* Show "Keiner Passt" if there are any suggestions shown (recommended or alternatives) */}
          {(hasAnyRecommendation || hasAlternatives) && (
            <Button onClick={onRejectAll} variant="destructive">
              Keiner dieser Vorschläge passt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
