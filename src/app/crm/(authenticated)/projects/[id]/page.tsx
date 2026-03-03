import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { ProjectOverview } from "@/components/project/ProjectOverview";
import { ProjectSchedule } from "@/components/project/ProjectSchedule";
import { ProjectTasks } from "@/components/project/ProjectTasks";
import { ProjectCommunication } from "@/components/project/ProjectCommunication";
import { ProjectFiles } from "@/components/project/ProjectFiles";
import { ProjectContracts } from "@/components/project/ProjectContracts";
import { ProjectPayments } from "@/components/project/ProjectPayments";

async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          requestTypes: true,
        },
      },
      manager: {
        select: { id: true, name: true, email: true },
      },
      schedules: {
        orderBy: { sortOrder: "asc" },
      },
      tasks: {
        include: {
          assignee: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
          attachments: true,
        },
        orderBy: { createdAt: "desc" },
      },
      files: {
        where: { isDeleted: false },
        include: {
          uploader: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      contracts: {
        orderBy: { createdAt: "desc" },
      },
      payments: true,
      servers: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return project;
}

async function getUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, users] = await Promise.all([getProject(id), getUsers()]);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500">{project.client.name}</p>
          </div>
        </div>
        <DeleteButton
          id={project.id}
          endpoint="/api/projects"
          redirectPath="/crm/projects"
          itemName={project.name}
          buttonVariant="destructive"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">프로젝트 개요</TabsTrigger>
          <TabsTrigger value="schedule">일정</TabsTrigger>
          <TabsTrigger value="tasks">업무</TabsTrigger>
          <TabsTrigger value="communication">커뮤니케이션</TabsTrigger>
          <TabsTrigger value="files">프로젝트 파일</TabsTrigger>
          <TabsTrigger value="contracts">계약서</TabsTrigger>
          <TabsTrigger value="payments">매출</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview project={project} users={users} />
        </TabsContent>

        <TabsContent value="schedule">
          <ProjectSchedule project={project} />
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectTasks project={project} users={users} />
        </TabsContent>

        <TabsContent value="communication">
          <ProjectCommunication project={project} />
        </TabsContent>

        <TabsContent value="files">
          <ProjectFiles project={project} />
        </TabsContent>

        <TabsContent value="contracts">
          <ProjectContracts project={project} />
        </TabsContent>

        <TabsContent value="payments">
          <ProjectPayments project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
