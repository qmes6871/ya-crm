import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  DashboardDeadlines,
  type DeadlineProject,
} from "@/components/dashboard/DashboardDeadlines";
import { DashboardMilestoneList } from "@/components/dashboard/DashboardMilestoneList";
import { isDemoUser } from "@/lib/demo";

async function getDeadlineProjects(isDemo: boolean): Promise<DeadlineProject[]> {
  const demoFilter = isDemo
    ? { id: { startsWith: "demo-proj-" } }
    : { NOT: { id: { startsWith: "demo-proj-" } } };

  const projects = await prisma.project.findMany({
    where: {
      ...demoFilter,
      status: { not: "COMPLETED" },
      OR: [
        { deadline: { not: null } },
        { firstDraftDate: { not: null } },
        { secondDraftDate: { not: null } },
      ],
    },
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
    },
  });

  return projects
    .map((p) => {
      const milestones: DeadlineProject["milestones"] = [];
      if (p.firstDraftDate) {
        milestones.push({
          kind: "first",
          date: new Date(p.firstDraftDate).toISOString(),
          label: "1차 시안",
          completed: !!p.firstDraftCompletedAt,
        });
      }
      if (p.secondDraftDate) {
        milestones.push({
          kind: "second",
          date: new Date(p.secondDraftDate).toISOString(),
          label: "2차 시안",
          completed: !!p.secondDraftCompletedAt,
        });
      }
      if (p.deadline) {
        milestones.push({
          kind: "final",
          date: new Date(p.deadline).toISOString(),
          label: "최종 마감",
          completed: false,
        });
      }
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        client: p.client,
        manager: p.manager,
        milestones,
      };
    })
    .filter((p) => p.milestones.length > 0);
}

function getGivenName(fullName: string | null | undefined): string {
  if (!fullName) return "사용자";
  if (fullName.length > 1) {
    return fullName.slice(1);
  }
  return fullName;
}

export default async function DashboardPage() {
  const session = await auth();
  const isDemo = isDemoUser(session);
  const deadlineProjects = await getDeadlineProjects(isDemo);
  const givenName = getGivenName(session?.user?.name);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm sm:text-base text-gray-500">
          안녕하세요, {givenName}님! 오늘도 좋은 하루 되세요.
        </p>
      </div>

      {/* Row 1: 통합 캘린더 */}
      <DashboardDeadlines projects={deadlineProjects} />

      {/* Row 2: 1차 시안 / 2차 시안 / 최종 마감 임박 프로젝트 */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardMilestoneList kind="first" projects={deadlineProjects} />
        <DashboardMilestoneList kind="second" projects={deadlineProjects} />
        <DashboardMilestoneList kind="final" projects={deadlineProjects} />
      </div>
    </div>
  );
}
