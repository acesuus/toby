// app/api/games/route.ts — List and create games
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/games?cursor=<id>&limit=20
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 100);

  let query = supabase
    .from("games")
    .select("*, game_analyses(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (data?.length ?? 0) > limit;
  const games = hasMore ? data!.slice(0, limit) : (data ?? []);
  const nextCursor = hasMore ? games[games.length - 1].created_at : null;

  return NextResponse.json({ games, nextCursor });
}

// POST /api/games — Save or upsert a game
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Upsert logic: check if game already exists by source
  if (body.sourcePlatform && body.sourceGameId) {
    const { data: existing } = await supabase
      .from("games")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_platform", body.sourcePlatform)
      .eq("source_game_id", body.sourceGameId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from("games")
        .update({ pgn: body.pgn, headers: body.headers, last_accessed_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Upsert analysis
      await supabase.from("game_analyses").upsert({
        game_id: data.id,
        classified_moves: body.classifiedMoves,
        white_accuracy: body.whiteAccuracy,
        black_accuracy: body.blackAccuracy,
        analysis_depth: body.analysisDepth,
      }, { onConflict: "game_id" });

      return NextResponse.json({ game: data });
    }
  }

  // Insert new game
  const { data, error } = await supabase
    .from("games")
    .insert({
      user_id: user.id,
      pgn: body.pgn,
      headers: body.headers,
      source_platform: body.sourcePlatform ?? "manual",
      source_game_id: body.sourceGameId ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert analysis if provided
  if (body.classifiedMoves) {
    await supabase.from("game_analyses").insert({
      game_id: data.id,
      classified_moves: body.classifiedMoves,
      white_accuracy: body.whiteAccuracy,
      black_accuracy: body.blackAccuracy,
      analysis_depth: body.analysisDepth,
    });
  }

  return NextResponse.json({ game: data }, { status: 201 });
}
