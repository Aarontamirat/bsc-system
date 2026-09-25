import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createDepartmentAction,
  deleteDepartmentAction,
  updateDepartmentAction,
} from "@/app/actions/admin";
import { listDepartments } from "@/lib/services/admin.service";
import { getScorecardActorOrRedirect } from "@/lib/scorecard-actor";

export const dynamic = "force-dynamic";

type DepartmentsPageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function DepartmentsPage({
  searchParams,
}: DepartmentsPageProps) {
  const params = await searchParams;
  const actor = await getScorecardActorOrRedirect();

  if (actor.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const departments = await listDepartments(actor);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Departments"
        description={
          actor.canAdministerAllDepartments
            ? "Manage organizational departments without deleting referenced BSC history."
            : "Manage your department profile and its active status."
        }
      />

      {params.message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {params.message}
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}

      {actor.canAdministerAllDepartments ? (
        <Card>
          <CardHeader>
            <CardTitle>Create department</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDepartmentAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
              <input
                name="name"
                required
                maxLength={150}
                placeholder="Department name"
                className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              />
              <input
                name="description"
                placeholder="Description"
                className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {departments.map((department) => {
          const referenced =
            department._count.users +
            department._count.scorecards +
            department._count.responsibleActivities;

          return (
            <Card key={department.id}>
              <CardContent className="p-5">
                <form action={updateDepartmentAction} className="grid gap-3 lg:grid-cols-[1.2fr_2fr_auto_auto] lg:items-center">
                  <input type="hidden" name="id" value={department.id} />
                  <input
                    name="name"
                    required
                    maxLength={150}
                    defaultValue={department.name}
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                  />
                  <input
                    name="description"
                    defaultValue={department.description ?? ""}
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={department.isActive}
                    />
                    Active
                  </label>
                  <Button type="submit" variant="outline">
                    Save
                  </Button>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{department._count.users} users</Badge>
                  <Badge variant="outline">
                    {department._count.scorecards} scorecards
                  </Badge>
                  <Badge variant="outline">
                    {department._count.responsibleActivities} responsibilities
                  </Badge>
                  <form action={deleteDepartmentAction} className="ml-auto">
                    <input type="hidden" name="id" value={department.id} />
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={referenced > 0}>
                      Delete
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
