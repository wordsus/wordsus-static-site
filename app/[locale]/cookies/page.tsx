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
    title: isEs ? "Política de Cookies" : "Cookie Policy",
    description: isEs
      ? "Cómo Wordsus usa cookies y almacenamiento local."
      : "How Wordsus uses cookies and local storage.",
    robots: { index: false, follow: true },
  };
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isEs = locale === "es";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[hsl(var(--primary))] mb-3">
          Legal
        </span>
        <h1 className="text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
          {isEs ? "Política de Cookies" : "Cookie Policy"}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {isEs ? "Última actualización: mayo de 2025" : "Last updated: May 2025"}
        </p>
      </div>

      <div className="space-y-8 text-[hsl(var(--foreground))]">
        {isEs ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. ¿Qué son las cookies?</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo. Wordsus hace un uso mínimo y respetuoso del almacenamiento del navegador, priorizando tu privacidad.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. ¿Qué almacenamos?</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Wordsus <strong>no utiliza cookies de seguimiento ni de publicidad</strong>. Usamos exclusivamente el almacenamiento local del navegador (<code>localStorage</code>) para guardar tus preferencias de usuario de forma segura en tu propio dispositivo:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] pl-2">
                <li><strong>wordsus-theme</strong>: Tu preferencia de tema visual (claro, oscuro o sistema).</li>
                <li><strong>wordsus-favorites</strong>: Los libros que has marcado como favoritos.</li>
                <li><strong>wordsus-progress-*</strong>: Tu progreso de lectura por libro.</li>
                <li><strong>wordsus-recent</strong>: Los libros leídos recientemente.</li>
              </ul>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed mt-2">
                Ninguno de estos datos abandona tu dispositivo ni es enviado a ningún servidor.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Cookies de terceros</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Podemos utilizar servicios de análisis de tráfico anonimizados (como Cloudflare Web Analytics) que no establecen cookies de seguimiento personal. No integramos ninguna red publicitaria.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Cómo gestionar el almacenamiento</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Puedes borrar los datos almacenados en cualquier momento desde las herramientas de desarrollo de tu navegador (Configuración → Privacidad → Datos del sitio) o simplemente limpiando el almacenamiento local. El sitio seguirá funcionando con normalidad, aunque perderás tus preferencias guardadas.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Cambios en esta política</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Nos reservamos el derecho de actualizar esta política. Los cambios se publicarán en esta misma página con la fecha de actualización correspondiente.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. What Are Cookies?</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Cookies are small text files that websites store on your device. Wordsus makes minimal and respectful use of browser storage, prioritizing your privacy.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. What We Store</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Wordsus <strong>does not use tracking or advertising cookies</strong>. We exclusively use browser local storage (<code>localStorage</code>) to securely save your user preferences on your own device:
              </p>
              <ul className="list-disc list-inside space-y-2 text-[hsl(var(--muted-foreground))] pl-2">
                <li><strong>wordsus-theme</strong>: Your visual theme preference (light, dark, or system).</li>
                <li><strong>wordsus-favorites</strong>: Books you have marked as favorites.</li>
                <li><strong>wordsus-progress-*</strong>: Your reading progress per book.</li>
                <li><strong>wordsus-recent</strong>: Recently read books.</li>
              </ul>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed mt-2">
                None of this data leaves your device or is sent to any server.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Third-Party Cookies</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                We may use anonymized traffic analytics services (such as Cloudflare Web Analytics) that do not set personal tracking cookies. We do not integrate any advertising networks.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Managing Storage</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                You can delete stored data at any time from your browser&apos;s developer tools (Settings → Privacy → Site Data) or by simply clearing local storage. The site will continue working normally, though you will lose your saved preferences.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Changes to This Policy</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                We reserve the right to update this policy. Changes will be published on this page with the corresponding update date.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
