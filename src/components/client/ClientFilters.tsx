"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";

const requestTypeOptions = [
  { value: "WEB_DEV", label: "웹 개발" },
  { value: "SHOPPING_MALL", label: "쇼핑몰 개발" },
  { value: "APP_DEV", label: "앱 개발" },
  { value: "PLATFORM_DEV", label: "플랫폼 개발" },
  { value: "CRM_DEV", label: "CRM 개발" },
  { value: "OTHER", label: "기타" },
];

export function ClientFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });

      return newParams.toString();
    },
    [searchParams]
  );

  const updateFilter = (key: string, value: string | null) => {
    const queryString = createQueryString({ [key]: value });
    router.push(`/clients${queryString ? `?${queryString}` : ""}`);
  };

  const clearFilters = () => {
    router.push("/clients");
  };

  const hasActiveFilters = searchParams.toString().length > 0;

  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-700">필터</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            필터 초기화
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 의뢰 유형 필터 */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600">의뢰 유형</Label>
          <Select
            value={searchParams.get("type") || "all"}
            onValueChange={(value) => updateFilter("type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {requestTypeOptions.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 금액 필터 */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600">금액 범위</Label>
          <Select
            value={searchParams.get("amount") || "all"}
            onValueChange={(value) => updateFilter("amount", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="0-100">100만원 이하</SelectItem>
              <SelectItem value="100-500">100~500만원</SelectItem>
              <SelectItem value="500-1000">500~1000만원</SelectItem>
              <SelectItem value="1000-5000">1000~5000만원</SelectItem>
              <SelectItem value="5000+">5000만원 이상</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 계약일 필터 */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600">계약일</Label>
          <Select
            value={searchParams.get("date") || "all"}
            onValueChange={(value) => updateFilter("date", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="week">이번 주</SelectItem>
              <SelectItem value="month">이번 달</SelectItem>
              <SelectItem value="quarter">최근 3개월</SelectItem>
              <SelectItem value="year">올해</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
