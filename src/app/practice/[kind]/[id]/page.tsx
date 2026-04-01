import PracticeSession from "@/components/practice/PracticeSession";

interface PracticePageProps {
  params: Promise<{ kind: string; id: string }>;
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { kind, id } = await params;
  return <PracticeSession kind={kind} id={id} />;
}
