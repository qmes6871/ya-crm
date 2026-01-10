import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function PersonalCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">개인 캘린더</h1>
        <p className="text-gray-500">내 일정을 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            내 캘린더
          </CardTitle>
          <CardDescription>
            업무 데드라인과 일정을 확인할 수 있습니다.
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
