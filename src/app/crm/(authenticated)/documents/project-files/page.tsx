import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { ProjectFilesList } from "@/components/documents/project-files-list";

async function getProjectFiles() {
  const files = await prisma.file.findMany({
    where: { isDeleted: false },
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
    orderBy: { createdAt: "desc" },
  });

  return files;
}

async function getProjects() {
  return prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function ProjectFilesPage() {
  const [files, projects] = await Promise.all([getProjectFiles(), getProjects()]);

  // 통계
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
  const projectCount = new Set(files.map(f => f.projectId).filter(Boolean)).size;

  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">프로젝트 파일</h1>
        <p className="text-gray-500">프로젝트별 파일을 관리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체 파일</CardDescription>
            <CardTitle className="text-2xl">{totalFiles}개</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체 용량</CardDescription>
            <CardTitle className="text-2xl">{formatTotalSize(totalSize)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>파일 보유 프로젝트</CardDescription>
            <CardTitle className="text-2xl">{projectCount}개</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            프로젝트 파일 목록
          </CardTitle>
          <CardDescription>
            프로젝트별로 업로드된 파일을 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">등록된 파일이 없습니다</h3>
              <p className="mt-2 text-gray-500">프로젝트에서 파일을 업로드해주세요.</p>
            </div>
          ) : (
            <ProjectFilesList files={files} projects={projects} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
