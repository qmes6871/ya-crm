/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientContact?: string | null;
  validUntil?: string | null;
  totalAmount: number;
  note?: string | null;
  status: string;
  createdAt: string;
  creator: {
    name: string;
  };
  items: QuoteItem[];
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  businessNumber: string;
  representative: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: "YA Solution",
  address: "서울특별시 강남구",
  phone: "02-1234-5678",
  email: "contact@yasolution.com",
  businessNumber: "123-45-67890",
  representative: "홍길동",
};

const statusLabel: Record<string, string> = {
  DRAFT: "초안",
  SENT: "발송됨",
  ACCEPTED: "승인됨",
  REJECTED: "거절됨",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

// 폰트 데이터 캐싱
let cachedFontBase64: string | null = null;

async function loadKoreanFont(doc: jsPDF): Promise<void> {
  try {
    // 폰트 데이터가 캐시되어 있지 않으면 로드
    if (!cachedFontBase64) {
      const response = await fetch("/fonts/NotoSansKR-Regular.ttf");
      if (!response.ok) {
        throw new Error("폰트 파일을 로드할 수 없습니다.");
      }

      const arrayBuffer = await response.arrayBuffer();
      cachedFontBase64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
    }

    // 매번 새 문서에 폰트 추가
    doc.addFileToVFS("NotoSansKR-Regular.ttf", cachedFontBase64);
    doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal");
  } catch (error) {
    console.error("폰트 로드 실패:", error);
    throw error;
  }
}

export async function generateQuotePDF(
  quote: Quote,
  companyInfo: CompanyInfo = defaultCompanyInfo
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 한글 폰트 로드
  await loadKoreanFont(doc);
  doc.setFont("NotoSansKR", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // 제목
  doc.setFontSize(24);
  doc.text("견 적 서", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text("QUOTATION", pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 15;

  // 견적 정보
  doc.setFontSize(9);
  doc.text(`견적번호: ${quote.quoteNumber}`, margin, y);

  // 상태 배지
  const status = statusLabel[quote.status] || quote.status;
  doc.setFillColor(219, 234, 254);
  doc.setTextColor(30, 64, 175);
  const statusWidth = doc.getTextWidth(status) + 8;
  doc.roundedRect(pageWidth - margin - statusWidth, y - 4, statusWidth, 6, 2, 2, "F");
  doc.text(status, pageWidth - margin - statusWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 5;

  doc.text(`작성일: ${formatDate(quote.createdAt)}`, margin, y);
  y += 5;

  if (quote.validUntil) {
    doc.text(`유효기간: ${formatDate(quote.validUntil)}`, margin, y);
    y += 5;
  }
  y += 10;

  // 수신자 / 공급자 박스
  const boxWidth = (pageWidth - margin * 2 - 10) / 2;
  const boxHeight = 40;

  // 수신자 박스
  doc.setDrawColor(31, 41, 55);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, boxWidth, boxHeight);

  doc.setFontSize(11);
  doc.setFont("NotoSansKR", "normal");
  doc.text("수 신", margin + 5, y + 8);
  doc.line(margin, y + 12, margin + boxWidth, y + 12);

  doc.setFontSize(14);
  doc.text(`${quote.clientName} 귀하`, margin + 5, y + 22);

  if (quote.clientContact) {
    doc.setFontSize(9);
    doc.text(`연락처: ${quote.clientContact}`, margin + 5, y + 30);
  }

  // 공급자 박스
  const supplierX = margin + boxWidth + 10;
  doc.rect(supplierX, y, boxWidth, boxHeight);

  doc.setFontSize(11);
  doc.text("공 급 자", supplierX + 5, y + 8);
  doc.line(supplierX, y + 12, supplierX + boxWidth, y + 12);

  doc.setFontSize(12);
  doc.text(companyInfo.name, supplierX + 5, y + 20);

  doc.setFontSize(8);
  doc.text(`사업자번호: ${companyInfo.businessNumber}`, supplierX + 5, y + 26);
  doc.text(`대표자: ${companyInfo.representative}`, supplierX + 5, y + 31);
  doc.text(`Tel: ${companyInfo.phone}`, supplierX + 5, y + 36);

  y += boxHeight + 10;

  // 총 금액 박스
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text("총 견적금액 (VAT 별도)", margin + 10, y + 11);

  doc.setFontSize(16);
  doc.text(`₩ ${formatCurrency(quote.totalAmount)}`, pageWidth - margin - 10, y + 11, { align: "right" });
  doc.setTextColor(0, 0, 0);

  y += 25;

  // 견적 항목 테이블
  const tableData = quote.items.map((item, index) => [
    String(index + 1),
    item.description,
    String(item.quantity),
    `${formatCurrency(item.unitPrice)}원`,
    `${formatCurrency(item.amount)}원`,
  ]);

  // 합계 행 추가
  tableData.push([
    { content: "합 계", colSpan: 4, styles: { halign: "right", fillColor: [243, 244, 246], font: "NotoSansKR" } } as any,
    { content: `${formatCurrency(quote.totalAmount)}원`, styles: { halign: "right", fillColor: [243, 244, 246], textColor: [37, 99, 235], font: "NotoSansKR" } } as any,
  ]);

  tableData.push([
    { content: "부가세 (10%)", colSpan: 4, styles: { halign: "right", fillColor: [249, 250, 251], font: "NotoSansKR" } } as any,
    { content: `${formatCurrency(Math.round(quote.totalAmount * 0.1))}원`, styles: { halign: "right", fillColor: [249, 250, 251], font: "NotoSansKR" } } as any,
  ]);

  tableData.push([
    { content: "총 합계 (VAT 포함)", colSpan: 4, styles: { halign: "right", fillColor: [239, 246, 255], font: "NotoSansKR" } } as any,
    { content: `${formatCurrency(Math.round(quote.totalAmount * 1.1))}원`, styles: { halign: "right", fillColor: [239, 246, 255], textColor: [29, 78, 216], font: "NotoSansKR" } } as any,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["No", "품목 및 상세 내용", "수량", "단가", "금액"]],
    body: tableData,
    theme: "grid",
    styles: {
      font: "NotoSansKR",
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      font: "NotoSansKR",
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      halign: "center",
      fontStyle: "normal",
    },
    bodyStyles: {
      font: "NotoSansKR",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { cellWidth: "auto" },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
    didParseCell: function(data) {
      // 모든 셀에 한글 폰트 강제 적용
      data.cell.styles.font = "NotoSansKR";
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // 비고
  if (quote.note) {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 2, 2, "F");

    doc.setFontSize(10);
    doc.text("비고", margin + 5, y + 8);

    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(quote.note, margin + 5, y + 16, { maxWidth: pageWidth - margin * 2 - 10 });
    doc.setTextColor(0, 0, 0);

    y += 30;
  }

  // 안내사항
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 35, 2, 2, "F");

  doc.setFontSize(10);
  doc.text("안내사항", margin + 5, y + 8);

  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  const notices = [
    "• 본 견적서의 유효기간은 발행일로부터 30일입니다.",
    "• 부가가치세는 별도입니다.",
    "• 상기 금액은 협의에 따라 변경될 수 있습니다.",
    "• 결제 조건: 계약금 50%, 잔금 50% (프로젝트 완료 후)",
  ];
  notices.forEach((notice, index) => {
    doc.text(notice, margin + 5, y + 15 + index * 5);
  });
  doc.setTextColor(0, 0, 0);

  y += 45;

  // 푸터
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("본 견적서에 대한 문의사항이 있으시면 언제든지 연락 주시기 바랍니다.", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.text(`담당자: ${quote.creator.name}`, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // 직인 영역
  y += 15;
  const stampX = pageWidth - margin - 40;
  doc.setDrawColor(209, 213, 219);
  doc.rect(stampX, y, 40, 35);

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("공급자 직인", stampX + 20, y + 8, { align: "center" });

  // 인 표시
  doc.setDrawColor(220, 38, 38);
  doc.setTextColor(220, 38, 38);
  doc.setLineWidth(0.8);
  doc.circle(stampX + 20, y + 23, 8);
  doc.setFontSize(12);
  doc.text("인", stampX + 20, y + 26, { align: "center" });

  // PDF 저장
  doc.save(`견적서_${quote.quoteNumber}.pdf`);
}
