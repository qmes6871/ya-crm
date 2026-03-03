"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileDown,
  Pencil,
  Save,
  X,
  Loader2,
  Plus,
  Trash2,
  Printer,
} from "lucide-react";
import QuotePDFTemplate from "@/components/quotes/QuotePDFTemplate";
import { generateQuotePDF } from "@/lib/generateQuotePDF";

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
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  items: QuoteItem[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "초안", className: "bg-gray-100 text-gray-700" },
  SENT: { label: "발송됨", className: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "승인됨", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "거절됨", className: "bg-red-100 text-red-700" },
};

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 편집 상태
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [items, setItems] = useState<QuoteItem[]>([]);

  const id = params.id as string;

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
        // 편집용 상태 초기화
        setClientName(data.clientName);
        setClientContact(data.clientContact || "");
        setValidUntil(
          data.validUntil
            ? format(new Date(data.validUntil), "yyyy-MM-dd")
            : ""
        );
        setNote(data.note || "");
        setStatus(data.status);
        setItems(data.items);
      } else {
        router.push("/crm/documents/quotes");
      }
    } catch (error) {
      console.error("Error fetching quote:", error);
      router.push("/crm/documents/quotes");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  useEffect(() => {
    const edit = searchParams.get("edit");
    const pdf = searchParams.get("pdf");

    if (edit === "true") {
      setIsEditing(true);
    }
    if (pdf === "true" && quote) {
      handleDownloadPDF();
    }
  }, [searchParams, quote]);

  const handleDownloadPDF = async () => {
    if (!quote) return;

    setGenerating(true);

    try {
      await generateQuotePDF(quote);
    } catch (error) {
      console.error("PDF 생성 오류:", error);
      alert("PDF 생성에 실패했습니다: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!clientName.trim()) {
      alert("고객/회사명을 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientContact,
          validUntil: validUntil || null,
          note,
          status,
          items: items
            .filter((item) => item.description.trim())
            .map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuote(data);
        setIsEditing(false);
        router.replace(`/crm/documents/quotes/${id}`);
      } else {
        const error = await res.json();
        alert(error.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error saving quote:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { description: "", quantity: 1, unitPrice: 0, amount: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof QuoteItem,
    value: string | number
  ) => {
    setItems(
      items.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value };
          updated.amount = updated.quantity * updated.unitPrice;
          return updated;
        }
        return item;
      })
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  const currentStatus = statusConfig[quote.status] || {
    label: quote.status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm/documents/quotes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {quote.quoteNumber}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${currentStatus.className}`}
              >
                {currentStatus.label}
              </span>
            </div>
            <p className="text-gray-500">
              {quote.clientName} | 작성: {quote.creator.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  router.replace(`/crm/documents/quotes/${id}`);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                저장
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                인쇄
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                PDF 다운로드
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 편집 모드 */}
      {isEditing ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>고객 정보</CardTitle>
              <CardDescription>견적서 정보를 수정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  고객/회사명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientContact">연락처</Label>
                <Input
                  id="clientContact"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">유효기간</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">상태</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">초안</SelectItem>
                    <SelectItem value="SENT">발송됨</SelectItem>
                    <SelectItem value="ACCEPTED">승인됨</SelectItem>
                    <SelectItem value="REJECTED">거절됨</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">비고</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>견적 항목</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg space-y-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      항목 {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="항목 설명"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      min="1"
                    />
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "unitPrice",
                          parseInt(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="10000"
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                항목 추가
              </Button>
              <div className="pt-4 border-t text-right">
                <span className="text-lg font-bold">
                  총 금액: {formatCurrency(totalAmount)}원
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* 미리보기 모드 */
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="print:block">
              <QuotePDFTemplate quote={quote} />
            </div>
          </CardContent>
        </Card>
      )}


      {/* 정보 카드 */}
      {!isEditing && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">작성일</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {format(new Date(quote.createdAt), "yyyy년 MM월 dd일", {
                  locale: ko,
                })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">수정일</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {format(new Date(quote.updatedAt), "yyyy년 MM월 dd일", {
                  locale: ko,
                })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">
                총 금액 (VAT 포함)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(Math.round(quote.totalAmount * 1.1))}원
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 인쇄용 스타일 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
