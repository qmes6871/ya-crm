"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [items, setItems] = useState<QuoteItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
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
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      alert("고객/회사명을 입력해주세요.");
      return;
    }

    if (items.length === 0 || items.every((item) => !item.description.trim())) {
      alert("최소 하나의 견적 항목을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientContact,
          validUntil: validUntil || null,
          note,
          status,
          items: items.filter((item) => item.description.trim()),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/crm/documents/quotes/${data.id}`);
      } else {
        const error = await res.json();
        alert(error.error || "견적서 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error creating quote:", error);
      alert("견적서 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/documents/quotes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">견적서 생성</h1>
          <p className="text-gray-500">새로운 견적서를 작성합니다.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
            <CardDescription>
              견적서를 받을 고객 정보를 입력하세요.
            </CardDescription>
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
                placeholder="고객명 또는 회사명"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientContact">연락처</Label>
              <Input
                id="clientContact"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="010-0000-0000"
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
                placeholder="추가 사항을 입력하세요"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>견적 항목</CardTitle>
            <CardDescription>견적 항목을 추가하세요.</CardDescription>
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
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>항목 설명</Label>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="예: 홈페이지 디자인"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>수량</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseInt(e.target.value) || 1)
                      }
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>단가 (원)</Label>
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
                <div className="text-right text-sm">
                  <span className="text-gray-500">소계: </span>
                  <span className="font-semibold">
                    {formatCurrency(item.quantity * item.unitPrice)}원
                  </span>
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

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">총 금액</span>
                <span className="font-bold">{formatCurrency(totalAmount)}원</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>부가세 (10%)</span>
                <span>{formatCurrency(Math.round(totalAmount * 0.1))}원</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-blue-600 pt-2 border-t">
                <span>총 합계 (VAT 포함)</span>
                <span>{formatCurrency(Math.round(totalAmount * 1.1))}원</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Link href="/crm/documents/quotes">
          <Button variant="outline">취소</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              견적서 저장
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
