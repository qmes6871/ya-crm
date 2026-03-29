"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderOpen, Upload, Loader2, Download, Eye, Trash2, FileText, Image, File, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { WordPreview } from "@/components/documents/word-preview";

interface ProjectFile {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: Date;
  uploader: {
    id: string;
    name: string;
  };
}

interface ProjectFilesProps {
  project: {
    id: string;
    files: ProjectFile[];
  };
}

export function ProjectFiles({ project }: ProjectFilesProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(e.target.files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`/yacrm/api/projects/${project.id}/files`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload files");

      router.refresh();
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("이 파일을 삭제하시겠습니까? (휴지통으로 이동됩니다)")) return;

    try {
      const response = await fetch(`/yacrm/api/projects/${project.id}/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete file");

      router.refresh();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("파일 삭제에 실패했습니다.");
    }
  };

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            프로젝트 파일
          </CardTitle>
          <CardDescription>
            프로젝트 관련 파일을 관리합니다. (문서관리와 연동됩니다)
          </CardDescription>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                파일 업로드
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {project.files.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">파일이 없습니다</h3>
            <p className="mt-2 text-gray-500">파일을 업로드해주세요.</p>
          </div>
        ) : (
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
              {project.files.map((file) => (
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
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <a href={`/api/files/${file.id}/download`}>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{previewFile?.originalName}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 overflow-auto max-h-[70vh]">
              {previewFile?.mimeType?.startsWith("image/") ? (
                <img
                  src={`/api/files/${previewFile.id}/preview`}
                  alt={previewFile.originalName}
                  className="max-w-full h-auto"
                />
              ) : previewFile?.mimeType === "application/pdf" ? (
                <iframe
                  src={`/api/files/${previewFile.id}/preview`}
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
      </CardContent>
    </Card>
  );
}
