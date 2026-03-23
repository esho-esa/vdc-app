const db = getDB();

const { data: user } = await db
  .from("staff")
  .select("*")
  .eq("username", username)
  .single();

if (!user) {
  return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
}

const valid = await verifyPassword(password, user.password_hash);

if (!valid) {
  return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
}