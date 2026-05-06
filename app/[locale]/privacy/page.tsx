import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEs = locale === "es";
  return {
    title: isEs ? "Política de Privacidad" : "Privacy Policy",
    description: isEs
      ? "Cómo Wordsus gestiona tus datos personales."
      : "How Wordsus handles your personal data.",
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isEs = locale === "es";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))] mb-3">
          {isEs ? "Legal" : "Legal"}
        </span>
        <h1 className="text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
          {isEs ? "Política de Privacidad" : "Privacy Policy"}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {isEs ? "Última actualización: mayo de 2025" : "Last updated: May 2025"}
        </p>
      </div>

      <div className="prose-wordsus space-y-8 text-[hsl(var(--foreground))]">
        {isEs ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Introducción</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                En Wordsus (<strong>wordsus.com</strong>), nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política describe qué información recopilamos, cómo la usamos y qué derechos tienes sobre ella. Wordsus es un sitio web de acceso libre que ofrece libros educativos gratuitos generados con inteligencia artificial. <strong>No realizamos transacciones comerciales ni procesamos pagos.</strong>
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Datos que recopilamos</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Wordsus <strong>no requiere registro ni cuenta de usuario</strong>. No recopilamos datos personales identificables como nombre, email o dirección. Los únicos datos que se almacenan son preferencias locales del usuario (tema visual, favoritos, progreso de lectura) guardadas exclusivamente en el <code>localStorage</code> de tu navegador, en tu dispositivo, y nunca enviadas a nuestros servidores.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Cookies y almacenamiento local</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Utilizamos almacenamiento local del navegador (<code>localStorage</code>) para guardar tus preferencias. No usamos cookies de seguimiento ni de publicidad. Consulta nuestra <a href={`/${locale}/cookies`} className="text-[hsl(var(--primary))] hover:underline">Política de Cookies</a> para más información.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Servicios de terceros</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Podemos utilizar servicios de análisis de tráfico anonimizados (como Cloudflare Web Analytics) que no recopilan datos personales identificables. El código fuente del sitio está alojado en GitHub (GitHub Pages / Cloudflare Pages).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Tus derechos</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Dado que no recopilamos datos personales, no existe información que solicitar, rectificar ni eliminar en nuestros servidores. Puedes borrar en cualquier momento los datos guardados en tu navegador desde la configuración de tu dispositivo.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Cambios en esta política</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Nos reservamos el derecho de actualizar esta política de privacidad cuando sea necesario. Los cambios se publicarán en esta misma página con la fecha de actualización correspondiente.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Contacto</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Si tienes alguna pregunta sobre esta política, puedes contactarnos a través de la sección de <a href={`/${locale}/about#contact`} className="text-[hsl(var(--primary))] hover:underline">Contacto</a>.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Introduction</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                At Wordsus (<strong>wordsus.com</strong>), we take your privacy seriously. This policy describes what information we collect, how we use it, and what rights you have over it. Wordsus is a freely accessible website offering free educational books generated with artificial intelligence. <strong>We do not conduct commercial transactions or process payments.</strong>
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Data We Collect</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Wordsus <strong>does not require registration or a user account</strong>. We do not collect personally identifiable data such as name, email, or address. The only data stored are local user preferences (visual theme, favorites, reading progress) saved exclusively in your browser&apos;s <code>localStorage</code>, on your device, and never sent to our servers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Cookies and Local Storage</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                We use browser local storage (<code>localStorage</code>) to save your preferences. We do not use tracking or advertising cookies. See our <a href={`/${locale}/cookies`} className="text-[hsl(var(--primary))] hover:underline">Cookie Policy</a> for more details.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Third-Party Services</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                We may use anonymized traffic analytics services (such as Cloudflare Web Analytics) that do not collect personally identifiable data. The site&apos;s source code is hosted on GitHub (GitHub Pages / Cloudflare Pages).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Your Rights</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Since we do not collect personal data, there is no information to request, rectify, or delete on our servers. You can delete data stored in your browser at any time through your device settings.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Changes to This Policy</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                We reserve the right to update this privacy policy when necessary. Changes will be published on this page with the corresponding update date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Contact</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                If you have questions about this policy, please reach out via our <a href={`/${locale}/about#contact`} className="text-[hsl(var(--primary))] hover:underline">Contact</a> section.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
