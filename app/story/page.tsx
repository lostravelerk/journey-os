"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StoryView } from "@/components/share/story-view";
import { Card, Section } from "@/components/ui/card";
import { useJourney } from "@/components/journey-provider";
import { getShareStory } from "@/lib/local-store";
import { ShareStory } from "@/lib/schema";
import { useI18n } from "@/lib/i18n";

function StoryFallback() {
  return (
    <Section>
      <div className="h-96 animate-pulse rounded-lg bg-white/60 dark:bg-white/8" />
    </Section>
  );
}

export default function SharedStoryPage() {
  return (
    <React.Suspense fallback={<StoryFallback />}>
      <SharedStoryContent />
    </React.Suspense>
  );
}

function SharedStoryContent() {
  const searchParams = useSearchParams();
  const storyId = searchParams.get("story") ?? "";
  const { shareStories, loading } = useJourney();
  const { t } = useI18n();
  const [story, setStory] = React.useState<ShareStory | null>(null);

  React.useEffect(() => {
    if (!storyId) {
      setStory(null);
      return;
    }
    const found = shareStories.find((item) => item.id === storyId);
    if (found) {
      setStory(found);
      return;
    }
    void getShareStory(storyId).then((item) => setStory(item ?? null));
  }, [storyId, shareStories]);

  if (loading && !story) {
    return (
      <Section>
        <div className="h-96 animate-pulse rounded-lg bg-white/60 dark:bg-white/8" />
      </Section>
    );
  }

  if (!story) {
    return (
      <Section className="py-16">
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold">{t("sharedStory.notFound")}</p>
          <Link
            href="/share"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-ink bg-ink px-4 text-sm font-medium text-paper shadow-soft"
          >
            {t("sharedStory.createStory")}
          </Link>
        </Card>
      </Section>
    );
  }

  return <StoryView story={story} />;
}
