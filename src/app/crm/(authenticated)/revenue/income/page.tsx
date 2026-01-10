import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Plus } from "lucide-react";

export default function IncomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매출 관리</h1>
          <p className="text-gray-500">매출을 확인하고 추가합니다.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          매출 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            매출 목록
          </CardTitle>
          <CardDescription>
            프로젝트별 및 추가 매출을 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400 py-8">
            등록된 매출이 없습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
