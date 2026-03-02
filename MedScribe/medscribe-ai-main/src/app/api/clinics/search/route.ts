import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Diacritics normalization map for common city names
const CITY_VARIANTS: Record<string, string[]> = {
  bucuresti: ["București", "Bucharest"],
  bucharest: ["București", "Bucuresti"],
  cluj: ["Cluj-Napoca", "Cluj"],
  "cluj-napoca": ["Cluj-Napoca", "Cluj"],
  timisoara: ["Timișoara"],
  iasi: ["Iași"],
  brasov: ["Brașov"],
  munchen: ["München", "Munich"],
  munich: ["München", "Munchen"],
  dusseldorf: ["Düsseldorf"],
  koln: ["Köln", "Cologne"],
  cologne: ["Köln", "Koln"],
  zurich: ["Zürich"],
  malaga: ["Málaga"],
  wien: ["Wien", "Vienna"],
  vienna: ["Wien"],
};

function getLocationVariants(location: string): string[] {
  const lower = location.toLowerCase();
  const variants = [location];
  if (CITY_VARIANTS[lower]) {
    variants.push(...CITY_VARIANTS[lower]);
  }
  return [...new Set(variants)];
}

const capitalize = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() || "";
  const location = searchParams.get("location")?.trim() || "";
  const specialty = searchParams.get("specialty")?.trim() || "";
  const consultationType = searchParams.get("consultationType")?.trim() || "";
  const minRating = parseFloat(searchParams.get("minRating") || "0");
  const language = searchParams.get("language")?.trim() || "";

  if (!q && !location && !specialty) {
    return NextResponse.json({ results: [], physicians: [] });
  }

  try {
    const searchTerm = q || specialty;
    const locationVariants = location ? getLocationVariants(location) : [];

    // Build clinic query
    let clinicQuery = supabase
      .from("clinics")
      .select("id, name, type, specialty, city, country, country_code, address, phone, website, description, services, languages, consultation_types, rating, reviews_count")
      .limit(30);

    if (searchTerm && location) {
      // BOTH q and location: (name/specialty matches q) AND (city/country matches location)
      const qFilters = [
        `name.ilike.%${searchTerm}%`,
        `specialty.cs.{${capitalize(searchTerm)}}`,
        `specialty.cs.{${searchTerm.toLowerCase()}}`,
      ];
      clinicQuery = clinicQuery.or(qFilters.join(","));

      // Location filter as AND
      const locFilters = locationVariants.flatMap((v) => [
        `city.ilike.%${v}%`,
        `country.ilike.%${v}%`,
      ]);
      clinicQuery = clinicQuery.or(locFilters.join(","));
    } else if (searchTerm) {
      // ONLY q: search name, specialty, city
      const filters = [
        `name.ilike.%${searchTerm}%`,
        `specialty.cs.{${capitalize(searchTerm)}}`,
        `specialty.cs.{${searchTerm.toLowerCase()}}`,
        `city.ilike.%${searchTerm}%`,
      ];
      clinicQuery = clinicQuery.or(filters.join(","));
    } else if (location) {
      // ONLY location
      const locFilters = locationVariants.flatMap((v) => [
        `city.ilike.%${v}%`,
        `country.ilike.%${v}%`,
      ]);
      clinicQuery = clinicQuery.or(locFilters.join(","));
    }

    if (consultationType) {
      clinicQuery = clinicQuery.contains("consultation_types", [consultationType]);
    }
    if (minRating > 0) {
      clinicQuery = clinicQuery.gte("rating", minRating);
    }
    if (language) {
      clinicQuery = clinicQuery.contains("languages", [language]);
    }

    const { data: clinics, error: clinicError } = await clinicQuery;

    if (clinicError) {
      console.error("Clinics search error:", clinicError);
      return NextResponse.json({ results: [], physicians: [] });
    }

    // Build physician query
    let physQuery = supabase
      .from("physicians")
      .select("id, name, specialty, country, city, language, bio, consultation_types, price_consultation, currency, rating, reviews_count")
      .limit(30);

    if (searchTerm && location) {
      physQuery = physQuery.or(
        `name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%`
      );
      const locFilters = locationVariants.flatMap((v) => [
        `city.ilike.%${v}%`,
        `country.ilike.%${v}%`,
      ]);
      physQuery = physQuery.or(locFilters.join(","));
    } else if (searchTerm) {
      physQuery = physQuery.or(
        `name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`
      );
    } else if (location) {
      const locFilters = locationVariants.flatMap((v) => [
        `city.ilike.%${v}%`,
        `country.ilike.%${v}%`,
      ]);
      physQuery = physQuery.or(locFilters.join(","));
    }

    if (consultationType) {
      physQuery = physQuery.contains("consultation_types", [consultationType]);
    }
    if (minRating > 0) {
      physQuery = physQuery.gte("rating", minRating);
    }
    if (language) {
      physQuery = physQuery.contains("language", [language]);
    }

    const { data: physicians } = await physQuery;

    return NextResponse.json({
      results: clinics || [],
      physicians: physicians || [],
    });
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json({ results: [], physicians: [] });
  }
}
