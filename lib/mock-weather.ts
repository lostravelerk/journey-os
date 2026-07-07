import type { JourneyMode, OutfitAdvice, RiskLevel, WeatherSummary } from "@/lib/schema";

type WeatherInput = {
  city: string;
  mode: JourneyMode;
  dayNumber: number;
};

export function mockWeather({ city, mode, dayNumber }: WeatherInput): WeatherSummary {
  if (city.includes("Las Vegas")) {
    return {
      highC: dayNumber >= 7 ? 46 : 43,
      lowC: 29,
      feelsLikeC: 47,
      humidity: 12,
      uvIndex: 10,
      rainProbability: 2,
      windKph: 18,
      description: "Desert heat, hard light"
    };
  }

  if (city.includes("Flagstaff") || city.includes("Olympic")) {
    return {
      highC: city.includes("Olympic") ? 18 : 28,
      lowC: city.includes("Olympic") ? 9 : 14,
      feelsLikeC: city.includes("Olympic") ? 16 : 25,
      humidity: city.includes("Olympic") ? 76 : 34,
      uvIndex: 6,
      rainProbability: city.includes("Olympic") ? 42 : 8,
      windKph: 12,
      description: city.includes("Olympic") ? "Forest mist, cool air" : "Mountain night, clear sky"
    };
  }

  if (city.includes("Seattle")) {
    return {
      highC: 22,
      lowC: 13,
      feelsLikeC: 21,
      humidity: 68,
      uvIndex: 5,
      rainProbability: 28,
      windKph: 14,
      description: "Soft clouds, bright breaks"
    };
  }

  if (city.includes("Houston") || city.includes("San Antonio")) {
    return {
      highC: 36,
      lowC: 26,
      feelsLikeC: 40,
      humidity: 71,
      uvIndex: 9,
      rainProbability: 22,
      windKph: 16,
      description: "Humid heat, late thunder risk"
    };
  }

  if (mode === "flight") {
    return {
      highC: 27,
      lowC: 20,
      feelsLikeC: 27,
      humidity: 44,
      uvIndex: 4,
      rainProbability: 10,
      windKph: 20,
      description: "Travel day, layered cabin air"
    };
  }

  return {
    highC: 31,
    lowC: 18,
    feelsLikeC: 30,
    humidity: 38,
    uvIndex: 8,
    rainProbability: 12,
    windKph: 15,
    description: "Dry sun, clean evening"
  };
}

export function outfitAdvice(weather: WeatherSummary, risk: RiskLevel): OutfitAdvice {
  const high = weather.highC ?? 28;
  const rain = weather.rainProbability ?? 0;

  if (high >= 40 || risk === "extreme") {
    return {
      top: "Breathable UV shirt",
      bottom: "Light technical pants",
      shoes: "Ventilated sneakers",
      outerwear: "None before sunset",
      accessories: ["Sunglasses", "Hat", "Electrolytes", "SPF 50"],
      avoid: ["Dark heavy cotton", "Long outdoor walks at noon"],
      reason: "Extreme heat and UV require shade-first pacing."
    };
  }

  if (rain > 35) {
    return {
      top: "Merino tee or dry-fit base",
      bottom: "Water-resistant pants",
      shoes: "Trail shoes",
      outerwear: "Packable rain shell",
      accessories: ["Small towel", "Zip pouch", "Warm socks"],
      avoid: ["Suede shoes", "Unprotected camera gear"],
      reason: "Cool mist and variable rain call for breathable layers."
    };
  }

  return {
    top: "Light shirt",
    bottom: "Travel chinos",
    shoes: "All-day walking shoes",
    outerwear: "Thin evening layer",
    accessories: ["Sunglasses", "Reusable bottle"],
    avoid: ["New shoes", "Overpacking"],
    reason: "Warm daytime movement with a cooler dinner window."
  };
}
