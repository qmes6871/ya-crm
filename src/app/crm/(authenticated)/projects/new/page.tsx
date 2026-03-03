"use client";

import { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, Loader2, Plus, X, Upload, FileText, Image, File } from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
}

interface User {
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

const serverCostOptions = [
  { id: "NONE", label: "미선택" },
  { id: "GENERAL", label: "일반형 (월 3,000원)" },
  { id: "BUSINESS", label: "비즈니스 (월 8,000원)" },
  { id: "FIRST_CLASS", label: "퍼스트클래스 (월 15,000원)" },
  { id: "GIANT", label: "자이언트 (월 20,000원)" },
  { id: "UNLIMITED_PLUS", label: "무제한 트래픽 플러스 (월 30,000원)" },
  { id: "OTHER", label: "기타" },
];

const maintenanceOptions = [
  { id: "NONE", label: "미선택" },
  { id: "BASIC_FREE", label: "기본 (무료)" },
  { id: "BASIC", label: "베이직 (월 5,000원)" },
  { id: "SPECIAL", label: "스페셜 (월 10,000원)" },
  { id: "PRO", label: "프로 (월 20,000원)" },
  { id: "PLUS", label: "플러스 (월 100,000원)" },
  { id: "OTHER", label: "기타" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Form state
  const [clientId, setClientId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [serverCost, setServerCost] = useState("NONE");
  const [serverCostCustom, setServerCostCustom] = useState("");
  const [maintenance, setMaintenance] = useState("NONE");
  const [maintenanceCustom, setMaintenanceCustom] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          const activeUsers = data.filter((user: User & { isActive: boolean }) => user.isActive);
          setUsers(activeUsers);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    fetchUsers();
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
    if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-gray-400" />;
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
          managerId: managerId || undefined,
          name,
          description,
          deadline,
          serverCost: serverCost !== "NONE" ? serverCost : null,
          serverCostCustom: serverCost === "OTHER" ? serverCostCustom : null,
          maintenance: maintenance !== "NONE" ? maintenance : null,
          maintenanceCustom: maintenance === "OTHER" ? maintenanceCustom : null,
          payments: paymentsData,
        }),
      });

      if (!response.ok) throw new Error("Failed to create project");

      const project = await response.json();

      // 첨부파일이 있으면 업로드
      if (attachedFiles.length > 0) {
        const formData = new FormData();
        attachedFiles.forEach((file) => {
          formData.append("files", file);
        });

        await fetch(`/api/projects/${project.id}/files`, {
          method: "POST",
          body: formData,
        });
      }

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
                <Label htmlFor="manager">담당자</Label>
                {isLoadingUsers ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    담당자 목록 로딩 중...
                  </div>
                ) : (
                  <Select value={managerId || undefined} onValueChange={setManagerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="담당자를 선택하세요 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
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
                <Label htmlFor="deadline">마감일 *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
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
              <div className="space-y-2">
                <Label>첨부파일</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      파일 선택
                    </Button>
                    <p className="text-xs text-gray-500">
                      여러 파일을 선택할 수 있습니다
                    </p>
                  </div>
                  {attachedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {getFileIcon(file.type)}
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-gray-400 shrink-0">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>서버비용 / 유지보수</CardTitle>
                <CardDescription>서버비용과 유지보수 옵션을 선택하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>서버비용</Label>
                  <Select value={serverCost} onValueChange={setServerCost}>
                    <SelectTrigger>
                      <SelectValue placeholder="서버비용을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {serverCostOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {serverCost === "OTHER" && (
                    <Input
                      value={serverCostCustom}
                      onChange={(e) => setServerCostCustom(e.target.value)}
                      placeholder="서버비용 직접 입력"
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>유지보수</Label>
                  <Select value={maintenance} onValueChange={setMaintenance}>
                    <SelectTrigger>
                      <SelectValue placeholder="유지보수를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {maintenanceOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {maintenance === "OTHER" && (
                    <Input
                      value={maintenanceCustom}
                      onChange={(e) => setMaintenanceCustom(e.target.value)}
                      placeholder="유지보수 직접 입력"
                      className="mt-2"
                    />
                  )}
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
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link href="/crm/projects">
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !clientId || !name || !deadline}>
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
