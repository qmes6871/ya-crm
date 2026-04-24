"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Edit,
  Loader2,
  ClipboardList,
  Target,
  ListChecks,
  Palette,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";

interface ProjectInstructionProps {
  project: {
    id: string;
    instructionPurpose: string | null;
    instructionFeatures: string | null;
    instructionDesign: string | null;
    instructionPages: string | null;
    instructionNotes: string | null;
  };
}

const sections = [
  {
    key: "instructionPurpose" as const,
    title: "목적 / 배경",
    icon: Target,
    placeholder: "프로젝트의 목적, 배경, 타겟 사용자 등을 기술하세요.",
    color: "text-blue-600",
  },
  {
    key: "instructionFeatures" as const,
    title: "주요 기능",
    icon: ListChecks,
    placeholder: "구현해야 할 핵심 기능 목록을 기술하세요.",
    color: "text-emerald-600",
  },
  {
    key: "instructionDesign" as const,
    title: "디자인 참고",
    icon: Palette,
    placeholder: "참고할 사이트, 톤앤매너, 컬러 가이드 등을 기술하세요.",
    color: "text-pink-600",
  },
  {
    key: "instructionPages" as const,
    title: "페이지 구성",
    icon: LayoutGrid,
    placeholder: "메뉴 / 사이트맵 / 주요 페이지 구조를 기술하세요.",
    color: "text-purple-600",
  },
  {
    key: "instructionNotes" as const,
    title: "특이사항",
    icon: AlertCircle,
    placeholder: "납품 형태, 제약사항, 주의점 등을 기술하세요.",
    color: "text-orange-600",
  },
];

export function ProjectInstruction({ project }: ProjectInstructionProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    instructionPurpose: project.instructionPurpose || "",
    instructionFeatures: project.instructionFeatures || "",
    instructionDesign: project.instructionDesign || "",
    instructionPages: project.instructionPages || "",
    instructionNotes: project.instructionNotes || "",
  });

  const hasEmptyField = sections.some((s) => !formData[s.key].trim());

  const handleSave = async () => {
    if (hasEmptyField) {
      alert("작업지시서의 모든 항목은 필수입니다.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/yacrm/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructionPurpose: formData.instructionPurpose,
          instructionFeatures: formData.instructionFeatures,
          instructionDesign: formData.instructionDesign,
          instructionPages: formData.instructionPages,
          instructionNotes: formData.instructionNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setIsEditOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating instruction:", error);
      alert("작업지시서 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = () => {
    setFormData({
      instructionPurpose: project.instructionPurpose || "",
      instructionFeatures: project.instructionFeatures || "",
      instructionDesign: project.instructionDesign || "",
      instructionPages: project.instructionPages || "",
      instructionNotes: project.instructionNotes || "",
    });
    setIsEditOpen(true);
  };

  const hasAny = sections.some((s) => project[s.key]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            작업지시서
          </CardTitle>
          <CardDescription>
            담당자가 개발에 참고할 상세 정보입니다. 모든 항목이 필수입니다.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Edit className="h-4 w-4 mr-2" />
          수정
        </Button>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            아직 작성된 작업지시서가 없습니다. <br />
            <span className="text-xs text-gray-400">우측 상단 "수정" 버튼으로 내용을 입력하세요.</span>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => {
              const value = project[section.key];
              const Icon = section.icon;
              return (
                <div key={section.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${section.color}`} />
                    <h3 className="font-semibold text-sm">{section.title}</h3>
                  </div>
                  {value ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap pl-6">
                      {value}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 pl-6">미입력</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>작업지시서 수정</DialogTitle>
            <DialogDescription>
              담당자가 개발 시 참고할 상세 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isEmpty = !formData[section.key].trim();
              return (
                <div key={section.key} className="space-y-2">
                  <Label htmlFor={section.key} className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${section.color}`} />
                    {section.title} *
                  </Label>
                  <Textarea
                    id={section.key}
                    value={formData[section.key]}
                    onChange={(e) =>
                      setFormData({ ...formData, [section.key]: e.target.value })
                    }
                    placeholder={section.placeholder}
                    rows={section.key === "instructionFeatures" ? 5 : 3}
                    required
                    className={isEmpty ? "border-red-300" : ""}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isLoading || hasEmptyField}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
