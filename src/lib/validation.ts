import { z } from "zod";
import Decimal from "decimal.js";

const DECIMAL_MAX = new Decimal("99999999999999.9999");

function isDecimalWithinDatabaseRange(value: string): boolean {
  try {
    const decimal = new Decimal(value);
    const isWithinRange = decimal.gte(0); // Store the result of gte in a variable

    return isWithinRange && decimal.lte(DECIMAL_MAX); // call lte on the decimal object
  } catch {
    return false;
  }
}

const decimalField = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/, {
    error: "Enter a valid non-negative number with up to 4 decimal places.",
  })
  .refine(isDecimalWithinDatabaseRange, {
    error: "The value exceeds the supported numeric range.",
  });

const weightField = decimalField.refine(
  (value) => new Decimal(value).lte(new Decimal("100")),
  {
    error: "Weight cannot exceed 100%.",
  },
);

const uuidField = z.uuid({
  error: "A valid identifier is required.",
});

const nameField = z
  .string()
  .trim()
  .min(1, {
    error: "Name is required.",
  })
  .max(250, {
    error: "Name cannot exceed 250 characters.",
  });

const descriptionField = z
  .string()
  .trim()
  .max(5000, {
    error: "Description cannot exceed 5,000 characters.",
  })
  .optional();

const integerYearField = z.coerce
  .number()
  .int({
    error: "Year must be a whole number.",
  })
  .min(2000, {
    error: "Year must be 2000 or later.",
  })
  .max(2100, {
    error: "Year must be 2100 or earlier.",
  });

const sortOrderField = z.coerce
  .number()
  .int({
    error: "Sort order must be a whole number.",
  })
  .min(0, {
    error: "Sort order cannot be negative.",
  });

const unitOfMeasureSchema = z.enum(
  ["PERCENT", "COUNT", "NUMBER", "MINUTE", "HOUR"],
  {
    error: "Select a valid unit of measure.",
  },
);

const userRoleSchema = z.enum(["ADMIN", "USER"], {
  error: "Select a valid user role.",
});

const passwordSchema = z
  .string()
  .min(12, {
    error: "Password must contain at least 12 characters.",
  })
  .max(128, {
    error: "Password cannot exceed 128 characters.",
  });

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, {
      error: "Username is required.",
    })
    .max(80, {
      error: "Username cannot exceed 80 characters.",
    })
    .transform((value) => value.toLowerCase()),

  password: z.string().min(1, {
    error: "Password is required.",
  }),
});

export const departmentCreateSchema = z.object({
  name: nameField.max(150, {
    error: "Department name cannot exceed 150 characters.",
  }),

  description: descriptionField,

  isActive: z.boolean().default(true),
});

export const departmentUpdateSchema = departmentCreateSchema.extend({
  id: uuidField,
});

export const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, {
      error: "Username must contain at least 3 characters.",
    })
    .max(80, {
      error: "Username cannot exceed 80 characters.",
    })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      error:
        "Username may only contain letters, numbers, dots, underscores and hyphens.",
    })
    .transform((value) => value.toLowerCase()),

  password: passwordSchema,

  role: userRoleSchema,

  departmentId: uuidField,

  isActive: z.boolean().default(true),
});

export const userUpdateSchema = userCreateSchema
  .omit({
    password: true,
  })
  .extend({
    id: uuidField,

    password: passwordSchema.optional(),
  });

export const scorecardCreateSchema = z.object({
  departmentId: uuidField,
  year: integerYearField,
});

export const scorecardUpdateSchema = scorecardCreateSchema.extend({
  id: uuidField,
});

export const perspectiveCreateSchema = z.object({
  scorecardId: uuidField,

  name: nameField.max(150, {
    error: "Perspective name cannot exceed 150 characters.",
  }),

  weight: weightField,

  sortOrder: sortOrderField.default(0),
});

export const perspectiveUpdateSchema = perspectiveCreateSchema.extend({
  id: uuidField,
});

export const objectiveCreateSchema = z.object({
  perspectiveId: uuidField,

  name: nameField.max(200, {
    error: "Objective name cannot exceed 200 characters.",
  }),

  weight: weightField,

  sortOrder: sortOrderField.default(0),
});

export const objectiveUpdateSchema = objectiveCreateSchema.extend({
  id: uuidField,
});

export const activityCreateSchema = z.object({
  objectiveId: uuidField,

  name: nameField,

  weight: weightField,

  unitOfMeasure: unitOfMeasureSchema,

  annualTarget: decimalField,

  baseline: decimalField,

  responsibleDepartmentIds: z
    .array(uuidField)
    .min(1, {
      error: "At least one responsible department is required.",
    })
    .max(100, {
      error: "Too many responsible departments were selected.",
    }),

  remark: z
    .string()
    .trim()
    .max(5000, {
      error: "Remark cannot exceed 5,000 characters.",
    })
    .optional(),

  sortOrder: sortOrderField.default(0),
});

export const activityUpdateSchema = activityCreateSchema.extend({
  id: uuidField,
});

export const responsibleUnitsSchema = z.object({
  activityId: uuidField,

  departmentIds: z
    .array(uuidField)
    .min(1, {
      error: "At least one responsible department is required.",
    })
    .max(100),
});

export const monthlyPlanSchema = z.object({
  scorecardId: uuidField,

  activityId: uuidField,

  year: integerYearField,

  monthIndex: z.coerce.number().int().min(0).max(11),

  plannedValue: decimalField,
});

export const monthlyActualSchema = z.object({
  scorecardId: uuidField,

  activityId: uuidField,

  year: integerYearField,

  month: z.coerce.number().int().min(1).max(12),

  actualValue: decimalField,
});

export const monthlyPlanBatchSchema = z
  .object({
    scorecardId: uuidField,

    year: integerYearField,

    entries: z
      .array(
        z.object({
          activityId: uuidField,

          monthIndex: z.number().int().min(0).max(11),

          plannedValue: decimalField,
        }),
      )
      .max(5000),
  })
  .refine(
    (data) => {
      const keys = data.entries.map(
        (entry) => `${entry.activityId}:${entry.monthIndex}`,
      );

      return keys.length === new Set(keys).size;
    },
    {
      error: "Duplicate monthly plan entries are not allowed.",
      path: ["entries"],
    },
  );

export const monthlyActualBatchSchema = z
  .object({
    scorecardId: uuidField,

    year: integerYearField,

    entries: z
      .array(
        z.object({
          activityId: uuidField,

          month: z.number().int().min(1).max(12),

          actualValue: decimalField,
        }),
      )
      .max(5000),
  })
  .refine(
    (data) => {
      const keys = data.entries.map(
        (entry) => `${entry.activityId}:${entry.month}`,
      );

      return keys.length === new Set(keys).size;
    },
    {
      error: "Duplicate monthly actual entries are not allowed.",
      path: ["entries"],
    },
  );

export const monthlyAutoDistributionSchema = z.object({
  scorecardId: uuidField,

  activityId: uuidField,

  fiscalYear: integerYearField,

  totalValue: decimalField,

  selectedMonthIndexes: z
    .array(z.number().int().min(0).max(11))
    .min(1)
    .max(12)
    .refine((months) => months.length === new Set(months).size, {
      error: "Duplicate fiscal months are not allowed.",
    }),
});

export const reportRangeSchema = z.object({
  fiscalYear: integerYearField,

  startMonthIndex: z.number().int().min(0).max(11),

  endMonthIndex: z.number().int().min(0).max(11),
});

export const tableQuerySchema = z.object({
  search: z.string().trim().max(150).default(""),

  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export const scorecardActivitySchema = z.object({
  id: uuidField.optional(),

  name: nameField,

  weight: weightField,

  unitOfMeasure: unitOfMeasureSchema,

  annualTarget: decimalField,

  baseline: decimalField,

  responsibleDepartmentIds: z.array(uuidField).min(1, {
    error: "At least one responsible department is required.",
  }),

  remark: z.string().trim().max(5000).optional(),

  sortOrder: sortOrderField,
});

export const scorecardObjectiveSchema = z
  .object({
    id: uuidField.optional(),

    name: nameField.max(200),

    weight: weightField,

    sortOrder: sortOrderField,

    activities: z
      .array(scorecardActivitySchema)
      .min(1, {
        error: "Every objective must contain at least one activity.",
      })
      .max(500),
  })
  .refine(
    (objective) => {
      const total = objective.activities.reduce(
        (sum, activity) => sum.plus(new Decimal(activity.weight)),
        new Decimal(0),
      );

      return total.eq(100);
    },
    {
      error: "Activity weights within an objective must total exactly 100%.",
      path: ["activities"],
    },
  );

export const scorecardPerspectiveSchema = z
  .object({
    id: uuidField.optional(),

    name: nameField.max(150),

    weight: weightField,

    sortOrder: sortOrderField,

    objectives: z
      .array(scorecardObjectiveSchema)
      .min(1, {
        error: "Every perspective must contain at least one objective.",
      })
      .max(500),
  })
  .refine(
    (perspective) => {
      const total = perspective.objectives.reduce(
        (sum, objective) => sum.plus(new Decimal(objective.weight)),
        new Decimal(0),
      );

      return total.eq(100);
    },
    {
      error: "Objective weights within a perspective must total exactly 100%.",
      path: ["objectives"],
    },
  );

export const scorecardDefinitionSchema = z
  .object({
    scorecardId: uuidField,

    perspectives: z
      .array(scorecardPerspectiveSchema)
      .min(1, {
        error: "A scorecard must contain at least one perspective.",
      })
      .max(100),
  })
  .refine(
    (scorecard) => {
      const total = scorecard.perspectives.reduce(
        (sum, perspective) => sum.plus(new Decimal(perspective.weight)),
        new Decimal(0),
      );

      return total.eq(100);
    },
    {
      error: "Perspective weights within a scorecard must total exactly 100%.",
      path: ["perspectives"],
    },
  );

export type LoginInput = z.infer<typeof loginSchema>;

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;

export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;

export type UserCreateInput = z.infer<typeof userCreateSchema>;

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export type ScorecardCreateInput = z.infer<typeof scorecardCreateSchema>;

export type ScorecardUpdateInput = z.infer<typeof scorecardUpdateSchema>;

export type PerspectiveCreateInput = z.infer<typeof perspectiveCreateSchema>;

export type PerspectiveUpdateInput = z.infer<typeof perspectiveUpdateSchema>;

export type ObjectiveCreateInput = z.infer<typeof objectiveCreateSchema>;

export type ObjectiveUpdateInput = z.infer<typeof objectiveUpdateSchema>;

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;

export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;

export type MonthlyPlanInput = z.infer<typeof monthlyPlanSchema>;

export type MonthlyActualInput = z.infer<typeof monthlyActualSchema>;

export type MonthlyPlanBatchInput = z.infer<typeof monthlyPlanBatchSchema>;

export type MonthlyActualBatchInput = z.infer<typeof monthlyActualBatchSchema>;

export type MonthlyAutoDistributionInput = z.infer<
  typeof monthlyAutoDistributionSchema
>;

export type ReportRangeInput = z.infer<typeof reportRangeSchema>;

export type ScorecardDefinitionInput = z.infer<
  typeof scorecardDefinitionSchema
>;
