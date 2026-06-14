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
      ? "Cómo Wordsus usa cookies, almacenamiento local y publicidad de Google AdSense."
      : "How Wordsus uses cookies, local storage, and Google AdSense advertising.",
    robots: { index: false, follow: true },
  };
}

const link = "text-[hsl(var(--primary))] hover:underline";
const muted = "text-[hsl(var(--muted-foreground))] leading-relaxed";

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
        <p className={muted}>
          {isEs ? "Última actualización: mayo de 2025" : "Last updated: May 2025"}
        </p>
      </div>

      <div className="space-y-8 text-[hsl(var(--foreground))]">
        {isEs ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. ¿Qué son las cookies?</h2>
              <p className={muted}>
                Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo para
                recordar información sobre tu visita. Pueden ser establecidas por el propio sitio web (cookies
                propias) o por terceros (cookies de terceros), como proveedores de publicidad o servicios de
                análisis.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Almacenamiento local (cookies propias)</h2>
              <p className={muted}>
                Wordsus utiliza exclusivamente el almacenamiento local del navegador (<code>localStorage</code>)
                para guardar tus preferencias de usuario de forma segura en tu propio dispositivo. Estos datos
                nunca son enviados a ningún servidor:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-[hsl(var(--muted-foreground))]">
                <li><strong>wordsus-theme</strong>: Tu preferencia de tema visual (claro, oscuro o sistema).</li>
                <li><strong>wordsus-favorites</strong>: Los libros que has marcado como favoritos.</li>
                <li><strong>wordsus-progress-*</strong>: Tu progreso de lectura por libro.</li>
                <li><strong>wordsus-recent</strong>: Libros leídos recientemente.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Cookies de publicidad — Google AdSense</h2>
              <p className={muted}>
                Wordsus muestra publicidad a través de <strong>Google AdSense</strong>. Google, como proveedor
                de publicidad externo, puede establecer cookies en tu navegador para ofrecerte anuncios
                personalizados basados en tus visitas a este sitio y a otros sitios de internet.
              </p>
              <p className={muted}>
                En concreto, Google utiliza la <strong>cookie DoubleClick DART</strong> para publicar anuncios
                basados en los intereses de los visitantes de Wordsus y de otros sitios en internet. Esta cookie
                está asociada al dominio <code>doubleclick.net</code>.
              </p>
              <p className={muted}>
                Las cookies de publicidad de Google pueden recopilar información como:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>Tu dirección IP (de forma anonimizada)</li>
                <li>Identificadores de cookies y dispositivos</li>
                <li>Páginas visitadas e interacciones con anuncios</li>
                <li>Datos de geolocalización aproximada</li>
              </ul>
              <p className={muted}>
                Para más información, consulta la{" "}
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  política de privacidad de la red de publicidad de Google
                </a>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Cookies de análisis de tráfico</h2>
              <p className={muted}>
                Podemos utilizar servicios de análisis de tráfico anonimizados (como Cloudflare Web Analytics)
                para entender cómo los usuarios interactúan con el sitio. Estos servicios no establecen cookies
                de seguimiento personal ni recopilan datos identificables.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Cómo controlar y desactivar cookies</h2>
              <p className={muted}>
                Tienes varias opciones para gestionar las cookies de publicidad:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>
                  <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className={link}>
                    Configuración de anuncios de Google
                  </a>{" "}
                  — desactiva los anuncios personalizados de Google.
                </li>
                <li>
                  <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className={link}>
                    Network Advertising Initiative (NAI) — Opt-out
                  </a>{" "}
                  — desactiva anuncios de múltiples redes publicitarias.
                </li>
                <li>
                  <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className={link}>
                    Digital Advertising Alliance — Opt-out
                  </a>.
                </li>
              </ul>
              <p className={muted}>
                También puedes borrar las cookies y el almacenamiento local desde la configuración de tu
                navegador (Configuración → Privacidad → Datos del sitio). El sitio seguirá funcionando con
                normalidad, aunque perderás tus preferencias guardadas.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Cambios en esta política</h2>
              <p className={muted}>
                Nos reservamos el derecho de actualizar esta política. Los cambios se publicarán en esta misma
                página con la fecha de actualización correspondiente.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. What Are Cookies?</h2>
              <p className={muted}>
                Cookies are small text files that websites store on your device to remember information about
                your visit. They can be set by the website itself (first-party cookies) or by third parties
                (third-party cookies), such as advertising providers or analytics services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Local Storage (First-Party)</h2>
              <p className={muted}>
                Wordsus exclusively uses browser local storage (<code>localStorage</code>) to securely save
                your user preferences on your own device. This data is never sent to any server:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-[hsl(var(--muted-foreground))]">
                <li><strong>wordsus-theme</strong>: Your visual theme preference (light, dark, or system).</li>
                <li><strong>wordsus-favorites</strong>: Books you have marked as favorites.</li>
                <li><strong>wordsus-progress-*</strong>: Your reading progress per book.</li>
                <li><strong>wordsus-recent</strong>: Recently read books.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Advertising Cookies — Google AdSense</h2>
              <p className={muted}>
                Wordsus displays advertising through <strong>Google AdSense</strong>. Google, as a third-party
                advertising provider, may place cookies on your browser to deliver personalized ads based on
                your visits to this site and other sites on the internet.
              </p>
              <p className={muted}>
                Specifically, Google uses the <strong>DoubleClick DART cookie</strong> to serve interest-based
                ads to visitors of Wordsus and other sites on the internet. This cookie is associated with the
                domain <code>doubleclick.net</code>.
              </p>
              <p className={muted}>
                Google&apos;s advertising cookies may collect information such as:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>Your IP address (anonymized)</li>
                <li>Cookie and device identifiers</li>
                <li>Pages visited and ad interactions</li>
                <li>Approximate geolocation data</li>
              </ul>
              <p className={muted}>
                For more information, see the{" "}
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  Google advertising and content network privacy policy
                </a>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Traffic Analytics Cookies</h2>
              <p className={muted}>
                We may use anonymized traffic analytics services (such as Cloudflare Web Analytics) to
                understand how users interact with the site. These services do not set personal tracking cookies
                or collect identifiable data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. How to Control and Disable Cookies</h2>
              <p className={muted}>
                You have several options for managing advertising cookies:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>
                  <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className={link}>
                    Google Ads Settings
                  </a>{" "}
                  — opt out of personalized ads from Google.
                </li>
                <li>
                  <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className={link}>
                    Network Advertising Initiative (NAI) opt-out
                  </a>{" "}
                  — opt out of ads from multiple ad networks.
                </li>
                <li>
                  <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className={link}>
                    Digital Advertising Alliance opt-out
                  </a>.
                </li>
              </ul>
              <p className={muted}>
                You can also clear cookies and local storage from your browser settings (Settings → Privacy →
                Site Data). The site will continue working normally, though you will lose your saved
                preferences.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Changes to This Policy</h2>
              <p className={muted}>
                We reserve the right to update this policy. Changes will be published on this page with the
                corresponding update date.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
