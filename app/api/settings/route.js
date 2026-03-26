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

    const { data, error } = await db
      .from("settings")
      .upsert({ id: 1, ...body })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}