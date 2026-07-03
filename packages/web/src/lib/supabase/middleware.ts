import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routeDecision, needsRole, type Role } from '@/lib/routing';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Refresh the auth session on every request and apply role-based routing. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Resolve role only when a decision actually depends on it (front door /
  // operator console) — avoids a profiles lookup on every request.
  let role: Role = null;
  if (needsRole(!!user, path)) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user!.id)
      .maybeSingle();
    role = ((data?.role as Role) ?? null) as Role;
  }

  const target = routeDecision({ authed: !!user, role, path });
  if (target && target !== `${path}${request.nextUrl.search}`) {
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}
