import ExcelJS from 'exceljs';
import { Response } from 'express';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/** Stream an Excel (.xlsx) file to the HTTP response */
export async function exportToExcel(
  res: Response,
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, any>[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));

  // Bold header row
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row);
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

/** Stream a CSV file to the HTTP response */
export async function exportToCsv(
  res: Response,
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, any>[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));

  for (const row of rows) {
    sheet.addRow(row);
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  await workbook.csv.write(res);
  res.end();
}
