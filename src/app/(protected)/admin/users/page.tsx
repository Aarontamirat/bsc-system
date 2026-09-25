import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUserAction, updateUserAction } from "@/app/actions/admin";
import { listDepartments, listUsers } from "@/lib/services/admin.service";
import { UserRole } from "@/generated/prisma/client";
import { getScorecardActorOrRedirect } from "@/lib/scorecard-actor";

export const dynamic = "force-dynamic";

type UsersPageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const actor = await getScorecardActorOrRedirect();

  // if (actor.role !== UserRole.ADMIN) {
  //   redirect("/dashboard");
  // }

  const isAdmin = actor.role === UserRole.ADMIN;

  // Fetch users and conditionally fetch departments (only needed for admins creating/assigning users)
  const [allUsers, departments] = await Promise.all([
    listUsers(actor),
    isAdmin ? listDepartments(actor) : Promise.resolve([]),
  ]);

  // Non-admins can only see their own user record
  const users = isAdmin
    ? allUsers
    : allUsers.filter((user) => user.id === actor.userId);

  // const [users, departments] = await Promise.all([
  //   listUsers(actor),
  //   listDepartments(actor),
  // ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isAdmin ? "Administration" : "Account Settings"}
        title={isAdmin ? "Users" : "My Account"}
        description={
          isAdmin
            ? actor.canAdministerAllDepartments
              ? "Manage internal credentials, roles, departments and account status."
              : "Manage credentials, roles and account status for your department."
            : "Update your personal login credentials and account settings."
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

      {/* Only Admins can see the Create User section */}
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Create user</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={createUserAction}
              className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] lg:items-center">
              <input
                name="username"
                required
                placeholder="Username"
                className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              />
              <input
                name="password"
                required
                type="password"
                minLength={12}
                placeholder="Initial password"
                className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              />
              <select
                name="role"
                defaultValue={UserRole.USER}
                className="h-9 rounded-md border border-slate-200 px-3 text-sm">
                <option value={UserRole.USER}>USER</option>
                <option value={UserRole.ADMIN}>ADMIN</option>
              </select>
              <select
                name="departmentId"
                required
                className="h-9 rounded-md border border-slate-200 px-3 text-sm">
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked />
                Active
              </label>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* User list (contains all users for Admin, or only current user for non-Admin) */}
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-5">
              <form
                action={updateUserAction}
                className={`grid gap-3 xl:items-center ${isAdmin ? "xl:grid-cols-[1fr_1fr_120px_1fr_auto_auto]" : "xl:grid-cols-[1fr_1fr_auto]"}`}>
                <input type="hidden" name="id" value={user.id} />
                <input
                  name="username"
                  required
                  defaultValue={user.username}
                  className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                />
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  placeholder="New password (optional)"
                  className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                />

                {isAdmin ? (
                  <>
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="h-9 rounded-md border border-slate-200 px-3 text-sm">
                      <option value={UserRole.USER}>USER</option>
                      <option value={UserRole.ADMIN}>ADMIN</option>
                    </select>
                    <select
                      name="departmentId"
                      defaultValue={user.departmentId}
                      className="h-9 rounded-md border border-slate-200 px-3 text-sm">
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={user.isActive}
                      />
                      Active
                    </label>
                  </>
                ) : (
                  // Send hidden fields so non-admins preserve their existing role and department
                  <>
                    <input type="hidden" name="role" value={user.role} />
                    <input
                      type="hidden"
                      name="departmentId"
                      value={user.departmentId}
                    />
                    <input
                      type="hidden"
                      name="isActive"
                      value={user.isActive ? "on" : ""}
                    />
                  </>
                )}
                <Button type="submit" variant="outline">
                  Save
                </Button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{user.role}</Badge>
                <Badge variant="outline">{user.department.name}</Badge>
                <Badge variant={user.isActive ? "secondary" : "outline"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
