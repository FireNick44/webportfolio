import type { ReactNode } from "react";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

// Applies the persisted theme + token overrides before paint (no FOUC). Lives
// in the ROOT layout (which never re-renders on locale change) so React doesn't
// reconcile the <script> on the language switch.
const ANTIFLASH = `(function(){try{var s=localStorage.getItem('noel-portfolio-v1');var th='dark';if(s){var t=JSON.parse(s);var st=t&&t.state;if(st){if(st.theme==='dark'||st.theme==='light')th=st.theme;var ov=st.tokenOverrides;if(ov)for(var k in ov)document.documentElement.style.setProperty(k,ov[k]);}}document.documentElement.setAttribute('data-theme',th);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-scroll-behavior="smooth"
      className={fontVariables}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: ANTIFLASH }} />
        {children}
      </body>
    </html>
  );
}
