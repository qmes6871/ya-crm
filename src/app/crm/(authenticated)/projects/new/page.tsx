"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
}

interface PaymentEntry {
  type: string;
  amount: string;
}

const paymentTypes = [
  { id: "ADVANCE", label: "선수금" },
  { id: "MID_PAYMENT", label: "중도금" },
  { id: "BALANCE", label: "잔금" },
  { id: "FULL_PAYMENT", label: "전체지급" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  // Form state
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  useEffect(() => {
    // Check for clientId in URL params
    const urlClientId = searchParams.get("clientId");
    if (urlClientId) {
      setClientId(urlClientId);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch("/api/clients");
        if (response.ok) {
          const data = await response.json();
          setClients(data);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setIsLoadingClients(false);
      }
    }
    fetchClients();
  }, []);

  const addPayment = (type: string) => {
    if (!payments.find((p) => p.type === type)) {
      setPayments([...payments, { type, amount: "" }]);
    }
  };

  const formatNumberWithCommas = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/[^\d]/g, "");
    // Add commas
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const updatePaymentAmount = (type: string, amount: string) => {
    const formattedAmount = formatNumberWithCommas(amount);
    setPayments(
      payments.map((p) => (p.type === type ? { ...p, amount: formattedAmount } : p))
    );
  };

  const removePayment = (type: string) => {
    setPayments(payments.filter((p) => p.type !== type));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const paymentsData = payments
        .filter((p) => p.amount)
        .map((p) => ({
          type: p.type,
          amount: parseFloat(p.amount.replace(/,/g, "")),
        }));

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name,
          description,
          payments: paymentsData,
        }),
      });

      if (!response.ok) throw new Error("Failed to create project");

      router.push("/crm/projects");
      router.refresh();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("프로젝트 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로젝트 생성</h1>
          <p className="text-gray-500">새로운 프로젝트를 등록합니다.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 정보</CardTitle>
              <CardDescription>프로젝트의 기본 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">거래처 *</Label>
                {isLoadingClients ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    거래처 목록 로딩 중...
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    등록된 거래처가 없습니다.{" "}
                    <Link href="/crm/clients/new" className="text-blue-600 hover:underline">
                      거래처를 먼저 등록해주세요.
                    </Link>
                  </div>
                ) : (
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="거래처를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">프로젝트명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="프로젝트명을 입력하세요"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="프로젝트 설명을 입력하세요"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>매출</CardTitle>
              <CardDescription>매출 유형별 금액을 입력하세요. (선택사항)</CardDescription>
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
                {payments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    매출 유형 버튼을 클릭하여 추가하세요.
                  </p>
                ) : (
                  payments.map((payment) => (
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link href="/crm/projects">
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !clientId || !name}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "프로젝트 생성"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
