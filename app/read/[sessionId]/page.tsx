import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import {
  ReadingWorkspace,
  type ParagraphData,
  type AnnotationData,
  type CoachTurn,
} from "./reading-workspace";

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { supabase, user } = await getSessionProfile(`/read/${sessionId}`);

  const { data: session } = await supabase
    .from("sessions")
    .select("id, student_id, passage_id, status")
    .eq("id", sessionId)
    .single();
  if (!session || session.student_id !== user.id) notFound();

  const { data: passage } = await supabase
    .from("passages")
    .select("id, title")
    .eq("id", session.passage_id)
    .single();
  if (!passage) notFound();

  const { data: paragraphs } = await supabase
    .from("passage_paragraphs")
    .select("id, seq, text")
    .eq("passage_id", session.passage_id)
    .order("seq", { ascending: true });

  const { data: annotations } = await supabase
    .from("annotations")
    .select(
      "id, paragraph_id, type, span_start, span_end, target_ref, from_ref, relation_type",
    )
    .eq("session_id", session.id);

  const { data: messages } = await supabase
    .from("agent_messages")
    .select("id, role, content, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  return (
    <ReadingWorkspace
      sessionId={session.id}
      title={passage.title}
      status={session.status}
      paragraphs={(paragraphs ?? []) as ParagraphData[]}
      annotations={(annotations ?? []) as AnnotationData[]}
      messages={(messages ?? []) as CoachTurn[]}
    />
  );
}
