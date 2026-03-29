"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HardDrive, Activity, AlertTriangle, RotateCcw } from "lucide-react";

interface UsageData {
  disk: {
    used: number;
    total: number | null;
    percentage: number | null;
  };
  traffic: {
    used: number;
    total: number | null;
    percentage: number | null;
    isUnlimited: boolean;
    resetAt: string | null;
  };
  serverType: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getProgressColor(percentage: number | null): string {
  if (percentage === null) return "bg-gray-300";
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 70) return "bg-yellow-500";
  return "bg-blue-500";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ServerUsage({ serverId }: { serverId: string }) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      const response = await fetch(`/crm/api/servers/${serverId}/usage`);
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      } else {
        setError("사용량을 불러올 수 없습니다.");
      }
    } catch {
      setError("사용량을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const resetTraffic = async () => {
    if (!confirm("트래픽을 초기화하시겠습니까?\n초기화 이후의 트래픽만 계산됩니다.")) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(`/crm/api/servers/${serverId}/reset-traffic`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchUsage();
      } else {
        alert("트래픽 초기화에 실패했습니다.");
      }
    } catch {
      alert("트래픽 초기화에 실패했습니다.");
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [serverId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>서버 사용량</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>서버 사용량</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">{error || "데이터 없음"}</p>
        </CardContent>
      </Card>
    );
  }

  if (!usage.serverType) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>서버 사용량</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">서버 타입이 설정되지 않았습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          서버 사용량
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 디스크 사용량 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">디스크 사용량</span>
            </div>
            <span className="text-sm text-gray-600">
              {formatBytes(usage.disk.used)} / {usage.disk.total ? formatBytes(usage.disk.total) : "-"}
            </span>
          </div>
          <div className="relative">
            <Progress
              value={usage.disk.percentage || 0}
              className="h-3"
            />
            <div
              className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(usage.disk.percentage)}`}
              style={{ width: `${Math.min(usage.disk.percentage || 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{usage.disk.percentage !== null ? `${usage.disk.percentage}% 사용` : ""}</span>
            {usage.disk.percentage !== null && usage.disk.percentage >= 80 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                용량 부족 주의
              </span>
            )}
          </div>
        </div>

        {/* 트래픽 사용량 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">트래픽</span>
              {usage.traffic.resetAt && (
                <span className="text-xs text-gray-400">
                  ({formatDate(usage.traffic.resetAt)} 이후)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {formatBytes(usage.traffic.used)} / {usage.traffic.isUnlimited ? "무제한" : (usage.traffic.total ? formatBytes(usage.traffic.total) : "-")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={resetTraffic}
                disabled={resetting}
                className="h-6 px-2 text-xs"
              >
                <RotateCcw className={`h-3 w-3 mr-1 ${resetting ? "animate-spin" : ""}`} />
                초기화
              </Button>
            </div>
          </div>
          {!usage.traffic.isUnlimited && (
            <>
              <div className="relative">
                <Progress
                  value={usage.traffic.percentage || 0}
                  className="h-3"
                />
                <div
                  className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(usage.traffic.percentage)}`}
                  style={{ width: `${Math.min(usage.traffic.percentage || 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{usage.traffic.percentage !== null ? `${usage.traffic.percentage}% 사용` : ""}</span>
                {usage.traffic.percentage !== null && usage.traffic.percentage >= 80 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    트래픽 초과 주의
                  </span>
                )}
              </div>
            </>
          )}
          {usage.traffic.isUnlimited && (
            <p className="text-xs text-green-600">무제한 트래픽 요금제</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
