"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    kakaoEnabled: false,
    taskReminder: true,
    projectUpdate: true,
    newLead: true,
    settlement: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">알림 설정</h1>
        <p className="text-gray-500">알림 수신 방법과 유형을 설정합니다.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              알림 채널
            </CardTitle>
            <CardDescription>
              알림을 받을 채널을 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <Label htmlFor="email">이메일 알림</Label>
              </div>
              <Switch
                id="email"
                checked={settings.emailEnabled}
                onCheckedChange={() => handleToggle("emailEnabled")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <Label htmlFor="sms">SMS 알림</Label>
              </div>
              <Switch
                id="sms"
                checked={settings.smsEnabled}
                onCheckedChange={() => handleToggle("smsEnabled")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-gray-500" />
                <Label htmlFor="kakao">카카오톡 알림</Label>
              </div>
              <Switch
                id="kakao"
                checked={settings.kakaoEnabled}
                onCheckedChange={() => handleToggle("kakaoEnabled")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>알림 유형</CardTitle>
            <CardDescription>
              수신할 알림 유형을 선택하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="task">업무 리마인더</Label>
              <Switch
                id="task"
                checked={settings.taskReminder}
                onCheckedChange={() => handleToggle("taskReminder")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="project">프로젝트 업데이트</Label>
              <Switch
                id="project"
                checked={settings.projectUpdate}
                onCheckedChange={() => handleToggle("projectUpdate")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="lead">새 가망고객</Label>
              <Switch
                id="lead"
                checked={settings.newLead}
                onCheckedChange={() => handleToggle("newLead")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="settlement">정산 알림</Label>
              <Switch
                id="settlement"
                checked={settings.settlement}
                onCheckedChange={() => handleToggle("settlement")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button>설정 저장</Button>
      </div>
    </div>
  );
}
