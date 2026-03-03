import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, AlertTriangle } from "lucide-react";
import { TrashFilesList } from "@/components/documents/trash-files-list";

async function getDeletedFiles() {
  const files = await prisma.file.findMany({
    where: { isDeleted: true },
    include: {
      uploader: {
        select: { id: true, name: true },
      },
      project: {
        select: {
          id: true,
          name: true,
          client: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { deletedAt: "desc" },
  });

  return files;
}

export default async function TrashPage() {
  const files = await getDeletedFiles();

  // 7일 이상 지난 파일 수
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const expiredFiles = files.filter(
    (f) => f.deletedAt && new Date(f.deletedAt) < sevenDaysAgo
  );

  // 총 용량
  const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">휴지통</h1>
        <p className="text-gray-500">삭제된 파일을 관리합니다. 7일 후 자동 삭제됩니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>삭제된 파일</CardDescription>
            <CardTitle className="text-2xl">{files.length}개</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>휴지통 용량</CardDescription>
            <CardTitle className="text-2xl">{formatTotalSize(totalSize)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={expiredFiles.length > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              {expiredFiles.length > 0 && <AlertTriangle className="h-4 w-4 text-orange-500" />}
              7일 경과 파일
            </CardDescription>
            <CardTitle className={`text-2xl ${expiredFiles.length > 0 ? "text-orange-600" : ""}`}>
              {expiredFiles.length}개
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            삭제된 파일
          </CardTitle>
          <CardDescription>
            복원하거나 영구 삭제할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">휴지통이 비어있습니다</h3>
              <p className="mt-2 text-gray-500">삭제된 파일이 없습니다.</p>
            </div>
          ) : (
            <TrashFilesList files={files} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
