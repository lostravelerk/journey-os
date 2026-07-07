import { Section } from "@/components/ui/card";

export default function Loading() {
  return (
    <Section className="py-16">
      <div className="h-80 animate-pulse rounded-lg border border-black/10 bg-white/50 dark:border-white/10 dark:bg-white/8" />
    </Section>
  );
}
