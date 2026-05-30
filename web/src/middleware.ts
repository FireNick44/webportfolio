// NOTE: Next 16 renamed this convention to `proxy.ts` (Node runtime). We keep
// the legacy `middleware.ts` (edge runtime) on purpose: @netlify/plugin-nextjs
// (5.15.11) doesn't yet wire Next 16's `proxy` — it bundles the function but it
// never intercepts, so bare `/` and missing-locale paths 404. Edge middleware is
// fully supported by the adapter. Revert to proxy.ts once Netlify ships proxy
// support. Next will log a "renamed to proxy" deprecation warning at build —
// that's expected, not an error. See [[webportfolio-netlify-proxy]].
import { match as matchLocale } from "@formatjs/intl-localematcher";
import { NextResponse } from "next/server";

import { defaultLocale, locales } from "./i18n/config";

import type { NextRequest } from "next/server";

// Parse an Accept-Language header into language tags ordered by q-weight.
// Done by hand (instead of `negotiator`) because Netlify edge functions run on
// Deno: negotiator is CommonJS and throws at runtime there, which silently
// breaks the whole middleware (passthrough -> 404 on every locale-less path).
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.startsWith("q="));
      return { tag: tag.trim(), q: q ? parseFloat(q.slice(2)) : 1 };
    })
    .filter((e) => e.tag)
    .sort((a, b) => b.q - a.q)
    .map((e) => e.tag);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameIsMissingLocale = (locales as readonly string[]).every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  if (pathnameIsMissingLocale) {
    const accept = request.headers.get("accept-language") || "";
    const languages = parseAcceptLanguage(accept);

    let locale: string = defaultLocale;
    try {
      locale = matchLocale(languages, locales as readonly string[], defaultLocale);
    } catch {
      if (/\bde\b/i.test(accept)) locale = "de";
    }

    return NextResponse.redirect(
      new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url),
    );
  }

  const segments = pathname.split("/");
  const first = segments[1];
  if (first && !(locales as readonly string[]).includes(first)) {
    segments[1] = defaultLocale;
    return NextResponse.redirect(new URL(segments.join("/"), request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|skills|img|svg|fonts|manifest.json|v/|.*\\..*).*)",
  ],
};
