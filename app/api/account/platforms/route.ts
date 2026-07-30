import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateUsername, fetchRecentGames } from "@/lib/fetcher";
import type { Platform } from "@/lib/types";

interface ConnectBody {
  platform: Platform;
  username: string;
}

interface DisconnectBody {
  platform: Platform;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("chess_com_username, lichess_username")
    .eq("id", user.id)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: ConnectBody = await request.json();
  const { platform, username } = body;

  // Format validation
  const validationError = validateUsername(platform, username);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Verify username exists on platform
  try {
    await fetchRecentGames(platform, username.trim());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Save to database
  const column =
    platform === "chesscom" ? "chess_com_username" : "lichess_username";
  const { error } = await supabase
    .from("profiles")
    .update({ [column]: username.trim() })
    .eq("id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ [column]: username.trim() });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: DisconnectBody = await request.json();
  const { platform } = body;

  const column =
    platform === "chesscom" ? "chess_com_username" : "lichess_username";
  const { error } = await supabase
    .from("profiles")
    .update({ [column]: null })
    .eq("id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ disconnected: platform });
}
