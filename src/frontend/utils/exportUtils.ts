/**
 * Export utilities for generating PDF and Excel reports.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ReportExportData {
  farmName: string;
  dateRangeLabel: string;
  generatedBy: string;
  summaryStats: {
    label: string;
    value: string;
    unit: string;
  }[];
  comparisonData: {
    garden: string;
    temp: number;
    humidity: number;
    light: number;
  }[];
  alertTypesData: {
    name: string;
    value: number;
  }[];
  gardenCount: number;
  alertCount: number;
  scheduleCount: number;
}

export function exportToPdf(data: ReportExportData): void {
  const doc = new jsPDF();
  const now = new Date().toLocaleString("vi-VN");

  // Title
  doc.setFontSize(18);
  doc.text("Bao cao Nong trai Thong minh", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Nong trai: ${data.farmName}`, 14, 28);
  doc.text(`Thoi gian: ${data.dateRangeLabel}`, 14, 34);
  doc.text(`Nguoi xuat: ${data.generatedBy} | Ngay: ${now}`, 14, 40);

  // Summary stats
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("1. Tong hop", 14, 52);

  autoTable(doc, {
    startY: 56,
    head: [["Chi so", "Gia tri", "Don vi"]],
    body: data.summaryStats.map((s) => [s.label, s.value, s.unit]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [27, 67, 50] },
  });

  // Garden comparison
  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 90;
  doc.setFontSize(13);
  doc.text("2. So sanh khu vuon", 14, afterSummary + 10);

  autoTable(doc, {
    startY: afterSummary + 14,
    head: [["Khu vuon", "Nhiet do (C)", "Do am dat (%)", "Anh sang (kLux)"]],
    body: data.comparisonData.map((row) => [
      row.garden,
      String(row.temp),
      String(row.humidity),
      String(row.light),
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [27, 67, 50] },
  });

  // Alert statistics
  const afterComparison = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 150;
  doc.setFontSize(13);
  doc.text("3. Thong ke canh bao", 14, afterComparison + 10);

  autoTable(doc, {
    startY: afterComparison + 14,
    head: [["Loai canh bao", "So luong"]],
    body: data.alertTypesData.map((a) => [a.name, String(a.value)]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [27, 67, 50] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Trang ${i}/${pageCount} - NongTech Smart Farm`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const safeFarm = data.farmName.replace(/\s+/g, "-").toLowerCase();
  doc.save(`report_${safeFarm}_${stamp}.pdf`);
}

export function exportToExcel(data: ReportExportData): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tong hop
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Bao cao Nong trai Thong minh"],
    [`Nong trai: ${data.farmName}`],
    [`Thoi gian: ${data.dateRangeLabel}`],
    [`Nguoi xuat: ${data.generatedBy}`],
    [`Ngay xuat: ${new Date().toLocaleString("vi-VN")}`],
    [],
    ["Chi so", "Gia tri", "Don vi"],
    ...data.summaryStats.map((s) => [s.label, s.value, s.unit]),
    [],
    ["Tong quan"],
    ["So khu vuon", data.gardenCount],
    ["So canh bao", data.alertCount],
    ["So lich trinh", data.scheduleCount],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Tong hop");

  // Sheet 2: So sanh vuon
  const compSheet = XLSX.utils.aoa_to_sheet([
    ["Khu vuon", "Nhiet do (C)", "Do am dat (%)", "Anh sang (kLux)"],
    ...data.comparisonData.map((row) => [row.garden, row.temp, row.humidity, row.light]),
  ]);
  XLSX.utils.book_append_sheet(wb, compSheet, "So sanh vuon");

  // Sheet 3: Canh bao
  const alertSheet = XLSX.utils.aoa_to_sheet([
    ["Loai canh bao", "So luong"],
    ...data.alertTypesData.map((a) => [a.name, a.value]),
  ]);
  XLSX.utils.book_append_sheet(wb, alertSheet, "Canh bao");

  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const safeFarm = data.farmName.replace(/\s+/g, "-").toLowerCase();
  XLSX.writeFile(wb, `report_${safeFarm}_${stamp}.xlsx`);
}
