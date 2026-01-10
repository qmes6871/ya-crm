import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";

export default function SharedAccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전체 공유 계정</h1>
          <p className="text-gray-500">팀원 모두가 공유하는 계정 정보입니다.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          공유 계정 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            공유 계정 목록
          </CardTitle>
          <CardDescription>
            모든 팀원이 볼 수 있는 계정 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400 py-8">
            등록된 공유 계정이 없습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
