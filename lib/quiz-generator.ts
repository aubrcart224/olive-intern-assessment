import Anthropic from "@anthropic-ai/sdk";

import {
  parseQuizSpec,
  type QuizSpec,
} from "@/lib/quiz-spec";

const QUIZ_GENERATOR_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

const GENERATION_SYSTEM_PROMPT = `
You turn plain-English quiz requests into a strict JSON quiz specification.

Return JSON only. Do not wrap the response in markdown, prose, or code fences.

Requirements:
- Supported question types are: multiple_choice, yes_no, slider.
- Use stable kebab-case ids for all question ids, option ids, and result ids.
- Prefer yes_no over two-option multiple_choice when the prompt is binary.
- Keep scoring simple integer deltas and use scoring.model = "normalized_100".
- Use branching only when it materially improves the flow.
- Every quiz must include a resultsScreen with score bands that cover the full 0-100 percentage range without gaps (e.g., 0-25, 26-50, 51-75, 76-100).
- If the prompt is underspecified, make the safest reasonable product choice and encode it in the spec rather than asking questions.

Required JSON shape:
{
  "version": "1.0",
  "quiz": {
    "title": string,
    "description": string,
    "promptIntent": string,
    "questionTypesUsed": string[],
    "scoring": {
      "model": "normalized_100",
      "scoreLabel": string
    },
    "questions": [
      {
        "id": "kebab-case",
        "type": "multiple_choice" | "yes_no" | "slider",
        "title": string,
        "description": string?,
        "required": boolean,
        "branching": {
          "defaultDestination": { "kind": "question" | "result" | "end", "targetId": string? },
          "rules": [
            {
              "condition": {
                "selectedOptionId": string?,
                "selectedOptionIdsAll": string[]?,
                "equalsBoolean": boolean?,
                "minValue": number?,
                "maxValue": number?,
                "textIncludesAny": string[]?
              },
              "destination": { "kind": "question" | "result" | "end", "targetId": string? },
              "explanation": string?
            }
          ]
        }?
      }
    ],
    "resultsScreen": {
      "title": string,
      "showScore": boolean,
      "scoreLabel": string?,
      "bands": [
        {
          "id": "kebab-case",
          "title": string,
          "description": string,
          "minPercent": integer (0-100),
          "maxPercent": integer (0-100),
          "ctaLabel": string?,
          "ctaHref": string?
        }
      ]
    }
  }
}

Type-specific additions:
- multiple_choice: "allowMultiple": boolean, "options": [{ "id", "label", "helperText"?, "scoreDelta" }]
- yes_no: "yesLabel", "noLabel", "scoreDelta": { "yes": integer, "no": integer }
- slider: "min", "max", "step", "minLabel", "maxLabel", "scoreBands": [{ "minValue", "maxValue", "scoreDelta", "label"? }]
`.trim();

function createGenerationPrompt(prompt: string) {
  return `
Create one quiz spec from this request:

${prompt}

Semantic guidance:
- Produce a polished quiz a frontend can render.
- Include clear question copy, answer labels, and scoring.
- Keep the quiz concise unless the user explicitly asks for a long quiz.
- Use branching destinations only when the next step logically changes based on an answer.
`.trim();
}

function createRepairPrompt(rawOutput: string, issues: string[]) {
  return `
The previous response did not validate against the quiz schema.

Validation issues:
${issues.map((issue) => `- ${issue}`).join("\n")}

Return a corrected JSON object only. Do not include markdown or explanation.

Previous response:
${rawOutput}
`.trim();
}

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

async function requestQuizSpec(userPrompt: string) {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await client.messages.create({
    model: QUIZ_GENERATOR_MODEL,
    max_tokens: 4000,
    temperature: 0,
    system: GENERATION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  if (!("content" in message)) {
    throw new Error("Expected a non-streaming Anthropic response.");
  }

  return getTextFromResponse(message);
}

export type GenerateQuizResult =
  | {
      ok: true;
      spec: QuizSpec;
      rawOutput: string;
      repaired: boolean;
      issues: string[];
    }
  | {
      ok: false;
      rawOutput: string;
      repaired: boolean;
      issues: string[];
      errorMessage: string;
    };

export async function generateQuizSpecFromPrompt(
  prompt: string,
): Promise<GenerateQuizResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      rawOutput: "",
      repaired: false,
      issues: ["ANTHROPIC_API_KEY is not configured on the server."],
      errorMessage: "Missing Anthropic configuration.",
    };
  }

  const rawOutput = await requestQuizSpec(createGenerationPrompt(prompt));
  const firstAttempt = parseQuizSpec(rawOutput);

  if (firstAttempt.success) {
    return {
      ok: true,
      spec: firstAttempt.spec,
      rawOutput: firstAttempt.candidate,
      repaired: false,
      issues: [],
    };
  }

  const repairOutput = await requestQuizSpec(
    createRepairPrompt(firstAttempt.candidate, firstAttempt.issues),
  );
  const repairedAttempt = parseQuizSpec(repairOutput);

  if (repairedAttempt.success) {
    return {
      ok: true,
      spec: repairedAttempt.spec,
      rawOutput: repairedAttempt.candidate,
      repaired: true,
      issues: firstAttempt.issues,
    };
  }

  return {
    ok: false,
    rawOutput: repairOutput || rawOutput,
    repaired: true,
    issues: repairedAttempt.issues,
    errorMessage:
      "The model returned output that could not be validated. Retry or edit the JSON manually.",
  };
}
