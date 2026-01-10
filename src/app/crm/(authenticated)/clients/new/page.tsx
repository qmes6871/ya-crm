"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

const requestTypes = [
  { id: "WEB_DEV", label: "웹 개발" },
  { id: "SHOPPING_MALL", label: "쇼핑몰 개발" },
  { id: "APP_DEV", label: "앱 개발" },
  { id: "PLATFORM_DEV", label: "플랫폼 개발" },
  { id: "CRM_DEV", label: "CRM 개발" },
];

const paymentTypes = [
  { id: "ADVANCE", label: "선수금" },
  { id: "MID_PAYMENT", label: "중도금" },
  { id: "BALANCE", label: "잔금" },
  { id: "FULL_PAYMENT", label: "전체지급" },
];

interface PaymentEntry {
  type: string;
  amount: string;
}

export default function NewClientPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [firstDraftDate, setFirstDraftDate] = useState("");
  const [requirements, setRequirements] = useState("");
  const [selectedRequestTypes, setSelectedRequestTypes] = useState<string[]>([]);
  const [customRequestType, setCustomRequestType] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  const handleRequestTypeChange = (typeId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequestTypes([...selectedRequestTypes, typeId]);
    } else {
      setSelectedRequestTypes(selectedRequestTypes.filter((t) => t !== typeId));
    }
  };

  const addPayment = (type: string) => {
    if (!payments.find((p) => p.type === type)) {
      setPayments([...payments, { type, amount: "" }]);
    }
  };

  const updatePaymentAmount = (type: string, amount: string) => {
    setPayments(
      payments.map((p) => (p.type === type ? { ...p, amount } : p))
    );
  };

  const removePayment = (type: string) => {
    setPayments(payments.filter((p) => p.type !== type));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const requestTypesData = selectedRequestTypes.map((type) => ({
        type,
        customType: type === "OTHER" ? customRequestType : null,
      }));

      if (customRequestType && !selectedRequestTypes.includes("OTHER")) {
        requestTypesData.push({
          type: "OTHER",
          customType: customRequestType,
        });
      }

      const paymentsData = payments
        .filter((p) => p.amount)
        .map((p) => ({
          type: p.type,
          amount: parseFloat(p.amount.replace(/,/g, "")),
        }));

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          contractDate: contractDate || null,
          firstDraftDate: firstDraftDate || null,
          requirements,
          requestTypes: requestTypesData,
          payments: paymentsData,
        }),
      });

      if (!response.ok) throw new Error("Failed to create client");

      router.push("/crm/clients");
      router.refresh();
    } catch (error) {
      console.error("Error creating client:", error);
      alert("거래처 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">거래처 추가</h1>
          <p className="text-gray-500">새로운 거래처를 등록합니다.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>거래처의 기본 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">거래처명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="거래처명을 입력하세요"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">연락처</Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractDate">계약날짜</Label>
                <Input
                  id="contractDate"
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstDraftDate">1차 시안 공유 일정</Label>
                <Input
                  id="firstDraftDate"
                  type="date"
                  value={firstDraftDate}
                  onChange={(e) => setFirstDraftDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">진행 요청사항</Label>
                <Textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="진행 요청사항을 입력하세요"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 의뢰 유형 & 매출 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>의뢰 유형</CardTitle>
                <CardDescription>해당하는 의뢰 유형을 선택하세요. (다중 선택 가능)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {requestTypes.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.id}
                        checked={selectedRequestTypes.includes(type.id)}
                        onCheckedChange={(checked) =>
                          handleRequestTypeChange(type.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={type.id} className="cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customType">비고 (기타 유형)</Label>
                  <Input
                    id="customType"
                    value={customRequestType}
                    onChange={(e) => setCustomRequestType(e.target.value)}
                    placeholder="직접 입력"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>매출</CardTitle>
                <CardDescription>매출 유형별 금액을 입력하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {paymentTypes.map((type) => (
                    <Button
                      key={type.id}
                      type="button"
                      variant={payments.find((p) => p.type === type.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => addPayment(type.id)}
                      disabled={!!payments.find((p) => p.type === type.id)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {type.label}
                    </Button>
                  ))}
                </div>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.type} className="flex items-center gap-2">
                      <span className="w-20 text-sm font-medium">
                        {paymentTypes.find((t) => t.id === payment.type)?.label}
                      </span>
                      <Input
                        type="text"
                        value={payment.amount}
                        onChange={(e) => updatePaymentAmount(payment.type, e.target.value)}
                        placeholder="금액 입력"
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500">원</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePayment(payment.type)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link href="/crm/clients">
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !name}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "거래처 등록"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
