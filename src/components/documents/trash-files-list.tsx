"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  RotateCcw,
  Trash2,
  FileText,
  Image,
  File,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface DeletedFile {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: Date;
  deletedAt: Date | null;
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

interface TrashFilesListProps {
  files: DeletedFile[];
}

export function TrashFilesList({ files }: TrashFilesListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DeletedFile | null>(null);
  const [bulkAction, setBulkAction] = useState<"restore" | "delete" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-5 w-5 text-gray-400" />;
    if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    return <FileText className="h-5 w-5 text-gray-400" />;
  };

  const getDaysUntilExpiry = (deletedAt: Date | null) => {
    if (!deletedAt) return 7;
    const now = new Date();
    const deleted = new Date(deletedAt);
    const expiryDate = new Date(deleted.getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return daysLeft;
  };

  const handleRestore = async (fileId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/yacrm/api/files/${fileId}/restore`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to restore file");

      router.refresh();
    } catch (error) {
      console.error("Error restoring file:", error);
      alert("파일 복원에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async (fileId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/yacrm/api/files/${fileId}/permanent`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete file permanently");

      router.refresh();
    } catch (error) {
      console.error("Error permanently deleting file:", error);
      alert("파일 영구 삭제에 실패했습니다.");
    } finally {
      setIsProcessing(false);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleBulkAction = async () => {
    if (selectedFiles.size === 0) return;

    setIsProcessing(true);
    try {
      const fileIds = Array.from(selectedFiles);

      if (bulkAction === "restore") {
        await Promise.all(
          fileIds.map((id) =>
            fetch(`/yacrm/api/files/${id}/restore`, { method: "POST" })
          )
        );
      } else if (bulkAction === "delete") {
        await Promise.all(
          fileIds.map((id) =>
            fetch(`/yacrm/api/files/${id}/permanent`, { method: "DELETE" })
          )
        );
      }

      setSelectedFiles(new Set());
      router.refresh();
    } catch (error) {
      console.error("Error processing bulk action:", error);
      alert("일괄 처리에 실패했습니다.");
    } finally {
      setIsProcessing(false);
      setBulkAction(null);
    }
  };

  const toggleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  // 필터링
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.project?.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.uploader.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* 검색 및 일괄 작업 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="파일명, 프로젝트, 거래처 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedFiles.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkAction("restore");
                handleBulkAction();
              }}
              disabled={isProcessing}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              선택 복원 ({selectedFiles.size})
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setBulkAction("delete");
                setDeleteDialogOpen(true);
              }}
              disabled={isProcessing}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              선택 삭제 ({selectedFiles.size})
            </Button>
          </div>
        )}
      </div>

      {/* 결과 수 */}
      <div className="text-sm text-gray-500">
        총 {filteredFiles.length}개의 파일
      </div>

      {/* 파일 목록 */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          검색 결과가 없습니다.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </TableHead>
              <TableHead>파일명</TableHead>
              <TableHead>프로젝트</TableHead>
              <TableHead>크기</TableHead>
              <TableHead>삭제 시간</TableHead>
              <TableHead>남은 시간</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.map((file) => {
              const daysLeft = getDaysUntilExpiry(file.deletedAt);
              const isExpired = daysLeft <= 0;
              const isExpiringSoon = daysLeft <= 2 && daysLeft > 0;

              return (
                <TableRow key={file.id} className={isExpired ? "bg-red-50" : isExpiringSoon ? "bg-orange-50" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleSelectFile(file.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      <span className="font-medium">{file.originalName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {file.project ? (
                      <Link
                        href={`/projects/${file.project.id}`}
                        className="hover:underline"
                      >
                        {file.project.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                  <TableCell>
                    {file.deletedAt ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {format(new Date(file.deletedAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {isExpired ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-3 w-3" />
                        만료됨
                      </Badge>
                    ) : isExpiringSoon ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-3 w-3" />
                        {daysLeft}일 남음
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-500">{daysLeft}일 남음</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(file.id)}
                        disabled={isProcessing}
                        title="복원"
                      >
                        <RotateCcw className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFileToDelete(file);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={isProcessing}
                        title="영구 삭제"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* 영구 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>영구 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete" ? (
                <>선택한 {selectedFiles.size}개의 파일을 영구 삭제하시겠습니까?</>
              ) : fileToDelete ? (
                <>&quot;{fileToDelete.originalName}&quot; 파일을 영구 삭제하시겠습니까?</>
              ) : null}
              <br />
              <span className="text-red-600 font-medium">이 작업은 되돌릴 수 없습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulkAction === "delete") {
                  handleBulkAction();
                } else if (fileToDelete) {
                  handlePermanentDelete(fileToDelete.id);
                }
              }}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              영구 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
