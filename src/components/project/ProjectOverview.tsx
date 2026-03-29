"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Building2, User, Calendar, Edit, Loader2, Clock, Server, ExternalLink, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const statusLabels: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "기획", color: "bg-gray-100 text-gray-800" },
  FIRST_DRAFT: { label: "1차 시안 작업", color: "bg-blue-100 text-blue-800" },
  FIRST_DRAFT_REVIEW: { label: "1차 시안 공개", color: "bg-purple-100 text-purple-800" },
  REVISION: { label: "시안 수정", color: "bg-yellow-100 text-yellow-800" },
  FINAL_REVIEW: { label: "시안 공개", color: "bg-orange-100 text-orange-800" },
  OPEN: { label: "오픈", color: "bg-green-100 text-green-800" },
  COMPLETED: { label: "완료", color: "bg-emerald-100 text-emerald-800" },
};

const serverCostLabels: Record<string, string> = {
  GENERAL: "일반형 (월 3,000원)",
  BUSINESS: "비즈니스 (월 8,000원)",
  FIRST_CLASS: "퍼스트클래스 (월 15,000원)",
  GIANT: "자이언트 (월 20,000원)",
  UNLIMITED_PLUS: "무제한 트래픽 플러스 (월 30,000원)",
  OTHER: "기타",
};

const maintenanceLabels: Record<string, string> = {
  BASIC_FREE: "기본 (무료)",
  BASIC: "베이직 (월 5,000원)",
  SPECIAL: "스페셜 (월 10,000원)",
  PRO: "프로 (월 20,000원)",
  PLUS: "플러스 (월 100,000원)",
  OTHER: "기타",
};

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

interface ProjectOverviewProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    deadline: Date | null;
    serverCost: string | null;
    serverCostCustom: string | null;
    maintenance: string | null;
    maintenanceCustom: string | null;
    createdAt: Date;
    client: {
      id: string;
      name: string;
      contact: string | null;
      requestTypes: { type: string; customType: string | null }[];
    };
    manager: {
      id: string;
      name: string;
      email: string;
    };
    payments: { id: string; type: string; amount: number }[];
    servers: {
      id: string;
      name: string;
      domain: string | null;
      serverType: string | null;
      isActive: boolean;
      localPath: string | null;
    }[];
  };
  users: { id: string; name: string; email: string }[];
}

const requestTypeLabels: Record<string, string> = {
  WEB_DEV: "웹 개발",
  SHOPPING_MALL: "쇼핑몰 개발",
  APP_DEV: "앱 개발",
  PLATFORM_DEV: "플랫폼 개발",
  CRM_DEV: "CRM 개발",
  OTHER: "기타",
};

const paymentTypeLabels: Record<string, string> = {
  ADVANCE: "선수금",
  MID_PAYMENT: "중도금",
  BALANCE: "잔금",
  FULL_PAYMENT: "전체지급",
};

export function ProjectOverview({ project, users }: ProjectOverviewProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || "",
    status: project.status,
    progress: project.progress,
    managerId: project.manager.id,
    deadline: project.deadline ? format(new Date(project.deadline), "yyyy-MM-dd") : "",
    serverCost: project.serverCost || "NONE",
    serverCostCustom: project.serverCostCustom || "",
    maintenance: project.maintenance || "NONE",
    maintenanceCustom: project.maintenanceCustom || "",
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/crm/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          serverCost: formData.serverCost !== "NONE" ? formData.serverCost : null,
          serverCostCustom: formData.serverCost === "OTHER" ? formData.serverCostCustom : null,
          maintenance: formData.maintenance !== "NONE" ? formData.maintenance : null,
          maintenanceCustom: formData.maintenance === "OTHER" ? formData.maintenanceCustom : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update project");

      setIsEditOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating project:", error);
      alert("프로젝트 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPayment = project.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* 연동된 서버 */}
      {project.servers && project.servers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              연동된 서버
            </CardTitle>
            <CardDescription>이 프로젝트에 연동된 서버 목록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.servers.map((server) => (
                <div
                  key={server.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    !server.isActive ? "bg-red-50 border-red-200" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {server.isActive ? (
                      <Power className="h-4 w-4 text-green-500" />
                    ) : (
                      <PowerOff className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <Link
                        href={`/servers/${server.id}`}
                        className="font-medium hover:underline"
                      >
                        {server.name}
                      </Link>
                      {server.domain && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <a
                            href={server.domain.startsWith("http") ? server.domain : `https://${server.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            {server.domain.replace(/^https?:\/\//, "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {server.serverType && (
                      <Badge variant="secondary" className="text-xs">
                        {serverCostLabels[server.serverType]?.replace(/ \(.*\)/, "") || server.serverType}
                      </Badge>
                    )}
                    <Badge className={server.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {server.isActive ? "활성" : "중단"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>프로젝트 정보</CardTitle>
            <CardDescription>프로젝트 기본 정보</CardDescription>
          </div>
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                수정
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>프로젝트 수정</DialogTitle>
                <DialogDescription>프로젝트 정보를 수정합니다.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">프로젝트명</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager">담당자</Label>
                  <Select
                    value={formData.managerId}
                    onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="deadline">마감일</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>서버비용</Label>
                  <Select
                    value={formData.serverCost}
                    onValueChange={(value) => setFormData({ ...formData, serverCost: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serverCostOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.serverCost === "OTHER" && (
                    <Input
                      value={formData.serverCostCustom}
                      onChange={(e) => setFormData({ ...formData, serverCostCustom: e.target.value })}
                      placeholder="서버비용 직접 입력"
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>유지보수</Label>
                  <Select
                    value={formData.maintenance}
                    onValueChange={(value) => setFormData({ ...formData, maintenance: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {maintenanceOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.maintenance === "OTHER" && (
                    <Input
                      value={formData.maintenanceCustom}
                      onChange={(e) => setFormData({ ...formData, maintenanceCustom: e.target.value })}
                      placeholder="유지보수 직접 입력"
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">상태</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="progress">진행률 ({formData.progress}%)</Label>
                  <Input
                    id="progress"
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    "저장"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">상태</span>
            <Badge className={statusLabels[project.status]?.color}>
              {statusLabels[project.status]?.label}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">진행률</span>
              <span className="text-sm font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">담당자</span>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">{project.manager.name}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">마감일</span>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              {project.deadline ? (
                <span className={`text-sm font-medium ${
                  new Date(project.deadline) < new Date() ? "text-red-600" : ""
                }`}>
                  {format(new Date(project.deadline), "yyyy년 MM월 dd일", { locale: ko })}
                </span>
              ) : (
                <span className="text-sm text-gray-400">미설정</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">서버비용</span>
            <span className="text-sm font-medium">
              {project.serverCost === "OTHER"
                ? project.serverCostCustom
                : project.serverCost
                  ? serverCostLabels[project.serverCost]
                  : <span className="text-gray-400">미설정</span>}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">유지보수</span>
            <span className="text-sm font-medium">
              {project.maintenance === "OTHER"
                ? project.maintenanceCustom
                : project.maintenance
                  ? maintenanceLabels[project.maintenance]
                  : <span className="text-gray-400">미설정</span>}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">생성일</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm">
                {format(new Date(project.createdAt), "yyyy년 MM월 dd일", { locale: ko })}
              </span>
            </div>
          </div>
          {project.description && (
            <div className="pt-4 border-t">
              <span className="text-sm text-gray-500">설명</span>
              <p className="mt-1 text-sm">{project.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            거래처 정보
          </CardTitle>
          <CardDescription>연결된 거래처 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">거래처명</span>
            <span className="text-sm font-medium">{project.client.name}</span>
          </div>
          {project.client.contact && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">연락처</span>
              <span className="text-sm">{project.client.contact}</span>
            </div>
          )}
          {project.client.requestTypes.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-gray-500">의뢰 유형</span>
              <div className="flex flex-wrap gap-1">
                {project.client.requestTypes.map((rt, i) => (
                  <Badge key={i} variant="outline">
                    {rt.type === "OTHER" ? rt.customType : requestTypeLabels[rt.type]}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="pt-4 border-t space-y-2">
            <span className="text-sm text-gray-500">프로젝트 매출</span>
            {project.payments.length > 0 ? (
              <>
                {project.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                    <span>{paymentTypeLabels[payment.type]}</span>
                    <span className="font-medium">
                      {payment.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t font-medium">
                  <span>총 금액</span>
                  <span className="text-primary">{totalPayment.toLocaleString()}원</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">등록된 매출이 없습니다.</p>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
