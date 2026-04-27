import { z } from "zod";

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: "Use kebab-case ids with letters, numbers, and hyphens only.",
});

const imageAssetSchema = z
  .object({
    imageUrl: z.string().url().optional(),
    imagePrompt: z.string().min(1).max(280).optional(),
    alt: z.string().min(1).max(160),
  })
  .superRefine((value, ctx) => {
    if (!value.imageUrl && !value.imagePrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either imageUrl or imagePrompt.",
        path: ["imagePrompt"],
      });
    }
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

const choiceOptionSchema = z.object({
  id: idSchema,
  label: z.string().min(1).max(140),
  helperText: z.string().max(240).optional(),
  scoreDelta: z.number().int().min(-20).max(20),
  image: imageAssetSchema.optional(),
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

const freeTextQuestionSchema = questionBaseSchema.extend({
  type: z.literal("free_text"),
  placeholder: z.string().max(160).optional(),
  maxLength: z.number().int().min(20).max(2000),
  evaluation: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("manual_review"),
      rubric: z.string().min(1).max(400),
      defaultScoreDelta: z.number().int().min(-20).max(20),
    }),
    z.object({
      mode: z.literal("keyword_match"),
      keywordBuckets: z
        .array(
          z.object({
            keywords: z.array(z.string().min(1).max(40)).min(1).max(8),
            scoreDelta: z.number().int().min(-20).max(20),
            feedback: z.string().min(1).max(160).optional(),
          }),
        )
        .min(1)
        .max(6),
      fallbackScoreDelta: z.number().int().min(-20).max(20),
    }),
  ]),
});

const imageChoiceQuestionSchema = questionBaseSchema.extend({
  type: z.literal("image_choice"),
  promptImage: imageAssetSchema.optional(),
  allowMultiple: z.boolean(),
  options: z
    .array(
      choiceOptionSchema.extend({
        image: imageAssetSchema,
      }),
    )
    .min(2)
    .max(6),
});

export const quizQuestionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  yesNoQuestionSchema,
  sliderQuestionSchema,
  freeTextQuestionSchema,
  imageChoiceQuestionSchema,
]);

const resultBandSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(400),
    minScore: z.number().int(),
    maxScore: z.number().int(),
    ctaLabel: z.string().min(1).max(80).optional(),
    ctaHref: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.minScore > value.maxScore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minScore must be less than or equal to maxScore.",
        path: ["minScore"],
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
        "free_text",
        "image_choice",
      ]),
    ),
    scoring: z.object({
      model: z.literal("sum"),
      minimumScore: z.number().int(),
      maximumScore: z.number().int(),
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

    if (value.scoring.minimumScore > value.scoring.maximumScore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minimumScore must be less than or equal to maximumScore.",
        path: ["scoring", "minimumScore"],
      });
    }

    value.resultsScreen.bands.forEach((band, bandIndex) => {
      if (
        band.minScore < value.scoring.minimumScore ||
        band.maxScore > value.scoring.maximumScore
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Result bands must fall within the scoring range.",
          path: ["resultsScreen", "bands", bandIndex],
        });
      }
    });
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
