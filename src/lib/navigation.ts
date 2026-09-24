export type AppUserRole = "ADMIN" | "USER";

export type NavigationItem = {
  label: string;
  href: string;
  icon: "dashboard" | "scorecard" | "data" | "report" | "department" | "users";
  description: string;
  roles?: AppUserRole[];
  enabled: boolean;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

/**
 * Application navigation.
 *
 * Enabled means the module is currently implemented and
 * should be navigable from the application shell.
 *
 * Disabled modules remain visible so users can understand
 * the application roadmap, but they cannot be opened yet.
 */
export const navigationGroups: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "dashboard",
        description: "Overview of department performance.",
        enabled: true,
      },
      {
        label: "Scorecards",
        href: "/scorecards",
        icon: "scorecard",
        description: "Build and manage scorecard structures.",
        enabled: true,
      },
      {
        label: "Plans & Actuals",
        href: "/data-entry",
        icon: "data",
        description: "Enter and maintain monthly performance data.",
        roles: ["ADMIN", "USER"],
        enabled: true,
      },
      {
        label: "Consolidated Reports",
        href: "/reports",
        icon: "report",
        description: "Review consolidated scorecard performance.",
        roles: ["ADMIN", "USER"],
        enabled: false,
      },
    ],
  },

  {
    label: "Administration",
    items: [
      {
        label: "Departments",
        href: "/admin/departments",
        icon: "department",
        description: "Manage organizational departments.",
        roles: ["ADMIN"],
        enabled: false,
      },
      {
        label: "Users",
        href: "/admin/users",
        icon: "users",
        description: "Manage BSC system accounts.",
        roles: ["ADMIN"],
        enabled: false,
      },
    ],
  },
];

export function getVisibleNavigation(role: AppUserRole): NavigationGroup[] {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(role),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
