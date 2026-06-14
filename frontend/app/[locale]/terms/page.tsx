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
    title: isEs ? "Términos y Condiciones" : "Terms & Conditions",
    description: isEs
      ? "Reglas y condiciones para usar la plataforma Wordsus, incluyendo el uso de publicidad."
      : "Rules and conditions for using the Wordsus platform, including the use of advertising.",
    robots: { index: false, follow: true },
  };
}

const link = "text-[hsl(var(--primary))] hover:underline";
const muted = "text-[hsl(var(--muted-foreground))] leading-relaxed";

export default async function TermsPage({ params }: Props) {
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
          {isEs ? "Términos y Condiciones" : "Terms & Conditions"}
        </h1>
        <p className={muted}>
          {isEs ? "Última actualización: mayo de 2025" : "Last updated: May 2025"}
        </p>
      </div>

      <div className="space-y-8 text-[hsl(var(--foreground))]">
        {isEs ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Aceptación de los términos</h2>
              <p className={muted}>
                Al acceder y utilizar Wordsus (<strong>wordsus.com</strong>), aceptas quedar vinculado por estos
                Términos y Condiciones. Si no estás de acuerdo con alguno de ellos, te pedimos que no utilices el
                sitio. Wordsus es un servicio gratuito de biblioteca de libros educativos generados con
                inteligencia artificial y{" "}
                <strong>no realiza ningún tipo de transacción comercial ni procesa pagos</strong>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Descripción del servicio</h2>
              <p className={muted}>
                Wordsus proporciona acceso gratuito a libros educativos y divulgativos en múltiples categorías.
                El contenido es generado con la asistencia de inteligencia artificial y revisado editorialmente.
                El servicio no requiere registro, es de acceso libre y no cobra ningún tipo de suscripción ni
                tarifa. Para mantener el servicio gratuito, el sitio puede mostrar publicidad de terceros.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Publicidad</h2>
              <p className={muted}>
                Wordsus puede mostrar publicidad proporcionada por terceros, incluido <strong>Google AdSense</strong>.
                Al usar este sitio, aceptas que se muestren dichos anuncios. Los anuncios son proporcionados y
                gestionados por Google LLC y sus socios, y pueden estar personalizados según tus intereses.
              </p>
              <p className={muted}>
                Wordsus no es responsable del contenido de los anuncios de terceros ni de los sitios web a los
                que estos puedan dirigir. Las interacciones con los anuncios están sujetas a las políticas de
                privacidad y condiciones del proveedor correspondiente.
              </p>
              <p className={muted}>
                Si no deseas recibir publicidad personalizada, puedes configurar tus preferencias en{" "}
                <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className={link}>
                  Configuración de anuncios de Google
                </a>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Propiedad intelectual</h2>
              <p className={muted}>
                Todo el contenido publicado en Wordsus (textos, imágenes, estructura y diseño) es propiedad de
                Wordsus o de sus colaboradores, y está protegido por las leyes de propiedad intelectual
                aplicables. Queda prohibida la reproducción, distribución o modificación del contenido con fines
                comerciales sin autorización previa y por escrito, salvo para uso personal y no comercial.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Uso aceptable</h2>
              <p className={muted}>
                Te comprometes a utilizar Wordsus únicamente con fines legales. Queda expresamente prohibido:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>Copiar o redistribuir el contenido con fines comerciales sin autorización.</li>
                <li>Intentar acceder de forma no autorizada a los sistemas del sitio.</li>
                <li>Interferir con el funcionamiento del servicio.</li>
                <li>Usar el sitio para difundir contenido ilegal o dañino.</li>
                <li>Hacer clic de forma fraudulenta en anuncios o participar en cualquier actividad que viole las políticas de Google AdSense.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Exención de responsabilidad sobre el contenido</h2>
              <p className={muted}>
                El contenido de Wordsus se ofrece con fines educativos e informativos. Dado que parte del
                contenido es generado por IA, no garantizamos su exactitud, completitud o idoneidad para un
                propósito específico. Wordsus no será responsable de ningún daño directo, indirecto o
                consecuente derivado del uso o la imposibilidad de uso del sitio.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Exención de responsabilidad sobre la publicidad</h2>
              <p className={muted}>
                Wordsus actúa únicamente como plataforma de publicación de anuncios de terceros. No respaldamos
                ni garantizamos los productos, servicios o información ofrecidos por los anunciantes. Cualquier
                transacción que realices con anunciantes se efectúa exclusivamente entre tú y el anunciante.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">8. Modificaciones</h2>
              <p className={muted}>
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones
                entrarán en vigor en el momento de su publicación en esta página. El uso continuado del sitio
                tras la publicación de los cambios implica la aceptación de los nuevos términos.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">9. Ley aplicable</h2>
              <p className={muted}>
                Estos términos se regirán e interpretarán de acuerdo con la legislación aplicable. Para cualquier
                duda, puedes contactarnos a través de la sección de{" "}
                <a href={`/${locale}/about#contact`} className={link}>Contacto</a>.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
              <p className={muted}>
                By accessing and using Wordsus (<strong>wordsus.com</strong>), you agree to be bound by these
                Terms and Conditions. If you disagree with any part of them, please do not use the site. Wordsus
                is a free library of educational books generated with artificial intelligence and{" "}
                <strong>does not engage in any commercial transactions or process payments</strong>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Service Description</h2>
              <p className={muted}>
                Wordsus provides free access to educational and informational books across multiple categories.
                Content is generated with the assistance of artificial intelligence and editorially reviewed.
                The service does not require registration, is freely accessible, and charges no subscription fee
                or tariff. To keep the service free, the site may display third-party advertising.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Advertising</h2>
              <p className={muted}>
                Wordsus may display advertising provided by third parties, including <strong>Google AdSense</strong>.
                By using this site, you agree to the display of such advertisements. Ads are provided and managed
                by Google LLC and its partners, and may be personalized based on your interests.
              </p>
              <p className={muted}>
                Wordsus is not responsible for the content of third-party ads or the websites they may link to.
                Interactions with advertisements are subject to the privacy policies and terms of the respective
                provider.
              </p>
              <p className={muted}>
                If you wish to opt out of personalized advertising, you may configure your preferences at{" "}
                <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className={link}>
                  Google Ads Settings
                </a>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Intellectual Property</h2>
              <p className={muted}>
                All content published on Wordsus (texts, images, structure, and design) is the property of
                Wordsus or its collaborators, and is protected by applicable intellectual property laws.
                Reproduction, distribution, or modification of content for commercial purposes without prior
                written authorization is prohibited, except for personal and non-commercial use.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
              <p className={muted}>
                You agree to use Wordsus only for lawful purposes. Expressly prohibited:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-[hsl(var(--muted-foreground))]">
                <li>Copying or redistributing content for commercial purposes without authorization.</li>
                <li>Attempting unauthorized access to site systems.</li>
                <li>Interfering with the service&apos;s operation.</li>
                <li>Using the site to spread illegal or harmful content.</li>
                <li>Fraudulently clicking on advertisements or engaging in any activity that violates Google AdSense policies.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Disclaimer of Warranties Regarding Content</h2>
              <p className={muted}>
                Wordsus content is provided for educational and informational purposes. Since some content is
                AI-generated, we do not guarantee its accuracy, completeness, or fitness for a specific purpose.
                Wordsus shall not be liable for any direct, indirect, or consequential damages arising from the
                use or inability to use the site.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">7. Disclaimer Regarding Advertising</h2>
              <p className={muted}>
                Wordsus acts solely as a platform for publishing third-party advertisements. We do not endorse
                or guarantee the products, services, or information offered by advertisers. Any transactions you
                conduct with advertisers occur exclusively between you and the advertiser.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">8. Modifications</h2>
              <p className={muted}>
                We reserve the right to modify these terms at any time. Modifications will take effect upon
                publication on this page. Continued use of the site after changes are published implies
                acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">9. Governing Law</h2>
              <p className={muted}>
                These terms shall be governed and interpreted in accordance with applicable law. For any
                questions, please reach out via our{" "}
                <a href={`/${locale}/about#contact`} className={link}>Contact</a> section.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
