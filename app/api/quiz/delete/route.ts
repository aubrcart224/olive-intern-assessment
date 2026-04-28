import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("id");

    if (!quizId) {
      return NextResponse.json(
        { ok: false, error: "Missing quiz ID." },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // First delete related quiz sessions (foreign key constraint)
    const { error: sessionsError } = await supabase
      .from("quiz_sessions")
      .delete()
      .eq("quiz_id", quizId);

    if (sessionsError) {
      return NextResponse.json(
        { ok: false, error: sessionsError.message },
        { status: 500 },
      );
    }

    // Then delete the quiz
    const { error: quizError } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId);

    if (quizError) {
      return NextResponse.json(
        { ok: false, error: quizError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error while deleting quiz.",
      },
      { status: 500 },
    );
  }
}
