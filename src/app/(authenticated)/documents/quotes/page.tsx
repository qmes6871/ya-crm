"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  FileDown,
} from "lucide-react";

interface Quote {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientContact?: string | null;
  validUntil?: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
  creator: {
    id: string;
    name: string;
  };
}


export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchQuotes = async () => {
    try {
      const res = await fetch("/yacrm/api/quotes");
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/yacrm/api/quotes/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setQuotes(quotes.filter((q) => q.id !== deleteId));
      }
    } catch (error) {
      console.error("Error deleting quote:", error);
    } finally {
      setDeleteId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">견적서 관리</h1>
          <p className="text-gray-500">견적서를 생성하고 관리합니다.</p>
        </div>
        <Link href="/documents/quotes/new">
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
          <CardDescription>생성된 견적서를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              등록된 견적서가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>견적번호</TableHead>
                  <TableHead>고객명</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>작성일</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => {
                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell>{quote.clientName}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(quote.totalAmount)}원
                      </TableCell>
                      <TableCell>
                        {format(new Date(quote.createdAt), "yyyy.MM.dd", {
                          locale: ko,
                        })}
                      </TableCell>
                      <TableCell>{quote.creator.name}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/documents/quotes/${quote.id}`}>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                상세보기
                              </DropdownMenuItem>
                            </Link>
                            <Link
                              href={`/documents/quotes/${quote.id}?edit=true`}
                            >
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                수정
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/documents/quotes/${quote.id}?pdf=true`}>
                              <DropdownMenuItem>
                                <FileDown className="mr-2 h-4 w-4" />
                                PDF 다운로드
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(quote.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>견적서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 견적서를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
