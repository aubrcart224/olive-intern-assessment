import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase";
import { quizSpecSchema, type QuizSpec } from "@/lib/quiz-spec";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spec } = body;

    if (!spec) {
      return NextResponse.json(
        { ok: false, error: "Missing quiz spec." },
        { status: 400 },
      );
    }

    const parsed = quizSpecSchema.safeParse(spec);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid quiz spec." },
        { status: 400 },
      );
    }

    const validatedSpec: QuizSpec = parsed.data;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        title: validatedSpec.quiz.title,
        description: validatedSpec.quiz.description,
        spec_json: validatedSpec as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, quiz: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error while saving quiz.",
      },
      { status: 500 },
    );
  }
}
