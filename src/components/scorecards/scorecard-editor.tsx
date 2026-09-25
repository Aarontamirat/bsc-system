"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Edit3,
  Layers3,
  ListChecks,
  MoreHorizontal,
  Plus,
  Scale,
  Target,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  createActivityAction,
  createObjectiveAction,
  createPerspectiveAction,
  deleteActivityAction,
  deleteObjectiveAction,
  deletePerspectiveAction,
  updateActivityAction,
  updateObjectiveAction,
  updatePerspectiveAction,
} from "@/app/actions/scorecard-structure";

import {
  deleteScorecardAction,
  validateScorecardAction,
} from "@/app/actions/scorecard";

type UnitOfMeasure = "PERCENT" | "COUNT" | "NUMBER" | "MINUTE" | "HOUR";

type ActivityNode = {
  id: string;
  objectiveId: string;
  name: string;
  weight: number;
  unitOfMeasure: UnitOfMeasure;
  annualTarget: number;
  baseline: number;
  remark: string | null;
  sortOrder: number;
  responsibleDepartmentIds: string[];
  responsibleUnits: Array<{
    id: string;
    name: string;
  }>;
};

type ObjectiveNode = {
  id: string;
  perspectiveId: string;
  name: string;
  weight: number;
  activities: ActivityNode[];
};

type PerspectiveNode = {
  id: string;
  scorecardId: string;
  name: string;
  weight: number;
  objectives: ObjectiveNode[];
};

type ScorecardEditorData = {
  id: string;
  departmentId: string;
  year: number;
  departmentName: string;
  perspectives: PerspectiveNode[];
};

type DepartmentOption = {
  id: string;
  name: string;
};

interface ScorecardEditorProps {
  data: ScorecardEditorData;
  departments: DepartmentOption[];
  canEdit: boolean;
}

type EditorTarget =
  | {
      type: "perspective";
      mode: "create" | "edit";
      id?: string;
    }
  | {
      type: "objective";
      mode: "create" | "edit";
      id?: string;
      perspectiveId: string;
    }
  | {
      type: "activity";
      mode: "create" | "edit";
      id?: string;
      objectiveId: string;
    }
  | null;

const perspectiveSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Perspective name is required.")
    .max(200, "Maximum 200 characters."),
  weight: z
    .number()
    .gt(0, "Weight must be greater than 0.")
    .lte(100, "Weight cannot exceed 100."),
});

const objectiveSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Objective name is required.")
    .max(200, "Maximum 200 characters."),
  weight: z
    .number()
    .gt(0, "Weight must be greater than 0.")
    .lte(100, "Weight cannot exceed 100."),
});

const activitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Activity name is required.")
    .max(200, "Maximum 200 characters."),

  weight: z
    .number()
    .gt(0, "Weight must be greater than 0.")
    .lte(100, "Weight cannot exceed 100."),

  unitOfMeasure: z.enum(["PERCENT", "COUNT", "NUMBER", "MINUTE", "HOUR"]),

  annualTarget: z
    .number()
    .finite("Annual target must be a valid number.")
    .gte(0, "Annual target cannot be negative."),

  baseline: z
    .number()
    .finite("Baseline must be a valid number.")
    .gte(0, "Baseline cannot be negative."),

  remark: z.string().max(500, "Maximum 500 characters.").optional(),
  responsibleDepartmentIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one responsible unit."),
});

type PerspectiveFormValues = z.infer<typeof perspectiveSchema>;
type ObjectiveFormValues = z.infer<typeof objectiveSchema>;
type ActivityFormValues = z.infer<typeof activitySchema>;

function sumWeights(items: Array<{ weight: number }>) {
  return items.reduce((sum, item) => sum + Number(item.weight), 0);
}

function roundWeight(value: number) {
  return Math.round(value * 100) / 100;
}

function getWeightStatus(total: number) {
  const normalized = roundWeight(total);

  if (normalized > 100) {
    return {
      label: "Over 100%",
      state: "overflow" as const,
    };
  }

  if (normalized === 100) {
    return {
      label: "Complete",
      state: "complete" as const,
    };
  }

  if (normalized === 0) {
    return {
      label: "Not configured",
      state: "empty" as const,
    };
  }

  return {
    label: `${roundWeight(100 - normalized)}% remaining`,
    state: "incomplete" as const,
  };
}

function WeightIndicator({ total }: { total: number }) {
  const status = getWeightStatus(total);

  const statusClasses = {
    complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
    incomplete: "border-amber-200 bg-amber-50 text-amber-700",
    overflow: "border-red-200 bg-red-50 text-red-700",
    empty: "border-slate-200 bg-slate-50 text-slate-500",
  };

  const progress = Math.min(Math.max(total, 0), 100);

  return (
    <div className="flex min-w-47.5 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500">
          Weight allocation
        </span>

        <Badge variant="outline" className={statusClasses[status.state]}>
          {roundWeight(total)}% · {status.label}
        </Badge>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={[
            "h-full rounded-full transition-all duration-300",
            status.state === "complete" && "bg-emerald-500",
            status.state === "overflow" && "bg-red-500",
            status.state === "incomplete" && "bg-amber-500",
            status.state === "empty" && "bg-slate-300",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

function FormActions({
  pending,
  onCancel,
  submitLabel,
}: {
  pending: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={onCancel}>
        Cancel
      </Button>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

function PerspectiveForm({
  scorecardId,
  perspective,
  onClose,
  onSaved,
  onError,
}: {
  scorecardId: string;
  perspective?: PerspectiveNode;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const editing = Boolean(perspective);
  const [pending, setPending] = useState(false);

  const form = useForm<PerspectiveFormValues>({
    resolver: zodResolver(perspectiveSchema),
    defaultValues: {
      name: perspective?.name ?? "",
      weight: perspective?.weight ?? 0,
    },
  });

  async function onSubmit(values: PerspectiveFormValues) {
    setPending(true);

    try {
      const result = editing
        ? await updatePerspectiveAction({
            id: perspective!.id,
            scorecardId,
            name: values.name,
            weight: values.weight,
          })
        : await createPerspectiveAction({
            scorecardId,
            name: values.name,
            weight: values.weight,
          });

      if (!result.success) {
        onError(result.message);
        return;
      }

      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-4 rounded-2xl border border-slate-200 bg-(--background) p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">
          {editing ? "Edit perspective" : "Add perspective"}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Perspectives must collectively total exactly 100% before the scorecard
          is ready.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div>
          <Label htmlFor="perspective-name">Name</Label>

          <Input
            id="perspective-name"
            className="mt-2"
            placeholder="e.g. Financial"
            {...form.register("name")}
          />

          <FieldError message={form.formState.errors.name?.message} />
        </div>

        <div>
          <Label htmlFor="perspective-weight">Weight (%)</Label>

          <Input
            id="perspective-weight"
            className="mt-2"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            {...form.register("weight", { valueAsNumber: true })}
          />

          <FieldError message={form.formState.errors.weight?.message} />
        </div>
      </div>

      <div className="mt-4">
        <FormActions
          pending={pending}
          onCancel={onClose}
          submitLabel={editing ? "Save perspective" : "Add perspective"}
        />
      </div>
    </form>
  );
}

function ObjectiveForm({
  scorecardId,
  perspectiveId,
  objective,
  onClose,
  onSaved,
  onError,
}: {
  scorecardId: string;
  perspectiveId: string;
  objective?: ObjectiveNode;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const editing = Boolean(objective);
  const [pending, setPending] = useState(false);

  const form = useForm<ObjectiveFormValues>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      name: objective?.name ?? "",
      weight: objective?.weight ?? 0,
    },
  });

  async function onSubmit(values: ObjectiveFormValues) {
    setPending(true);

    try {
      const result = editing
        ? await updateObjectiveAction({
            id: objective!.id,
            scorecardId,
            name: values.name,
            weight: values.weight,
          })
        : await createObjectiveAction({
            perspectiveId,
            scorecardId,
            name: values.name,
            weight: values.weight,
          });

      if (!result.success) {
        onError(result.message);
        return;
      }

      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div>
          <Label htmlFor="objective-name">Objective</Label>

          <Input
            id="objective-name"
            className="mt-2 bg-(--background)"
            placeholder="Enter objective"
            {...form.register("name")}
          />

          <FieldError message={form.formState.errors.name?.message} />
        </div>

        <div>
          <Label htmlFor="objective-weight">Weight (%)</Label>

          <Input
            id="objective-weight"
            className="mt-2 bg-(--background)"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            {...form.register("weight", { valueAsNumber: true })}
          />

          <FieldError message={form.formState.errors.weight?.message} />
        </div>
      </div>

      <div className="mt-4">
        <FormActions
          pending={pending}
          onCancel={onClose}
          submitLabel={editing ? "Save objective" : "Add objective"}
        />
      </div>
    </form>
  );
}

function ActivityForm({
  scorecardId,
  objectiveId,
  activity,
  departments,
  onClose,
  onSaved,
  onError,
}: {
  scorecardId: string;
  objectiveId: string;
  activity?: ActivityNode;
  departments: DepartmentOption[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const editing = Boolean(activity);
  const [pending, setPending] = useState(false);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: activity?.name ?? "",
      weight: activity?.weight ?? 0,
      unitOfMeasure: activity?.unitOfMeasure ?? "PERCENT",
      annualTarget: activity?.annualTarget ?? 0,
      baseline: activity?.baseline ?? 0,
      remark: activity?.remark ?? "",
      responsibleDepartmentIds: activity?.responsibleDepartmentIds ?? [],
    },
  });

  const responsibleDepartmentIds = useWatch({
    control: form.control,
    name: "responsibleDepartmentIds",
    defaultValue: activity?.responsibleDepartmentIds ?? [],
  });

  async function onSubmit(values: ActivityFormValues) {
    setPending(true);

    try {
      const payload = {
        name: values.name,
        weight: values.weight,
        unitOfMeasure: values.unitOfMeasure,
        annualTarget: values.annualTarget,
        baseline: values.baseline,
        remark: values.remark ?? "",
        responsibleDepartmentIds: values.responsibleDepartmentIds,
      };

      const result = editing
        ? await updateActivityAction({
            id: activity!.id,
            scorecardId,
            ...payload,
          })
        : await createActivityAction({
            objectiveId,
            scorecardId,
            ...payload,
          });

      if (!result.success) {
        onError(result.message);
        return;
      }

      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-3 rounded-2xl border border-slate-200 bg-(--background) p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">
          {editing ? "Edit activity" : "Add activity"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_120px_170px]">
        <div>
          <Label htmlFor="activity-name">Activity</Label>

          <Input
            id="activity-name"
            className="mt-2"
            placeholder="Enter activity"
            {...form.register("name")}
          />

          <FieldError message={form.formState.errors.name?.message} />
        </div>

        <div>
          <Label htmlFor="activity-weight">Weight (%)</Label>

          <Input
            id="activity-weight"
            className="mt-2"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            {...form.register("weight", { valueAsNumber: true })}
          />

          <FieldError message={form.formState.errors.weight?.message} />
        </div>

        <div>
          <Label htmlFor="activity-unit">Unit</Label>

          <select
            id="activity-unit"
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...form.register("unitOfMeasure")}>
            <option value="PERCENT">%</option>
            <option value="COUNT">Count</option>
            <option value="NUMBER">Number</option>
            <option value="MINUTE">Minute</option>
            <option value="HOUR">Hour</option>
          </select>

          <FieldError message={form.formState.errors.unitOfMeasure?.message} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="activity-target">Annual target</Label>

          <Input
            id="activity-target"
            className="mt-2"
            type="number"
            min="0"
            step="0.01"
            {...form.register("annualTarget", { valueAsNumber: true })}
          />

          <FieldError message={form.formState.errors.annualTarget?.message} />
        </div>

        <div>
          <Label htmlFor="activity-baseline">Baseline</Label>

          <Input
            id="activity-baseline"
            className="mt-2"
            type="number"
            min="0"
            step="0.01"
            {...form.register("baseline", { valueAsNumber: true })}
          />

          <FieldError message={form.formState.errors.baseline?.message} />
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="activity-remark">Remark</Label>

        <textarea
          id="activity-remark"
          rows={3}
          placeholder="Optional note..."
          className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          {...form.register("remark")}
        />

        <FieldError message={form.formState.errors.remark?.message} />
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Responsible units</legend>
        <div className="mt-2 grid max-h-44 gap-2 overflow-y-auto rounded-md border border-input bg-background p-3 sm:grid-cols-2">
          {departments.map((department) => {
            const selected = (responsibleDepartmentIds || []).includes(
              department.id,
            );

            return (
              <label
                key={department.id}
                className="flex min-w-0 cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    const current = form.getValues("responsibleDepartmentIds");
                    form.setValue(
                      "responsibleDepartmentIds",
                      event.target.checked
                        ? [...current, department.id]
                        : current.filter((id) => id !== department.id),
                      { shouldValidate: true },
                    );
                  }}
                />
                <span className="truncate">{department.name}</span>
              </label>
            );
          })}
        </div>
        <FieldError
          message={form.formState.errors.responsibleDepartmentIds?.message}
        />
      </fieldset>

      <div className="mt-4">
        <FormActions
          pending={pending}
          onCancel={onClose}
          submitLabel={editing ? "Save activity" : "Add activity"}
        />
      </div>
    </form>
  );
}

export function ScorecardEditor({
  data,
  departments,
  canEdit,
}: ScorecardEditorProps) {
  const router = useRouter();

  const [expandedPerspectives, setExpandedPerspectives] = useState<Set<string>>(
    () => new Set(data.perspectives.map((perspective) => perspective.id)),
  );

  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(
    () => new Set(),
  );

  const [target, setTarget] = useState<EditorTarget>(null);

  const [validationPending, setValidationPending] = useState(false);

  const perspectiveTotal = useMemo(
    () => sumWeights(data.perspectives),
    [data.perspectives],
  );

  const objectiveTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const perspective of data.perspectives) {
      totals.set(perspective.id, sumWeights(perspective.objectives));
    }

    return totals;
  }, [data.perspectives]);

  const activityTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const perspective of data.perspectives) {
      for (const objective of perspective.objectives) {
        totals.set(objective.id, sumWeights(objective.activities));
      }
    }

    return totals;
  }, [data.perspectives]);

  const scorecardReady = useMemo(() => {
    if (
      data.perspectives.length === 0 ||
      roundWeight(perspectiveTotal) !== 100
    ) {
      return false;
    }

    for (const perspective of data.perspectives) {
      if (
        perspective.objectives.length === 0 ||
        roundWeight(objectiveTotals.get(perspective.id) ?? 0) !== 100
      ) {
        return false;
      }

      for (const objective of perspective.objectives) {
        if (
          objective.activities.length === 0 ||
          roundWeight(activityTotals.get(objective.id) ?? 0) !== 100
        ) {
          return false;
        }
      }
    }

    return true;
  }, [data.perspectives, perspectiveTotal, objectiveTotals, activityTotals]);

  function togglePerspective(id: string) {
    setExpandedPerspectives((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleObjective(id: string) {
    setExpandedObjectives((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function closeEditor() {
    setTarget(null);
  }

  function handleSaved(message: string) {
    setTarget(null);
    toast.success(message);
    router.refresh();
  }

  function handleError(message: string) {
    toast.error(message);
  }

  async function removePerspective(perspective: PerspectiveNode) {
    if (!window.confirm(`Delete "${perspective.name}"?`)) {
      return;
    }

    const result = await deletePerspectiveAction({
      id: perspective.id,
      scorecardId: data.id,
    });

    if (!result.success) {
      handleError(result.message);
      return;
    }

    handleSaved("Perspective deleted successfully.");
  }

  async function removeObjective(objective: ObjectiveNode) {
    if (!window.confirm(`Delete "${objective.name}"?`)) {
      return;
    }

    const result = await deleteObjectiveAction({
      id: objective.id,
      scorecardId: data.id,
    });

    if (!result.success) {
      handleError(result.message);
      return;
    }

    handleSaved("Objective deleted successfully.");
  }

  async function removeActivity(activity: ActivityNode) {
    if (!window.confirm(`Delete "${activity.name}"?`)) {
      return;
    }

    const result = await deleteActivityAction({
      id: activity.id,
      scorecardId: data.id,
    });

    if (!result.success) {
      handleError(result.message);
      return;
    }

    handleSaved("Activity deleted successfully.");
  }

  async function validateStructure() {
    setValidationPending(true);

    try {
      const result = await validateScorecardAction(data.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        result.message ?? "Scorecard structure passed server-side validation.",
      );
    } finally {
      setValidationPending(false);
    }
  }

  async function removeScorecard() {
    const accepted = window.confirm(
      "Delete this draft scorecard and its structure? This is only allowed before any monthly plan or actual data is recorded.",
    );

    if (!accepted) {
      return;
    }

    const result = await deleteScorecardAction(data.id);

    if (!result.success) {
      handleError(result.message);
      return;
    }

    router.push("/scorecards");
    router.refresh();
  }

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto w-full max-w-375 space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-(--background) shadow-sm">
          <div className="bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-7 text-white sm:px-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="border-white/10 bg-(--background)/10 text-white">
                    Fiscal Year {data.year}/{data.year + 1}
                  </Badge>

                  {!canEdit && (
                    <Badge
                      variant="outline"
                      className="border-white/20 bg-transparent text-white">
                      Read only
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Scorecard Builder
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Configure the strategic hierarchy for{" "}
                  <span className="font-semibold text-white">
                    {data.departmentName}
                  </span>
                  .
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-(--background)/5 p-3">
                <div className="rounded-xl bg-(--background)/10 p-2.5">
                  <Scale className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Overall allocation
                  </p>
                  <p className="text-lg font-bold">
                    {roundWeight(perspectiveTotal)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-200 bg-(--background) p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Layers3 className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Perspectives
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {data.perspectives.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Target className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Objectives
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {data.perspectives.reduce(
                      (total, perspective) =>
                        total + perspective.objectives.length,
                      0,
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Activity className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Activities
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {data.perspectives.reduce(
                      (total, perspective) =>
                        total +
                        perspective.objectives.reduce(
                          (objectiveTotal, objective) =>
                            objectiveTotal + objective.activities.length,
                          0,
                        ),
                      0,
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={[
                "rounded-2xl border p-4",
                scorecardReady
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-amber-200 bg-amber-50/60",
              ].join(" ")}>
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "rounded-xl p-2.5",
                    scorecardReady
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700",
                  ].join(" ")}>
                  {scorecardReady ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Configuration
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {scorecardReady ? "Ready" : "In progress"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main editor */}
        <section className="rounded-3xl border border-slate-200 bg-(--background) shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Strategic hierarchy
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Build each level from broad strategic perspective down to
                measurable activity.
              </p>
            </div>

            {canEdit && (
              <Button
                type="button"
                onClick={() =>
                  setTarget({
                    type: "perspective",
                    mode: "create",
                  })
                }>
                <Plus className="mr-2 h-4 w-4" />
                Add perspective
              </Button>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {target?.type === "perspective" && target.mode === "create" && (
              <PerspectiveForm
                scorecardId={data.id}
                onClose={closeEditor}
                onSaved={() => handleSaved("Perspective created successfully.")}
                onError={handleError}
              />
            )}

            {data.perspectives.length === 0 ? (
              target?.type === "perspective" &&
              target.mode === "create" ? null : (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <Layers3 className="h-8 w-8 text-slate-500" />
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    No perspectives yet
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Start the scorecard by creating its first strategic
                    perspective.
                  </p>

                  {canEdit && (
                    <Button
                      type="button"
                      className="mt-5"
                      onClick={() =>
                        setTarget({
                          type: "perspective",
                          mode: "create",
                        })
                      }>
                      <CirclePlus className="mr-2 h-4 w-4" />
                      Create first perspective
                    </Button>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-4">
                {data.perspectives.map((perspective, perspectiveIndex) => {
                  const perspectiveExpanded = expandedPerspectives.has(
                    perspective.id,
                  );

                  const perspectiveObjectiveTotal =
                    objectiveTotals.get(perspective.id) ?? 0;

                  return (
                    <div
                      key={perspective.id}
                      className="overflow-hidden rounded-2xl border border-slate-200">
                      {/* Perspective */}
                      <div className="bg-slate-50/80 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <button
                            type="button"
                            onClick={() => togglePerspective(perspective.id)}
                            className="flex min-w-0 items-center gap-3 text-left">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                              {perspectiveIndex + 1}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {perspectiveExpanded ? (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                )}

                                <h3 className="truncate text-base font-bold text-slate-900">
                                  {perspective.name}
                                </h3>
                              </div>

                              <p className="mt-1 pl-6 text-xs text-slate-500">
                                Perspective weight:{" "}
                                <span className="font-semibold text-slate-700">
                                  {roundWeight(perspective.weight)}%
                                </span>
                              </p>
                            </div>
                          </button>

                          <div className="flex flex-wrap items-center gap-3">
                            <WeightIndicator
                              total={perspectiveObjectiveTotal}
                            />

                            {canEdit && (
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Edit perspective"
                                  onClick={() =>
                                    setTarget({
                                      type: "perspective",
                                      mode: "edit",
                                      id: perspective.id,
                                    })
                                  }>
                                  <Edit3 className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Delete perspective"
                                  onClick={() =>
                                    removePerspective(perspective)
                                  }>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {canEdit &&
                          target?.type === "perspective" &&
                          target.mode === "edit" &&
                          target.id === perspective.id && (
                            <PerspectiveForm
                              scorecardId={data.id}
                              perspective={perspective}
                              onClose={closeEditor}
                              onSaved={() =>
                                handleSaved("Perspective updated successfully.")
                              }
                              onError={handleError}
                            />
                          )}
                      </div>

                      {/* Objectives */}
                      {perspectiveExpanded && (
                        <div className="border-t border-slate-200 bg-(--background) p-4 sm:p-5">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-slate-500" />
                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                Objectives
                              </span>
                            </div>

                            {canEdit && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setTarget({
                                    type: "objective",
                                    mode: "create",
                                    perspectiveId: perspective.id,
                                  })
                                }>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Add objective
                              </Button>
                            )}
                          </div>

                          {target?.type === "objective" &&
                            target.mode === "create" &&
                            target.perspectiveId === perspective.id && (
                              <ObjectiveForm
                                scorecardId={data.id}
                                perspectiveId={perspective.id}
                                onClose={closeEditor}
                                onSaved={() =>
                                  handleSaved("Objective created successfully.")
                                }
                                onError={handleError}
                              />
                            )}

                          {perspective.objectives.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center">
                              <Target className="mx-auto h-6 w-6 text-slate-400" />

                              <p className="mt-2 text-sm font-medium text-slate-700">
                                No objectives configured
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Add objectives to define what this perspective
                                needs to achieve.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {perspective.objectives.map(
                                (objective, objectiveIndex) => {
                                  const objectiveExpanded =
                                    expandedObjectives.has(objective.id);

                                  const activityTotal =
                                    activityTotals.get(objective.id) ?? 0;

                                  return (
                                    <div
                                      key={objective.id}
                                      className="overflow-hidden rounded-2xl border border-slate-200">
                                      <div className="p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleObjective(objective.id)
                                            }
                                            className="flex min-w-0 items-center gap-3 text-left">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                              {objectiveIndex + 1}
                                            </div>

                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                {objectiveExpanded ? (
                                                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                                )}

                                                <span className="truncate text-sm font-semibold text-slate-900">
                                                  {objective.name}
                                                </span>
                                              </div>

                                              <p className="mt-1 pl-6 text-xs text-slate-500">
                                                Objective weight:{" "}
                                                <span className="font-semibold text-slate-700">
                                                  {roundWeight(
                                                    objective.weight,
                                                  )}
                                                  %
                                                </span>
                                              </p>
                                            </div>
                                          </button>

                                          <div className="flex flex-wrap items-center gap-3">
                                            <WeightIndicator
                                              total={activityTotal}
                                            />

                                            {canEdit && (
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  title="Edit objective"
                                                  onClick={() =>
                                                    setTarget({
                                                      type: "objective",
                                                      mode: "edit",
                                                      id: objective.id,
                                                      perspectiveId:
                                                        perspective.id,
                                                    })
                                                  }>
                                                  <Edit3 className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  title="Delete objective"
                                                  onClick={() =>
                                                    removeObjective(objective)
                                                  }>
                                                  <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {canEdit &&
                                          target?.type === "objective" &&
                                          target.mode === "edit" &&
                                          target.id === objective.id && (
                                            <ObjectiveForm
                                              scorecardId={data.id}
                                              perspectiveId={perspective.id}
                                              objective={objective}
                                              onClose={closeEditor}
                                              onSaved={() =>
                                                handleSaved(
                                                  "Objective updated successfully.",
                                                )
                                              }
                                              onError={handleError}
                                            />
                                          )}
                                      </div>

                                      {objectiveExpanded && (
                                        <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                                          <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                              <Activity className="h-4 w-4 text-slate-500" />
                                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                                Activities
                                              </span>
                                            </div>

                                            {canEdit && (
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  setTarget({
                                                    type: "activity",
                                                    mode: "create",
                                                    objectiveId: objective.id,
                                                  })
                                                }>
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                Add activity
                                              </Button>
                                            )}
                                          </div>

                                          {target?.type === "activity" &&
                                            target.mode === "create" &&
                                            target.objectiveId ===
                                              objective.id && (
                                              <ActivityForm
                                                scorecardId={data.id}
                                                objectiveId={objective.id}
                                                departments={departments}
                                                onClose={closeEditor}
                                                onSaved={() =>
                                                  handleSaved(
                                                    "Activity created successfully.",
                                                  )
                                                }
                                                onError={handleError}
                                              />
                                            )}

                                          {objective.activities.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-300 bg-(--background) px-5 py-8 text-center">
                                              <Activity className="mx-auto h-6 w-6 text-slate-400" />

                                              <p className="mt-2 text-sm font-medium text-slate-700">
                                                No activities configured
                                              </p>

                                              <p className="mt-1 text-xs text-slate-500">
                                                Activities are the measurable
                                                units used for monthly planning
                                                and actual results.
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              {objective.activities
                                                .slice()
                                                .sort(
                                                  (a, b) =>
                                                    a.sortOrder - b.sortOrder,
                                                )
                                                .map(
                                                  (activity, activityIndex) => (
                                                    <div
                                                      key={activity.id}
                                                      className="rounded-2xl border border-slate-200 bg-(--background) p-4">
                                                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                        <div className="flex min-w-0 items-start gap-3">
                                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                                                            {activityIndex + 1}
                                                          </div>

                                                          <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                              {activity.name}
                                                            </p>

                                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                              <Badge variant="outline">
                                                                {
                                                                  activity.unitOfMeasure
                                                                }
                                                              </Badge>

                                                              <span>
                                                                Target:{" "}
                                                                <strong className="text-slate-700">
                                                                  {
                                                                    activity.annualTarget
                                                                  }
                                                                </strong>
                                                              </span>

                                                              <span>
                                                                Baseline:{" "}
                                                                <strong className="text-slate-700">
                                                                  {
                                                                    activity.baseline
                                                                  }
                                                                </strong>
                                                              </span>

                                                              <span>
                                                                Weight:{" "}
                                                                <strong className="text-slate-700">
                                                                  {roundWeight(
                                                                    activity.weight,
                                                                  )}
                                                                  %
                                                                </strong>
                                                              </span>
                                                            </div>

                                                            {activity.remark && (
                                                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                                                {
                                                                  activity.remark
                                                                }
                                                              </p>
                                                            )}

                                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                              {activity.responsibleUnits.map(
                                                                (unit) => (
                                                                  <Badge
                                                                    key={
                                                                      unit.id
                                                                    }
                                                                    variant="secondary">
                                                                    {unit.name}
                                                                  </Badge>
                                                                ),
                                                              )}
                                                            </div>
                                                          </div>
                                                        </div>

                                                        {canEdit && (
                                                          <div className="flex items-center gap-1">
                                                            <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="icon"
                                                              title="Edit activity"
                                                              onClick={() =>
                                                                setTarget({
                                                                  type: "activity",
                                                                  mode: "edit",
                                                                  id: activity.id,
                                                                  objectiveId:
                                                                    objective.id,
                                                                })
                                                              }>
                                                              <Edit3 className="h-4 w-4" />
                                                            </Button>

                                                            <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="icon"
                                                              title="Delete activity"
                                                              onClick={() =>
                                                                removeActivity(
                                                                  activity,
                                                                )
                                                              }>
                                                              <Trash2 className="h-4 w-4 text-red-600" />
                                                            </Button>
                                                          </div>
                                                        )}
                                                      </div>

                                                      {canEdit &&
                                                        target?.type ===
                                                          "activity" &&
                                                        target.mode ===
                                                          "edit" &&
                                                        target.id ===
                                                          activity.id && (
                                                          <ActivityForm
                                                            scorecardId={
                                                              data.id
                                                            }
                                                            objectiveId={
                                                              objective.id
                                                            }
                                                            departments={
                                                              departments
                                                            }
                                                            activity={activity}
                                                            onClose={
                                                              closeEditor
                                                            }
                                                            onSaved={() =>
                                                              handleSaved(
                                                                "Activity updated successfully.",
                                                              )
                                                            }
                                                            onError={
                                                              handleError
                                                            }
                                                          />
                                                        )}
                                                    </div>
                                                  ),
                                                )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Footer guidance */}
        <section className="rounded-3xl border border-slate-200 bg-(--background) p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4 text-slate-500" />

                <h3 className="text-sm font-bold text-slate-900">
                  Structure validation
                </h3>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Every sibling level must ultimately total 100%. A scorecard is
                ready only when perspectives, objectives, and activities are all
                completely allocated.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div
                className={[
                  "rounded-2xl border px-4 py-3",
                  scorecardReady
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50",
                ].join(" ")}>
                <div className="flex items-center gap-2">
                  {scorecardReady ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {scorecardReady
                        ? "Structure appears complete"
                        : "Structure requires configuration"}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {scorecardReady
                        ? "Ready for server validation."
                        : "Every hierarchy level must total 100%."}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant={scorecardReady ? "default" : "outline"}
                disabled={validationPending}
                onClick={validateStructure}>
                {validationPending ? (
                  "Validating..."
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Validate scorecard
                  </>
                )}
              </Button>
              {canEdit ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={removeScorecard}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete draft
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
