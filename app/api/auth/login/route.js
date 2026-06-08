import { NextResponse } from "next/server";
import { verifyPassword, generateToken } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { logStaffActivity } from "@/lib/activity";

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const db = getDB();
    let user = null;
    let isLegacy = false;

    // 1. Query staff_members table
    try {
      const { data, error } = await db
        .from("staff_members")
        .select("*")
        .eq("username", username)
        .single();
      
      if (!error && data) {
        user = data;
      }
    } catch (e) {
      console.warn("[Login API] staff_members query threw error:", e.message);
    }

    // 2. Fallback to legacy staff table if not found
    if (!user) {
      console.log("[Login API] Trying legacy staff table fallback...");
      const { data, error } = await db
        .from("staff")
        .select("*")
        .eq("username", username)
        .single();
      
      if (error || !data) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }
      user = data;
      isLegacy = true;
    }

    // 3. Check Account Status
    if (user.status && user.status !== "Active") {
      return NextResponse.json(
        { error: "This staff account is Inactive. Please contact an administrator." },
        { status: 403 }
      );
    }

    // 4. Verify Password
    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // 5. Generate JWT Token (with extended payload)
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // 6. Asynchronously log activity & update heartbeat (safely)
    try {
      await logStaffActivity({
        staffId: user.id,
        staffName: user.name,
        action: "Login",
        details: `${user.name} (${user.role}) logged in successfully`
      });

      if (!isLegacy) {
        await db
          .from("staff_members")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    } catch (logErr) {
      console.warn("[Login API] Failed to log activity or update heartbeat:", logErr.message);
    }

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("[Login API] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}