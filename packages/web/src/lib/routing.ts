export type Role = 'admin' | 'customer' | null;

export interface RouteContext {
  authed: boolean;
  role: Role;
  path: string;
}

function inDashboard(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/');
}
function inAdmin(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

/**
 * Pure role-routing decision — returns a redirect target (path, possibly with a
 * query) or null to proceed. Kept free of Next types so it's unit-testable.
 *
 * - Unauthenticated hitting a protected area → /login?next=<path>.
 * - Authenticated at the "front door" (/ or /login) → role home (admin→/admin,
 *   otherwise /dashboard).
 * - Customers may not reach the operator console (/admin → /dashboard).
 */
export function routeDecision({ authed, role, path }: RouteContext): string | null {
  if (!authed) {
    if (inDashboard(path) || inAdmin(path)) {
      return `/login?next=${encodeURIComponent(path)}`;
    }
    return null;
  }

  if (path === '/' || path === '/login') {
    return role === 'admin' ? '/admin' : '/dashboard';
  }
  if (inAdmin(path) && role !== 'admin') {
    return '/dashboard';
  }
  return null;
}

/** Whether the role must be resolved to make a decision (avoids a DB hit otherwise). */
export function needsRole(authed: boolean, path: string): boolean {
  return authed && (path === '/' || path === '/login' || inAdmin(path));
}
