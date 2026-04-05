"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, Plus, Edit, Trash2, Loader2 } from "lucide-react";

const paymentTypeLabels: Record<string, { label: string; color: string }> = {
  ADVANCE: { label: "선수금", color: "bg-blue-100 text-blue-700" },
  MID_PAYMENT: { label: "중도금", color: "bg-yellow-100 text-yellow-700" },
  BALANCE: { label: "잔금", color: "bg-green-100 text-green-700" },
  FULL_PAYMENT: { label: "전체지급", color: "bg-purple-100 text-purple-700" },
};

interface Payment {
  id: string;
  type: string;
  amount: number;
}

interface ProjectPaymentsProps {
  project: {
    id: string;
    payments: Payment[];
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

function formatNumberWithCommas(value: string) {
  const numbers = value.replace(/[^\d]/g, "");
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseFormattedNumber(value: string) {
  return parseFloat(value.replace(/,/g, "")) || 0;
}

export function ProjectPayments({ project }: ProjectPaymentsProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [newPayment, setNewPayment] = useState({
    type: "",
    amount: "",
  });

  const handleAddPayment = async () => {
    if (!newPayment.type || !newPayment.amount) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/yacrm/api/projects/${project.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newPayment.type,
          amount: parseFormattedNumber(newPayment.amount),
        }),
      });

      if (!response.ok) throw new Error("Failed to add payment");

      setIsAddOpen(false);
      setNewPayment({ type: "", amount: "" });
      router.refresh();
    } catch (error) {
      console.error("Error adding payment:", error);
      alert("매출 추가에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedPayment) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/yacrm/api/projects/${project.id}/payments/${selectedPayment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: selectedPayment.type,
            amount: parseFormattedNumber(editAmount),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update payment");

      setIsEditOpen(false);
      setSelectedPayment(null);
      setEditAmount("");
      router.refresh();
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("매출 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("이 매출 내역을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(
        `/yacrm/api/projects/${project.id}/payments/${paymentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete payment");

      router.refresh();
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("매출 삭제에 실패했습니다.");
    }
  };

  const totalAmount = project.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            매출 관리
          </CardTitle>
          <CardDescription>
            총 매출: {formatCurrency(totalAmount)}
          </CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              매출 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>매출 추가</DialogTitle>
              <DialogDescription>새로운 매출 내역을 추가합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="paymentType">매출 유형 *</Label>
                <Select
                  value={newPayment.type}
                  onValueChange={(value) =>
                    setNewPayment({ ...newPayment, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADVANCE">선수금</SelectItem>
                    <SelectItem value="MID_PAYMENT">중도금</SelectItem>
                    <SelectItem value="BALANCE">잔금</SelectItem>
                    <SelectItem value="FULL_PAYMENT">전체지급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">금액 *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="amount"
                    type="text"
                    value={newPayment.amount}
                    onChange={(e) =>
                      setNewPayment({ ...newPayment, amount: formatNumberWithCommas(e.target.value) })
                    }
                    placeholder="금액을 입력하세요"
                  />
                  <span className="text-sm text-gray-500">원</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleAddPayment}
                disabled={isLoading || !newPayment.type || !newPayment.amount}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    추가 중...
                  </>
                ) : (
                  "추가"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {project.payments.length === 0 ? (
          <div className="text-center py-12">
            <Banknote className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">매출 내역이 없습니다</h3>
            <p className="mt-2 text-gray-500">매출 내역을 추가해주세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {project.payments.map((payment) => {
              const typeInfo = paymentTypeLabels[payment.type] || {
                label: payment.type,
                color: "bg-gray-100 text-gray-700",
              };

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-white"
                >
                  <div className="flex items-center gap-4">
                    <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                    <span className="font-medium text-lg">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setEditAmount(formatNumberWithCommas(payment.amount.toString()));
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePayment(payment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Total Row */}
            <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-300 bg-gray-50 mt-4">
              <span className="font-bold text-gray-700">총 합계</span>
              <span className="font-bold text-lg text-blue-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>매출 수정</DialogTitle>
              <DialogDescription>매출 내역을 수정합니다.</DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editPaymentType">매출 유형</Label>
                  <Select
                    value={selectedPayment.type}
                    onValueChange={(value) =>
                      setSelectedPayment({ ...selectedPayment, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADVANCE">선수금</SelectItem>
                      <SelectItem value="MID_PAYMENT">중도금</SelectItem>
                      <SelectItem value="BALANCE">잔금</SelectItem>
                      <SelectItem value="FULL_PAYMENT">전체지급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAmount">금액</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="editAmount"
                      type="text"
                      value={editAmount}
                      onChange={(e) => setEditAmount(formatNumberWithCommas(e.target.value))}
                    />
                    <span className="text-sm text-gray-500">원</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                취소
              </Button>
              <Button onClick={handleUpdatePayment} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
