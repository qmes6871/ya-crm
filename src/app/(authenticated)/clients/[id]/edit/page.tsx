"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { use } from "react";

const requestTypes = [
  { id: "WEB_DEV", label: "웹 개발" },
  { id: "SHOPPING_MALL", label: "쇼핑몰 개발" },
  { id: "APP_DEV", label: "앱 개발" },
  { id: "PLATFORM_DEV", label: "플랫폼 개발" },
  { id: "CRM_DEV", label: "CRM 개발" },
];

interface Client {
  id: string;
  name: string;
  contact: string | null;
  contractDate: string | null;
  firstDraftDate: string | null;
  requirements: string | null;
  requestTypes: { type: string; customType: string | null }[];
}

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [firstDraftDate, setFirstDraftDate] = useState("");
  const [requirements, setRequirements] = useState("");
  const [selectedRequestTypes, setSelectedRequestTypes] = useState<string[]>([]);
  const [customRequestType, setCustomRequestType] = useState("");

  useEffect(() => {
    async function fetchClient() {
      try {
        const response = await fetch(`/yacrm/api/clients/${id}`);
        if (response.ok) {
          const client: Client = await response.json();
          setName(client.name);
          setContact(client.contact || "");
          setContractDate(client.contractDate ? client.contractDate.split("T")[0] : "");
          setFirstDraftDate(client.firstDraftDate ? client.firstDraftDate.split("T")[0] : "");
          setRequirements(client.requirements || "");

          const types = client.requestTypes.map(rt => rt.type);
          setSelectedRequestTypes(types.filter(t => t !== "OTHER"));

          const otherType = client.requestTypes.find(rt => rt.type === "OTHER");
          if (otherType) {
            setCustomRequestType(otherType.customType || "");
          }
        }
      } catch (error) {
        console.error("Error fetching client:", error);
      } finally {
        setIsLoadingClient(false);
      }
    }
    fetchClient();
  }, [id]);

  const handleRequestTypeChange = (typeId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequestTypes([...selectedRequestTypes, typeId]);
    } else {
      setSelectedRequestTypes(selectedRequestTypes.filter((t) => t !== typeId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const requestTypesData: { type: string; customType: string | null }[] = selectedRequestTypes.map((type) => ({
        type,
        customType: null,
      }));

      if (customRequestType) {
        requestTypesData.push({
          type: "OTHER",
          customType: customRequestType,
        });
      }

      const response = await fetch(`/yacrm/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact: contact || null,
          contractDate: contractDate || null,
          firstDraftDate: firstDraftDate || null,
          requirements: requirements || null,
          requestTypes: requestTypesData,
        }),
      });

      if (!response.ok) throw new Error("Failed to update client");

      router.push(`/clients/${id}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating client:", error);
      alert("거래처 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/clients/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">거래처 수정</h1>
          <p className="text-gray-500">거래처 정보를 수정합니다.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>거래처의 기본 정보를 수정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">거래처명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="거래처명을 입력하세요"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">연락처</Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractDate">계약날짜</Label>
                <Input
                  id="contractDate"
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstDraftDate">1차 시안 공유 일정</Label>
                <Input
                  id="firstDraftDate"
                  type="date"
                  value={firstDraftDate}
                  onChange={(e) => setFirstDraftDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">진행 요청사항</Label>
                <Textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="진행 요청사항을 입력하세요"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 의뢰 유형 */}
          <Card>
            <CardHeader>
              <CardTitle>의뢰 유형</CardTitle>
              <CardDescription>해당하는 의뢰 유형을 선택하세요. (다중 선택 가능)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {requestTypes.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.id}
                      checked={selectedRequestTypes.includes(type.id)}
                      onCheckedChange={(checked) =>
                        handleRequestTypeChange(type.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={type.id} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customType">비고 (기타 유형)</Label>
                <Input
                  id="customType"
                  value={customRequestType}
                  onChange={(e) => setCustomRequestType(e.target.value)}
                  placeholder="직접 입력"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link href={`/clients/${id}`}>
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !name}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
