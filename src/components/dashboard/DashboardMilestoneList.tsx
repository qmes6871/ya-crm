import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { format, differenceInDays, startOfDay } from "date-fns";
import type { DeadlineProject } from "./DashboardDeadlines";

type MilestoneKind = "first" | "second" | "final";

const statusLabels: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "기획", color: "bg-gray-100 text-gray-800" },
  FIRST_DRAFT: { label: "1차 시안 작업", color: "bg-blue-100 text-blue-800" },
  FIRST_DRAFT_REVIEW: { label: "1차 시안 공개", color: "bg-purple-100 text-purple-800" },
  REVISION: { label: "시안 수정", color: "bg-yellow-100 text-yellow-800" },
  FINAL_REVIEW: { label: "시안 공개", color: "bg-orange-100 text-orange-800" },
  OPEN: { label: "오픈", color: "bg-green-100 text-green-800" },
  COMPLETED: { label: "완료", color: "bg-emerald-100 text-emerald-800" },
};

const kindMeta: Record<
  MilestoneKind,
  { title: string; description: string; accent: string; dot: string }
> = {
  first: {
    title: "1차 시안 임박",
    description: "14일 이내 1차 시안 마감 프로젝트",
    accent: "text-blue-700",
    dot: "bg-blue-500",
  },
  second: {
    title: "2차 시안 임박",
    description: "14일 이내 2차 시안 마감 프로젝트",
    accent: "text-purple-700",
    dot: "bg-purple-500",
  },
  final: {
    title: "최종 마감 임박",
    description: "14일 이내 최종 납품 프로젝트",
    accent: "text-red-700",
    dot: "bg-red-500",
  },
};

function formatDday(date: Date): { text: string; color: string } {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = differenceInDays(target, today);
  if (diff === 0) return { text: "오늘", color: "text-red-600 font-semibold" };
  if (diff < 0) return { text: `${Math.abs(diff)}일 지남`, color: "text-red-600 font-medium" };
  if (diff <= 3) return { text: `D-${diff}`, color: "text-orange-600 font-medium" };
  return { text: `D-${diff}`, color: "text-gray-500" };
}

interface Props {
  kind: MilestoneKind;
  projects: DeadlineProject[];
}

const IMMINENT_DAYS = 14;

export function DashboardMilestoneList({ kind, projects }: Props) {
  const meta = kindMeta[kind];
  const today = startOfDay(new Date());

  const items = projects
    .map((p) => {
      const m = p.milestones.find((x) => x.kind === kind && !x.completed);
      return m ? { project: p, milestone: m } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(({ milestone }) => {
      const diff = differenceInDays(new Date(milestone.date), today);
      return diff <= IMMINENT_DAYS;
    })
    .sort(
      (a, b) => new Date(a.milestone.date).getTime() - new Date(b.milestone.date).getTime()
    );

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
          <CalendarDays className={`h-5 w-5 ${meta.accent}`} />
          <span>{meta.title}</span>
        </CardTitle>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            14일 이내 임박한 프로젝트가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map(({ project, milestone }) => {
              const date = new Date(milestone.date);
              const dday = formatDday(date);
              const status = statusLabels[project.status] ?? {
                label: project.status,
                color: "bg-gray-100 text-gray-800",
              };
              const isOverdue = differenceInDays(date, startOfDay(new Date())) < 0;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium truncate">{project.name}</p>
                        {isOverdue && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {project.client.name} · {project.manager.name}
                      </p>
                    </div>
                    <Badge className={`${status.color} flex-shrink-0 text-[10px]`}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="text-gray-500">{format(date, "yyyy.MM.dd")}</span>
                    <span className={dday.color}>{dday.text}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
