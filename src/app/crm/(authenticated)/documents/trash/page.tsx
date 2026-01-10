import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

export default function TrashPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">휴지통</h1>
        <p className="text-gray-500">삭제된 파일을 관리합니다. 7일 후 자동 삭제됩니다.</p>
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
          <p className="text-center text-gray-400 py-8">
            휴지통이 비어있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
