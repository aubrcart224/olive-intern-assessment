import { z } from "zod";

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: "Use kebab-case ids with letters, numbers, and hyphens only.",
});

const destinationSchema = z
  .object({
    kind: z.enum(["question", "result", "end"]),
    targetId: idSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const needsTarget = value.kind === "question" || value.kind === "result";

    if (needsTarget && !value.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetId is required for question and result destinations.",
        path: ["targetId"],
      });
    }

    if (!needsTarget && value.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetId must be omitted for end destinations.",
        path: ["targetId"],
      });
    }
  });

const branchConditionSchema = z
  .object({
    selectedOptionId: idSchema.optional(),
    selectedOptionIdsAll: z.array(idSchema).min(1).max(5).optional(),
    equalsBoolean: z.boolean().optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    textIncludesAny: z.array(z.string().min(1).max(80)).min(1).max(8).optional(),
  })
  .superRefine((value, ctx) => {
    if (!Object.values(value).some((entry) => entry !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one condition is required.",
      });
    }

    if (
      value.minValue !== undefined &&
      value.maxValue !== undefined &&
      value.minValue > value.maxValue
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minValue must be less than or equal to maxValue.",
        path: ["minValue"],
      });
    }
  });

const branchRuleSchema = z.object({
  condition: branchConditionSchema,
  destination: destinationSchema,
  explanation: z.string().min(1).max(240).optional(),
});

const branchingSchema = z
  .object({
    defaultDestination: destinationSchema.optional(),
    rules: z.array(branchRuleSchema).max(6).default([]),
  })
  .superRefine((value, ctx) => {
    if (!value.defaultDestination && value.rules.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Branching must include a default destination or at least one rule.",
      });
    }
  });

export const choiceOptionSchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(140),
  helperText: z.string().max(240).optional(),
  scoreDelta: z.number().int().min(-20).max(20),
});

const questionBaseSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(180),
  description: z.string().max(400).optional(),
  required: z.boolean(),
  branching: branchingSchema.optional(),
});

const multipleChoiceQuestionSchema = questionBaseSchema.extend({
  type: z.literal("multiple_choice"),
  allowMultiple: z.boolean(),
  options: z.array(choiceOptionSchema).min(2).max(8),
});

const yesNoQuestionSchema = questionBaseSchema.extend({
  type: z.literal("yes_no"),
  yesLabel: z.string().min(1).max(40),
  noLabel: z.string().min(1).max(40),
  scoreDelta: z.object({
    yes: z.number().int().min(-20).max(20),
    no: z.number().int().min(-20).max(20),
  }),
});

const sliderBandSchema = z
  .object({
    minValue: z.number(),
    maxValue: z.number(),
    scoreDelta: z.number().int().min(-20).max(20),
    label: z.string().min(1).max(80).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.minValue > value.maxValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minValue must be less than or equal to maxValue.",
        path: ["minValue"],
      });
    }
  });

const sliderQuestionSchema = questionBaseSchema
  .extend({
    type: z.literal("slider"),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    minLabel: z.string().min(1).max(40),
    maxLabel: z.string().min(1).max(40),
    scoreBands: z.array(sliderBandSchema).min(1).max(8),
  })
  .superRefine((value, ctx) => {
    if (value.min >= value.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "max must be greater than min.",
        path: ["max"],
      });
    }
  });

export const quizQuestionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  yesNoQuestionSchema,
  sliderQuestionSchema,
]);

export const resultBandSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(400),
    minPercent: z.number().int().min(0).max(100),
    maxPercent: z.number().int().min(0).max(100),
    ctaLabel: z.string().min(1).max(80).optional(),
    ctaHref: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.minPercent > value.maxPercent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minPercent must be less than or equal to maxPercent.",
        path: ["minPercent"],
      });
    }
  });

const quizCoreSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(400),
    promptIntent: z.string().min(1).max(400),
    questionTypesUsed: z.array(
      z.enum([
        "multiple_choice",
        "yes_no",
        "slider",
      ]),
    ),
    scoring: z.object({
      model: z.literal("normalized_100"),
      scoreLabel: z.string().min(1).max(40),
    }),
    questions: z.array(quizQuestionSchema).min(1).max(12),
    resultsScreen: z.object({
      title: z.string().min(1).max(120),
      showScore: z.boolean(),
      scoreLabel: z.string().min(1).max(40).optional(),
      bands: z.array(resultBandSchema).min(1).max(6),
    }),
  })
  .superRefine((value, ctx) => {
    const questionIds = new Set<string>();
    const resultIds = new Set(value.resultsScreen.bands.map((band) => band.id));

    value.questions.forEach((question, questionIndex) => {
      if (questionIds.has(question.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate question id "${question.id}".`,
          path: ["questions", questionIndex, "id"],
        });
      }

      questionIds.add(question.id);

      if ("options" in question) {
        const optionIds = new Set<string>();

        question.options.forEach((option, optionIndex) => {
          if (optionIds.has(option.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate option id "${option.id}" in question "${question.id}".`,
              path: ["questions", questionIndex, "options", optionIndex, "id"],
            });
          }

          optionIds.add(option.id);
        });
      }

      const destinations = [
        question.branching?.defaultDestination,
        ...(question.branching?.rules.map((rule) => rule.destination) ?? []),
      ].filter((destination) => destination !== undefined);

      destinations.forEach((destination, destinationIndex) => {
        if (destination.kind === "question" && !questionIds.has(destination.targetId!)) {
          const existsLater = value.questions.some(
            (candidate) => candidate.id === destination.targetId,
          );

          if (!existsLater) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Unknown question destination "${destination.targetId}".`,
              path: [
                "questions",
                questionIndex,
                "branching",
                "rules",
                destinationIndex,
                "destination",
                "targetId",
              ],
            });
          }
        }

        if (destination.kind === "result" && !resultIds.has(destination.targetId!)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown result destination "${destination.targetId}".`,
            path: [
              "questions",
              questionIndex,
              "branching",
              "rules",
              destinationIndex,
              "destination",
              "targetId",
            ],
          });
        }
      });
    });

    // Validate that result bands cover the full 0-100 range without gaps
    const sortedBands = [...value.resultsScreen.bands].sort((a, b) => a.minPercent - b.minPercent);

    if (sortedBands[0]?.minPercent !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Result bands must start at 0%.",
        path: ["resultsScreen", "bands", 0, "minPercent"],
      });
    }

    if (sortedBands[sortedBands.length - 1]?.maxPercent !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Result bands must end at 100%.",
        path: ["resultsScreen", "bands", sortedBands.length - 1, "maxPercent"],
      });
    }

    for (let i = 0; i < sortedBands.length - 1; i++) {
      if (sortedBands[i]!.maxPercent + 1 !== sortedBands[i + 1]!.minPercent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Gap or overlap between result bands: ${sortedBands[i]!.id} ends at ${sortedBands[i]!.maxPercent} but ${sortedBands[i + 1]!.id} starts at ${sortedBands[i + 1]!.minPercent}.`,
          path: ["resultsScreen", "bands", i, "maxPercent"],
        });
      }
    }
  });

export const quizSpecSchema = z.object({
  version: z.literal("1.0"),
  quiz: quizCoreSchema,
});

export const generateQuizRequestSchema = z.object({
  prompt: z.string().min(20).max(5000),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizSpec = z.infer<typeof quizSpecSchema>;
export type GenerateQuizRequest = z.infer<typeof generateQuizRequestSchema>;
export type ResultBand = z.infer<typeof resultBandSchema>;
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;

export function formatZodIssues(issues: z.ZodIssue[]) {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";
    return `${path}: ${issue.message}`;
  });
}

export function extractJsonCandidate(input: string) {
  const fencedMatch = input.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const startIndex = input.indexOf("{");
  const endIndex = input.lastIndexOf("}");

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return input.slice(startIndex, endIndex + 1);
  }

  return input.trim();
}

export function parseQuizSpec(input: string) {
  const candidate = extractJsonCandidate(input);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(candidate);
  } catch (error) {
    return {
      success: false as const,
      candidate,
      issues: [
        error instanceof Error ? error.message : "Failed to parse JSON response.",
      ],
    };
  }

  const result = quizSpecSchema.safeParse(parsedJson);

  if (!result.success) {
    return {
      success: false as const,
      candidate,
      issues: formatZodIssues(result.error.issues),
    };
  }

  return {
    success: true as const,
    candidate,
    spec: result.data,
  };
}
