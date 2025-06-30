import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

type EndkundeInsert = Database['public']['Tables']['endkunden']['Insert'];

interface EndkundenImportProps {
  customerId: string | null;
  onClose: () => void;
  onImportSuccess: () => void;
}

// Define the database fields a user can map to.
const dbFields: (keyof EndkundeInsert)[] = [
  'Vorname',
  'Nachname',
  'Adresse',
  'Postleitzahl',
  'Ort',
  'Wohnung',
  'Gebäude',
  'Lage',
  'external_ID',
  'Rufnummer', // Neues Feld für die Telefonnummer
];

const EndkundenImport: React.FC<EndkundenImportProps> = ({ customerId, onClose, onImportSuccess }) => {
  const [step, setStep] = useState(1);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (fileToProcess: File) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result;
        if (!fileData) throw new Error('Could not read file.');
        const wb = XLSX.read(fileData, { type: 'binary' });
        setWorkbook(wb);
        const sheetNames = wb.SheetNames;
        setWorksheets(sheetNames);

        if (sheetNames.length > 0) {
          parseSheet(wb, sheetNames[0]);
          setSelectedSheet(sheetNames[0]);
          setStep(2);
        } else {
          setError('Keine Tabellenblätter in der Datei gefunden.');
        }
      } catch (err) {
        setError('Datei konnte nicht verarbeitet werden. Stellen Sie sicher, dass es eine gültige .xlsx, .xls oder .csv Datei ist.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(fileToProcess);
  };
  
  const parseSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (jsonData.length > 0) {
      const fileHeaders = jsonData[0].map(h => String(h));
      setHeaders(fileHeaders);
      setData(jsonData.slice(1));
      
      const initialMapping: { [key: string]: string } = {};
      fileHeaders.forEach(header => {
        const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/gi, '');
        const foundField = dbFields.find(dbField => 
            (dbField as string).toLowerCase().replace(/[^a-z0-9]/gi, '') === lowerHeader
        );
        if (foundField) {
          initialMapping[header] = foundField;
        }
      });
      setMapping(initialMapping);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (workbook) {
      setSelectedSheet(sheetName);
      parseSheet(workbook, sheetName);
    }
  }

  const handleMappingChange = (header: string, dbField: string) => {
    setMapping(prev => ({ ...prev, [header]: dbField === 'ignore' ? '' : dbField }));
  };

  const handleImport = async () => {
    if (!customerId) {
      setError('Bitte wählen Sie zuerst einen Kunden aus, dem die Daten zugeordnet werden sollen.');
      return;
    }

    setLoading(true);
    setError(null);

    const recordsToInsert: EndkundeInsert[] = data.map(row => {
      const record: Partial<EndkundeInsert> = {};
      headers.forEach((header, index) => {
        const dbField = mapping[header] as keyof EndkundeInsert;
        if (dbField) {
          record[dbField] = row[index];
        }
      });
      record.customer_ID = customerId;
      return record as EndkundeInsert;
    }).filter(record => Object.values(record).some(val => val !== null && val !== undefined && val !== '')); 

    if (recordsToInsert.length === 0) {
      setError('Keine gültigen Datensätze zum Importieren gefunden. Stellen Sie sicher, dass Vor- und Nachname zugeordnet sind und die entsprechenden Spalten Werte enthalten.');
      setLoading(false);
      return;
    }

    const { error: insertError, count } = await supabase.from('endkunden').insert(recordsToInsert, { count: 'exact' });

    setLoading(false);
    if (insertError) {
      setError(`Fehler beim Import: ${insertError.message}`);
    } else {
      setImportResult({ success: count || 0, failed: data.length - (count || 0) });
      setStep(3);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-lg font-medium mb-2">Schritt 1: Datei auswählen</h3>
            <p className="text-sm text-muted-foreground mb-4">Wählen Sie eine .xlsx, .xls oder .csv Datei aus.</p>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-md p-10 text-center cursor-pointer hover:border-primary"
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input id="file-upload" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="hidden" />
              {loading ? <p>Verarbeite...</p> : <p>Klicken oder ziehen Sie eine Datei hierher.</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h3 className="text-lg font-medium mb-2">Schritt 2: Spalten zuordnen</h3>
            <p className="text-sm text-muted-foreground mb-4">Ordnen Sie die Spalten Ihrer Datei den Datenbankfeldern zu. Nicht zugeordnete Spalten werden ignoriert.</p>
            {worksheets.length > 1 && (
              <div className="mb-4 max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tabellenblatt auswählen</label>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{worksheets.map(sheet => <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="overflow-x-auto border rounded-md max-h-96">
              <Table>
                <TableHeader className="sticky top-0 bg-secondary">
                  <TableRow>
                    <TableHead>Spalte aus Ihrer Datei</TableHead>
                    <TableHead>Vorschau (1. Zeile)</TableHead>
                    <TableHead>Datenbankfeld</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((header, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell className="text-muted-foreground">{data[0]?.[index]}</TableCell>
                      <TableCell>
                        <Select value={mapping[header] || 'ignore'} onValueChange={(value) => handleMappingChange(header, value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">Nicht importieren</SelectItem>
                            {dbFields.map(field => <SelectItem key={field} value={field}>{field}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
        case 3:
            return (
                <div>
                    <h3 className="text-lg font-medium mb-2">Schritt 3: Import abgeschlossen</h3>
                    <Alert variant={importResult && importResult.failed > 0 ? 'destructive' : 'default'}>
                        {importResult && importResult.failed > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        <AlertTitle>{importResult && importResult.failed > 0 ? 'Import mit Fehlern abgeschlossen' : 'Import erfolgreich!'}</AlertTitle>
                        <AlertDescription>
                            <p>{importResult?.success} von {data.length} Datensätzen wurden erfolgreich importiert.</p>
                            {importResult && importResult.failed > 0 && <p>{importResult.failed} Datensätze konnten nicht importiert werden. Dies kann an fehlenden Pflichtfeldern (Vorname, Nachname) liegen.</p>}
                        </AlertDescription>
                    </Alert>
                </div>
            )
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {renderStep()}
      {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
      <div className="flex justify-between items-center pt-4 border-t mt-6">
        {step < 3 ? (
            <Button variant="secondary" onClick={onClose} disabled={loading}>Abbrechen</Button>
        ) : <div/> }
        
        {step === 2 && (
          <Button onClick={handleImport} disabled={loading}>
            {loading ? 'Importiere...' : `Import starten (${data.length} Datensätze)`}
          </Button>
        )}
        {step === 3 && (
            <Button onClick={onImportSuccess}>Schließen</Button>
        )}
      </div>
    </div>
  );
};

export default EndkundenImport;
