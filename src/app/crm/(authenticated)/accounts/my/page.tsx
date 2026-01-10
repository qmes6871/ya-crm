import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Plus } from "lucide-react";

export default function MyAccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내가 관리하는 계정</h1>
          <p className="text-gray-500">다른 플랫폼의 계정 정보를 관리합니다.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          계정 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            계정 목록
          </CardTitle>
          <CardDescription>
            저장된 계정 정보를 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400 py-8">
            등록된 계정이 없습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
