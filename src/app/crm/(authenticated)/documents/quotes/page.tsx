import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">견적서 관리</h1>
          <p className="text-gray-500">견적서를 생성하고 관리합니다.</p>
        </div>
        <Link href="/crm/documents/quotes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            견적서 생성
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            견적서 목록
          </CardTitle>
          <CardDescription>
            생성된 견적서를 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400 py-8">
            등록된 견적서가 없습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
