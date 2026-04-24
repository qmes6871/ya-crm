import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { ProjectOverview } from "@/components/project/ProjectOverview";
import { ProjectInstruction } from "@/components/project/ProjectInstruction";
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Link href="/projects" className="shrink-0">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{project.name}</h1>
            <p className="text-sm md:text-base text-gray-500 truncate">{project.client.name}</p>
          </div>
        </div>
        <div className="shrink-0">
          <DeleteButton
            id={project.id}
            endpoint="/api/projects"
            redirectPath="/projects"
            itemName={project.name}
            buttonVariant="destructive"
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:w-full">
            <TabsTrigger value="overview" className="text-xs md:text-sm whitespace-nowrap">개요</TabsTrigger>
            <TabsTrigger value="instruction" className="text-xs md:text-sm whitespace-nowrap">작업지시서</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs md:text-sm whitespace-nowrap">일정</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs md:text-sm whitespace-nowrap">업무</TabsTrigger>
            <TabsTrigger value="communication" className="text-xs md:text-sm whitespace-nowrap">커뮤니케이션</TabsTrigger>
            <TabsTrigger value="files" className="text-xs md:text-sm whitespace-nowrap">파일</TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs md:text-sm whitespace-nowrap">계약서</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs md:text-sm whitespace-nowrap">매출</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <ProjectOverview project={project} users={users} />
        </TabsContent>

        <TabsContent value="instruction">
          <ProjectInstruction project={project} />
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
