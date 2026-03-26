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

    console.log("[Settings API] Received save request:", JSON.stringify(body));

    // Build the update payload with only valid fields
    const updatePayload = {};
    const allowedFields = [
      'clinic_name', 'tagline', 'phone', 'email', 'address',
      'accent_color', 'whatsapp_enabled', 'whatsapp_business_number',
      'whatsapp_number', 'whatsapp_template', 'reminder_template'
    ];

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updatePayload[key] = body[key];
      }
    }

    console.log("[Settings API] Update payload:", JSON.stringify(updatePayload));

    // Try update first (row id=1 should exist)
    const { data, error } = await db
      .from("settings")
      .update(updatePayload)
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      console.error("[Settings API] Update error:", error);

      // If row doesn't exist yet, insert it
      if (error.code === 'PGRST116') {
        console.log("[Settings API] No row found, inserting new settings row");
        const { data: insertData, error: insertError } = await db
          .from("settings")
          .insert({ id: 1, ...updatePayload })
          .select()
          .single();

        if (insertError) {
          console.error("[Settings API] Insert error:", insertError);
          throw insertError;
        }

        console.log("[Settings API] Settings inserted successfully");
        return NextResponse.json(insertData);
      }

      throw error;
    }

    console.log("[Settings API] Settings updated successfully");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}