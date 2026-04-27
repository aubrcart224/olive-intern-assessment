import { NextResponse } from "next/server";

import { generateQuizSpecFromPrompt } from "@/lib/quiz-generator";
import {
  formatZodIssues,
  generateQuizRequestSchema,
} from "@/lib/quiz-spec";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedRequest = generateQuizRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          ok: false,
          errorMessage: "Please provide a longer quiz request.",
          issues: formatZodIssues(parsedRequest.error.issues),
        },
        { status: 400 },
      );
    }

    const result = await generateQuizSpecFromPrompt(parsedRequest.data.prompt);

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unexpected server error while generating the quiz.",
        issues: [],
      },
      { status: 500 },
    );
  }
}
