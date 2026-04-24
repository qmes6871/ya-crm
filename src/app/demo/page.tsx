"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DemoPage() {
  const router = useRouter();
  const [status, setStatus] = useState("데모 계정으로 로그인 중...");

  useEffect(() => {
    async function autoLogin() {
      try {
        const result = await signIn("credentials", {
          email: "demo@yasolution.com",
          password: "demo1234",
          redirect: false,
        });

        if (result?.error) {
          setStatus("데모 로그인에 실패했습니다.");
          return;
        }

        setStatus("로그인 성공! 대시보드로 이동 중...");
        router.push("/dashboard");
        router.refresh();
      } catch {
        setStatus("오류가 발생했습니다.");
      }
    }

    autoLogin();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-gray-600 text-sm">{status}</p>
      </div>
    </div>
  );
}
