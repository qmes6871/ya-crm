"use client";

import { useEffect, useState } from "react";
import { HardDrive, Wifi } from "lucide-react";

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
    isUnlimited?: boolean;
  };
}

interface ServerUsageCompactProps {
  serverId: string;
  serverType: string | null;
  localPath: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getProgressColor(percentage: number): string {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

export function ServerUsageCompact({ serverId, serverType, localPath }: ServerUsageCompactProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localPath || !serverType || serverType === "OTHER") {
      setLoading(false);
      return;
    }

    fetch(`/crm/api/servers/${serverId}/usage`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setUsage(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serverId, serverType, localPath]);

  if (!localPath || !serverType || serverType === "OTHER") {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  if (loading) {
    return <span className="text-gray-400 text-xs">로딩...</span>;
  }

  if (!usage) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const diskPercentage = usage.disk.percentage ?? 0;
  const trafficPercentage = usage.traffic.percentage ?? 0;
  const isUnlimited = usage.traffic.isUnlimited || usage.traffic.total === null;

  return (
    <div className="space-y-1.5 min-w-[120px]">
      {/* 디스크 사용량 */}
      <div className="flex items-center gap-1.5">
        <HardDrive className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(diskPercentage)} transition-all`}
              style={{ width: `${Math.min(diskPercentage, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">
          {diskPercentage}%
        </span>
      </div>

      {/* 트래픽 사용량 */}
      <div className="flex items-center gap-1.5">
        <Wifi className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          {!isUnlimited ? (
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(trafficPercentage)} transition-all`}
                style={{ width: `${Math.min(trafficPercentage, 100)}%` }}
              />
            </div>
          ) : (
            <div className="h-1.5 bg-blue-100 rounded-full" />
          )}
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">
          {!isUnlimited ? `${trafficPercentage}%` : "무제한"}
        </span>
      </div>
    </div>
  );
}
