"use client";

import { useState } from "react";
import { Mail, CheckCircle, Copy } from "lucide-react";

interface ContactSectionProps {
  title: string;
  text: string;
  copyLabel: string;
  copiedLabel: string;
}

export default function ContactSection({
  title,
  text,
  copyLabel,
  copiedLabel,
}: ContactSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Email assembled only on user interaction — never in static HTML
    const p1 = "hello";
    const p2 = "@";
    const p3 = "word";
    const p4 = "sus";
    const p5 = ".com";
    const email = p1 + p2 + p3 + p4 + p5;

    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <section
      id="contact"
      className="mt-20 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 sm:p-12"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
          <Mail size={20} className="text-[hsl(var(--primary))]" />
        </div>
        <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{title}</h2>
      </div>
      <p className="text-[hsl(var(--muted-foreground))] leading-relaxed mb-6 max-w-lg">
        {text}
      </p>
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all duration-150"
      >
        {copied ? (
          <>
            <CheckCircle size={16} />
            {copiedLabel}
          </>
        ) : (
          <>
            <Copy size={16} />
            {copyLabel}
          </>
        )}
      </button>
    </section>
  );
}
