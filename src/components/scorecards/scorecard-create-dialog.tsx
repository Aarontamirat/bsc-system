"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createScorecardAction } from "@/app/actions/scorecard";

type Department = {
  id: string;
  name: string;
};

type Props = {
  departments: Department[];
};

function getCurrentFiscalYear(): number {
  const now = new Date();
  const calendarYear = now.getFullYear();
  const calendarMonth = now.getMonth();

  // July–December belongs to the current year's fiscal year.
  // January–June belongs to the fiscal year that started the previous year.
  return calendarMonth >= 6 ? calendarYear : calendarYear - 1;
}

export function ScorecardCreateDialog({ departments }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentFiscalYear = getCurrentFiscalYear();

  const [departmentId, setDepartmentId] = useState("");
  const [year, setYear] = useState(String(currentFiscalYear));

  const years = Array.from(
    { length: 7 },
    (_, index) => currentFiscalYear - 2 + index,
  );

  function resetForm() {
    setDepartmentId("");
    setYear(String(currentFiscalYear));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen && !pending) {
      resetForm();
    }
  }

  function handleSubmit() {
    if (!departmentId) {
      toast.error("Please select a department.");
      return;
    }

    const numericYear = Number(year);

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 2000 ||
      numericYear > 2100
    ) {
      toast.error("Please select a valid fiscal year.");
      return;
    }

    startTransition(async () => {
      const result = await createScorecardAction({
        departmentId,
        year: numericYear,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Scorecard created successfully.");

      setOpen(false);
      resetForm();

      router.push(`/scorecards/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button onClick={() => setOpen(true)}>+ New Scorecard</Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Scorecard</DialogTitle>

          <DialogDescription>
            Create a new annual Balanced Scorecard for a department.
            Perspectives, objectives and activities will be added after the
            scorecard is created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          <div className="space-y-2">
            <label
              htmlFor="scorecard-department"
              className="text-sm font-medium">
              Department
            </label>

            <Select
              value={departmentId}
              onValueChange={(value) => setDepartmentId(value ?? "")}
              disabled={pending}>
              <SelectTrigger id="scorecard-department" className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>

              <SelectContent className="z-50 min-w-(--radix-select-trigger-width) bg-(--background) dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md p-1">
                {departments.length === 0 ? (
                  <div className="py-2 px-3 text-center text-xs text-slate-500">
                    No departments available
                  </div>
                ) : (
                  departments.map((department) => (
                    <SelectItem
                      key={department.id}
                      value={department.id}
                      className="cursor-pointer rounded-sm px-2.5 py-1.5 text-sm focus:bg-slate-100 dark:focus:bg-slate-800">
                      {department.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="scorecard-year" className="text-sm font-medium">
              Fiscal Year
            </label>

            <Select
              value={year}
              onValueChange={(value) => setYear(value ?? "")}
              disabled={pending}>
              <SelectTrigger id="scorecard-year" className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="z-50 min-w-(--radix-select-trigger-width) bg-(--background) dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md p-1">
                {years.map((value) => (
                  <SelectItem
                    key={value}
                    value={String(value)}
                    className="cursor-pointer rounded-sm px-2.5 py-1.5 text-sm focus:bg-slate-100 dark:focus:bg-slate-800">
                    FY{value}/{value + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>

          <Button type="button" disabled={pending} onClick={handleSubmit}>
            {pending ? "Creating..." : "Create Scorecard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
