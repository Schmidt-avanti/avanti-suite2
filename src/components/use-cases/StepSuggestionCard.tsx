import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Edit, Plus, Lightbulb, AlertCircle, HelpCircle } from 'lucide-react';

interface StructuredField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'date_range' | 'number' | 'textarea' | 'select' | 'multi_select';
  required: boolean;
  placeholder?: string;
  options?: string[]; // für select und multi_select Felder
}

interface ConditionalBranch {
  condition: string;
  condition_value: string;
  condition_label: string;
  steps: any[]; // DialogStep array
}

// Neue Interfaces für Rule-Based Branching
interface BranchCondition {
  field: string;    // "Schadensart"
  operator: 'equals' | 'contains' | 'not_equals' | 'in' | 'not_in';
  value: string | string[];    // "Wasserschaden" oder ["Wasserschaden", "Elektrik"]
  label?: string;   // Benutzerfreundliche Anzeige
}

// Temporäre DialogStep Definition (wird später durch echte ersetzt)
interface DialogStep {
  id: string;
  type: string;
  content: string;
  [key: string]: any;
}

interface BranchRule {
  id: string;
  name: string;     // "Wasserschaden + Notfall"
  description?: string;
  conditions: BranchCondition[];
  actions: DialogStep[];
  priority: number; // Für Konfliktauflösung
  active: boolean;
}

interface RuleBranching {
  type: 'rule_based';
  available_fields: BranchField[];  // Welche Felder können als Bedingungen verwendet werden?
  rules: BranchRule[];
  default_actions?: DialogStep[];   // Fallback wenn keine Regel greift
}

interface BranchField {
  name: string;     // "schadensart"
  label: string;    // "Schadensart"
  type: 'select' | 'text' | 'boolean' | 'number';
  options?: string[]; // Für select fields
}

interface StepSuggestion {
  step_suggestion: string;
  reasoning: string;
  step_type: 'question' | 'input' | 'routing' | 'final' | 'knowledge' | 'complexity_check' | 'clarification' | 'conditional' | 'rule_based';
  options?: string[];
  fields?: StructuredField[];
  knowledge_content?: string;
  
  // Legacy conditional branching (wird durch rule_based ersetzt)
  branches?: ConditionalBranch[];
  condition_question?: string;
  
  // Neue rule-based branching Felder
  rule_branching?: RuleBranching;
  
  // Andere Felder
  complexity_question?: string;
  clarification_question?: string;
  is_complete?: boolean;
}

interface StepSuggestionCardProps {
  suggestion: StepSuggestion;
  onAccept: (inputValue?: string) => void;
  onModify: () => void;
  onAddManual: () => void;
  loading?: boolean;
}

export const StepSuggestionCard: React.FC<StepSuggestionCardProps> = ({
  suggestion,
  onAccept,
  onModify,
  onAddManual,
  loading = false
}) => {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const getStepTypeLabel = (type: string) => {
    switch (type) {
      case 'question': return 'Frage';
      case 'knowledge': return 'Wissen';
      case 'input': return 'Eingabefeld';
      case 'routing': return 'Weiterleitung';
      case 'final': return 'Abschluss';
      case 'conditional': return 'Verzweigung';
      case 'rule_based': return 'Regel-Verzweigung';
      default: return type;
    }
  };

  const getStepTypeBadgeColor = () => {
    switch (suggestion.step_type) {
      case 'question': return 'bg-blue-100 text-blue-800';
      case 'knowledge': return 'bg-indigo-100 text-indigo-800';
      case 'input': return 'bg-green-100 text-green-800';
      case 'routing': return 'bg-orange-100 text-orange-800';
      case 'final': return 'bg-purple-100 text-purple-800';
      case 'conditional': return 'bg-red-100 text-red-800';
      case 'rule_based': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAccept = () => {
    // KRITISCH: Bei Use Case ERSTELLUNG soll der Admin NIEMALS Endkunden-Eingaben machen!
    // Der Admin definiert nur die STRUKTUR, nicht die Inhalte!
    
    // Nur bei Routing-Steps, die Admin-Konfiguration benötigen (E-Mail-Adressen)
    if (suggestion.step_type === 'routing') {
      const needsAdminInput = suggestion.step_suggestion.toLowerCase().includes('e-mail') || 
                             suggestion.step_suggestion.toLowerCase().includes('an wen');
      if (needsAdminInput) {
        // Nur hier braucht der Admin Input (für Routing-Konfiguration)
        setShowInput(true);
      } else {
        onAccept();
      }
    } else {
      // Alle anderen Steps (question, input, final) direkt akzeptieren
      // Der Admin definiert nur die Struktur, macht keine Endkunden-Eingaben!
      onAccept();
    }
  };

  const handleInputSubmit = () => {
    if (inputValue.trim()) {
      onAccept(inputValue);
      setInputValue('');
      setShowInput(false);
    }
  };

  const getInputLabel = () => {
    if (suggestion.step_suggestion.toLowerCase().includes('e-mail')) {
      return 'E-Mail-Adresse eingeben:';
    }
    if (suggestion.step_suggestion.toLowerCase().includes('an wen')) {
      return 'An wen soll weitergeleitet werden?';
    }
    return 'Eingabe:';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">KI denkt nach...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            KI schlägt vor:
          </CardTitle>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStepTypeBadgeColor()}`}>
            {getStepTypeLabel(suggestion.step_type)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 mb-2">
            {suggestion.step_suggestion}
          </h3>
          <p className="text-sm text-gray-600">
            {suggestion.reasoning}
          </p>
        </div>

        {/* Strukturierte Felder anzeigen */}
        {suggestion.fields && suggestion.fields.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Benötigte Informationen:</h4>
            <div className="space-y-3">
              {suggestion.fields.map((field, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{field.label}</span>
                      {field.required && <span className="text-red-500 text-sm">*</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Typ: {field.type} {field.placeholder && `• ${field.placeholder}`}
                      {field.options && field.options.length > 0 && (
                        <div className="mt-1">
                          <span className="font-medium">Optionen:</span> {field.options.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wissensinhalte anzeigen */}
        {suggestion.knowledge_content && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              Bereitgestellte Informationen:
            </h4>
            <div className="bg-white rounded border p-3">
              <div className="whitespace-pre-line text-sm text-gray-800 mb-3">
                {suggestion.knowledge_content}
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                <Edit className="h-4 w-4 mr-2" />
                Inhalt bearbeiten
              </Button>
            </div>
          </div>
        )}

        {/* Komplexitätsfrage anzeigen */}
        {suggestion.complexity_question && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Komplexität klären:
            </h4>
            <div className="bg-white rounded border p-3">
              <div className="text-sm text-gray-800 mb-3">
                {suggestion.complexity_question}
              </div>
              <Button variant="ghost" size="sm" className="text-yellow-600 hover:text-yellow-800">
                <Edit className="h-4 w-4 mr-2" />
                Frage anpassen
              </Button>
            </div>
          </div>
        )}

        {/* Verzweigungsfrage anzeigen */}
        {suggestion.condition_question && (
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Verzweigungsfrage:
            </h4>
            <div className="bg-white rounded border p-3">
              <div className="text-sm text-gray-800 mb-3">
                {suggestion.condition_question}
              </div>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800">
                <Edit className="h-4 w-4 mr-2" />
                Frage anpassen
              </Button>
            </div>
          </div>
        )}

        {/* Verzweigungen anzeigen */}
        {suggestion.branches && suggestion.branches.length > 0 && (
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Verzweigungen ({suggestion.branches.length}):
            </h4>
            <div className="space-y-3">
              {suggestion.branches.map((branch, index) => (
                <div key={index} className="bg-white rounded border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {branch.condition_label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {branch.steps?.length || 0} Schritte
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Bedingung: {branch.condition} = "{branch.condition_value}"
                  </div>
                  {branch.steps && branch.steps.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Schritte: {branch.steps.map((step: any, i: number) => step.content || `Schritt ${i+1}`).join(', ')}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 mt-2">
                    <Edit className="h-4 w-4 mr-2" />
                    Branch bearbeiten
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Neue Rule-Based Verzweigungen anzeigen */}
        {suggestion.rule_branching && (
          <div className="bg-emerald-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-emerald-600" />
              Regel-Verzweigungen ({suggestion.rule_branching.rules.length} Regeln):
            </h4>
            
            {/* Verfügbare Felder anzeigen */}
            <div className="mb-4 p-3 bg-white rounded border">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Verfügbare Kriterien:</h5>
              <div className="flex flex-wrap gap-2">
                {suggestion.rule_branching.available_fields.map((field, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs"
                  >
                    {field.label} ({field.type})
                  </span>
                ))}
              </div>
            </div>

            {/* Regeln anzeigen */}
            <div className="space-y-3">
              {suggestion.rule_branching.rules.map((rule, index) => (
                <div key={rule.id} className="bg-white rounded border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-900">{rule.name}</span>
                      {rule.description && (
                        <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Priorität: {rule.priority}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {rule.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Bedingungen */}
                  <div className="mb-3">
                    <h6 className="text-sm font-medium text-gray-700 mb-2">Bedingungen:</h6>
                    <div className="space-y-1">
                      {rule.conditions.map((condition, condIndex) => (
                        <div key={condIndex} className="text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                          <span className="font-medium">{condition.field}</span>
                          <span className="mx-2">{condition.operator === 'equals' ? '=' : condition.operator}</span>
                          <span className="italic">
                            {Array.isArray(condition.value) 
                              ? condition.value.join(', ') 
                              : condition.value}
                          </span>
                          {condition.label && (
                            <span className="ml-2 text-xs text-gray-500">({condition.label})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Aktionen */}
                  <div className="mb-3">
                    <h6 className="text-sm font-medium text-gray-700 mb-2">
                      Aktionen ({rule.actions.length}):
                    </h6>
                    <div className="text-xs text-gray-500">
                      {rule.actions.map((action, actionIndex) => (
                        <div key={actionIndex} className="truncate">
                          {actionIndex + 1}. {action.content || action.type || 'Unbekannte Aktion'}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Bearbeiten Buttons */}
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-800">
                      <Edit className="h-4 w-4 mr-2" />
                      Regel bearbeiten
                    </Button>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                      <Plus className="h-4 w-4 mr-2" />
                      Regel duplizieren
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Default Actions falls vorhanden */}
            {suggestion.rule_branching.default_actions && suggestion.rule_branching.default_actions.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded border">
                <h6 className="text-sm font-medium text-gray-700 mb-2">Standard-Aktionen (wenn keine Regel greift):</h6>
                <div className="text-xs text-gray-600">
                  {suggestion.rule_branching.default_actions.map((action, index) => (
                    <div key={index}>
                      {index + 1}. {action.content || action.type || 'Unbekannte Aktion'}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Neue Regel hinzufügen Button */}
            <div className="mt-4 pt-3 border-t">
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Neue Regel hinzufügen
              </Button>
            </div>
          </div>
        )}

        {suggestion.options && suggestion.options.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Optionen:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestion.options.map((option, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                >
                  {option}
                </span>
              ))}
            </div>
          </div>
        )}

        {showInput && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label htmlFor="step-input" className="text-sm font-medium">
              {getInputLabel()}
            </Label>
            <Input
              id="step-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={suggestion.step_type === 'routing' && suggestion.step_suggestion.includes('E-Mail') 
                ? 'z.B. buchhaltung@firma.de' 
                : 'Eingabe...'}
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputSubmit();
                }
              }}
            />
            <div className="flex gap-2">
              <Button onClick={handleInputSubmit} size="sm" disabled={!inputValue.trim()}>
                <Check className="h-4 w-4 mr-1" />
                Übernehmen
              </Button>
              <Button 
                onClick={() => {
                  setShowInput(false);
                  setInputValue('');
                }} 
                variant="outline" 
                size="sm"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {!showInput && (
          <div className="flex gap-2">
            <Button onClick={handleAccept} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Akzeptieren
            </Button>
            <Button onClick={onModify} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Anpassen
            </Button>
            <Button onClick={onAddManual} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Manuell
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
