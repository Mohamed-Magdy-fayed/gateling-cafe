import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/auth/core/session";
import type { UserScreen } from "@/drizzle/schema";

const PUBLIC_PATHS = ["/auth/sign-in", "/playground"];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isPublicRoute = PUBLIC_PATHS.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    const session = await getSessionFromCookie({
        get: (key) => {
            const cookie = request.cookies.get(key);
            return cookie ? { name: cookie.name, value: cookie.value } : undefined;
        },
    });

    if (!session) {
        if (isPublicRoute) {
            return NextResponse.next();
        }

        return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }

    if (isPublicRoute) {
        return NextResponse.next();
    }

    const accessibleScreens = session.user.screens ?? [];
    const primarySegment = pathname.split("/").filter(Boolean)[0] ?? null;
    const hasScreenAccess =
        primarySegment === null ||
        accessibleScreens.includes(primarySegment as UserScreen);

    if (!hasScreenAccess) {
        const fallbackScreen = accessibleScreens[0];
        const fallbackPath = fallbackScreen ? `/${fallbackScreen}` : "/";

        return NextResponse.redirect(new URL(fallbackPath, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|ico)).*)",
    ],
};
