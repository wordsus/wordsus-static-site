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
      ? "Reglas y condiciones para usar la plataforma Wordsus."
      : "Rules and conditions for using the Wordsus platform.",
    robots: { index: false, follow: true },
  };
}

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
        <p className="text-[hsl(var(--muted-foreground))]">
          {isEs ? "Última actualización: mayo de 2025" : "Last updated: May 2025"}
        </p>
      </div>

      <div className="space-y-8 text-[hsl(var(--foreground))]">
        {isEs ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Aceptación de los términos</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Al acceder y utilizar Wordsus (<strong>wordsus.com</strong>), aceptas quedar vinculado por estos Términos y Condiciones. Wordsus es un servicio gratuito de biblioteca de libros educativos generados con inteligencia artificial y no realiza ningún tipo de transacción comercial.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Descripción del servicio</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Wordsus proporciona acceso gratuito a libros educativos en múltiples categorías. El contenido es generado con la asistencia de inteligencia artificial y revisado editorialmente. El servicio no requiere registro, es de acceso libre y no cobra ningún tipo de suscripción ni tarifa.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Propiedad intelectual</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Todo el contenido publicado en Wordsus es propiedad de Wordsus o de sus colaboradores, protegido por las leyes de propiedad intelectual aplicables. Queda prohibida la reproducción o distribución del contenido con fines comerciales sin autorización previa y por escrito.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Uso aceptable</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Te comprometes a utilizar Wordsus únicamente con fines legales. Queda prohibido copiar el contenido con fines comerciales, intentar acceder no autorizado a los sistemas, interferir con el servicio, o usar el sitio para difundir contenido ilegal o dañino.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Exención de responsabilidad</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                El contenido de Wordsus se ofrece con fines educativos e informativos. Dado que parte del contenido es generado por IA, no garantizamos su exactitud o completitud. Wordsus no será responsable de ningún daño derivado del uso del sitio.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Modificaciones</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado del sitio tras la publicación de los cambios implica su aceptación.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                By accessing and using Wordsus (<strong>wordsus.com</strong>), you agree to be bound by these Terms and Conditions. Wordsus is a free library of educational books generated with artificial intelligence and does not engage in any commercial transactions.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">2. Service Description</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Wordsus provides free access to educational books across multiple categories. Content is AI-generated and editorially reviewed. The service requires no registration, is freely accessible, and charges no subscription fee.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">3. Intellectual Property</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                All content on Wordsus is the property of Wordsus or its collaborators, protected by applicable intellectual property laws. Reproduction or distribution for commercial purposes without prior written authorization is prohibited.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                You agree to use Wordsus only for lawful purposes. Prohibited: copying content for commercial use, unauthorized system access, interfering with the service, or spreading illegal or harmful content.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">5. Disclaimer of Warranties</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                Content is provided for educational and informational purposes. Since some content is AI-generated, we do not guarantee its accuracy or completeness. Wordsus shall not be liable for any damages arising from site use.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">6. Modifications</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
                We reserve the right to modify these terms at any time. Continued use of the site after changes are published implies acceptance of the new terms.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
