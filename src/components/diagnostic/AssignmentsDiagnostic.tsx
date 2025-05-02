
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserAssignments } from '@/hooks/useUserAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserRole } from '@/types';

export const AssignmentsDiagnostic: React.FC = () => {
  const { user } = useAuth();
  const { assignments, isLoading } = useUserAssignments();
  const [showDebug, setShowDebug] = useState(false);

  if (!user || user.role !== 'admin' && user.role !== 'agent') {
    return null;
  }

  return (
    <Card className="mt-6 border-dashed border-orange-300 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Diagnose: Kundenzuweisungen
        </CardTitle>
        <CardDescription>
          Dieses Tool zeigt Informationen zu Ihren Kundenzuweisungen und kann helfen, Probleme zu identifizieren.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">Benutzer-ID:</p>
              <p className="text-xs bg-gray-100 p-2 rounded">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Rolle:</p>
              <p className="text-xs bg-gray-100 p-2 rounded">{user.role}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Zugewiesene Kunden:</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Lade Zuweisungen...</p>
            ) : assignments.length > 0 ? (
              <ul className="text-sm space-y-2">
                {assignments.map(assignment => (
                  <li key={assignment.id} className="bg-white p-2 rounded border border-gray-200">
                    {assignment.customer_name || 'Unbekannter Kunde'} 
                    <span className="text-xs text-gray-500 ml-2">({assignment.customer_id})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Keine Zuweisungen gefunden</AlertTitle>
                <AlertDescription>
                  {user.role === 'agent' ? (
                    "Sie haben keine zugewiesenen Kunden. Bitte wenden Sie sich an einen Administrator."
                  ) : (
                    "Es wurden keine Kundenzuweisungen gefunden."
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)}>
          {showDebug ? "Debug-Info ausblenden" : "Debug-Info anzeigen"}
        </Button>
        {showDebug && (
          <div className="mt-4 w-full">
            <pre className="text-xs bg-black text-white p-2 rounded overflow-auto max-h-60">
              {JSON.stringify({ user, assignments }, null, 2)}
            </pre>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
