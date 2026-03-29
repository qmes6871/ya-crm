"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

const sourceTypes = [
  { id: "SOOMGO", label: "숨고" },
  { id: "KMONG", label: "크몽" },
  { id: "PHONE", label: "전화" },
  { id: "WEBSITE", label: "홈페이지 접수" },
];

const paymentTypes = [
  { id: "ADVANCE", label: "선수금" },
  { id: "MID_PAYMENT", label: "중도금" },
  { id: "BALANCE", label: "잔금" },
  { id: "FULL_PAYMENT", label: "전체지급" },
];

const resultOptions = [
  { id: "NOT_CALCULATED", label: "결과 미산출" },
  { id: "QUOTE_PROVIDED", label: "견적 안내" },
  { id: "QUOTE_SENT", label: "견적서 납기" },
  { id: "MEETING", label: "미팅" },
  { id: "WAITING_RESPONSE", label: "회신 기다리는중" },
  { id: "OTHER", label: "기타" },
];

interface QuoteEntry {
  type: string;
  amount: string;
}

export default function NewLeadPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [consultantId, setConsultantId] = useState("");
  const [consultDate, setConsultDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [customSource, setCustomSource] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [quotes, setQuotes] = useState<QuoteEntry[]>([]);
  const [result, setResult] = useState("NOT_CALCULATED");
  const [resultNote, setResultNote] = useState("");

  useEffect(() => {
    // Set default consultant to current user
    if (session?.user?.id) {
      setConsultantId(session.user.id);
    }

    // Fetch users for consultant selection
    fetch("/yacrm/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(console.error);
  }, [session]);

  const handleSourceChange = (sourceId: string, checked: boolean) => {
    if (checked) {
      setSelectedSources([...selectedSources, sourceId]);
    } else {
      setSelectedSources(selectedSources.filter((s) => s !== sourceId));
    }
  };

  const addQuote = (type: string) => {
    if (!quotes.find((q) => q.type === type)) {
      setQuotes([...quotes, { type, amount: "" }]);
    }
  };

  const updateQuoteAmount = (type: string, amount: string) => {
    setQuotes(quotes.map((q) => (q.type === type ? { ...q, amount } : q)));
  };

  const removeQuote = (type: string) => {
    setQuotes(quotes.filter((q) => q.type !== type));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const sourcesData: { type: string; customType: string | null }[] = selectedSources.map((type) => ({
        type,
        customType: null,
      }));

      if (customSource) {
        sourcesData.push({
          type: "OTHER",
          customType: customSource,
        });
      }

      const quotesData = quotes
        .filter((q) => q.amount)
        .map((q) => ({
          type: q.type,
          amount: parseFloat(q.amount.replace(/,/g, "")),
        }));

      const response = await fetch("/yacrm/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId,
          consultDate,
          customerName,
          contact,
          sources: sourcesData,
          inquiry,
          quotes: quotesData,
          result,
          resultNote: result === "OTHER" ? resultNote : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create lead");

      router.push("/leads");
      router.refresh();
    } catch (error) {
      console.error("Error creating lead:", error);
      alert("가망고객 등록에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">가망고객 추가</h1>
          <p className="text-gray-500">새로운 가망고객을 등록합니다.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* 상담 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>상담 정보</CardTitle>
              <CardDescription>상담 관련 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="consultant">상담자</Label>
                <Select value={consultantId} onValueChange={setConsultantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="상담자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultDate">상담날짜</Label>
                <Input
                  id="consultDate"
                  type="date"
                  value={consultDate}
                  onChange={(e) => setConsultDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">고객 성함 및 회사명 *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="고객명 또는 회사명"
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
                <Label htmlFor="inquiry">고객 문의사항</Label>
                <Textarea
                  id="inquiry"
                  value={inquiry}
                  onChange={(e) => setInquiry(e.target.value)}
                  placeholder="문의 내용을 입력하세요"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 경로 & 안내금액 & 결과 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>유입 경로</CardTitle>
                <CardDescription>고객의 유입 경로를 선택하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {sourceTypes.map((source) => (
                    <div key={source.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={source.id}
                        checked={selectedSources.includes(source.id)}
                        onCheckedChange={(checked) =>
                          handleSourceChange(source.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={source.id} className="cursor-pointer">
                        {source.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customSource">기타 (직접 입력)</Label>
                  <Input
                    id="customSource"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    placeholder="기타 경로 입력"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>안내 금액</CardTitle>
                <CardDescription>안내한 금액을 입력하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {paymentTypes.map((type) => (
                    <Button
                      key={type.id}
                      type="button"
                      variant={quotes.find((q) => q.type === type.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => addQuote(type.id)}
                      disabled={!!quotes.find((q) => q.type === type.id)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {type.label}
                    </Button>
                  ))}
                </div>
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <div key={quote.type} className="flex items-center gap-2">
                      <span className="w-20 text-sm font-medium">
                        {paymentTypes.find((t) => t.id === quote.type)?.label}
                      </span>
                      <Input
                        type="text"
                        value={quote.amount}
                        onChange={(e) => updateQuoteAmount(quote.type, e.target.value)}
                        placeholder="금액 입력"
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500">원</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuote(quote.type)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>결과</CardTitle>
                <CardDescription>상담 결과를 선택하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger>
                    <SelectValue placeholder="결과 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {resultOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {result === "OTHER" && (
                  <Input
                    value={resultNote}
                    onChange={(e) => setResultNote(e.target.value)}
                    placeholder="결과 비고 입력"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link href="/leads">
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !customerName}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "가망고객 등록"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
