
import { utils, writeFile } from 'xlsx';
import { DailyMinutesRecord } from '@/hooks/useInvoiceData';
import { InvoiceCalculation } from '@/hooks/useInvoiceCalculation';

export interface InvoiceData {
  customerName: string;
  costCenter: string;
  dateRange: string;
  contactPerson: string;
  billingAddress: string;
  dailyRecords: DailyMinutesRecord[];
  summary: InvoiceCalculation;
}

export const exportInvoiceToExcel = (data: InvoiceData) => {
  console.log('Exporting invoice data:', data);
  
  const wb = utils.book_new();

  // Create headers
  const headerData = [
    ['Projektname:', 'Avanti Suite'],
    ['Kostenstelle:', data.costCenter || ''],
    ['Zeitraum:', data.dateRange],
    ['Kunde:', data.customerName],
    ['Ansprechpartner:', data.contactPerson || ''],
    [''],
    ['Rechnungsanschrift:', data.billingAddress || ''],
    [''],
    ['Datum', 'Minuten']
  ];

  // Add daily records, sortiert nach Datum
  const recordsData = data.dailyRecords
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(record => [
      record.date.split('-').reverse().join('.'), // Datum von YYYY-MM-DD zu DD.MM.YYYY formatieren
      record.minutes
    ]);

  console.log('Records for Excel:', recordsData);

  // Add summary
  const summaryData = [
    [''],
    ['Gesamtsumme:', `${data.summary.totalMinutes} Min`],
    ['Freiminuten:', '1.000 Min'],
    ['Verrechenbare Minuten:', `${data.summary.billableMinutes} Min`],
    ['Nettobetrag:', `${data.summary.netAmount.toFixed(2)} €`],
    ['USt. 19%:', `${data.summary.vat.toFixed(2)} €`],
    ['Gesamtbetrag:', `${data.summary.totalAmount.toFixed(2)} €`]
  ];

  const ws = utils.aoa_to_sheet([...headerData, ...recordsData, ...summaryData]);

  // Auto-Size columns
  const colWidths = [
    { wch: 18 }, // Datum
    { wch: 15 }, // Minuten/Werte
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  utils.book_append_sheet(wb, ws, 'Rechnung');

  // Generate Excel file with formatted name
  const fileName = `Rechnung_${data.customerName.replace(/\s+/g, '_')}_${data.dateRange.replace(/\s+/g, '').replace(/\./g, '-').replace(/-/g, '_')}.xlsx`;
  writeFile(wb, fileName);
  
  console.log('Excel file exported as:', fileName);
};
