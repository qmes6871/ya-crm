"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink, Search, X } from "lucide-react";
import { ServerUsageCompact } from "./server-usage-compact";

interface Server {
  id: string;
  name: string;
  serverType: string | null;
  serverTypeCustom: string | null;
  localPath: string | null;
  domain: string | null;
  hostingProvider: string | null;
  hostingProviderCustom: string | null;
  isActive: boolean;
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
}

interface ServerListFilterProps {
  servers: Server[];
}

const serverTypeLabels: Record<string, { label: string }> = {
  GENERAL: { label: "일반형" },
  BUSINESS: { label: "비즈니스" },
  FIRST_CLASS: { label: "퍼스트클래스" },
  GIANT: { label: "자이언트" },
  UNLIMITED_PLUS: { label: "무제한 트래픽 플러스" },
  OTHER: { label: "기타" },
};

const serverTypeColors: Record<string, string> = {
  GENERAL: "bg-gray-100 text-gray-800",
  BUSINESS: "bg-blue-100 text-blue-800",
  FIRST_CLASS: "bg-purple-100 text-purple-800",
  GIANT: "bg-orange-100 text-orange-800",
  UNLIMITED_PLUS: "bg-red-100 text-red-800",
  OTHER: "bg-yellow-100 text-yellow-800",
};

const hostingProviderLabels: Record<string, string> = {
  SELF: "자체 서버",
  CAFE24: "카페24호스팅",
  GABIA: "가비아",
  AWS: "AWS",
  OTHER: "기타",
};

export function ServerListFilter({ servers }: ServerListFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [serverTypeFilter, setServerTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hostingFilter, setHostingFilter] = useState<string>("all");

  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      // 검색어 필터
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          server.name.toLowerCase().includes(search) ||
          server.project.name.toLowerCase().includes(search) ||
          server.project.client.name.toLowerCase().includes(search) ||
          (server.domain && server.domain.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // 서버 타입 필터
      if (serverTypeFilter !== "all" && server.serverType !== serverTypeFilter) {
        return false;
      }

      // 상태 필터
      if (statusFilter !== "all") {
        if (statusFilter === "active" && !server.isActive) return false;
        if (statusFilter === "suspended" && server.isActive) return false;
      }

      // 호스팅 필터
      if (hostingFilter !== "all" && server.hostingProvider !== hostingFilter) {
        return false;
      }

      return true;
    });
  }, [servers, searchTerm, serverTypeFilter, statusFilter, hostingFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setServerTypeFilter("all");
    setStatusFilter("all");
    setHostingFilter("all");
  };

  const hasActiveFilters =
    searchTerm || serverTypeFilter !== "all" || statusFilter !== "all" || hostingFilter !== "all";

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 items-center">
        <div className="relative col-span-2 sm:flex-1 sm:min-w-[200px] sm:max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="서버명, 프로젝트, 거래처, 도메인 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={serverTypeFilter} onValueChange={setServerTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="서버 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 타입</SelectItem>
            {Object.entries(serverTypeLabels).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="suspended">중단</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hostingFilter} onValueChange={setHostingFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="호스팅" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 호스팅</SelectItem>
            {Object.entries(hostingProviderLabels).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 col-span-2 sm:col-span-1">
            <X className="h-4 w-4 mr-1" />
            필터 초기화
          </Button>
        )}
      </div>

      {/* 결과 카운트 */}
      <div className="text-sm text-gray-500">
        {hasActiveFilters ? (
          <>
            검색 결과: <span className="font-medium">{filteredServers.length}</span>개
            {filteredServers.length !== servers.length && (
              <span className="text-gray-400"> (전체 {servers.length}개)</span>
            )}
          </>
        ) : (
          <>
            총 <span className="font-medium">{servers.length}</span>개의 서버
          </>
        )}
      </div>

      {/* 테이블 */}
      {filteredServers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {hasActiveFilters ? "검색 결과가 없습니다." : "등록된 서버가 없습니다."}
        </div>
      ) : (
        <div className="overflow-x-auto"><Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs md:text-sm">상태</TableHead>
              <TableHead className="text-xs md:text-sm">서버명</TableHead>
              <TableHead className="text-xs md:text-sm hidden md:table-cell">프로젝트</TableHead>
              <TableHead className="text-xs md:text-sm hidden lg:table-cell">거래처</TableHead>
              <TableHead className="text-xs md:text-sm hidden md:table-cell">서버 타입</TableHead>
              <TableHead className="text-xs md:text-sm hidden lg:table-cell">사용량</TableHead>
              <TableHead className="text-xs md:text-sm hidden md:table-cell">도메인</TableHead>
              <TableHead className="text-xs md:text-sm hidden lg:table-cell">호스팅</TableHead>
              <TableHead className="text-xs md:text-sm text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServers.map((server) => {
              const typeInfo = server.serverType
                ? serverTypeLabels[server.serverType]
                : null;
              const typeColor = server.serverType
                ? serverTypeColors[server.serverType]
                : "bg-gray-100 text-gray-800";

              return (
                <TableRow key={server.id} className={!server.isActive ? "bg-red-50" : ""}>
                  <TableCell>
                    {server.isActive ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">활성</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 text-xs">중단</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm font-medium">
                    <Link
                      href={`/servers/${server.id}`}
                      className="hover:underline"
                    >
                      {server.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">
                    <Link
                      href={`/projects/${server.project.id}`}
                      className="hover:underline"
                    >
                      {server.project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell">
                    <Link
                      href={`/clients/${server.project.client.id}`}
                      className="hover:underline"
                    >
                      {server.project.client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className={`text-xs ${typeColor}`}>
                      {server.serverType === "OTHER"
                        ? server.serverTypeCustom || "기타"
                        : typeInfo?.label || "미설정"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <ServerUsageCompact
                      serverId={server.id}
                      serverType={server.serverType}
                      localPath={server.localPath}
                    />
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">
                    {server.domain ? (
                      <a
                        href={server.domain.startsWith("http") ? server.domain : `https://${server.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        {server.domain.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell">
                    {server.hostingProvider ? (
                      server.hostingProvider === "OTHER"
                        ? server.hostingProviderCustom || "기타"
                        : hostingProviderLabels[server.hostingProvider] || server.hostingProvider
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/servers/${server.id}`}>
                      <Button variant="outline" size="sm" className="text-xs md:text-sm">
                        <Eye className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                        상세
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table></div>
      )}
    </div>
  );
}
