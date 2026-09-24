import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUserAction, updateUserAction } from "@/app/actions/admin";
import { listDepartments, listUsers } from "@/lib/services/admin.service";
import { UserRole } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type UsersPageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const [users, departments] = await Promise.all([
    listUsers(),
    listDepartments(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Manage internal credentials, roles, departments and account status."
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

      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] lg:items-center">
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

      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-5">
              <form action={updateUserAction} className="grid gap-3 xl:grid-cols-[1fr_1fr_120px_1fr_auto_auto] xl:items-center">
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
