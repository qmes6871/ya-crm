"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Loader2, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserPermission {
  dashboard: boolean;
  attendance: boolean;
  clients: boolean;
  projects: boolean;
  leads: boolean;
  tasks: boolean;
  documents: boolean;
  accounts: boolean;
  servers: boolean;
  settlements: boolean;
  revenue: boolean;
  obSales: boolean;
  settings: boolean;
}

interface UserIncentive {
  advanceRate: number;
  midPaymentRate: number;
  balanceRate: number;
  fullPaymentRate: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions: UserPermission | null;
  incentives: UserIncentive | null;
}

const rolePresets: Record<string, { label: string; permissions: UserPermission }> = {
  ADMIN: {
    label: "관리자",
    permissions: {
      dashboard: true, attendance: true, clients: true, projects: true, leads: true, tasks: true,
      documents: true, accounts: true, servers: true, settlements: true, revenue: true,
      obSales: true, settings: true,
    },
  },
  DEVELOPER: {
    label: "개발자",
    permissions: {
      dashboard: true, attendance: true, clients: true, projects: true, leads: true, tasks: true,
      documents: true, accounts: true, servers: true, settlements: false, revenue: false,
      obSales: false, settings: false,
    },
  },
  SALES: {
    label: "영업진",
    permissions: {
      dashboard: false, attendance: true, clients: false, projects: false, leads: false, tasks: false,
      documents: false, accounts: false, servers: false, settlements: false, revenue: false,
      obSales: true, settings: false,
    },
  },
  USER: {
    label: "일반 사용자",
    permissions: {
      dashboard: true, attendance: true, clients: true, projects: true, leads: true, tasks: true,
      documents: true, accounts: true, servers: true, settlements: true, revenue: true,
      obSales: true, settings: false,
    },
  },
};

const defaultPermissions: UserPermission = rolePresets.USER.permissions;

const permissionLabels: Record<keyof UserPermission, string> = {
  dashboard: "대시보드",
  attendance: "출퇴근",
  clients: "거래처 관리",
  projects: "프로젝트 관리",
  leads: "가망고객 관리",
  tasks: "업무 관리",
  documents: "문서 관리",
  accounts: "계정 관리",
  servers: "서버 리스트",
  settlements: "정산 관리",
  revenue: "매출 관리",
  obSales: "OB영업",
  settings: "설정",
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // New user form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("USER");
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<UserPermission>(defaultPermissions);
  const [enableIncentive, setEnableIncentive] = useState(false);
  const [incentives, setIncentives] = useState<UserIncentive>({
    advanceRate: 0,
    midPaymentRate: 0,
    balanceRate: 0,
    fullPaymentRate: 0,
  });

  // Edit form
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("USER");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPermissions, setEditPermissions] = useState<UserPermission>(defaultPermissions);
  const [editEnableIncentive, setEditEnableIncentive] = useState(false);
  const [editIncentives, setEditIncentives] = useState<UserIncentive>({
    advanceRate: 0,
    midPaymentRate: 0,
    balanceRate: 0,
    fullPaymentRate: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/crm/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setRole("USER");
    setIsActive(true);
    setPermissions(defaultPermissions);
    setEnableIncentive(false);
    setIncentives({
      advanceRate: 0,
      midPaymentRate: 0,
      balanceRate: 0,
      fullPaymentRate: 0,
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/crm/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone || null,
          role,
          isActive,
          permissions,
          incentives: enableIncentive ? incentives : undefined,
        }),
      });

      if (res.ok) {
        resetForm();
        setIsDialogOpen(false);
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "사용자 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("사용자 추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditPhone(user.phone || "");
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditPermissions(user.permissions || defaultPermissions);
    setEditEnableIncentive(!!user.incentives);
    setEditIncentives(user.incentives || {
      advanceRate: 0,
      midPaymentRate: 0,
      balanceRate: 0,
      fullPaymentRate: 0,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const updateData: Record<string, unknown> = {
        name: editName,
        email: editEmail,
        phone: editPhone || null,
        role: editRole,
        isActive: editIsActive,
        permissions: editPermissions,
        incentives: editEnableIncentive ? editIncentives : null,
      };

      if (editPassword) {
        updateData.password = editPassword;
      }

      const res = await fetch(`/crm/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "사용자 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("사용자 수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("이 사용자를 삭제하시겠습니까? 관련된 모든 데이터가 삭제됩니다.")) return;

    try {
      const res = await fetch(`/crm/api/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "사용자 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("사용자 삭제에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자/권한 관리</h1>
          <p className="text-gray-500">사용자와 권한을 관리합니다.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              사용자 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 사용자 추가</DialogTitle>
              <DialogDescription>새로운 사용자를 추가합니다.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호 *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">역할</Label>
                  <Select value={role} onValueChange={(v) => { setRole(v); setPermissions({ ...rolePresets[v]?.permissions || defaultPermissions }); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(rolePresets).map(([key, preset]) => (
                        <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>상태</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={(checked) => setIsActive(checked as boolean)}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">활성</Label>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <Label>메뉴 접근 권한</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-lg">
                  {(Object.keys(permissionLabels) as Array<keyof UserPermission>).map((key) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${key}`}
                        checked={permissions[key]}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, [key]: checked as boolean })
                        }
                      />
                      <Label htmlFor={`perm-${key}`} className="cursor-pointer text-sm">
                        {permissionLabels[key]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incentives */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableIncentive"
                    checked={enableIncentive}
                    onCheckedChange={(checked) => setEnableIncentive(checked as boolean)}
                  />
                  <Label htmlFor="enableIncentive" className="cursor-pointer">인센티브 설정</Label>
                </div>
                {enableIncentive && (
                  <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="advanceRate">선수금 비율 (%)</Label>
                      <Input
                        id="advanceRate"
                        type="number"
                        min="0"
                        max="100"
                        value={incentives.advanceRate}
                        onChange={(e) =>
                          setIncentives({ ...incentives, advanceRate: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="midPaymentRate">중도금 비율 (%)</Label>
                      <Input
                        id="midPaymentRate"
                        type="number"
                        min="0"
                        max="100"
                        value={incentives.midPaymentRate}
                        onChange={(e) =>
                          setIncentives({ ...incentives, midPaymentRate: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="balanceRate">잔금 비율 (%)</Label>
                      <Input
                        id="balanceRate"
                        type="number"
                        min="0"
                        max="100"
                        value={incentives.balanceRate}
                        onChange={(e) =>
                          setIncentives({ ...incentives, balanceRate: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullPaymentRate">전체지급 비율 (%)</Label>
                      <Input
                        id="fullPaymentRate"
                        type="number"
                        min="0"
                        max="100"
                        value={incentives.fullPaymentRate}
                        onChange={(e) =>
                          setIncentives({ ...incentives, fullPaymentRate: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting || !name || !email || !password}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    "추가"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            사용자 목록
          </CardTitle>
          <CardDescription>
            총 {users.length}명의 사용자
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>인센티브</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {rolePresets[user.role]?.label || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "outline" : "destructive"}>
                      {user.isActive ? "활성" : "비활성"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.incentives ? (
                      <span className="text-sm text-gray-500">
                        선수금 {user.incentives.advanceRate}% /
                        잔금 {user.incentives.balanceRate}%
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>사용자 수정</DialogTitle>
            <DialogDescription>사용자 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName">이름 *</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">이메일 *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPassword">비밀번호 (변경시에만 입력)</Label>
                <Input
                  id="editPassword"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="새 비밀번호"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">연락처</Label>
                <Input
                  id="editPhone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editRole">역할</Label>
                <Select value={editRole} onValueChange={(v) => { setEditRole(v); setEditPermissions({ ...rolePresets[v]?.permissions || defaultPermissions }); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(rolePresets).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="editIsActive"
                    checked={editIsActive}
                    onCheckedChange={(checked) => setEditIsActive(checked as boolean)}
                  />
                  <Label htmlFor="editIsActive" className="cursor-pointer">활성</Label>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label>메뉴 접근 권한</Label>
              <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg">
                {(Object.keys(permissionLabels) as Array<keyof UserPermission>).map((key) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-perm-${key}`}
                      checked={editPermissions[key]}
                      onCheckedChange={(checked) =>
                        setEditPermissions({ ...editPermissions, [key]: checked as boolean })
                      }
                    />
                    <Label htmlFor={`edit-perm-${key}`} className="cursor-pointer text-sm">
                      {permissionLabels[key]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Incentives */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editEnableIncentive"
                  checked={editEnableIncentive}
                  onCheckedChange={(checked) => setEditEnableIncentive(checked as boolean)}
                />
                <Label htmlFor="editEnableIncentive" className="cursor-pointer">인센티브 설정</Label>
              </div>
              {editEnableIncentive && (
                <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="editAdvanceRate">선수금 비율 (%)</Label>
                    <Input
                      id="editAdvanceRate"
                      type="number"
                      min="0"
                      max="100"
                      value={editIncentives.advanceRate}
                      onChange={(e) =>
                        setEditIncentives({ ...editIncentives, advanceRate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editMidPaymentRate">중도금 비율 (%)</Label>
                    <Input
                      id="editMidPaymentRate"
                      type="number"
                      min="0"
                      max="100"
                      value={editIncentives.midPaymentRate}
                      onChange={(e) =>
                        setEditIncentives({ ...editIncentives, midPaymentRate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editBalanceRate">잔금 비율 (%)</Label>
                    <Input
                      id="editBalanceRate"
                      type="number"
                      min="0"
                      max="100"
                      value={editIncentives.balanceRate}
                      onChange={(e) =>
                        setEditIncentives({ ...editIncentives, balanceRate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editFullPaymentRate">전체지급 비율 (%)</Label>
                    <Input
                      id="editFullPaymentRate"
                      type="number"
                      min="0"
                      max="100"
                      value={editIncentives.fullPaymentRate}
                      onChange={(e) =>
                        setEditIncentives({ ...editIncentives, fullPaymentRate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || !editName || !editEmail}>
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
