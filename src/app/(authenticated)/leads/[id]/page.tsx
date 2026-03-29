"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Edit,
  Trash2,
  User,
  Phone,
  Calendar,
  MessageSquare,
  DollarSign,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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

const resultColors: Record<string, string> = {
  NOT_CALCULATED: "bg-gray-100 text-gray-800",
  QUOTE_PROVIDED: "bg-blue-100 text-blue-800",
  QUOTE_SENT: "bg-purple-100 text-purple-800",
  MEETING: "bg-green-100 text-green-800",
  WAITING_RESPONSE: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

interface QuoteEntry {
  type: string;
  amount: string;
}

interface Lead {
  id: string;
  consultantId: string;
  consultDate: string;
  customerName: string;
  contact: string | null;
  inquiry: string | null;
  result: string;
  resultNote: string | null;
  createdAt: string;
  updatedAt: string;
  consultant: {
    id: string;
    name: string;
  };
  sources: {
    id: string;
    type: string;
    customType: string | null;
  }[];
  quotes: {
    id: string;
    type: string;
    amount: number;
  }[];
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [consultantId, setConsultantId] = useState("");
  const [consultDate, setConsultDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [customSource, setCustomSource] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [quotes, setQuotes] = useState<QuoteEntry[]>([]);
  const [result, setResult] = useState("");
  const [resultNote, setResultNote] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/crm/api/leads/${id}`).then((res) => res.json()),
      fetch("/crm/api/users").then((res) => res.json()),
    ])
      .then(([leadData, usersData]) => {
        setLead(leadData);
        setUsers(usersData);
        initFormData(leadData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  const initFormData = (leadData: Lead) => {
    setConsultantId(leadData.consultantId);
    setConsultDate(leadData.consultDate.split("T")[0]);
    setCustomerName(leadData.customerName);
    setContact(leadData.contact || "");
    setInquiry(leadData.inquiry || "");
    setResult(leadData.result);
    setResultNote(leadData.resultNote || "");

    // Sources
    const standardSources = leadData.sources
      .filter((s) => s.type !== "OTHER")
      .map((s) => s.type);
    setSelectedSources(standardSources);

    const otherSource = leadData.sources.find((s) => s.type === "OTHER");
    setCustomSource(otherSource?.customType || "");

    // Quotes
    setQuotes(
      leadData.quotes.map((q) => ({
        type: q.type,
        amount: q.amount.toString(),
      }))
    );
  };

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sourcesData: { type: string; customType: string | null }[] =
        selectedSources.map((type) => ({
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

      const response = await fetch(`/crm/api/leads/${id}`, {
        method: "PATCH",
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

      if (!response.ok) throw new Error("Failed to update lead");

      const updatedLead = await response.json();
      setLead(updatedLead);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating lead:", error);
      alert("가망고객 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 가망고객을 삭제하시겠습니까?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/crm/api/leads/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete lead");

      router.push("/leads");
      router.refresh();
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("가망고객 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelEdit = () => {
    if (lead) {
      initFormData(lead);
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">가망고객을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const totalQuote = lead.quotes.reduce((sum, q) => sum + q.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.customerName}
            </h1>
            <p className="text-gray-500">가망고객 상세정보</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                수정
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                삭제
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={cancelEdit}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        // Edit Mode
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>상담 정보</CardTitle>
              <CardDescription>상담 관련 정보를 수정하세요.</CardDescription>
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">연락처</Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inquiry">고객 문의사항</Label>
                <Textarea
                  id="inquiry"
                  value={inquiry}
                  onChange={(e) => setInquiry(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>유입 경로</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {sourceTypes.map((source) => (
                    <div key={source.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${source.id}`}
                        checked={selectedSources.includes(source.id)}
                        onCheckedChange={(checked) =>
                          handleSourceChange(source.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={`edit-${source.id}`} className="cursor-pointer">
                        {source.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>기타 (직접 입력)</Label>
                  <Input
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {paymentTypes.map((type) => (
                    <Button
                      key={type.id}
                      type="button"
                      variant={
                        quotes.find((q) => q.type === type.id) ? "default" : "outline"
                      }
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
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger>
                    <SelectValue />
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
      ) : (
        // View Mode
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>상담 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">상담자</p>
                  <p className="font-medium">{lead.consultant.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">상담날짜</p>
                  <p className="font-medium">
                    {format(new Date(lead.consultDate), "yyyy년 MM월 dd일", {
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
              {lead.contact && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">연락처</p>
                    <p className="font-medium">{lead.contact}</p>
                  </div>
                </div>
              )}
              {lead.inquiry && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">고객 문의사항</p>
                      <p className="mt-1 whitespace-pre-wrap">{lead.inquiry}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  유입 경로
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lead.sources.length === 0 ? (
                  <p className="text-gray-500">등록된 경로가 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {lead.sources.map((source, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {source.type === "OTHER"
                          ? source.customType || "기타"
                          : sourceTypes.find((s) => s.id === source.type)?.label ||
                            source.type}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  안내 금액
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lead.quotes.length === 0 ? (
                  <p className="text-gray-500">등록된 금액이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {lead.quotes.map((quote, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-gray-600">
                          {paymentTypes.find((p) => p.id === quote.type)?.label}
                        </span>
                        <span className="font-medium">
                          {quote.amount.toLocaleString()}원
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 font-bold">
                      <span>총 금액</span>
                      <span className="text-primary">
                        {totalQuote.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>결과</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`${resultColors[lead.result]} text-sm`}>
                  {lead.result === "OTHER"
                    ? lead.resultNote || "기타"
                    : resultOptions.find((r) => r.id === lead.result)?.label}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
