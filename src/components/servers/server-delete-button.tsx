"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface ServerDeleteButtonProps {
  serverId: string;
  serverName: string;
  localPath?: string | null;
}

export function ServerDeleteButton({ serverId, serverName, localPath }: ServerDeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    let confirmMessage = `"${serverName}" 서버를 삭제하시겠습니까?\n\n`;

    if (localPath) {
      confirmMessage += `⚠️ 주의: 서버 폴더(${localPath})도 함께 삭제됩니다!\n\n`;
    }

    confirmMessage += "이 작업은 되돌릴 수 없습니다.";

    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/crm/api/servers/${serverId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("서버가 삭제되었습니다.");
        router.push("/servers");
      } else {
        const error = await response.json();
        alert(error.error || "서버 삭제에 실패했습니다.");
      }
    } catch {
      alert("서버 삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="mr-2 h-4 w-4" />
      )}
      삭제
    </Button>
  );
}
