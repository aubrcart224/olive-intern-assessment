import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

import {
  formatZodIssues,
} from "@/lib/quiz-spec";

const REGENERATE_OPTIONS_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

const regenerateOptionsSchema = z.object({
  questionTitle: z.string().min(1).max(180),
  questionDescription: z.string().max(400).optional(),
  questionType: z.enum(["multiple_choice", "yes_no", "slider"]),
  numOptions: z.number().int().min(2).max(8).default(4),
  context: z.string().optional(), // Additional context about the quiz
});

const SYSTEM_PROMPT = `You are a quiz design assistant. Given a question, generate appropriate answer options with scoring.

Return a JSON object with this structure (no markdown, no code fences):
{
  "options": [
    {
      "id": "kebab-case-id",
      "label": "Option text (max 140 chars)",
      "helperText": "Optional helper text (max 240 chars)",
      "scoreDelta": -20 to 20 (integer, negative for "bad" answers, positive for "good" answers)
    }
  ]
}

Guidelines:
- IDs must be unique and kebab-case (lowercase letters, numbers, hyphens only)
- Labels should be clear and concise
- Score deltas should range from -10 to +15 to create meaningful differentiation
- Mix of positive and negative scores based on answer quality
- Helper text is optional but helpful for clarifying ambiguous options`;

function getTextFromResponse(
  message: {
    content: Array<{ type: string; text?: string }>;
  },
) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

const optionSchema = z.array(
  z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    label: z.string().min(1).max(140),
    helperText: z.string().max(240).optional(),
    scoreDelta: z.number().int().min(-20).max(20),
  })
).min(2).max(8);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = regenerateOptionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request", issues: formatZodIssues(parsed.error.issues) },
        { status: 400 }
      );
    }

    const { questionTitle, questionDescription, questionType, numOptions, context } = parsed.data;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const userPrompt = `Generate ${numOptions} answer options for this quiz question:

Question: ${questionTitle}
${questionDescription ? `Description: ${questionDescription}` : ""}
${context ? `Context: ${context}` : ""}

Type: ${questionType}

Generate appropriate options with realistic scoring.`;

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: REGENERATE_OPTIONS_MODEL,
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    if (!("content" in message)) {
      throw new Error("Expected a non-streaming Anthropic response.");
    }

    const rawOutput = getTextFromResponse(message);

    // Extract JSON from response
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { ok: false, error: "Failed to parse LLM response" },
        { status: 500 }
      );
    }

    const parsedJson = JSON.parse(jsonMatch[0]);
    const validatedOptions = optionSchema.safeParse(parsedJson.options);

    if (!validatedOptions.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Generated options failed validation",
          issues: formatZodIssues(validatedOptions.error.issues),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      options: validatedOptions.data,
    });
  } catch (error) {
    console.error("Regenerate options error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to regenerate options",
      },
      { status: 500 }
    );
  }
}
