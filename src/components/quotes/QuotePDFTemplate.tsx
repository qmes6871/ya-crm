"use client";

import { forwardRef } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
  notices?: string | null;
  status: string;
  createdAt: string;
  creator: {
    name: string;
  };
  items: QuoteItem[];
}

interface QuotePDFTemplateProps {
  quote: Quote;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    businessNumber: string;
    representative: string;
  };
}

const defaultCompanyInfo = {
  name: "와이에이솔루션",
  address: "서울특별시 강서구 마곡중앙 4로 18, 7층",
  phone: "",
  email: "qmes6871@gmail.com",
  businessNumber: "380-32-01610",
  representative: "신동훈",
};

const QuotePDFTemplate = forwardRef<HTMLDivElement, QuotePDFTemplateProps>(
  ({ quote, companyInfo = defaultCompanyInfo }, ref) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("ko-KR").format(amount);
    };

    const defaultNotices = [
      "본 견적서의 유효기간은 발행일로부터 7일입니다.",
      "부가가치세는 별도입니다.",
      "상기 금액은 협의에 따라 변경될 수 있습니다.",
      "결제 조건: 계약금 50%, 잔금 50% (프로젝트 완료 후)",
    ];

    const noticeItems = quote.notices
      ? quote.notices.split("\n").filter((line: string) => line.trim())
      : defaultNotices;

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: "#ffffff",
          padding: "48px",
          width: "210mm",
          margin: "0 auto",
          fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
          color: "#1f2937",
        }}
      >
        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#111827",
              letterSpacing: "0.1em",
              margin: 0,
            }}
          >
            견 적 서
          </h1>
        </div>

        {/* 견적서 정보 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "32px",
          }}
        >
          <div>
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "4px 0" }}>
              견적번호:{" "}
              <span style={{ fontWeight: "600" }}>{quote.quoteNumber}</span>
            </p>
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "4px 0" }}>
              작성일:{" "}
              <span style={{ fontWeight: "600" }}>
                {format(new Date(quote.createdAt), "yyyy년 MM월 dd일", {
                  locale: ko,
                })}
              </span>
            </p>
            {quote.validUntil && (
              <p style={{ fontSize: "14px", color: "#4b5563", margin: "4px 0" }}>
                유효기간:{" "}
                <span style={{ fontWeight: "600" }}>
                  {format(new Date(quote.validUntil), "yyyy년 MM월 dd일", {
                    locale: ko,
                  })}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* 수신자 및 공급자 정보 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
            marginBottom: "40px",
          }}
        >
          {/* 수신자 */}
          <div
            style={{
              border: "2px solid #1f2937",
              padding: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#1f2937",
                borderBottom: "2px solid #1f2937",
                paddingBottom: "8px",
                marginBottom: "16px",
                marginTop: 0,
              }}
            >
              수 신
            </h2>
            <div>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#111827",
                  margin: "8px 0",
                }}
              >
                {quote.clientName} 귀하
              </p>
              {quote.clientContact && (
                <p style={{ fontSize: "14px", color: "#4b5563", margin: "4px 0" }}>
                  연락처: {quote.clientContact}
                </p>
              )}
            </div>
          </div>

          {/* 공급자 */}
          <div
            style={{
              border: "2px solid #1f2937",
              padding: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#1f2937",
                borderBottom: "2px solid #1f2937",
                paddingBottom: "8px",
                marginBottom: "16px",
                marginTop: 0,
              }}
            >
              공 급 자
            </h2>
            <div style={{ fontSize: "14px" }}>
              <p
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#111827",
                  margin: "4px 0",
                }}
              >
                {companyInfo.name}
              </p>
              <p style={{ color: "#4b5563", margin: "4px 0" }}>
                사업자번호: {companyInfo.businessNumber}
              </p>
              <p style={{ color: "#4b5563", margin: "4px 0" }}>
                책임자: {companyInfo.representative}
              </p>
              <p style={{ color: "#4b5563", margin: "4px 0" }}>
                주소: {companyInfo.address}
              </p>
              <p style={{ color: "#4b5563", margin: "4px 0" }}>
                {companyInfo.phone ? `Tel: ${companyInfo.phone} | ` : ""}Email: {companyInfo.email}
              </p>
            </div>
          </div>
        </div>

        {/* 총 금액 */}
        <div
          style={{
            background: "linear-gradient(to right, #2563eb, #1d4ed8)",
            color: "#ffffff",
            padding: "24px",
            borderRadius: "8px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: "500" }}>
              총 견적금액 (VAT 별도)
            </span>
            <span style={{ fontSize: "28px", fontWeight: "bold" }}>
              ₩ {formatCurrency(quote.totalAmount)}
            </span>
          </div>
        </div>

        {/* 견적 항목 테이블 */}
        <div style={{ marginBottom: "32px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#1f2937", color: "#ffffff" }}>
                <th
                  style={{
                    border: "1px solid #1f2937",
                    padding: "12px 16px",
                    textAlign: "center",
                    width: "48px",
                  }}
                >
                  No
                </th>
                <th
                  style={{
                    border: "1px solid #1f2937",
                    padding: "12px 16px",
                    textAlign: "left",
                  }}
                >
                  품목 및 상세 내용
                </th>
                <th
                  style={{
                    border: "1px solid #1f2937",
                    padding: "12px 16px",
                    textAlign: "center",
                    width: "80px",
                  }}
                >
                  수량
                </th>
                <th
                  style={{
                    border: "1px solid #1f2937",
                    padding: "12px 16px",
                    textAlign: "right",
                    width: "128px",
                  }}
                >
                  단가
                </th>
                <th
                  style={{
                    border: "1px solid #1f2937",
                    padding: "12px 16px",
                    textAlign: "right",
                    width: "144px",
                  }}
                >
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "12px 16px",
                      textAlign: "center",
                      color: "#4b5563",
                    }}
                  >
                    {index + 1}
                  </td>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "12px 16px",
                      color: "#1f2937",
                    }}
                  >
                    {item.description}
                  </td>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "12px 16px",
                      textAlign: "center",
                      color: "#4b5563",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "12px 16px",
                      textAlign: "right",
                      color: "#4b5563",
                    }}
                  >
                    {formatCurrency(item.unitPrice)}원
                  </td>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: "600",
                      color: "#1f2937",
                    }}
                  >
                    {formatCurrency(item.amount)}원
                  </td>
                </tr>
              ))}
              {/* 합계 행 */}
              <tr style={{ backgroundColor: "#f3f4f6", fontWeight: "bold" }}>
                <td
                  colSpan={4}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "12px 16px",
                    textAlign: "right",
                    color: "#1f2937",
                  }}
                >
                  합 계
                </td>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "12px 16px",
                    textAlign: "right",
                    color: "#2563eb",
                    fontSize: "18px",
                  }}
                >
                  {formatCurrency(quote.totalAmount)}원
                </td>
              </tr>
              <tr style={{ backgroundColor: "#f9fafb" }}>
                <td
                  colSpan={4}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "12px 16px",
                    textAlign: "right",
                    color: "#4b5563",
                  }}
                >
                  부가세 (10%)
                </td>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "12px 16px",
                    textAlign: "right",
                    color: "#4b5563",
                  }}
                >
                  {formatCurrency(Math.round(quote.totalAmount * 0.1))}원
                </td>
              </tr>
              <tr
                style={{ backgroundColor: "#eff6ff", fontWeight: "bold" }}
              >
                <td
                  colSpan={4}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "12px 16px",
                    textAlign: "right",
                    color: "#1f2937",
                  }}
                >
                  총 합계 (VAT 포함)
                </td>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "12px 16px",
                    textAlign: "right",
                    color: "#1d4ed8",
                    fontSize: "20px",
                  }}
                >
                  {formatCurrency(Math.round(quote.totalAmount * 1.1))}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 비고 */}
        {quote.note && (
          <div
            style={{
              marginBottom: "32px",
              padding: "20px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "8px",
                marginTop: 0,
              }}
            >
              비고
            </h3>
            <p
              style={{
                color: "#4b5563",
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {quote.note}
            </p>
          </div>
        )}

        {/* 안내사항 */}
        <div
          style={{
            marginTop: "40px",
            padding: "20px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: "12px",
              marginTop: 0,
            }}
          >
            안내사항
          </h3>
          <ul
            style={{
              fontSize: "14px",
              color: "#4b5563",
              margin: 0,
              paddingLeft: "20px",
            }}
          >
            {noticeItems.map((item: string, index: number) => (
              <li key={index} style={{ marginBottom: "4px" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 푸터 */}
        <div style={{ marginTop: "64px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            본 견적서에 대한 문의사항이 있으시면 언제든지 연락 주시기 바랍니다.
          </p>
          <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
            담당자: {quote.creator.name}
          </p>
        </div>

      </div>
    );
  }
);

QuotePDFTemplate.displayName = "QuotePDFTemplate";

export default QuotePDFTemplate;
