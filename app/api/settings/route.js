import { NextResponse } from "next/server"
import { getDB } from "@/lib/db"

export async function GET() {
  try {
    const db = getDB()

    const { data, error } = await db
      .from("settings")
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json(data || {})
  } catch (err) {
    console.error(err)
    return NextResponse.json({}, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const db = getDB()
    const body = await req.json()

    const { data, error } = await db
      .from("settings")
      .upsert({ ...body, id: 1 })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}