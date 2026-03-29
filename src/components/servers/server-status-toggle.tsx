"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Power, PowerOff, Loader2 } from "lucide-react";

interface ServerStatusToggleProps {
  serverId: string;
  isActive: boolean;
  suspendedAt: string | null;
  localPath: string | null;
  onStatusChange?: (isActive: boolean) => void;
}

export function ServerStatusToggle({
  serverId,
  isActive: initialIsActive,
  suspendedAt,
  localPath,
  onStatusChange,
}: ServerStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const action = isActive ? "suspend" : "activate";
    const confirmMessage = isActive
      ? "서버를 중단하시겠습니까?\n해당 사이트에 접속할 수 없게 됩니다."
      : "서버를 다시 활성화하시겠습니까?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/yacrm/api/servers/${serverId}/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsActive(data.isActive);
        onStatusChange?.(data.isActive);
        alert(data.message);
        // 페이지 새로고침으로 상태 반영
        window.location.reload();
      } else {
        alert(data.error || "상태 변경에 실패했습니다.");
      }
    } catch {
      alert("상태 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!localPath) {
    return (
      <div className="text-sm text-gray-500">
        로컬 폴더가 연동되지 않아 중단 기능을 사용할 수 없습니다.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">서버 상태:</span>
        {isActive ? (
          <Badge className="bg-green-100 text-green-800">
            <Power className="h-3 w-3 mr-1" />
            활성화
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800">
            <PowerOff className="h-3 w-3 mr-1" />
            중단됨
          </Badge>
        )}
      </div>

      {!isActive && suspendedAt && (
        <span className="text-xs text-gray-500">
          {new Date(suspendedAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })} 중단
        </span>
      )}

      <Button
        variant={isActive ? "destructive" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : isActive ? (
          <PowerOff className="h-4 w-4 mr-1" />
        ) : (
          <Power className="h-4 w-4 mr-1" />
        )}
        {isActive ? "서버 중단" : "서버 활성화"}
      </Button>
    </div>
  );
}
