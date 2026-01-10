import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function AllTasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">전체 업무</h1>
        <p className="text-gray-500">모든 사용자의 업무를 확인합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            전체 업무 목록
          </CardTitle>
          <CardDescription>
            모든 팀원의 업무 현황을 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400 py-8">
            곧 구현될 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
