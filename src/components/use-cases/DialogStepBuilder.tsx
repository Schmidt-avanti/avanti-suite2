import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MessageSquare, 
  Edit3, 
  Mail, 
  CheckCircle, 
  Trash2, 
  ArrowDown,
  AlertCircle
} from 'lucide-react';

interface DialogStep {
  id: string;
  type: 'question' | 'input' | 'routing' | 'final';
  content: string;
  options?: string[];
  next_step?: string;
  user_input?: string; // For routing steps with user input
}

interface RoutingInfo {
  recipient?: string;
  email?: string;
  cc?: string;
  requiresRouting?: boolean;
}

interface DialogStepBuilderProps {
  steps: DialogStep[];
  routingInfo: RoutingInfo;
  onEditStep: (stepId: string) => void;
  onDeleteStep: (stepId: string) => void;
  onSave: () => void;
  onUpdateRoutingInfo: (info: RoutingInfo) => void;
  canSave: boolean;
}

export const DialogStepBuilder: React.FC<DialogStepBuilderProps> = ({
  steps,
  routingInfo,
  onEditStep,
  onDeleteStep,
  onSave,
  onUpdateRoutingInfo,
  canSave
}) => {
  const [showCcField, setShowCcField] = React.useState(!!routingInfo.cc);
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'question': return <MessageSquare className="h-4 w-4" />;
      case 'input': return <Edit3 className="h-4 w-4" />;
      case 'routing': return <Mail className="h-4 w-4" />;
      case 'final': return <CheckCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStepTypeLabel = (type: string) => {
    switch (type) {
      case 'question': return 'Frage';
      case 'input': return 'Eingabe';
      case 'routing': return 'Weiterleitung';
      case 'final': return 'Abschluss';
      default: return type;
    }
  };

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'question': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'input': return 'bg-green-100 text-green-800 border-green-200';
      case 'routing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'final': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isRoutingComplete = () => {
    // Wenn keine Weiterleitung erforderlich ist, ist Routing "komplett"
    if (routingInfo.requiresRouting === false) {
      return true;
    }
    // Wenn Weiterleitung erforderlich ist, müssen beide Felder ausgefüllt sein
    return routingInfo.recipient && routingInfo.email;
  };

  const getValidationWarnings = () => {
    const warnings = [];
    
    // Nur Warnungen zeigen, wenn bereits Dialog-Schritte vorhanden sind
    if (steps.length === 0) {
      return []; // Keine Warnungen bei leerem Dialog
    }
    
    // Routing-Warnung nur zeigen, wenn Weiterleitung erforderlich ist
    if (routingInfo.requiresRouting !== false && !isRoutingComplete()) {
      warnings.push('Routing-Informationen fehlen (Empfänger + E-Mail)');
    }
    
    const hasQuestions = steps.some(step => step.type === 'question' || step.type === 'input');
    if (!hasQuestions) {
      warnings.push('Keine Fragen oder Eingabefelder im Dialog');
    }
    
    return warnings;
  };

  const warnings = getValidationWarnings();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dialog-Schritte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Noch keine Schritte hinzugefügt</p>
              <p className="text-sm">Akzeptiere KI-Vorschläge oder füge manuell hinzu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id}>
                  <Card className="border-l-4 border-l-gray-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStepIcon(step.type)}
                            <Badge 
                              variant="outline" 
                              className={getStepTypeColor(step.type)}
                            >
                              {getStepTypeLabel(step.type)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Schritt {index + 1}
                            </span>
                          </div>
                          
                          <h3 className="font-medium text-gray-900 mb-1">
                            {step.content}
                          </h3>
                          
                          {step.options && step.options.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 mb-1">Optionen:</p>
                              <div className="flex flex-wrap gap-1">
                                {step.options.map((option, optIndex) => (
                                  <span
                                    key={optIndex}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                  >
                                    {option}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {step.user_input && (
                            <div className="mt-2 p-2 bg-green-50 rounded border-l-2 border-green-200">
                              <p className="text-xs text-green-700 font-medium">Eingabe:</p>
                              <p className="text-sm text-green-800">{step.user_input}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-1 ml-4">
                          <Button
                            onClick={() => onEditStep(step.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => onDeleteStep(step.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Routing Information Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Routing-Informationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Direct Routing Input Fields */}
            <div className="space-y-3">
              <div>
                <label htmlFor="recipient" className="text-sm font-medium text-gray-700 block mb-1">
                  Empfänger (Person/Abteilung):
                </label>
                <input
                  id="recipient"
                  type="text"
                  value={routingInfo.recipient || ''}
                  onChange={(e) => onUpdateRoutingInfo({
                    ...routingInfo,
                    recipient: e.target.value || undefined
                  })}
                  placeholder="z.B. Hausverwaltung, Herr Schmidt, Support-Team..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-1">
                  E-Mail-Adresse(n):
                </label>
                <input
                  id="email"
                  type="text"
                  value={routingInfo.email || ''}
                  onChange={(e) => onUpdateRoutingInfo({
                    ...routingInfo,
                    email: e.target.value || undefined
                  })}
                  placeholder="empfaenger@firma.de, weitere@firma.de"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              {/* CC Field Toggle and Input */}
              {!showCcField ? (
                <button
                  type="button"
                  onClick={() => setShowCcField(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  + CC hinzufügen
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="cc" className="text-sm font-medium text-gray-700">
                      CC (optional):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCcField(false);
                        onUpdateRoutingInfo({
                          ...routingInfo,
                          cc: undefined
                        });
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Entfernen
                    </button>
                  </div>
                  <input
                    id="cc"
                    type="text"
                    value={routingInfo.cc || ''}
                    onChange={(e) => onUpdateRoutingInfo({
                      ...routingInfo,
                      cc: e.target.value || undefined
                    })}
                    placeholder="cc@firma.de, weitere-cc@firma.de"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* No Routing Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="no-routing"
                checked={routingInfo.requiresRouting === false}
                onCheckedChange={(checked) => {
                  onUpdateRoutingInfo({
                    ...routingInfo,
                    requiresRouting: checked ? false : true,
                    // Clear routing info when selecting no routing
                    ...(checked ? { recipient: undefined, email: undefined } : {})
                  });
                }}
              />
              <label
                htmlFor="no-routing"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Keine Weiterleitung - Dialog wird direkt von Avanti beantwortet
              </label>
            </div>
            
            {/* Status Indicator */}
            {routingInfo.requiresRouting === false ? (
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Keine Weiterleitung - Dialog wird direkt beantwortet
              </div>
            ) : isRoutingComplete() ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Routing vollständig
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                Empfänger und E-Mail-Adresse eingeben oder "Keine Weiterleitung" wählen
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {warnings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-800 mb-2">
                  Hinweise vor dem Speichern:
                </h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={onSave} 
          disabled={!canSave}
          size="lg"
          className="min-w-[120px]"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Use Case speichern
        </Button>
      </div>
    </div>
  );
};
