import {
  defaultSharePolicy,
  JourneyDay,
  MealPlan,
  PhotoItem,
  ScheduleItem,
  SharePolicy,
  Visibility
} from "@/lib/schema";

export const hiddenByDefault = [
  "hotels",
  "flights",
  "exactGps",
  "expenses",
  "privateNotes",
  "businessContacts"
];

export const sharedByDefault = [
  "photosYouChoose",
  "cityLevelRoute",
  "weatherSummary",
  "memoryText"
];

export function canShareVisibility(visibility?: Visibility) {
  return visibility === "shareable";
}

export function mealCompletion(day: JourneyDay) {
  const slots = [day.meals.breakfast, day.meals.lunch, day.meals.dinner];
  const completed = slots.filter((meal) => meal?.name && meal.name !== "Local lunch TBD" && meal.name !== "Dinner reservation TBD").length;
  return {
    completed,
    total: slots.length,
    label: `${completed}/${slots.length}`
  };
}

export function selectedSharePhotos(day: JourneyDay, policy: SharePolicy = defaultSharePolicy): PhotoItem[] {
  void policy;
  return (day.photos ?? []).filter((photo) => photo.selectedForShare && canShareVisibility(photo.visibility));
}

export function publicSchedule(day: JourneyDay, policy: SharePolicy = defaultSharePolicy): ScheduleItem[] {
  return day.schedule.filter((item) => {
    if (item.visibility === "private") return false;
    if (!policy.includeFlights && item.type === "flight") return false;
    if (!policy.includeBusinessContacts && item.type === "meeting") return false;
    return true;
  });
}

export function publicMeal(meal?: MealPlan): MealPlan | undefined {
  if (!meal) return undefined;
  if (meal.visibility === "private") return undefined;
  return {
    name: meal.name,
    cuisine: meal.cuisine,
    reservation: false,
    priceLevel: undefined,
    notes: meal.notes,
    source: meal.source,
    visibility: meal.visibility
  };
}

export function sanitizeDayForShare(day: JourneyDay, policy: SharePolicy = defaultSharePolicy): JourneyDay {
  return {
    ...day,
    hotel: policy.includeHotels ? day.hotel : undefined,
    route: day.route
      ? {
          ...day.route,
          fuelAdvice: undefined,
          drivingAdvice: day.route.drivingAdvice,
          visibility: "shareable"
        }
      : undefined,
    schedule: publicSchedule(day, policy),
    meals: {
      breakfast: publicMeal(day.meals.breakfast),
      lunch: publicMeal(day.meals.lunch),
      dinner: publicMeal(day.meals.dinner),
      coffee: day.meals.coffee?.map(publicMeal).filter(Boolean) as MealPlan[] | undefined
    },
    photos: selectedSharePhotos(day, policy),
    notes: policy.includePrivateNotes
      ? day.notes
      : day.notes?.filter((note) => note.visibility === "shareable")
  };
}

export function privacyReviewRows(policy: SharePolicy = defaultSharePolicy) {
  return [
    { key: "hotels", shared: policy.includeHotels },
    { key: "flights", shared: policy.includeFlights },
    { key: "exactGps", shared: policy.includeExactGps },
    { key: "expenses", shared: policy.includeExpenses },
    { key: "peopleNames", shared: policy.includePeopleNames },
    { key: "businessContacts", shared: policy.includeBusinessContacts },
    { key: "privateNotes", shared: policy.includePrivateNotes }
  ];
}
