import { redirect } from "next/navigation";

type ProjectTasksPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTasksPage({ params }: ProjectTasksPageProps) {
  const { projectId } = await params;
  redirect(`/dashboard/projects/${projectId}`);
}
