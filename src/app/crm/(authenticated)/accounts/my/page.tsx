"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  KeyRound,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";

interface ManagedAccount {
  id: string;
  platform: string;
  accountId: string;
  password: string;
  socialLogin: string | null;
  socialNote: string | null;
  isShared: boolean;
  owner: {
    id: string;
    name: string;
  };
  createdAt: string;
}

const socialLoginOptions = [
  { id: "NAVER", label: "네이버" },
  { id: "KAKAO", label: "카카오" },
  { id: "GOOGLE", label: "구글" },
  { id: "OTHER", label: "기타" },
];

export default function MyAccountsPage() {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ManagedAccount | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [platform, setPlatform] = useState("");
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [socialLogin, setSocialLogin] = useState("");
  const [socialNote, setSocialNote] = useState("");
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts?type=my");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPlatform("");
    setAccountId("");
    setPassword("");
    setSocialLogin("");
    setSocialNote("");
    setIsShared(false);
    setEditingAccount(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (account: ManagedAccount) => {
    setEditingAccount(account);
    setPlatform(account.platform);
    setAccountId(account.accountId);
    setPassword(account.password);
    setSocialLogin(account.socialLogin || "");
    setSocialNote(account.socialNote || "");
    setIsShared(account.isShared);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingAccount
        ? `/api/accounts/${editingAccount.id}`
        : "/api/accounts";
      const method = editingAccount ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          accountId,
          password,
          socialLogin: socialLogin || null,
          socialNote: socialNote || null,
          isShared,
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchAccounts();
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error saving account:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchAccounts();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      // HTTPS 환경에서는 navigator.clipboard 사용
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // HTTP 환경에서는 execCommand 사용
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getSocialLoginLabel = (value: string | null) => {
    if (!value) return "-";
    const option = socialLoginOptions.find((o) => o.id === value);
    return option ? option.label : value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 계정</h1>
          <p className="text-gray-500">내가 관리하는 계정 정보를 관리합니다.</p>
        </div>
        <Button onClick={openCreateDialog}>
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
          <CardDescription>저장된 계정 정보를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              등록된 계정이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>플랫폼</TableHead>
                  <TableHead>아이디</TableHead>
                  <TableHead>비밀번호</TableHead>
                  <TableHead>소셜로그인</TableHead>
                  <TableHead>공유</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.platform}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{account.accountId}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            copyToClipboard(account.accountId, `id-${account.id}`)
                          }
                        >
                          {copiedId === `id-${account.id}` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {visiblePasswords.has(account.id)
                            ? account.password
                            : "••••••••"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(account.id)}
                        >
                          {visiblePasswords.has(account.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            copyToClipboard(account.password, `pw-${account.id}`)
                          }
                        >
                          {copiedId === `pw-${account.id}` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSocialLoginLabel(account.socialLogin)}
                      {account.socialNote && (
                        <span className="text-gray-400 text-sm ml-1">
                          ({account.socialNote})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.isShared ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          공유
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(account)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "계정 수정" : "계정 추가"}
            </DialogTitle>
            <DialogDescription>
              플랫폼 계정 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="platform">플랫폼 *</Label>
                <Input
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="예: 네이버, 카페24, AWS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountId">아이디 *</Label>
                <Input
                  id="accountId"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="계정 아이디를 입력하세요"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialLogin">소셜로그인</Label>
                <Select value={socialLogin || undefined} onValueChange={setSocialLogin}>
                  <SelectTrigger>
                    <SelectValue placeholder="소셜로그인 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    {socialLoginOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {socialLogin && (
                <div className="space-y-2">
                  <Label htmlFor="socialNote">소셜로그인 비고</Label>
                  <Input
                    id="socialNote"
                    value={socialNote}
                    onChange={(e) => setSocialNote(e.target.value)}
                    placeholder="예: 홍길동 계정"
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isShared"
                  checked={isShared}
                  onCheckedChange={(checked) => setIsShared(checked as boolean)}
                />
                <Label htmlFor="isShared" className="text-sm font-normal">
                  다른 팀원과 공유하기
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
