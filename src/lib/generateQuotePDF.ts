import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// oklch CSS 변수를 hex로 대체
const CSS_OVERRIDES = `
  * {
    --background: #fafafa !important;
    --foreground: #171717 !important;
    --card: #ffffff !important;
    --card-foreground: #171717 !important;
    --popover: #ffffff !important;
    --popover-foreground: #171717 !important;
    --primary: #2563eb !important;
    --primary-foreground: #ffffff !important;
    --secondary: #f5f5f5 !important;
    --secondary-foreground: #262626 !important;
    --muted: #f5f5f5 !important;
    --muted-foreground: #737373 !important;
    --accent: #eff6ff !important;
    --accent-foreground: #262626 !important;
    --destructive: #dc2626 !important;
    --border: #e5e5e5 !important;
    --input: #e5e5e5 !important;
    --ring: #2563eb !important;
    --chart-1: #2563eb !important;
    --chart-2: #10b981 !important;
    --chart-3: #22c55e !important;
    --chart-4: #eab308 !important;
    --chart-5: #a855f7 !important;
    --sidebar: #fafafa !important;
    --sidebar-foreground: #171717 !important;
    --sidebar-primary: #2563eb !important;
    --sidebar-primary-foreground: #ffffff !important;
    --sidebar-accent: #eff6ff !important;
    --sidebar-accent-foreground: #262626 !important;
    --sidebar-border: #e5e5e5 !important;
    --sidebar-ring: #2563eb !important;
  }
`;

export async function generateQuotePDFFromElement(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  // 클론하여 별도 렌더링
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.minHeight = "auto";

  // oklch 오버라이드 스타일 삽입
  const styleEl = document.createElement("style");
  styleEl.textContent = CSS_OVERRIDES;
  document.head.appendChild(styleEl);
  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pdfWidth;
    let imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // 한 페이지에 맞추기: 높이가 넘치면 축소
    if (imgHeight > pdfHeight) {
      const ratio = pdfHeight / imgHeight;
      imgWidth = imgWidth * ratio;
      imgHeight = pdfHeight;
    }

    // 가로 중앙 정렬
    const xOffset = (pdfWidth - imgWidth) / 2;

    pdf.addImage(imgData, "PNG", xOffset, 0, imgWidth, imgHeight);

    pdf.save(fileName);
  } finally {
    document.body.removeChild(clone);
    document.head.removeChild(styleEl);
  }
}
