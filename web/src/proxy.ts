import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

import { defaultLocale, locales } from "./i18n/config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameIsMissingLocale = (locales as readonly string[]).every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  if (pathnameIsMissingLocale) {
    const negotiatorHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));
    const languages = new Negotiator({ headers: negotiatorHeaders }).languages();

    let locale: string = defaultLocale;
    try {
      locale = matchLocale(languages, locales as readonly string[], defaultLocale);
    } catch {
      const accept = request.headers.get("accept-language") || "";
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
    "/((?!api|_next/static|_next/image|favicon.ico|skills|img|svg|fonts|manifest.json|.*\\..*).*)",
  ],
};
