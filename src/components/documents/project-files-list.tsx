"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  Eye,
  Trash2,
  FileText,
  Image,
  File,
  FolderOpen,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { WordPreview } from "./word-preview";

interface ProjectFile {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: Date;
  projectId: string | null;
  uploader: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  } | null;
}

interface ProjectFilesListProps {
  files: ProjectFile[];
  projects: { id: string; name: string }[];
}

export function ProjectFilesList({ files, projects }: ProjectFilesListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-5 w-5 text-gray-400" />;
    if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes("word") || mimeType.includes("document")) return <FileText className="h-5 w-5 text-blue-600" />;
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return <FileText className="h-5 w-5 text-orange-500" />;
    return <FileText className="h-5 w-5 text-gray-400" />;
  };

  const getFileType = (mimeType: string | null): string => {
    if (!mimeType) return "other";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("word") || mimeType.includes("document")) return "document";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "spreadsheet";
    return "other";
  };

  const isPreviewable = (mimeType: string | null) => {
    if (!mimeType) return false;
    return (
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    );
  };

  const isWordDocument = (mimeType: string | null) => {
    if (!mimeType) return false;
    return (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    );
  };

  const handleDelete = async (file: ProjectFile) => {
    if (!confirm(`"${file.originalName}" 파일을 삭제하시겠습니까?\n(휴지통으로 이동됩니다)`)) return;

    try {
      const response = await fetch(`/yacrm/api/files/${file.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete file");

      router.refresh();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("파일 삭제에 실패했습니다.");
    }
  };

  // 필터링
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.project?.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.uploader.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject =
      selectedProject === "all" || file.projectId === selectedProject;

    const matchesType =
      selectedType === "all" || getFileType(file.mimeType) === selectedType;

    return matchesSearch && matchesProject && matchesType;
  });

  // 프로젝트별 그룹핑
  const groupedByProject = filteredFiles.reduce((acc, file) => {
    const projectId = file.projectId || "no-project";
    const projectName = file.project?.name || "프로젝트 없음";
    if (!acc[projectId]) {
      acc[projectId] = {
        projectName,
        clientName: file.project?.client.name || "-",
        files: [],
      };
    }
    acc[projectId].files.push(file);
    return acc;
  }, {} as Record<string, { projectName: string; clientName: string; files: ProjectFile[] }>);

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="파일명, 프로젝트, 거래처, 업로더 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="프로젝트 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 프로젝트</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="파일 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="image">이미지</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="document">문서</SelectItem>
            <SelectItem value="spreadsheet">스프레드시트</SelectItem>
            <SelectItem value="other">기타</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 결과 수 */}
      <div className="text-sm text-gray-500">
        총 {filteredFiles.length}개의 파일
      </div>

      {/* 프로젝트별 파일 목록 */}
      {Object.entries(groupedByProject).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          검색 결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByProject).map(([projectId, group]) => (
            <div key={projectId} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-gray-500" />
                <Link
                  href={projectId !== "no-project" ? `/projects/${projectId}` : "#"}
                  className={projectId !== "no-project" ? "font-medium hover:underline" : "font-medium text-gray-500"}
                >
                  {group.projectName}
                </Link>
                {group.clientName !== "-" && (
                  <Badge variant="outline" className="ml-2">
                    {group.clientName}
                  </Badge>
                )}
                <span className="text-sm text-gray-500 ml-auto">
                  {group.files.length}개 파일
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>파일명</TableHead>
                    <TableHead>크기</TableHead>
                    <TableHead>업로더</TableHead>
                    <TableHead>업로드 일시</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.mimeType)}
                          <span className="font-medium">{file.originalName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                      <TableCell>{file.uploader.name}</TableCell>
                      <TableCell>
                        {format(new Date(file.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isPreviewable(file.mimeType) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewFile(file)}
                              title="미리보기"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <a href={`/yacrm/api/files/${file.id}/download`}>
                            <Button variant="ghost" size="sm" title="다운로드">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(file)}
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}

      {/* 미리보기 다이얼로그 */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewFile?.originalName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-auto max-h-[70vh]">
            {previewFile?.mimeType?.startsWith("image/") ? (
              <img
                src={`/yacrm/api/files/${previewFile.id}/preview`}
                alt={previewFile.originalName}
                className="max-w-full h-auto"
              />
            ) : previewFile?.mimeType === "application/pdf" ? (
              <iframe
                src={`/yacrm/api/files/${previewFile.id}/preview`}
                className="w-full h-[70vh]"
              />
            ) : isWordDocument(previewFile?.mimeType ?? null) ? (
              <WordPreview
                fileId={previewFile!.id}
                fileName={previewFile!.originalName}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
