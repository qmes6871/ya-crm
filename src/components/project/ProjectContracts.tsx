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
import { FileSignature, Upload, Loader2, Download, Eye, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Contract {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: Date;
}

interface ProjectContractsProps {
  project: {
    id: string;
    contracts: Contract[];
  };
}

export function ProjectContracts({ project }: ProjectContractsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(e.target.files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`/yacrm/api/projects/${project.id}/contracts`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload contracts");

      router.refresh();
    } catch (error) {
      console.error("Error uploading contracts:", error);
      alert("계약서 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (contractId: string) => {
    if (!confirm("이 계약서를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/yacrm/api/projects/${project.id}/contracts/${contractId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete contract");

      router.refresh();
    } catch (error) {
      console.error("Error deleting contract:", error);
      alert("계약서 삭제에 실패했습니다.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isPreviewable = (mimeType: string | null) => {
    if (!mimeType) return false;
    return mimeType.startsWith("image/") || mimeType === "application/pdf";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            계약서
          </CardTitle>
          <CardDescription>프로젝트 계약서를 관리합니다.</CardDescription>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.hwp,image/*"
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
                계약서 업로드
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {project.contracts.length === 0 ? (
          <div className="text-center py-12">
            <FileSignature className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">계약서가 없습니다</h3>
            <p className="mt-2 text-gray-500">계약서를 업로드해주세요.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>파일명</TableHead>
                <TableHead>크기</TableHead>
                <TableHead>업로드 일시</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="font-medium">{contract.fileName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(contract.fileSize)}</TableCell>
                  <TableCell>
                    {format(new Date(contract.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {isPreviewable(contract.mimeType) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewContract(contract)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <a href={`/api/contracts/${contract.id}/download`}>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contract.id)}
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

        <Dialog open={!!previewContract} onOpenChange={() => setPreviewContract(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{previewContract?.fileName}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 overflow-auto max-h-[70vh]">
              {previewContract?.mimeType?.startsWith("image/") ? (
                <img
                  src={`/api/contracts/${previewContract.id}/preview`}
                  alt={previewContract.fileName}
                  className="max-w-full h-auto"
                />
              ) : previewContract?.mimeType === "application/pdf" ? (
                <iframe
                  src={`/api/contracts/${previewContract.id}/preview`}
                  className="w-full h-[70vh]"
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
