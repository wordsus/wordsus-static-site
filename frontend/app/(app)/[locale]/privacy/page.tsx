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
      ? "Cómo Wordsus gestiona tus datos personales y el uso de publicidad de terceros."
      : "How Wordsus handles your personal data and third-party advertising.",
    robots: { index: false, follow: true },
  };
}

const link = "text-[hsl(var(--primary))] hover:underline";
const muted = "text-[hsl(var(--muted-foreground))] leading-relaxed";

export default async function PrivacyPage({ params }: Props) {
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
          {isEs ? "Política de Privacidad" : "Privacy Policy"}
        </h1>
        <p className={muted}>
          {isEs ? "Última actualización: mayo de 2025" : "Last updated: May 2025"}
        </p>
      </div>

      <div className="space-y-8 text-[hsl(var(--foreground))]">
        {isEs ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Introducción</h2>
              <p className={muted}>
                En Wordsus (<strong>wordsus.com</strong>), nos tomamos muy en serio la privacidad de nuestros usuarios.
                Esta política describe qué información recopilamos, cómo la usamos, cómo intervienen terceros
                (incluidos proveedores de publicidad) y qué derechos tienes. Wordsus es un sitio web de acceso libre
                que ofrece libros educativos gratuitos generados con inteligencia artificial.{" "}
                <strong>No realizamos transacciones comerciales ni procesamos pagos.</strong>
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Datos que recopilamos</h2>
              <p className={muted}>
                Wordsus <strong>no requiere registro ni cuenta de usuario</strong> y no recopila directamente datos
                personales identificables como nombre, email o dirección. Las preferencias del usuario (tema visual,
                favoritos, progreso de lectura) se guardan exclusivamente en el <code>localStorage</code> de tu
                navegador y <strong>nunca son enviadas a nuestros servidores</strong>.
              </p>
              <p className={muted}>
                Sin embargo, al mostrar publicidad a través de <strong>Google AdSense</strong>, terceros pueden
                recopilar información de forma automática, tal como se describe en las secciones 4 y 5.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Cookies y almacenamiento local</h2>
              <p className={muted}>
                Utilizamos almacenamiento local del navegador (<code>localStorage</code>) para guardar tus preferencias
                de forma completamente local en tu dispositivo. Adicionalmente, los proveedores de publicidad de
                terceros (como Google) pueden establecer sus propias cookies. Consulta nuestra{" "}
                <a href={`/${locale}/cookies`} className={link}>Política de Cookies</a> para más información.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Publicidad de terceros — Google AdSense</h2>
              <p className={muted}>
                Wordsus utiliza <strong>Google AdSense</strong> para mostrar anuncios publicitarios. Google, como
                proveedor externo, usa cookies para mostrar anuncios basados en las visitas anteriores del usuario a
                este sitio web y a otros sitios web. Estas cookies permiten a Google y a sus socios mostrar anuncios
                a nuestros usuarios basándose en su visita a Wordsus y/o a otros sitios en internet.
              </p>
              <p className={muted}>
                Google utiliza la <strong>cookie DoubleClick DART</strong> para mostrar anuncios basados en el
                interés a los visitantes de nuestro sitio y de otros sitios en internet. Los usuarios pueden
                deshabilitar el uso de la cookie DART visitando la{" "}
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  Política de privacidad de la red de publicidad y contenido de Google
                </a>.
              </p>
              <p className={muted}>
                Los proveedores externos, incluido Google, usan cookies para publicar anuncios basados en visitas
                anteriores de un usuario a tu sitio web u otros sitios web. El uso de cookies de publicidad permite
                a Google y a sus socios publicar anuncios para los usuarios en función de su visita a tus sitios u
                otros sitios de Internet.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Información recopilada por terceros</h2>
              <p className={muted}>
                Al interactuar con los anuncios mostrados en Wordsus, los terceros anunciantes o redes publicitarias
                pueden recopilar automáticamente información como:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>Tu dirección IP</li>
                <li>El tipo de navegador y sistema operativo</li>
                <li>Las páginas visitadas antes y después de acceder a Wordsus</li>
                <li>Identificadores de cookies y tecnologías similares</li>
              </ul>
              <p className={muted}>
                Esta recopilación de datos está sujeta a las políticas de privacidad de dichos terceros, no a esta
                política. Wordsus no tiene acceso ni control sobre estas cookies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Análisis de tráfico</h2>
              <p className={muted}>
                Podemos utilizar servicios de análisis anonimizados (como Cloudflare Web Analytics) para comprender
                el uso del sitio. Estos servicios no recopilan datos personales identificables.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Tus opciones y derechos</h2>
              <p className={muted}>
                Puedes controlar la publicidad personalizada de Google o desactivar el uso de cookies visitando:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>
                  <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className={link}>
                    Configuración de anuncios de Google
                  </a>{" "}
                  — para desactivar la publicidad basada en intereses de Google.
                </li>
                <li>
                  <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className={link}>
                    Network Advertising Initiative (NAI) opt-out
                  </a>{" "}
                  — para desactivar anuncios de múltiples redes publicitarias.
                </li>
                <li>
                  <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className={link}>
                    Digital Advertising Alliance opt-out
                  </a>.
                </li>
              </ul>
              <p className={muted}>
                Dado que Wordsus no recopila directamente datos personales, no hay información personal que
                solicitar, rectificar ni eliminar en nuestros servidores. Los datos del navegador (localStorage)
                puedes borrarlos en cualquier momento desde la configuración de tu dispositivo.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">8. Cambios en esta política</h2>
              <p className={muted}>
                Nos reservamos el derecho de actualizar esta política cuando sea necesario. Los cambios se publicarán
                en esta página con la fecha de actualización correspondiente.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">9. Contacto</h2>
              <p className={muted}>
                Si tienes preguntas sobre esta política, contáctanos a través de la sección de{" "}
                <a href={`/${locale}/about#contact`} className={link}>Contacto</a>.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Introduction</h2>
              <p className={muted}>
                At Wordsus (<strong>wordsus.com</strong>), we take your privacy seriously. This policy describes
                what information we collect, how we use it, how third parties (including advertising providers)
                are involved, and what rights you have. Wordsus is a freely accessible website offering free
                educational books generated with artificial intelligence.{" "}
                <strong>We do not conduct commercial transactions or process payments.</strong>
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Data We Collect</h2>
              <p className={muted}>
                Wordsus <strong>does not require registration or a user account</strong> and does not directly
                collect personally identifiable data such as name, email, or address. User preferences (visual
                theme, favorites, reading progress) are stored exclusively in your browser&apos;s{" "}
                <code>localStorage</code> and are <strong>never sent to our servers</strong>.
              </p>
              <p className={muted}>
                However, by displaying advertising through <strong>Google AdSense</strong>, third parties may
                automatically collect information as described in Sections 4 and 5.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Cookies and Local Storage</h2>
              <p className={muted}>
                We use browser local storage (<code>localStorage</code>) to save your preferences entirely
                locally on your device. Additionally, third-party advertising providers (such as Google) may set
                their own cookies. See our{" "}
                <a href={`/${locale}/cookies`} className={link}>Cookie Policy</a> for more details.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Third-Party Advertising — Google AdSense</h2>
              <p className={muted}>
                Wordsus uses <strong>Google AdSense</strong> to display advertisements. Google, as a third-party
                provider, uses cookies to serve ads based on a user&apos;s prior visits to this website and other
                websites. These cookies allow Google and its partners to serve ads to our users based on their
                visit to Wordsus and/or other sites on the internet.
              </p>
              <p className={muted}>
                Google uses the <strong>DoubleClick DART cookie</strong> to serve interest-based ads to visitors
                of our site and other sites on the internet. Users may opt out of the use of the DART cookie by
                visiting the{" "}
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  Google advertising and content network privacy policy
                </a>.
              </p>
              <p className={muted}>
                Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior
                visits to your website or other websites. Google&apos;s use of advertising cookies enables it and
                its partners to serve ads to users based on their visit to your sites and/or other sites on the
                internet.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Information Collected by Third Parties</h2>
              <p className={muted}>
                When you interact with ads shown on Wordsus, third-party advertisers or ad networks may
                automatically collect information such as:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>Your IP address</li>
                <li>Browser type and operating system</li>
                <li>Pages visited before and after accessing Wordsus</li>
                <li>Cookie identifiers and similar technologies</li>
              </ul>
              <p className={muted}>
                This data collection is governed by those third parties&apos; own privacy policies, not by this
                policy. Wordsus has no access to or control over these cookies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Traffic Analytics</h2>
              <p className={muted}>
                We may use anonymized analytics services (such as Cloudflare Web Analytics) to understand site
                usage. These services do not collect personally identifiable data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Your Choices and Rights</h2>
              <p className={muted}>
                You can control Google&apos;s personalized advertising or opt out of cookie use by visiting:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>
                  <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className={link}>
                    Google Ads Settings
                  </a>{" "}
                  — to disable interest-based advertising from Google.
                </li>
                <li>
                  <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className={link}>
                    Network Advertising Initiative (NAI) opt-out
                  </a>{" "}
                  — to disable ads from multiple ad networks.
                </li>
                <li>
                  <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className={link}>
                    Digital Advertising Alliance opt-out
                  </a>.
                </li>
              </ul>
              <p className={muted}>
                Since Wordsus does not directly collect personal data, there is no personal information to
                request, rectify, or delete on our servers. Browser data (localStorage) can be cleared at any
                time from your device settings.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">8. Changes to This Policy</h2>
              <p className={muted}>
                We reserve the right to update this policy when necessary. Changes will be published on this page
                with the corresponding update date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">9. Contact</h2>
              <p className={muted}>
                If you have questions about this policy, please reach out via our{" "}
                <a href={`/${locale}/about#contact`} className={link}>Contact</a> section.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
