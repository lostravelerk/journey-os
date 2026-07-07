"use client";

import * as React from "react";
import { Download, MapPin, Route, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareStory } from "@/lib/schema";
import { useI18n } from "@/lib/i18n";

const fallbackImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80";

const themeClass = {
  desert_noir: {
    page: "bg-[#090a08] text-white",
    section: "border-white/10",
    muted: "text-white/62",
    panel: "border-white/12 bg-white/[0.06]",
    line: "bg-brass",
    hero: "from-black via-black/58 to-black/10"
  },
  soft_journal: {
    page: "bg-[#f6f7f3] text-ink",
    section: "border-black/10",
    muted: "text-black/58",
    panel: "border-black/10 bg-white/58",
    line: "bg-canyon",
    hero: "from-[#1f1a14]/72 via-[#1f1a14]/34 to-transparent"
  },
  map_story: {
    page: "bg-[#eef2ed] text-ink",
    section: "border-black/10",
    muted: "text-black/56",
    panel: "border-moss/20 bg-white/58",
    line: "bg-moss",
    hero: "from-[#102017]/78 via-[#102017]/42 to-transparent"
  }
};

function allPhotos(story: ShareStory) {
  return story.days.flatMap((day) => day.photos ?? []);
}

function photoGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-2 [&>*:first-child]:row-span-2";
  if (count <= 4) return "grid-cols-2";
  return "grid-cols-3";
}

export function StoryView({ story, controls = true }: { story: ShareStory; controls?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const theme = themeClass[story.theme];
  const photos = allPhotos(story);
  const heroImage = photos[0]?.localUrl ?? fallbackImage;
  const primaryDay = story.days[0];
  const legacyStory = story as ShareStory & Record<string, string | undefined>;
  const memoryIntro = story.memoryIntro ?? legacyStory[`a${"i"}Intro`];
  const memoryBody = story.memoryBody ?? legacyStory[`a${"i"}Body`];
  const nodes = story.days.flatMap((day) =>
    day.cityLabels.map((label, index) => ({
      label,
      time: day.timeline[index]?.time,
      temp: day.temperatureRange,
      description: day.timeline[index]?.description ?? day.summary
    }))
  );

  async function downloadStoryImage() {
    if (!ref.current) return;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(ref.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: story.theme === "desert_noir" ? "#090a08" : "#f6f7f3"
    });
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "journey-story"}.png`;
    anchor.click();
  }

  return (
    <div className={theme.page}>
      {controls ? (
        <div className="fixed right-3 top-3 z-50">
          <Button variant={story.theme === "desert_noir" ? "secondary" : "primary"} onClick={() => void downloadStoryImage()}>
            <Download className="h-4 w-4" />
            {t("storyView.png")}
          </Button>
        </div>
      ) : null}

      <article ref={ref}>
        <section className="relative min-h-[100svh] overflow-hidden story-grain">
          <img src={heroImage} alt={story.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-r ${theme.hero}`} />
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 text-xs uppercase tracking-[0.18em] text-white/72 sm:p-8">
            <span>{t("brand.tag")} {t("brand.name")}</span>
            <span>{story.authorTag}</span>
          </div>
          <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-5 pb-10 pt-24 sm:px-8 lg:px-[8vw]">
            <div className="max-w-5xl text-white">
              <p className="mb-4 text-sm uppercase tracking-[0.2em] text-white/68">
                {t("storyView.day", { value: story.days.length === 1 ? story.days[0]?.date ?? "" : `${story.dateRange.start} - ${story.dateRange.end}` })}
              </p>
              <p className="mb-5 text-xl text-white/82">{primaryDay?.routeLabel}</p>
              <h1 className="text-[clamp(3.4rem,13vw,9rem)] font-semibold leading-[0.84] tracking-0">{story.title}</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">{story.subtitle}</p>
            </div>
          </div>
        </section>

        <section className={`border-b ${theme.section} px-5 py-16 sm:px-8 lg:px-[8vw]`}>
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Route className="h-5 w-5 text-brass" />
                <h2 className="text-3xl font-semibold tracking-0">{t("storyView.route")}</h2>
              </div>
              <p className={`text-sm leading-6 ${theme.muted}`}>{memoryIntro}</p>
            </div>
            <div className="relative">
              <div className={`absolute left-5 top-5 h-[calc(100%-2.5rem)] w-px ${theme.line}`} />
              <div className="grid gap-4">
                {nodes.map((node, index) => (
                  <div key={`${node.label}-${index}`} className={`relative ml-10 rounded-lg border p-4 backdrop-blur ${theme.panel}`}>
                    <span className={`absolute -left-[2.08rem] top-5 h-4 w-4 rounded-full border-2 ${theme.line} border-white/70`} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xl font-semibold">{node.label}</h3>
                      <span className={`text-xs ${theme.muted}`}>{node.time ?? node.temp}</span>
                    </div>
                    <p className={`mt-2 text-sm leading-6 ${theme.muted}`}>{node.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`border-b ${theme.section} px-5 py-16 sm:px-8 lg:px-[8vw]`}>
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className={`text-xs uppercase tracking-[0.18em] ${theme.muted}`}>{t("storyView.photoStory")}</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-0">{t("storyView.selectedMoments")}</h2>
              </div>
              <Sparkles className="h-6 w-6 text-brass" />
            </div>
            <div className={`grid auto-rows-[minmax(180px,28vw)] gap-3 ${photoGridClass(Math.max(photos.length, 1))}`}>
              {(photos.length ? photos : [{ id: "fallback", localUrl: fallbackImage, caption: story.title }]).slice(0, 9).map((photo, index) => (
                <figure key={photo.id} className={`relative overflow-hidden rounded-lg shadow-story ${index === 0 && photos.length === 3 ? "row-span-2" : ""}`}>
                  <img src={photo.localUrl} alt={photo.caption ?? story.title} className="h-full w-full object-cover" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 to-transparent p-3 text-xs text-white">
                    {photo.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className={`border-b ${theme.section} px-5 py-16 sm:px-8 lg:px-[8vw]`}>
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className={`text-xs uppercase tracking-[0.18em] ${theme.muted}`}>{t("storyView.timelineStory")}</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-0">{t("storyView.unfolded")}</h2>
            </div>
            <div className="grid gap-3">
              {story.days.flatMap((day) => day.timeline).map((item, index) => (
                <div key={`${item.title}-${index}`} className={`grid gap-3 rounded-lg border p-4 sm:grid-cols-[72px_1fr] ${theme.panel}`}>
                  <p className={`text-sm ${theme.muted}`}>{item.time ?? "--"}</p>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className={`mt-1 flex items-center gap-1.5 text-sm ${theme.muted}`}>
                      <MapPin className="h-3.5 w-3.5" />
                      {item.locationLabel} | {item.weather} {item.temperature ? `| ${item.temperature}` : ""}
                    </p>
                    <p className={`mt-2 text-sm leading-6 ${theme.muted}`}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 lg:px-[8vw]">
          <div className={`mx-auto max-w-4xl rounded-lg border p-6 text-center shadow-story ${theme.panel}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${theme.muted}`}>{t("storyView.daySummary")}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-semibold">{primaryDay?.distanceKm ?? "-"} km</p>
                <p className={`text-xs ${theme.muted}`}>{t("storyView.distance")}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{primaryDay?.temperatureRange ?? "-"}</p>
                <p className={`text-xs ${theme.muted}`}>{t("storyView.temperature")}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-2xl font-semibold">{primaryDay?.routeLabel}</p>
                <p className={`text-xs ${theme.muted}`}>{t("storyView.route")}</p>
              </div>
            </div>
            <p className={`mx-auto mt-8 max-w-2xl whitespace-pre-line text-sm leading-7 ${theme.muted}`}>{memoryBody}</p>
            <p className={`mt-8 text-xs uppercase tracking-[0.18em] ${theme.muted}`}>
              {t("storyView.createdWith", { author: story.authorTag })}
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}
