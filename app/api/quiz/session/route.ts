import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quiz_id, action, session_id, answers, score, band_id } = body;

    if (!quiz_id && !session_id) {
      return NextResponse.json(
        { ok: false, error: "Missing quiz_id or session_id." },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    if (action === "start") {
      const { data, error } = await supabase
        .from("quiz_sessions")
        .insert({
          quiz_id,
          is_complete: false,
          user_agent: request.headers.get("user-agent") ?? null,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, session: data });
    }

    if (action === "complete" && session_id) {
      const { data, error } = await supabase
        .from("quiz_sessions")
        .update({
          is_complete: true,
          completed_at: new Date().toISOString(),
          final_score: score ?? null,
          final_band_id: band_id ?? null,
          answers_json: answers ?? {},
        })
        .eq("id", session_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, session: data });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action. Use 'start' or 'complete'." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error while recording quiz session.",
      },
      { status: 500 },
    );
  }
}
