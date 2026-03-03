"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Server, Save, Folder, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  client: {
    name: string;
  };
}

interface LocalFolder {
  name: string;
  path: string;
}

const serverTypes = [
  { value: "GENERAL", label: "일반형", price: "월 3,000원" },
  { value: "BUSINESS", label: "비즈니스", price: "월 8,000원" },
  { value: "FIRST_CLASS", label: "퍼스트클래스", price: "월 15,000원" },
  { value: "GIANT", label: "자이언트", price: "월 20,000원" },
  { value: "UNLIMITED_PLUS", label: "무제한 트래픽 플러스", price: "월 30,000원" },
  { value: "OTHER", label: "기타", price: "" },
];

const hostingProviders = [
  { value: "SELF", label: "자체 서버" },
  { value: "CAFE24", label: "카페24호스팅" },
  { value: "GABIA", label: "가비아" },
  { value: "AWS", label: "AWS" },
  { value: "OTHER", label: "기타" },
];

export default function EditServerPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [localFolders, setLocalFolders] = useState<LocalFolder[]>([]);
  const [showFtp, setShowFtp] = useState(false);
  const [showDb, setShowDb] = useState(false);
  const [formData, setFormData] = useState({
    projectId: "",
    name: "",
    serverType: "",
    serverTypeCustom: "",
    localPath: "",
    paymentDay: "",
    hostingProvider: "SELF",
    hostingProviderCustom: "",
    domain: "",
    githubUrl: "",
    adminUrl: "",
    adminId: "",
    adminPassword: "",
    ftpHost: "",
    ftpId: "",
    ftpPassword: "",
    ftpPort: "21",
    dbHost: "",
    dbPort: "5432",
    dbName: "",
    dbUser: "",
    dbPassword: "",
    note: "",
  });

  useEffect(() => {
    fetchProjects();
    fetchLocalFolders();
    fetchServer();
  }, [id]);

  const fetchServer = async () => {
    try {
      const response = await fetch(`/api/servers/${id}`);
      if (response.ok) {
        const server = await response.json();
        setFormData({
          projectId: server.projectId || "",
          name: server.name || "",
          serverType: server.serverType || "",
          serverTypeCustom: server.serverTypeCustom || "",
          localPath: server.localPath || "",
          paymentDay: server.paymentDay?.toString() || "",
          hostingProvider: server.hostingProvider || "SELF",
          hostingProviderCustom: server.hostingProviderCustom || "",
          domain: server.domain || "",
          githubUrl: server.githubUrl || "",
          adminUrl: server.adminUrl || "",
          adminId: server.adminId || "",
          adminPassword: server.adminPassword || "",
          ftpHost: server.ftpHost || "",
          ftpId: server.ftpId || "",
          ftpPassword: server.ftpPassword || "",
          ftpPort: server.ftpPort?.toString() || "21",
          dbHost: server.dbHost || "",
          dbPort: server.dbPort?.toString() || "5432",
          dbName: server.dbName || "",
          dbUser: server.dbUser || "",
          dbPassword: server.dbPassword || "",
          note: server.note || "",
        });

        // FTP 또는 DB 정보가 있으면 해당 섹션 표시
        if (server.ftpHost || server.ftpId) {
          setShowFtp(true);
        }
        if (server.dbHost || server.dbName) {
          setShowDb(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch server:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchLocalFolders = async () => {
    try {
      const response = await fetch("/api/servers/folders");
      if (response.ok) {
        const data = await response.json();
        setLocalFolders(data);
      }
    } catch (error) {
      console.error("Failed to fetch local folders:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/servers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push(`/crm/servers/${id}`);
      } else {
        const error = await response.json();
        alert(error.message || "서버 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to update server:", error);
      alert("서버 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/crm/servers/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">서버 수정</h1>
          <p className="text-gray-500">서버 정보를 수정합니다.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              기본 정보
            </CardTitle>
            <CardDescription>서버의 기본 정보를 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectId">연동 프로젝트 *</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => handleChange("projectId", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="프로젝트 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.client.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">서버명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="예: 메인 웹서버"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serverType">서버 타입</Label>
                <Select
                  value={formData.serverType || "none"}
                  onValueChange={(value) => handleChange("serverType", value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="서버 타입 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안함</SelectItem>
                    {serverTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} {type.price && `(${type.price})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.serverType === "OTHER" && (
                <div className="space-y-2">
                  <Label htmlFor="serverTypeCustom">기타 서버 타입</Label>
                  <Input
                    id="serverTypeCustom"
                    value={formData.serverTypeCustom}
                    onChange={(e) => handleChange("serverTypeCustom", e.target.value)}
                    placeholder="직접 입력"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDay">서버 비용 결제일</Label>
              <Select
                value={formData.paymentDay || "none"}
                onValueChange={(value) => handleChange("paymentDay", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="결제일 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      매월 {day}일
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="localPath" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                로컬 폴더 연동
              </Label>
              <Select
                value={formData.localPath || "none"}
                onValueChange={(value) => handleChange("localPath", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="연동할 폴더 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">연동 해제</SelectItem>
                  {localFolders.map((folder) => (
                    <SelectItem key={folder.path} value={folder.path}>
                      {folder.name} ({folder.path})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">/var/www 경로의 폴더와 연동합니다.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hostingProvider">호스팅 업체</Label>
                <Select
                  value={formData.hostingProvider}
                  onValueChange={(value) => handleChange("hostingProvider", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="호스팅 업체 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {hostingProviders.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.hostingProvider === "OTHER" && (
                <div className="space-y-2">
                  <Label htmlFor="hostingProviderCustom">기타 호스팅 업체</Label>
                  <Input
                    id="hostingProviderCustom"
                    value={formData.hostingProviderCustom}
                    onChange={(e) => handleChange("hostingProviderCustom", e.target.value)}
                    placeholder="호스팅 업체명 입력"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="domain">도메인</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => handleChange("domain", e.target.value)}
                  placeholder="예: example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="githubUrl">깃허브 경로</Label>
                <Input
                  id="githubUrl"
                  value={formData.githubUrl}
                  onChange={(e) => handleChange("githubUrl", e.target.value)}
                  placeholder="예: https://github.com/username/repo"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 관리자 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>관리자 정보</CardTitle>
            <CardDescription>웹사이트 관리자 접속 정보를 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminUrl">관리자 URL</Label>
              <Input
                id="adminUrl"
                value={formData.adminUrl}
                onChange={(e) => handleChange("adminUrl", e.target.value)}
                placeholder="예: https://example.com/admin"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminId">관리자 아이디</Label>
                <Input
                  id="adminId"
                  value={formData.adminId}
                  onChange={(e) => handleChange("adminId", e.target.value)}
                  placeholder="관리자 아이디"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">관리자 비밀번호</Label>
                <Input
                  id="adminPassword"
                  value={formData.adminPassword}
                  onChange={(e) => handleChange("adminPassword", e.target.value)}
                  placeholder="관리자 비밀번호"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FTP 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showFtp"
                checked={showFtp}
                onCheckedChange={(checked) => setShowFtp(checked as boolean)}
              />
              <div>
                <CardTitle className="cursor-pointer" onClick={() => setShowFtp(!showFtp)}>
                  FTP 정보
                </CardTitle>
                <CardDescription>FTP 접속 정보를 입력합니다.</CardDescription>
              </div>
            </div>
          </CardHeader>
          {showFtp && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ftpHost">FTP 호스트</Label>
                  <Input
                    id="ftpHost"
                    value={formData.ftpHost}
                    onChange={(e) => handleChange("ftpHost", e.target.value)}
                    placeholder="예: ftp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ftpPort">FTP 포트</Label>
                  <Input
                    id="ftpPort"
                    value={formData.ftpPort}
                    onChange={(e) => handleChange("ftpPort", e.target.value)}
                    placeholder="21"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ftpId">FTP 아이디</Label>
                  <Input
                    id="ftpId"
                    value={formData.ftpId}
                    onChange={(e) => handleChange("ftpId", e.target.value)}
                    placeholder="FTP 아이디"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ftpPassword">FTP 비밀번호</Label>
                  <Input
                    id="ftpPassword"
                    value={formData.ftpPassword}
                    onChange={(e) => handleChange("ftpPassword", e.target.value)}
                    placeholder="FTP 비밀번호"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* DB 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showDb"
                checked={showDb}
                onCheckedChange={(checked) => setShowDb(checked as boolean)}
              />
              <div>
                <CardTitle className="cursor-pointer" onClick={() => setShowDb(!showDb)}>
                  데이터베이스 정보
                </CardTitle>
                <CardDescription>데이터베이스 접속 정보를 입력합니다.</CardDescription>
              </div>
            </div>
          </CardHeader>
          {showDb && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dbHost">DB 호스트</Label>
                  <Input
                    id="dbHost"
                    value={formData.dbHost}
                    onChange={(e) => handleChange("dbHost", e.target.value)}
                    placeholder="예: localhost"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbPort">DB 포트</Label>
                  <Input
                    id="dbPort"
                    value={formData.dbPort}
                    onChange={(e) => handleChange("dbPort", e.target.value)}
                    placeholder="5432"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="dbName">DB 이름</Label>
                  <Input
                    id="dbName"
                    value={formData.dbName}
                    onChange={(e) => handleChange("dbName", e.target.value)}
                    placeholder="데이터베이스명"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbUser">DB 사용자</Label>
                  <Input
                    id="dbUser"
                    value={formData.dbUser}
                    onChange={(e) => handleChange("dbUser", e.target.value)}
                    placeholder="DB 사용자명"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbPassword">DB 비밀번호</Label>
                  <Input
                    id="dbPassword"
                    value={formData.dbPassword}
                    onChange={(e) => handleChange("dbPassword", e.target.value)}
                    placeholder="DB 비밀번호"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 메모 */}
        <Card>
          <CardHeader>
            <CardTitle>메모</CardTitle>
            <CardDescription>추가 메모사항을 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="추가 메모사항..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* 버튼 */}
        <div className="flex justify-end gap-4">
          <Link href={`/crm/servers/${id}`}>
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "저장 중..." : "서버 수정"}
          </Button>
        </div>
      </form>
    </div>
  );
}
