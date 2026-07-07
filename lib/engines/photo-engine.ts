import { JourneyDay, PhotoItem } from "@/lib/domain";

export function storyPhotos(day: JourneyDay): PhotoItem[] {
  return day.photos.filter((photo) => photo.selectedForStory && photo.visibility !== "private");
}

export function privatePhotos(day: JourneyDay): PhotoItem[] {
  return day.photos.filter((photo) => photo.visibility === "private");
}
