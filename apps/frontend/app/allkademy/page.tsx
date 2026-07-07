import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useCourses, useEnrollments } from "@/hooks/useCourses";
import { apiClient } from "@/lib/api-client";
import { NeonBadge } from "@/components/neon-badge";
import type { BadgeColor } from "@/lib/badge-styles";
import { Button } from "@/components/ui/button";
import { SlidePanel } from "@/components/slide-panel";
import { useToast } from "@/components/ui/use-toast";
import { BookOpen, Clock, Layers, Video, FileText, HelpCircle } from "lucide-react";

// Tipos alinhados ao schema real do Prisma (Course/CourseModule/Lesson/
// CourseEnrollment em apps/backend/prisma/schema.prisma) — NÃO usar
// apps/frontend/types/allkademy.ts, que descreve um modelo bem mais rico
// (certificados, quiz, progresso por aula) que ainda não existe no backend.
interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content_type: "video" | "text" | "quiz";
  content_url?: string | null;
  duration?: number | null;
  order: number;
}

interface CourseModuleData {
  id: string;
  course_id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  thumbnail?: string | null;
  duration?: number | null;
  is_published: boolean;
  is_free: boolean;
  audience_profiles: string;
  _count?: { modules: number; enrollments: number };
}

interface CourseDetail extends Course {
  modules: CourseModuleData[];
}

interface CourseEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  enrolled_at: string;
  progress: number;
  completed_at?: string | null;
}

// Cores por categoria — mesmo mapeamento usado em admin/allkademy, para manter
// consistência visual entre a visão do admin e a visão do aluno.
const CATEGORY_BADGE_COLOR: Record<string, BadgeColor> = {
  marketing: "pink",
  vendas: "blue",
  gestao: "violet",
  tecnologia: "cyan",
  design: "amber",
  negocios: "emerald",
};

const CONTENT_TYPE_ICONS: Record<string, typeof Video> = { video: Video, text: FileText, quiz: HelpCircle };

function fmtDuration(min?: number | null): string | null {
  if (!min) return null;
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// Página do aluno — somente listagem/inscrição/visualização. Nada de
// criar/editar/excluir/publicar curso aqui (isso é exclusivo de admin/allkademy).
// A lista já vem filtrada por perfil e por publicação diretamente do backend
// (GET /api/allkademy/courses) — o frontend não aplica nenhum filtro próprio,
// só exibe o que a API já decidiu que este usuário pode ver.
export default function AllkademyStudentPage() {
  const { courses, loading, error } = useCourses({ is_published: true }) as {
    courses: Course[];
    loading: boolean;
    error: string | null;
  };
  const { enrollments, enrollCourse } = useEnrollments() as {
    enrollments: CourseEnrollment[];
    enrollCourse: (courseId: string) => Promise<void>;
  };
  const { toast } = useToast();

  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCourse, setDetailCourse] = useState<CourseDetail | Course | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const enrollmentByCourseId = new Map<string, CourseEnrollment>(
    (enrollments || []).map((e) => [e.course_id, e]),
  );

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      await enrollCourse(courseId);
      toast({ title: "Inscrição realizada", description: "Você já pode acompanhar o curso." });
    } catch (err: any) {
      toast({ title: "Erro ao se inscrever", description: err?.message, variant: "destructive" });
    } finally {
      setEnrollingId(null);
    }
  };

  const openDetail = async (course: Course) => {
    setDetailOpen(true);
    setDetailCourse(null);
    setDetailLoading(true);
    try {
      const full = (await apiClient.getCourse(course.id)) as CourseDetail;
      setDetailCourse(full);
    } catch (err: any) {
      toast({ title: "Erro ao carregar curso", description: err?.message, variant: "destructive" });
      setDetailCourse(course);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Allkademy" description="Cursos disponíveis para o seu perfil" />

      {loading ? (
        <p className="text-sm text-slate-400">Carregando cursos…</p>
      ) : error ? (
        <p className="text-sm text-red-500">Erro ao carregar cursos: {error}</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum curso disponível para o seu perfil no momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const enrollment = enrollmentByCourseId.get(course.id);
            const isEnrolled = !!enrollment;
            const duration = fmtDuration(course.duration);
            return (
              <div
                key={course.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col"
              >
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="h-32 w-full object-cover" />
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-blue-400" />
                  </div>
                )}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {course.category && (
                      <NeonBadge color={CATEGORY_BADGE_COLOR[course.category?.toLowerCase?.()] || "slate"} className="capitalize">
                        {course.category}
                      </NeonBadge>
                    )}
                    {isEnrolled && <NeonBadge color="emerald">Inscrito</NeonBadge>}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{course.title}</h3>
                  {course.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{course.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-auto pt-2">
                    {duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {duration}
                      </span>
                    )}
                    {course._count?.modules != null && (
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" /> {course._count.modules} módulo{course._count.modules !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {isEnrolled && enrollment && (
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(100, enrollment.progress || 0)}%` }}
                      />
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openDetail(course)}>
                      Ver conteúdo
                    </Button>
                    {!isEnrolled && (
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs btn-brand"
                        disabled={enrollingId === course.id}
                        onClick={() => handleEnroll(course.id)}
                      >
                        {enrollingId === course.id ? "Inscrevendo…" : "Iniciar curso"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SlidePanel
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailCourse(null);
        }}
        title={detailCourse?.title || "Curso"}
        subtitle={detailCourse?.category}
        widthMode="compact"
        compactWidth={480}
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {detailLoading ? (
            <p className="text-sm text-slate-400">Carregando conteúdo…</p>
          ) : !("modules" in (detailCourse || {})) || !(detailCourse as CourseDetail)?.modules?.length ? (
            <p className="text-sm text-slate-400">Este curso ainda não tem módulos publicados.</p>
          ) : (
            (detailCourse as CourseDetail).modules.map((mod) => (
              <div key={mod.id} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{mod.title}</p>
                <div className="space-y-1.5">
                  {(mod.lessons || []).map((lesson) => {
                    const Icon = CONTENT_TYPE_ICONS[lesson.content_type] || Video;
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{lesson.title}</span>
                        </div>
                        {lesson.content_url ? (
                          <a
                            href={lesson.content_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0"
                          >
                            Abrir
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-300 shrink-0">Em breve</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          {/* TODO(allkademy-player): construir um player de aula in-app com
              marcação de progresso por aula. Hoje CourseEnrollment.progress é
              só um número 0-100 por curso inteiro (sem granularidade por
              aula no schema/Prisma), então não há como marcar "aula
              concluída" de forma real ainda — o backend já expõe
              PUT /api/allkademy/enrollments/:course_id/progress para quando
              essa lógica for definida pelo produto. */}
        </div>
      </SlidePanel>
    </div>
  );
}
