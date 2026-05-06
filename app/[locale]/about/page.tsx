import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { BookOpen, Sparkles, Globe, Users, Zap } from "lucide-react";
import ContactSection from "@/components/ContactSection";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEs = locale === "es";
  return {
    title: isEs ? "Sobre Nosotros" : "About Us",
    description: isEs
      ? "Conoce Wordsus, la biblioteca gratuita de libros educativos generados con IA."
      : "Learn about Wordsus, the free AI-powered educational book library.",
    robots: { index: false, follow: true },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isEs = locale === "es";

  const features = isEs
    ? [
        { icon: BookOpen, title: "Biblioteca en crecimiento", desc: "Cientos de libros educativos en ciencia, tecnología, filosofía, teología y más." },
        { icon: Sparkles, title: "Generado con IA", desc: "Contenido creado con la asistencia de inteligencia artificial y supervisión editorial humana." },
        { icon: Globe, title: "Multiidioma", desc: "Disponible en español e inglés, con planes de expansión a más idiomas." },
        { icon: Users, title: "Para todos", desc: "Sin registro, sin pagos, sin barreras. Acceso libre para cualquier persona en el mundo." },
        { icon: Zap, title: "Experiencia fluida", desc: "Progreso de lectura local, favoritos y tema visual sin necesidad de crear una cuenta." },
      ]
    : [
        { icon: BookOpen, title: "Growing Library", desc: "Hundreds of educational books across science, technology, philosophy, theology, and more." },
        { icon: Sparkles, title: "AI-Powered", desc: "Content created with artificial intelligence assistance and human editorial oversight." },
        { icon: Globe, title: "Multilingual", desc: "Available in Spanish and English, with plans to expand to more languages." },
        { icon: Users, title: "For Everyone", desc: "No registration, no payments, no barriers. Free access for anyone in the world." },
        { icon: Zap, title: "Smooth Experience", desc: "Local reading progress, favorites, and visual themes — no account needed." },
      ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))] mb-4">
          {isEs ? "Sobre Nosotros" : "About Us"}
        </span>
        <h1 className="text-5xl font-bold text-[hsl(var(--foreground))] mb-6 leading-tight">
          {isEs
            ? "Conocimiento libre para todos"
            : "Free knowledge for everyone"}
        </h1>
        <p className="text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto leading-relaxed">
          {isEs
            ? "Wordsus nació con una misión clara: hacer que el conocimiento educativo de calidad sea accesible para cualquier persona, en cualquier lugar, sin coste alguno."
            : "Wordsus was born with a clear mission: to make quality educational knowledge accessible to anyone, anywhere, at no cost."}
        </p>
      </div>

      {/* Mission section */}
      <div className="rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-8 sm:p-12 mb-12">
        <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">
          {isEs ? "Nuestra misión" : "Our Mission"}
        </h2>
        <div className="space-y-4 text-[hsl(var(--muted-foreground))] leading-relaxed">
          {isEs ? (
            <>
              <p>
                Vivimos en una era donde la información abunda, pero el conocimiento profundo y bien estructurado sigue siendo difícil de encontrar de forma gratuita. Wordsus quiere cambiar eso.
              </p>
              <p>
                Combinamos el poder de la inteligencia artificial con la supervisión editorial humana para crear libros educativos accesibles, rigurosos y gratuitos sobre los temas más apasionantes del mundo: ciencia, programación, teología, filosofía, biología, astronomía y mucho más.
              </p>
              <p>
                <strong className="text-[hsl(var(--foreground))]">No somos una empresa comercial.</strong> No procesamos pagos, no tenemos planes de suscripción y no vendemos tus datos. Somos un proyecto de acceso abierto, comprometido con la democratización del conocimiento.
              </p>
            </>
          ) : (
            <>
              <p>
                We live in an era where information is abundant, but deep, well-structured knowledge is still hard to find for free. Wordsus wants to change that.
              </p>
              <p>
                We combine the power of artificial intelligence with human editorial oversight to create accessible, rigorous, and free educational books on the most fascinating topics in the world: science, programming, theology, philosophy, biology, astronomy, and much more.
              </p>
              <p>
                <strong className="text-[hsl(var(--foreground))]">We are not a commercial company.</strong> We process no payments, have no subscription plans, and do not sell your data. We are an open-access project committed to the democratization of knowledge.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Features grid */}
      <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-6">
        {isEs ? "¿Qué nos hace diferentes?" : "What makes us different?"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 hover:border-[hsl(var(--primary)/0.4)] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-4">
              <f.icon size={20} className="text-[hsl(var(--primary))]" />
            </div>
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">{f.title}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Open source */}
      <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 sm:p-12 mb-4">
        <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">
          {isEs ? "Código abierto" : "Open Source"}
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] leading-relaxed mb-4">
          {isEs
            ? "Wordsus es un proyecto de código abierto. Puedes ver, estudiar y contribuir al código fuente del sitio en GitHub."
            : "Wordsus is an open-source project. You can view, study, and contribute to the site's source code on GitHub."}
        </p>
        <a
          href="https://github.com/wordsus/wordsus-static-site"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          github.com/wordsus/wordsus-static-site
        </a>
      </div>

      {/* Contact — client component with protected email */}
      <ContactSection
        title={isEs ? "Contacto" : "Contact"}
        text={
          isEs
            ? "¿Tienes alguna pregunta, sugerencia o propuesta de colaboración? Nos encantaría saber de ti. Haz clic en el botón para copiar nuestra dirección de email."
            : "Have a question, suggestion, or collaboration proposal? We'd love to hear from you. Click the button below to copy our email address."
        }
        copyLabel={isEs ? "Copiar dirección de email" : "Copy email address"}
        copiedLabel={isEs ? "¡Copiado!" : "Copied!"}
      />
    </div>
  );
}
