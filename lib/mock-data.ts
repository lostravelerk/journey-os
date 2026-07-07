import {
  JourneyDay,
  JourneyMode,
  MealPlan,
  PhotoItem,
  RiskLevel,
  RouteSegment,
  ScheduleItem,
  Trip
} from "@/lib/schema";
import { mockWeather, outfitAdvice } from "@/lib/mock-weather";

const tripId = "trip_usa_business_roadtrip_2026";

const samplePhotos = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80"
];

function isoDate(dayNumber: number) {
  const date = new Date(Date.UTC(2026, 6, dayNumber));
  return date.toISOString().slice(0, 10);
}

function schedule(id: string, items: Omit<ScheduleItem, "id" | "visibility">[]): ScheduleItem[] {
  return items.map((item, index) => ({
    id: `${id}_schedule_${index + 1}`,
    visibility: item.type === "meeting" || item.type === "flight" ? "private" : "shareable",
    ...item
  }));
}

function meal(name: string, cuisine: string, notes?: string): MealPlan {
  return {
    name,
    cuisine,
    reservation: false,
    priceLevel: "$$",
    notes,
    source: "manual",
    visibility: "private"
  };
}

function route(input: Partial<RouteSegment>): RouteSegment {
  return {
    visibility: "shareable",
    ...input
  };
}

function riskFor(mode: JourneyMode, city: string): RiskLevel {
  if (city.includes("Las Vegas") || city.includes("El Paso")) return "high";
  if (mode === "flight") return "medium";
  if (city.includes("Olympic")) return "medium";
  return "low";
}

function createDay(input: {
  dayNumber: number;
  mode: JourneyMode;
  title: string;
  city: string;
  routeLabel?: string;
  hotelName?: string;
  hotelAddress?: string;
  schedule: Omit<ScheduleItem, "id" | "visibility">[];
  route?: Partial<RouteSegment>;
  notes?: string;
  photos?: PhotoItem[];
}): JourneyDay {
  const id = `day_${String(input.dayNumber).padStart(2, "0")}`;
  const riskLevel = input.dayNumber === 7 ? "extreme" : riskFor(input.mode, input.city);
  const weather = mockWeather({
    city: input.city,
    mode: input.mode,
    dayNumber: input.dayNumber
  });

  return {
    id,
    tripId,
    dayNumber: input.dayNumber,
    date: isoDate(input.dayNumber),
    mode: input.mode,
    title: input.title,
    city: input.city,
    routeLabel: input.routeLabel,
    hotel: input.hotelName
      ? {
          name: input.hotelName,
          address: input.hotelAddress,
          checkIn: "15:00",
          checkOut: "11:00",
          breakfastIncluded: input.mode !== "flight",
          parking: input.mode === "road_trip" || input.mode === "national_park" ? "Self parking" : "TBD",
          reservationNumber: `MG-${input.dayNumber}-PRIVATE`,
          notes: "Keep address and booking details private by default.",
          visibility: "private"
        }
      : undefined,
    schedule: schedule(id, input.schedule),
    meals: {
      breakfast: meal("Hotel breakfast / coffee", "Simple", "Keep morning light and predictable."),
      lunch: meal("Local lunch TBD", "Regional", "Add a place once the route is confirmed."),
      dinner: meal("Dinner reservation TBD", "Casual", "Choose near hotel or evening walk."),
      coffee: [meal("Road coffee", "Coffee", "A small pause for the long drive.")]
    },
    weather,
    outfit: outfitAdvice(weather, riskLevel),
    route: input.route ? route(input.route) : undefined,
    photos: input.photos ?? [],
    notes: input.notes
      ? [
          {
            id: `${id}_note_1`,
            type: input.mode === "exhibition" ? "exhibition" : "memory",
            content: input.notes,
            createdAt: new Date().toISOString(),
            visibility: "private"
          }
        ]
      : [],
    riskLevel,
    visibility: "private"
  };
}

function dayPhotos(dayId: string, captions: string[]): PhotoItem[] {
  return captions.map((caption, index) => ({
    id: `${dayId}_photo_${index + 1}`,
    tripId,
    dayId,
    localUrl: samplePhotos[index % samplePhotos.length],
    caption,
    tags: ["sample", "story"],
    visibility: "private",
    selectedForShare: false
  }));
}

export function createMockTrip(): Trip {
  const now = new Date().toISOString();
  const days: JourneyDay[] = [
    createDay({
      dayNumber: 1,
      mode: "flight",
      title: "Shanghai to Los Angeles",
      city: "Shanghai / Los Angeles",
      routeLabel: "Shanghai -> Los Angeles",
      hotelName: "Los Angeles Airport Hotel",
      schedule: [
        { time: "08:30", title: "Depart Shanghai", type: "flight", location: "PVG" },
        { time: "10:40", title: "Arrive Los Angeles", type: "flight", location: "LAX" },
        { time: "15:00", title: "Hotel check-in and reset", type: "hotel", location: "LAX area" },
        { time: "18:30", title: "Simple dinner", type: "dinner", location: "Near hotel" }
      ],
      notes: "Jet lag buffer day. Keep all flight details private."
    }),
    createDay({
      dayNumber: 2,
      mode: "city_leisure",
      title: "Los Angeles soft landing",
      city: "Los Angeles",
      routeLabel: "LAX -> Santa Monica -> Downtown",
      hotelName: "Los Angeles Base Hotel",
      schedule: [
        { time: "09:00", title: "Slow breakfast", type: "breakfast", location: "Hotel" },
        { time: "11:00", title: "Santa Monica walk", type: "attraction", location: "Santa Monica" },
        { time: "14:00", title: "Supply run", type: "shopping", location: "West LA" },
        { time: "19:00", title: "Dinner", type: "dinner", location: "Koreatown" }
      ],
      notes: "Buy water, sunscreen, SIM/eSIM backup, and car chargers."
    }),
    createDay({
      dayNumber: 3,
      mode: "road_trip",
      title: "Drive into Las Vegas",
      city: "Los Angeles / Las Vegas",
      routeLabel: "Los Angeles -> Barstow -> Las Vegas",
      hotelName: "Las Vegas Exhibition Hotel",
      schedule: [
        { time: "08:30", title: "Pick up rental car", type: "drive", location: "Los Angeles" },
        { time: "11:30", title: "Barstow stop", type: "coffee", location: "Barstow" },
        { time: "15:30", title: "Arrive Las Vegas", type: "hotel", location: "Las Vegas Strip" },
        { time: "19:30", title: "Exhibition prep dinner", type: "dinner", location: "Las Vegas" }
      ],
      route: {
        start: "Los Angeles",
        end: "Las Vegas",
        distanceKm: 435,
        drivingMinutes: 270,
        stops: ["Barstow", "Baker"],
        fuelAdvice: "Top up before leaving Barstow.",
        drivingAdvice: "Avoid the hottest afternoon loading window."
      }
    }),
    createDay({
      dayNumber: 4,
      mode: "exhibition",
      title: "Cosmoprof day one",
      city: "Las Vegas",
      routeLabel: "Hotel -> Convention Center",
      hotelName: "Las Vegas Exhibition Hotel",
      schedule: [
        { time: "08:00", title: "Breakfast and badge check", type: "breakfast", location: "Hotel" },
        { time: "09:30", title: "Beauty packaging exhibition", type: "exhibition", location: "Convention Center" },
        { time: "12:30", title: "Supplier lunch", type: "meeting", location: "Private" },
        { time: "15:00", title: "Packaging hall follow-ups", type: "exhibition", location: "Cosmoprof" },
        { time: "20:00", title: "Debrief dinner", type: "dinner", location: "Las Vegas" }
      ],
      notes: "Protect customer and supplier notes from share-safe views."
    }),
    createDay({
      dayNumber: 5,
      mode: "exhibition",
      title: "Cosmoprof meetings",
      city: "Las Vegas",
      routeLabel: "Convention Center loop",
      hotelName: "Las Vegas Exhibition Hotel",
      schedule: [
        { time: "08:30", title: "Coffee and route plan", type: "coffee", location: "Hotel" },
        { time: "10:00", title: "Supplier meetings", type: "meeting", location: "Cosmoprof" },
        { time: "13:00", title: "Quick lunch", type: "lunch", location: "Convention Center" },
        { time: "16:30", title: "Booth photos and notes", type: "exhibition", location: "Cosmoprof" },
        { time: "19:30", title: "Dinner", type: "dinner", location: "Las Vegas" }
      ],
      notes: "Capture booth photos separately from personal travel photos."
    }),
    createDay({
      dayNumber: 6,
      mode: "exhibition",
      title: "Last exhibition day",
      city: "Las Vegas",
      routeLabel: "Convention Center -> Strip",
      hotelName: "Las Vegas Exhibition Hotel",
      schedule: [
        { time: "09:00", title: "Final booth pass", type: "exhibition", location: "Cosmoprof" },
        { time: "12:00", title: "Lunch with shortlist", type: "meeting", location: "Private" },
        { time: "16:00", title: "Pack samples", type: "free", location: "Hotel" },
        { time: "20:00", title: "Road trip reset dinner", type: "dinner", location: "Las Vegas" }
      ],
      notes: "Confirm car, cooler, water, and early departure plan."
    }),
    createDay({
      dayNumber: 7,
      mode: "road_trip",
      title: "From desert heat to mountain night",
      city: "Las Vegas / Flagstaff",
      routeLabel: "Las Vegas -> Hoover Dam -> Kingman -> Williams -> Flagstaff",
      hotelName: "Flagstaff Mountain Hotel",
      schedule: [
        { time: "08:00", title: "Leave Las Vegas", type: "drive", location: "Las Vegas" },
        { time: "10:00", title: "Hoover Dam stop", type: "attraction", location: "Hoover Dam" },
        { time: "12:30", title: "Kingman lunch", type: "lunch", location: "Kingman" },
        { time: "15:00", title: "Route 66 stretch", type: "drive", location: "Williams" },
        { time: "18:00", title: "Arrive Flagstaff", type: "hotel", location: "Flagstaff" },
        { time: "20:00", title: "Cool evening dinner", type: "dinner", location: "Downtown Flagstaff" }
      ],
      route: {
        start: "Las Vegas",
        end: "Flagstaff",
        distanceKm: 460,
        drivingMinutes: 300,
        stops: ["Hoover Dam", "Kingman", "Williams"],
        fuelAdvice: "Fill before Kingman and keep water visible.",
        drivingAdvice: "Extreme heat through the desert, then quick cooling at elevation."
      },
      notes: "Today moves from 46C desert heat into a much cooler mountain night.",
      photos: dayPhotos("day_07", [
        "Leaving Las Vegas in hard desert light",
        "Hoover Dam concrete and blue water",
        "Route 66 road texture",
        "Williams late-afternoon stop",
        "Flagstaff mountain air",
        "Dinner after the long drive"
      ])
    }),
    createDay({
      dayNumber: 8,
      mode: "national_park",
      title: "Painted desert crossing",
      city: "Flagstaff / Albuquerque",
      routeLabel: "Flagstaff -> Petrified Forest -> Albuquerque",
      hotelName: "Albuquerque Old Town Hotel",
      schedule: [
        { time: "08:30", title: "Depart Flagstaff", type: "drive", location: "Flagstaff" },
        { time: "11:00", title: "Petrified Forest", type: "attraction", location: "National Park" },
        { time: "13:30", title: "Road lunch", type: "lunch", location: "Holbrook" },
        { time: "18:00", title: "Arrive Albuquerque", type: "hotel", location: "Old Town" }
      ],
      route: {
        start: "Flagstaff",
        end: "Albuquerque",
        distanceKm: 520,
        drivingMinutes: 335,
        stops: ["Petrified Forest", "Holbrook", "Gallup"],
        fuelAdvice: "Do not skip Gallup fuel.",
        drivingAdvice: "Long open-road day with strong sun."
      }
    }),
    createDay({
      dayNumber: 9,
      mode: "city_leisure",
      title: "Albuquerque and Santa Fe",
      city: "Albuquerque / Santa Fe",
      routeLabel: "Old Town -> Santa Fe -> Albuquerque",
      hotelName: "Albuquerque Old Town Hotel",
      schedule: [
        { time: "09:00", title: "Old Town coffee", type: "coffee", location: "Albuquerque" },
        { time: "11:30", title: "Drive to Santa Fe", type: "drive", location: "I-25" },
        { time: "13:00", title: "Santa Fe lunch", type: "lunch", location: "Santa Fe Plaza" },
        { time: "16:00", title: "Museum / gallery window", type: "attraction", location: "Santa Fe" },
        { time: "20:00", title: "Return dinner", type: "dinner", location: "Albuquerque" }
      ]
    }),
    createDay({
      dayNumber: 10,
      mode: "road_trip",
      title: "New Mexico to El Paso",
      city: "Santa Fe / El Paso",
      routeLabel: "Albuquerque -> White Sands -> El Paso",
      hotelName: "El Paso Downtown Hotel",
      schedule: [
        { time: "08:00", title: "Southbound drive", type: "drive", location: "I-25" },
        { time: "12:30", title: "White Sands lunch stop", type: "lunch", location: "Alamogordo" },
        { time: "15:00", title: "White Sands window", type: "attraction", location: "White Sands" },
        { time: "19:00", title: "El Paso check-in", type: "hotel", location: "El Paso" }
      ],
      route: {
        start: "Albuquerque",
        end: "El Paso",
        distanceKm: 430,
        drivingMinutes: 280,
        stops: ["Socorro", "White Sands"],
        fuelAdvice: "Fill before leaving Alamogordo.",
        drivingAdvice: "Heat management and sunset timing matter."
      }
    }),
    createDay({
      dayNumber: 11,
      mode: "city_leisure",
      title: "El Paso reset day",
      city: "El Paso",
      routeLabel: "Downtown -> Scenic Drive",
      hotelName: "El Paso Downtown Hotel",
      schedule: [
        { time: "09:00", title: "Late breakfast", type: "breakfast", location: "Hotel" },
        { time: "11:00", title: "Laundry and car check", type: "free", location: "El Paso" },
        { time: "16:30", title: "Scenic Drive overlook", type: "attraction", location: "El Paso" },
        { time: "19:30", title: "Tex-Mex dinner", type: "dinner", location: "Downtown" }
      ]
    }),
    createDay({
      dayNumber: 12,
      mode: "road_trip",
      title: "Long Texas drive",
      city: "El Paso / San Antonio",
      routeLabel: "El Paso -> Fort Stockton -> San Antonio",
      hotelName: "San Antonio Riverwalk Hotel",
      schedule: [
        { time: "07:00", title: "Early departure", type: "drive", location: "El Paso" },
        { time: "11:30", title: "Fort Stockton fuel", type: "coffee", location: "Fort Stockton" },
        { time: "14:00", title: "Road lunch", type: "lunch", location: "I-10" },
        { time: "19:30", title: "San Antonio arrival", type: "hotel", location: "River Walk" }
      ],
      route: {
        start: "El Paso",
        end: "San Antonio",
        distanceKm: 890,
        drivingMinutes: 540,
        stops: ["Van Horn", "Fort Stockton", "Junction"],
        fuelAdvice: "Set fuel stops before departure; this is the longest drive.",
        drivingAdvice: "Rotate drivers and keep a strict hydration cadence."
      }
    }),
    createDay({
      dayNumber: 13,
      mode: "city_leisure",
      title: "San Antonio River Walk",
      city: "San Antonio",
      routeLabel: "River Walk -> Pearl District",
      hotelName: "San Antonio Riverwalk Hotel",
      schedule: [
        { time: "09:30", title: "River Walk breakfast", type: "breakfast", location: "River Walk" },
        { time: "11:00", title: "The Alamo", type: "attraction", location: "San Antonio" },
        { time: "14:00", title: "Pearl District", type: "lunch", location: "Pearl" },
        { time: "19:30", title: "Steak dinner", type: "dinner", location: "San Antonio" }
      ]
    }),
    createDay({
      dayNumber: 14,
      mode: "road_trip",
      title: "San Antonio to Houston",
      city: "San Antonio / Houston",
      routeLabel: "San Antonio -> Houston",
      hotelName: "Houston Business Hotel",
      schedule: [
        { time: "09:00", title: "Depart San Antonio", type: "drive", location: "San Antonio" },
        { time: "12:00", title: "Buc-ee's stop", type: "coffee", location: "Katy" },
        { time: "14:00", title: "Houston arrival", type: "hotel", location: "Houston" },
        { time: "19:00", title: "Dinner", type: "dinner", location: "Houston" }
      ],
      route: {
        start: "San Antonio",
        end: "Houston",
        distanceKm: 320,
        drivingMinutes: 195,
        stops: ["Katy"],
        fuelAdvice: "Easy fuel day; avoid Houston rush hour.",
        drivingAdvice: "Humidity climbs on arrival."
      }
    }),
    createDay({
      dayNumber: 15,
      mode: "city_leisure",
      title: "Houston business buffer",
      city: "Houston",
      routeLabel: "Business district -> Museum district",
      hotelName: "Houston Business Hotel",
      schedule: [
        { time: "09:00", title: "Breakfast and email window", type: "breakfast", location: "Hotel" },
        { time: "11:00", title: "Business follow-ups", type: "meeting", location: "Private" },
        { time: "15:00", title: "Museum district", type: "attraction", location: "Houston" },
        { time: "19:30", title: "Seafood dinner", type: "dinner", location: "Houston" }
      ],
      notes: "Separate exhibition actions from shared travel memories."
    }),
    createDay({
      dayNumber: 16,
      mode: "flight",
      title: "Houston to Seattle",
      city: "Houston / Seattle",
      routeLabel: "Houston -> Seattle",
      hotelName: "Seattle Waterfront Hotel",
      schedule: [
        { time: "09:30", title: "Airport transfer", type: "drive", location: "Houston" },
        { time: "12:00", title: "Flight to Seattle", type: "flight", location: "IAH" },
        { time: "16:30", title: "Arrive Seattle", type: "flight", location: "SEA" },
        { time: "19:00", title: "Waterfront dinner", type: "dinner", location: "Seattle" }
      ]
    }),
    createDay({
      dayNumber: 17,
      mode: "city_leisure",
      title: "Seattle day",
      city: "Seattle",
      routeLabel: "Pike Place -> Capitol Hill",
      hotelName: "Seattle Waterfront Hotel",
      schedule: [
        { time: "09:00", title: "Pike Place coffee", type: "coffee", location: "Pike Place" },
        { time: "11:30", title: "Waterfront walk", type: "attraction", location: "Seattle" },
        { time: "14:00", title: "Capitol Hill lunch", type: "lunch", location: "Capitol Hill" },
        { time: "19:00", title: "Sushi dinner", type: "dinner", location: "Seattle" }
      ]
    }),
    createDay({
      dayNumber: 18,
      mode: "national_park",
      title: "Olympic National Park",
      city: "Seattle / Olympic National Park",
      routeLabel: "Seattle -> Port Angeles -> Olympic",
      hotelName: "Olympic Peninsula Lodge",
      schedule: [
        { time: "07:30", title: "Depart Seattle", type: "drive", location: "Seattle" },
        { time: "10:30", title: "Hurricane Ridge", type: "attraction", location: "Olympic" },
        { time: "13:00", title: "Picnic lunch", type: "lunch", location: "Park" },
        { time: "17:30", title: "Lodge check-in", type: "hotel", location: "Peninsula" }
      ],
      route: {
        start: "Seattle",
        end: "Olympic National Park",
        distanceKm: 230,
        drivingMinutes: 230,
        stops: ["Port Angeles", "Hurricane Ridge"],
        fuelAdvice: "Fill in Port Angeles before park roads.",
        drivingAdvice: "Expect cooler air and possible mist."
      },
      photos: dayPhotos("day_18", ["Forest road", "Mountain cloud", "Quiet lodge"])
    }),
    createDay({
      dayNumber: 19,
      mode: "national_park",
      title: "Forest and coast",
      city: "Olympic National Park / Seattle",
      routeLabel: "Olympic -> Rialto Beach -> Seattle",
      hotelName: "Seattle Airport Hotel",
      schedule: [
        { time: "08:00", title: "Forest trail", type: "attraction", location: "Olympic" },
        { time: "12:00", title: "Coast lunch", type: "lunch", location: "Rialto Beach" },
        { time: "15:00", title: "Return drive", type: "drive", location: "Olympic Peninsula" },
        { time: "20:00", title: "Seattle airport hotel", type: "hotel", location: "SEA" }
      ],
      route: {
        start: "Olympic National Park",
        end: "Seattle",
        distanceKm: 290,
        drivingMinutes: 300,
        stops: ["Rialto Beach", "Port Angeles"],
        fuelAdvice: "Fuel before leaving the peninsula.",
        drivingAdvice: "Keep ferry/traffic buffer."
      }
    }),
    createDay({
      dayNumber: 20,
      mode: "flight",
      title: "Seattle to Los Angeles",
      city: "Seattle / Los Angeles",
      routeLabel: "Seattle -> Los Angeles",
      hotelName: "Los Angeles Final Hotel",
      schedule: [
        { time: "09:00", title: "Flight check-in", type: "flight", location: "SEA" },
        { time: "12:30", title: "Arrive Los Angeles", type: "flight", location: "LAX" },
        { time: "15:00", title: "Final hotel check-in", type: "hotel", location: "Los Angeles" },
        { time: "19:30", title: "Final LA dinner", type: "dinner", location: "Los Angeles" }
      ]
    }),
    createDay({
      dayNumber: 21,
      mode: "city_leisure",
      title: "Los Angeles final day",
      city: "Los Angeles",
      routeLabel: "Arts District -> Airport area",
      hotelName: "Los Angeles Final Hotel",
      schedule: [
        { time: "09:30", title: "Brunch", type: "breakfast", location: "Los Angeles" },
        { time: "12:00", title: "Shopping and packing", type: "shopping", location: "LA" },
        { time: "16:00", title: "Travel book note pass", type: "free", location: "Hotel" },
        { time: "19:00", title: "Closing dinner", type: "dinner", location: "Los Angeles" }
      ]
    }),
    createDay({
      dayNumber: 22,
      mode: "flight",
      title: "Return flight",
      city: "Los Angeles / Shanghai",
      routeLabel: "Los Angeles -> Shanghai",
      schedule: [
        { time: "08:30", title: "Airport transfer", type: "drive", location: "Los Angeles" },
        { time: "12:00", title: "Return flight", type: "flight", location: "LAX" },
        { time: "18:00", title: "Travel book export", type: "free", location: "In transit" }
      ],
      notes: "Export the private travel book before clearing browser data."
    })
  ];

  return {
    id: tripId,
    name: "USA Business & Road Trip 2026",
    subtitle: "Megee JourneyOS",
    travelers: [
      { id: "traveler_owner", name: "Traveler", gender: "male", role: "organizer", visibility: "private" }
    ],
    startDate: "2026-07-01",
    endDate: "2026-07-22",
    saveMode: "local_private",
    days,
    createdAt: now,
    updatedAt: now
  };
}
