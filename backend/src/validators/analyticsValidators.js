import { z } from "zod";

const askAuthAssistantSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(3, "Question must be at least 3 characters")
      .max(500, "Question is too long"),
    days: z.number().int().min(1).max(365).optional(),
    from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    includeDataPreview: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const hasFrom = Boolean(value.from);
    const hasTo = Boolean(value.to);
    if (hasFrom !== hasTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both from and to are required when filtering by date",
        path: hasFrom ? ["to"] : ["from"],
      });
    }
  });

const analyzeAuthLogsSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(3, "Question must be at least 3 characters")
      .max(500, "Question is too long"),
    email: z.string().trim().email("Invalid email format").optional(),
    ip: z.string().trim().min(3, "Invalid IP").max(64).optional(),
  })
  .refine((value) => Boolean(value.email || value.ip || value.question), {
    message: "At least one filter or question is required",
  });

export { askAuthAssistantSchema, analyzeAuthLogsSchema };
