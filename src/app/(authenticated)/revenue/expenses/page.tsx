"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TrendingDown, Plus, Pencil, Trash2, Loader2, Paperclip, X, FileText, Image as ImageIcon, Download } from "lucide-react";
import { format } from "date-fns";

const expenseCategories = [
  "인건비",
  "외주비",
  "서버/호스팅",
  "소프트웨어",
  "사무실",
  "마케팅",
  "세금/공과금",
  "기타",
];

interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  paidAt: string | null;
  attachments: Attachment[];
  createdAt: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

function formatNumberWithCommas(value: string) {
  const num = value.replace(/[^\d]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("ko-KR").format(parseInt(num));
}

function parseFormattedNumber(value: string) {
  return value.replace(/,/g, "");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

function isImageMime(mime: string | null) {
  return mime?.startsWith("image/") ?? false;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category: "기타",
    amount: "",
    description: "",
    paidAt: "",
  });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState<string[]>([]);

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAttachments, setPreviewAttachments] = useState<Attachment[]>([]);
  const [previewListOpen, setPreviewListOpen] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/yacrm/api/expenses?${params}`);
      if (res.ok) setExpenses(await res.json());
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const resetForm = () => {
    setForm({ category: "기타", amount: "", description: "", paidAt: "" });
    setNewFiles([]);
    setExistingAttachments([]);
    setRemoveAttachmentIds([]);
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      category: e.category,
      amount: e.amount.toString(),
      description: e.description || "",
      paidAt: e.paidAt ? e.paidAt.slice(0, 10) : "",
    });
    setNewFiles([]);
    setExistingAttachments(e.attachments || []);
    setRemoveAttachmentIds([]);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (id: string) => {
    setRemoveAttachmentIds((prev) => [...prev, id]);
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (!form.category || !form.amount || !form.paidAt) {
      alert("카테고리, 금액, 지급일은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("category", form.category);
      formData.append("amount", form.amount);
      formData.append("description", form.description);
      formData.append("paidAt", form.paidAt);
      for (const file of newFiles) {
        formData.append("files", file);
      }
      for (const id of removeAttachmentIds) {
        formData.append("removeAttachmentIds", id);
      }

      const url = editingId ? `/yacrm/api/expenses/${editingId}` : "/yacrm/api/expenses";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, body: formData });
      if (res.ok) {
        setDialogOpen(false);
        fetchExpenses();
      } else {
        const data = await res.json();
        alert(data.error || "저장에 실패했습니다.");
      }
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/yacrm/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) fetchExpenses();
      else alert("삭제에 실패했습니다.");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const setQuickRange = (type: "thisMonth" | "lastMonth" | "thisYear") => {
    const now = new Date();
    if (type === "thisMonth") {
      setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
      setEndDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);
    } else if (type === "lastMonth") {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setStartDate(`${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-01`);
      setEndDate(`${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(new Date(last.getFullYear(), last.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);
    } else if (type === "thisYear") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매입 관리</h1>
          <p className="text-gray-500">매입을 확인하고 추가합니다.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          매입 추가
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[160px]"
        />
        <span className="text-gray-400">~</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[160px]"
        />
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisMonth")}>이번 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("lastMonth")}>지난 달</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickRange("thisYear")}>올해</Button>
          <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>전체</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            매입 목록
          </CardTitle>
          <CardDescription>
            총 {expenses.length}건 | 합계: {formatCurrency(totalAmount)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-gray-400 py-8">등록된 매입이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-center">첨부</TableHead>
                  <TableHead className="text-right">설명</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      {e.paidAt ? format(new Date(e.paidAt), "yyyy-MM-dd") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(e.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {e.attachments?.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setPreviewAttachments(e.attachments);
                            setPreviewListOpen(true);
                          }}
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          <span className="text-xs">{e.attachments.length}</span>
                        </Button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate text-right">
                      {e.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "매입 수정" : "매입 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>카테고리 *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>금액 *</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumberWithCommas(form.amount)}
                onChange={(e) => setForm({ ...form, amount: parseFormattedNumber(e.target.value) })}
                placeholder="금액을 입력하세요"
              />
            </div>
            <div>
              <Label>지급일 *</Label>
              <Input
                type="date"
                value={form.paidAt}
                onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
              />
            </div>
            <div>
              <Label>설명</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="설명을 입력하세요"
              />
            </div>

            {/* File Attachments */}
            <div>
              <Label>첨부파일</Label>
              <div className="mt-1.5 space-y-2">
                {/* Existing attachments */}
                {existingAttachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    {isImageMime(att.mimeType) ? (
                      <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <button
                      type="button"
                      className="flex-1 text-left truncate hover:underline text-blue-600"
                      onClick={() => setPreviewUrl(`/yacrm/api/expenses/attachments/${att.id}`)}
                    >
                      {att.originalName}
                    </button>
                    <span className="text-xs text-gray-400 shrink-0">{formatFileSize(att.fileSize)}</span>
                    <button type="button" onClick={() => removeExistingAttachment(att.id)} className="text-red-400 hover:text-red-600 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* New files */}
                {newFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{formatFileSize(file.size)}</span>
                    <button type="button" onClick={() => removeNewFile(i)} className="text-red-400 hover:text-red-600 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" />
                  파일 첨부
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment List Dialog */}
      <Dialog open={previewListOpen} onOpenChange={setPreviewListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>첨부파일 목록</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {previewAttachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                {isImageMime(att.mimeType) ? (
                  <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <button
                  type="button"
                  className="flex-1 text-left truncate hover:underline text-blue-600"
                  onClick={() => {
                    setPreviewListOpen(false);
                    setPreviewUrl(`/yacrm/api/expenses/attachments/${att.id}`);
                  }}
                >
                  {att.originalName}
                </button>
                <span className="text-xs text-gray-400 shrink-0">{formatFileSize(att.fileSize)}</span>
                <a
                  href={`/yacrm/api/expenses/attachments/${att.id}`}
                  download
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>첨부파일 미리보기</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="미리보기"
                className="max-w-full max-h-[60vh] object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="hidden flex-col items-center gap-2 py-8 text-gray-400">
                <FileText className="h-12 w-12" />
                <p>미리보기를 지원하지 않는 파일입니다.</p>
              </div>
              <a href={previewUrl} download className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <Download className="h-4 w-4" />
                파일 다운로드
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
