import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export default function ProjectFilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">프로젝트 파일</h1>
        <p className="text-gray-500">프로젝트별 파일을 관리합니다.</p>
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
          <p className="text-center text-gray-400 py-8">
            등록된 파일이 없습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
