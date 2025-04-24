
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
  const wb = utils.book_new();

  // Create headers
  const headerData = [
    ['Projektname:', 'Avanti Suite'],
    ['Kostenstelle:', data.costCenter],
    ['Zeitraum:', data.dateRange],
    ['Kunde:', data.customerName],
    ['Ansprechpartner:', data.contactPerson],
    [''],
    ['Rechnungsanschrift:', data.billingAddress],
    [''],
    ['Datum', 'Minuten']
  ];

  // Add daily records
  const recordsData = data.dailyRecords.map(record => [record.date, record.minutes]);

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

  // Add worksheet to workbook
  utils.book_append_sheet(wb, ws, 'Rechnung');

  // Generate Excel file
  writeFile(wb, 'Rechnung.xlsx');
};
