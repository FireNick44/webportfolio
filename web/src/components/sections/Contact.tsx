"use client";

import { Check, AlertTriangle, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Reveal } from "@/components/ui/Reveal";
import type { Dictionary } from "@/i18n/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "success" | "error";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Contact({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const c = dict.contact;
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      message: String(fd.get("message") || "").trim(),
      company: String(fd.get("company") || ""),
      // For the auto-reply template — picks EN/DE copy in the route.
      lang,
    };

    if (!data.name || !data.message || !EMAIL_RE.test(data.email)) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (res.ok && json.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const fieldCls =
    "w-full border border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-foreground focus:outline-none";

  return (
    <section
      id="contact"
      className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 sm:py-36"
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Reveal>
            <span className="lab-label">{c.label}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              {c.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-md text-muted-foreground">{c.subtitle}</p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            {/* honeypot */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="hidden"
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="lab-label">{c.name}</span>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder={c.namePlaceholder}
                  className={fieldCls}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="lab-label">{c.email}</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder={c.emailPlaceholder}
                  className={fieldCls}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="lab-label">{c.message}</span>
              <textarea
                name="message"
                required
                rows={5}
                placeholder={c.messagePlaceholder}
                className={cn(fieldCls, "resize-none")}
              />
            </label>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <motion.button
                type="submit"
                disabled={status === "sending"}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex min-w-[200px] items-center justify-center gap-3 border border-foreground bg-foreground px-7 py-3.5 font-mono text-sm uppercase tracking-[0.22em] text-background transition-colors hover:bg-transparent hover:text-foreground disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-foreground disabled:hover:text-background"
              >
                {status === "sending" && (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                )}
                <span>{status === "sending" ? c.sending : c.send}</span>
              </motion.button>

              <AnimatePresence mode="wait" initial={false}>
                {(status === "success" || status === "error") && (
                  <motion.p
                    key={status}
                    aria-live="polite"
                    role={status === "error" ? "alert" : undefined}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "inline-flex max-w-prose items-start gap-2 text-sm leading-snug",
                      status === "success" && "text-accent",
                      status === "error" && "text-destructive",
                    )}
                  >
                    {status === "success" ? (
                      <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
                    ) : (
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                    )}
                    <span>{status === "success" ? c.success : c.error}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
