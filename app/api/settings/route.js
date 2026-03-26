import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function GET() {
  try {
    const db = getDB();

    const { data, error } = await db
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return NextResponse.json(data || {});
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getDB();
    const body = await request.json();

    console.log("[Settings API] Raw body received:", JSON.stringify(body));

    // Explicitly map incoming fields to exact DB column names.
    // Accept both camelCase (frontend state) and snake_case (already mapped) inputs.
    const updatePayload = {
      clinic_name:              body.clinic_name      ?? body.clinicName      ?? undefined,
      tagline:                  body.tagline                                  ?? undefined,
      phone:                    body.phone                                    ?? undefined,
      email:                    body.email                                    ?? undefined,
      address:                  body.address                                  ?? undefined,
      accent_color:             body.accent_color     ?? body.accentColor     ?? undefined,
      whatsapp_enabled:         body.whatsapp_enabled ?? body.whatsappEnabled ?? undefined,
      whatsapp_business_number: body.whatsapp_business_number ?? body.whatsapp_number ?? body.whatsappNumber ?? undefined,
      whatsapp_template:        body.whatsapp_template ?? body.reminder_template ?? body.reminderTemplate ?? undefined,
    };

    // Remove undefined keys so we don't overwrite existing values with null
    const cleanPayload = {};
    for (const [key, value] of Object.entries(updatePayload)) {
      if (value !== undefined) {
        cleanPayload[key] = value;
      }
    }

    console.log("[Settings API] Clean payload for DB:", JSON.stringify(cleanPayload));

    if (Object.keys(cleanPayload).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    // Update the single settings row
    const { data, error } = await db
      .from("settings")
      .update(cleanPayload)
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      console.error("[Settings API] Update error:", JSON.stringify(error));

      // If no row exists yet, insert one
      if (error.code === 'PGRST116') {
        console.log("[Settings API] Row id=1 not found, inserting...");
        const { data: inserted, error: insertErr } = await db
          .from("settings")
          .insert({ id: 1, ...cleanPayload })
          .select()
          .single();

        if (insertErr) {
          console.error("[Settings API] Insert error:", JSON.stringify(insertErr));
          throw insertErr;
        }
        return NextResponse.json(inserted);
      }

      throw error;
    }

    console.log("[Settings API] Update successful");
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Settings API] Catch error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Failed to save settings" }, { status: 500 });
  }
}