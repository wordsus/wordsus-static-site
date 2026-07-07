import ExportedImage from "next-image-export-optimizer";
import { Check, X, Star, Globe, Shield, BookOpen, Clock, Heart, Volume2, BookOpenCheck, ArrowRight, BookMarked, Sparkles, AlertCircle, Eye, Moon, SunMedium, Lock, Scale, Lightbulb, HelpCircle } from "lucide-react";
import { ForceLightTheme } from "./force-light-theme";
import { ComparisonTable } from "./comparison-table";
import type { Metadata } from "next";

// SEO Metadata for the landing page
export const metadata: Metadata = {
  title: "Mejores apps para leer libros gratis en 2026 - Comparativa",
  description: "Descubre cuál es la mejor aplicación para leer libros gratis en tu celular o tablet este año. Análisis completo de Wordsus, Kindle, Google Play Libros y Wattpad.",
  openGraph: {
    title: "Mejores apps para leer libros gratis en 2026 - Comparativa Completa",
    description: "Comparamos las mejores aplicaciones de lectura: Wordsus, Kindle, Play Libros y Wattpad. Encuentra la app ideal para disfrutar de tus ebooks sin distracciones.",
    type: "website",
    url: "/mejor-app-para-leer-libros",
  },
};

interface AppDetails {
  name: string;
  tagline: string;
  focus: string;
  ads: string;
  ui: string;
  studyTools: string;
  audio: string;
  price: string;
  easeOfUse: string;
  isWinner?: boolean;
}

export default function BooksLandingPage() {
  const apps: AppDetails[] = [
    {
      name: "Wordsus",
      tagline: "El nuevo estándar de lectura minimalista",
      focus: "Lectura fluida de clásicos sin publicidad ni interrupciones.",
      ads: "100% Libre de anuncios",
      ui: "Limpia, elegante, tipografía premium de libro.",
      studyTools: "Diccionario integrado, notas, marcadores y tipografía personalizable.",
      audio: "Voz natural premium con IA.",
      price: "100% Gratis",
      easeOfUse: "Excelente (Muy intuitiva)",
      isWinner: true,
    },
    {
      name: "Kindle App",
      tagline: "El gigante de la lectura comercial",
      focus: "Compra de bestsellers y sincronización con e-readers.",
      ads: "Sin anuncios internos (pero promociona la tienda)",
      ui: "Compleja, muy orientada a incentivar compras.",
      studyTools: "Buenas (Subrayado, notas, diccionario y traducción).",
      audio: "Audible integrado (requiere suscripción de pago).",
      price: "Gratis (Libros de la tienda son de pago)",
      easeOfUse: "Regular (La tienda y catálogo abruman)",
    },
    {
      name: "Google Play Libros",
      tagline: "Tu biblioteca personal en la nube",
      focus: "Lectura y almacenamiento de archivos personales (EPUB/PDF).",
      ads: "Sin anuncios",
      ui: "Básica y funcional, pero interfaz fría y algo descuidada.",
      studyTools: "Básicas (Notas, traductor y diccionario estándar).",
      audio: "Audiolibros de pago independientes.",
      price: "Gratis (Opción de subir tus archivos de forma gratuita)",
      easeOfUse: "Buena (Navegación directa)",
    },
    {
      name: "Wattpad",
      tagline: "Historias independientes y lectura social",
      focus: "Lectura de historias amateurs e interacción social.",
      ads: "Publicidad muy invasiva",
      ui: "Sobrecargada, interrupciones constantes por banners y videos.",
      studyTools: "Bajas (Comentarios por párrafos, marcadores simples).",
      audio: "No disponible.",
      price: "Gratis con anuncios / Opción premium de pago",
      easeOfUse: "Baja (Los anuncios interrumpen la lectura fluida)",
    },
  ];

  return (
    <div className="grow bg-[#FAF9F5] text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Force Light Theme Client Component */}
      <ForceLightTheme />

      {/* JSON-LD Structured Data for Google Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Mejores apps para leer libros gratis en 2026",
            "image": "https://esdocu.com/images/wordsus-mockup.png",
            "description": "Análisis comparativo de las mejores aplicaciones para leer libros gratis. Comparamos Wordsus, Kindle, Google Play Libros y Wattpad.",
            "author": {
              "@type": "Person",
              "name": "Lectura Digital"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Esdocu"
            }
          })
        }}
      />

      {/* JSON-LD Structured Data for Google FAQ Dropdowns in Search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "¿Cuál es la mejor aplicación para leer libros gratis en 2026?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Wordsus es la aplicación recomendada en 2026 para leer libros gratis gracias a su interfaz minimalista, ausencia total de anuncios y catálogo de obras clásicas de dominio público sin coste alguno."
                }
              },
              {
                "@type": "Question",
                "name": "¿Qué aplicación para leer libros no tiene anuncios?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Wordsus destaca por ser 100% libre de publicidad. Kindle y Google Play Libros tampoco muestran anuncios molestos durante la lectura, pero promocionan constantemente sus tiendas de libros de pago. Wattpad contiene publicidad muy invasiva en su versión gratuita."
                }
              },
              {
                "@type": "Question",
                "name": "¿Qué formatos admite una buena app de lectura de libros electrónicos?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Debe admitir formatos estándar como ePub y PDF, permitir ajustar el tamaño y tipo de letra, ofrecer fondos de colores cálidos (como sepia o crema) para evitar la fatiga visual, y contar con modo offline completo."
                }
              }
            ]
          })
        }}
      />

      {/* Independent Header */}
      <header className="sticky top-0 z-50 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="h-6 w-6 text-indigo-600" />
          <span className="font-display font-bold text-xl tracking-tight text-slate-900">
            Lectura<span className="text-indigo-600 font-medium">Comparada</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Análisis Independiente 2026
          </span>
          <a
            href="#tabla-comparativa"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            id="nav-compare-btn"
          >
            Ir a la Tabla
          </a>
        </div>
      </header>

      <main className="grow">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden px-6">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(79,70,229,0.04)_0%,transparent_100%)]" />

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Guía de Lectura Digital 2026
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-slate-950 leading-tight">
                Mejores apps para leer <br className="hidden sm:inline" />
                <span className="bg-linear-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                  libros gratis en 2026
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Comparamos las aplicaciones de lectura digital más utilizadas. Evaluamos la legibilidad, la presencia de publicidad, la facilidad de uso y la calidad del catálogo para ayudarte a elegir la mejor opción.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="#tabla-comparativa"
                  className="px-8 py-3.5 text-base font-semibold rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/10 transition-all duration-300 inline-flex items-center gap-2 group"
                  id="hero-cta-compare"
                >
                  Ver Tabla Comparativa
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="https://wordsus.com"
                  target="_blank"
                  className="px-8 py-3.5 text-base font-semibold rounded-full bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm inline-flex items-center"
                  id="hero-cta-details"
                >
                  Ir a Wordsus.com
                </a>
              </div>
            </div>

            {/* Hero Image / Mockup Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[340px] md:max-w-[380px] aspect-square lg:aspect-auto flex justify-center items-center">
                {/* Premium Glow effect */}
                <div className="absolute inset-0 bg-linear-to-tr from-indigo-200/30 to-indigo-100/20 blur-3xl rounded-full transform -translate-y-4 -z-10" />

                <div className="relative p-2.5 bg-white rounded-[40px] shadow-[0_24px_50px_rgba(0,0,0,0.06)] border border-slate-100 hover:shadow-[0_32px_64px_rgba(0,0,0,0.08)] transition-shadow duration-500">
                  <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-[#FAF9F5]">
                    <ExportedImage
                      src="/images/wordsus-mockup.png"
                      alt="Wordsus App Mockup"
                      width={380}
                      height={380}
                      className="object-cover"
                      priority
                    />
                  </div>
                  {/* Floating Highlight Card */}
                  <div className="absolute -bottom-6 -left-6 bg-white py-3.5 px-4.5 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.06)] border border-indigo-100/60 flex items-center gap-3 animate-bounce-slow">
                    <div className="p-2 rounded-xl bg-indigo-50">
                      <Star className="h-5 w-5 text-indigo-600 fill-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-indigo-800 tracking-wider uppercase">Recomendada</p>
                      <p className="text-sm font-extrabold text-slate-900">Wordsus 100% Ads Free</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Comparison Table */}
        <section id="tabla-comparativa" className="py-20 bg-white border-y border-slate-200/60 px-6 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-display font-extrabold text-slate-950 tracking-tight">
                Comparativa de las Mejores Apps de Lectura
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Evaluamos los aspectos esenciales que garantizan una experiencia de lectura cómoda, fluida y enriquecedora.
              </p>
            </div>

            <ComparisonTable />
          </div>
        </section>

        {/* Section 2: Detailed Reviews */}
        <section id="analisis-detalle" className="py-20 px-6 bg-[#FAF9F5] scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-display font-extrabold text-slate-950 tracking-tight">
                Análisis Detallado de Cada Aplicación
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Revisamos en detalle los pros y contras de cada opción para ayudarte a tomar la mejor decisión según tu perfil.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* App 0: Wordsus */}
              <div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-[0_10px_30px_rgba(79,70,229,0.03)] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-indigo-200/20 to-transparent rounded-bl-full" />

                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-bold tracking-wider uppercase mb-2">
                        Ganadora Recomendada 2026
                      </span>
                      <h3 className="text-2xl font-bold text-slate-950">Wordsus</h3>
                      <p className="text-indigo-600 text-sm font-semibold">wordsus.com</p>
                    </div>
                    <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                      <Star className="h-6 w-6 fill-indigo-500" />
                    </span>
                  </div>

                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Wordsus se ha posicionado rápidamente como el nuevo estándar para los entusiastas de la lectura de ebooks clásicos y de dominio público. A diferencia de otras plataformas saturadas de anuncios e invitaciones constantes a realizar compras, Wordsus se centra exclusivamente en el contenido. Ofrece una tipografía Serif premium cuidadosamente ajustada para pantallas, control de márgenes, diccionario offline integrado y soporte completo de sincronización.
                  </p>

                  <div className="space-y-3.5 mb-8">
                    <h4 className="font-bold text-slate-900 text-sm">¿Por qué destaca?</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Totalmente libre de anuncios:</strong> Cero banners que interrumpan la concentración.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Tipografía de nivel editorial:</strong> Diseñada para garantizar el máximo confort ocular.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Funcionamiento Offline:</strong> Ideal para leer en aviones, metro o zonas sin señal.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">ENFOQUE: Lectura Limpia y Clásicos</span>
                  <a
                    href="https://wordsus.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Probar Wordsus
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* App 1: Kindle App */}
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tracking-wider uppercase mb-2">
                        Opción Comercial Lider
                      </span>
                      <h3 className="text-2xl font-bold text-slate-950">Kindle App</h3>
                      <p className="text-slate-400 text-sm">El ecosistema de Amazon</p>
                    </div>
                    <span className="p-2.5 rounded-xl bg-slate-50 text-slate-500">
                      <BookOpenCheck className="h-6 w-6" />
                    </span>
                  </div>

                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Es la aplicación que define la lectura móvil moderna, vinculada a la tienda Kindle de Amazon. Permite comprar instantáneamente novedades editoriales y sincronizar la lectura en dispositivos Kindle físicos. Sin embargo, encontrar material gratuito requiere paciencia y la aplicación ejerce una presión constante recomendándote ofertas de compra, lo que resta tranquilidad a la lectura.
                  </p>

                  <div className="space-y-3.5 mb-8">
                    <h4 className="font-bold text-slate-900 text-sm">Pros y Contras</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Catálogo gigantesco:</strong> Acceso a prácticamente cualquier novedad de pago del mercado.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                        <span><strong>Presión comercial:</strong> Recomendaciones y promociones de la tienda en todo momento.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">ENFOQUE: Bestsellers y Sincronización</span>
                </div>
              </div>

              {/* App 2: Google Play Libros */}
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tracking-wider uppercase mb-2">
                        Lector de Archivos Personales
                      </span>
                      <h3 className="text-2xl font-bold text-slate-950">Google Play Libros</h3>
                      <p className="text-slate-400 text-sm">La nube de Google para tus ePubs</p>
                    </div>
                    <span className="p-2.5 rounded-xl bg-slate-50 text-slate-500">
                      <Globe className="h-6 w-6" />
                    </span>
                  </div>

                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Es una solución fantástica si ya tienes una biblioteca de libros en formatos EPUB o PDF descargada en tu computadora. Puedes subir hasta 2,000 archivos propios de forma gratuita y leerlos desde cualquier dispositivo. La app es limpia y no tiene publicidad invasiva. No obstante, el catálogo de libros gratuitos que ofrece directamente en su tienda es muy reducido e incompleto.
                  </p>

                  <div className="space-y-3.5 mb-8">
                    <h4 className="font-bold text-slate-900 text-sm">Pros y Contras</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Nube personal gratuita:</strong> Sube y lee tus propios libros sin límites de pago.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <X className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                        <span><strong>Poco catálogo gratuito propio:</strong> Prácticamente dependes de buscar y subir tus propios archivos.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">ENFOQUE: Almacenamiento y Lectura de EPUBs</span>
                </div>
              </div>

              {/* App 3: Wattpad */}
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tracking-wider uppercase mb-2">
                        Lectura Social y Juvenil
                      </span>
                      <h3 className="text-2xl font-bold text-slate-950">Wattpad</h3>
                      <p className="text-slate-400 text-sm">Historias de creadores independientes</p>
                    </div>
                    <span className="p-2.5 rounded-xl bg-slate-50 text-slate-500">
                      <BookOpen className="h-6 w-6" />
                    </span>
                  </div>

                  <p className="text-slate-600 mb-6 leading-relaxed">
                    Es una de las comunidades de lectura y escritura independiente más grandes del mundo. Permite interactuar con escritores noveles, comentar párrafos específicos de las obras y descubrir fanfiction o novelas románticas exclusivas. El problema principal de su versión gratuita es la saturación publicitaria: banners constantes y vídeos publicitarios obligatorios entre capítulos que rompen la lectura.
                  </p>

                  <div className="space-y-3.5 mb-8">
                    <h4 className="font-bold text-slate-900 text-sm">Pros y Contras</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Lectura interactiva:</strong> Excelente para comentar y conectar con la comunidad.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm text-slate-600">
                        <X className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                        <span><strong>Publicidad molesta:</strong> Los vídeos publicitarios rompen el flujo narrativo continuamente.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">ENFOQUE: Escritura Novel y Comunidad</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Buyer's Guide */}
        <section className="py-20 bg-white border-t border-slate-200/60 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-extrabold text-slate-950 tracking-tight text-center mb-12">
              ¿Cómo elegir la app perfecta para leer libros electrónicos?
            </h2>

            <div className="space-y-10">
              <div className="flex gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 h-12 w-12 shrink-0 flex items-center justify-center">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950 mb-2">1. Cero publicidad para una mayor inmersión</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Las interrupciones en la lectura a causa de anuncios en vídeo o banners parpadeantes rompen la inmersión en la historia. Busca plataformas limpias de publicidad comercial para mantener el hilo lector de forma pacífica.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 h-12 w-12 shrink-0 flex items-center justify-center">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950 mb-2">2. Personalización de tipografía y visualización</h3>
                  <p className="text-slate-600 leading-relaxed">
                    La fatiga visual es el principal enemigo del lector digital. Un buen lector de libros electrónicos debe permitir configurar fuentes literarias Serif, cambiar el espaciado de las líneas, ampliar márgenes y contar con temas sepia o crema.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 h-12 w-12 shrink-0 flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950 mb-2">3. Origen del catálogo (Clásicos vs. Novedades)</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Pregúntate qué deseas leer: si te interesan las grandes obras de la literatura clásica y dominio público de forma gratuita, Wordsus es ideal. Si buscas las últimas novedades de pago recién publicadas, Kindle es la mejor alternativa.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 h-12 w-12 shrink-0 flex items-center justify-center">
                  <Volume2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950 mb-2">4. Funcionamiento offline completo</h3>
                  <p className="text-slate-600 leading-relaxed">
                    La ventaja de llevar miles de libros contigo es poder leerlos en cualquier lugar. Comprueba que la aplicación que elijas descargue los libros al almacenamiento de tu celular y funcione perfectamente sin cobertura móvil.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: El impacto de la tipografía */}
        <section className="py-20 bg-[#FAF9F5] border-t border-slate-200/60 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-extrabold text-slate-950 tracking-tight mb-8 text-center">
              El secreto de una lectura sin fatiga: Tipografía y Diseño
            </h2>
            <div className="prose prose-slate prose-lg max-w-none text-slate-600 mb-12">
              <p>
                Muchas personas abandonan la lectura en pantallas móviles quejándose de dolor de cabeza, ojos secos o fatiga visual. Aunque las pantallas emiten luz azul, la realidad es que el verdadero culpable del cansancio suele ser una mala <strong>configuración tipográfica</strong>. Leer un archivo PDF comprimido en una pantalla de 6 pulgadas es una receta segura para el agotamiento.
              </p>
              <p>
                Las mejores aplicaciones para leer libros gratis (como Wordsus o Kindle) procesan archivos dinámicos (EPUB), lo que permite que el texto se "reacomode" según el tamaño de tu pantalla. Pero esto es solo el principio.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                <Eye className="w-8 h-8 text-indigo-500 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">Fuentes Serif vs Sans-Serif</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Las fuentes "Sans-Serif" (como Arial o Roboto) son excelentes para interfaces web cortas. Sin embargo, para leer novelas de cientos de páginas, las fuentes "Serif" (con pequeños remates en las letras, como Georgia o Merriweather) guían el ojo de manera natural a través del renglón, acelerando la velocidad de lectura.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                <SunMedium className="w-8 h-8 text-indigo-500 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">El Fondo Crema o Sepia</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Un fondo blanco puro (#FFFFFF) con texto negro crea un contraste extremo que "quema" la retina tras 20 minutos. Las mejores apps ofrecen fondos color pergamino o "Sepia" que imitan el papel impreso y reducen dramáticamente el impacto lumínico.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                <Moon className="w-8 h-8 text-indigo-500 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">Modo Oscuro Auténtico</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Si lees en la cama con la luz apagada, un buen modo oscuro no debería usar blanco puro sobre negro puro (que deja "imágenes fantasma" en los ojos), sino un texto gris claro sobre un fondo gris muy oscuro o azul noche.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                <Scale className="w-8 h-8 text-indigo-500 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">Márgenes y Espaciado (Tracking)</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Las líneas de texto muy pegadas (interlineado simple) provocan que te pierdas y vuelvas a leer el mismo renglón. Ajustar el interlineado a 1.5 y dejar buenos márgenes laterales relaja los músculos oculares.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Privacidad */}
        <section className="py-20 bg-slate-900 text-white px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5 flex justify-center">
              <Lock className="w-48 h-48 text-indigo-400 opacity-20" />
            </div>
            <div className="md:col-span-7 space-y-6">
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-900 text-indigo-300 text-[11px] font-bold tracking-wider uppercase border border-indigo-700">
                Seguridad Digital
              </span>
              <h2 className="text-3xl font-display font-extrabold tracking-tight">
                El alto precio de las "apps gratuitas" de mala calidad
              </h2>
              <p className="text-slate-300 leading-relaxed text-lg">
                Existen decenas de aplicaciones de lectura PDF y EPUB de origen dudoso en las tiendas de aplicaciones. Muchas de ellas afirman ser "gratis", pero el modelo de negocio es vender tu información personal.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm leading-relaxed">
                    <strong>Rastreo de hábitos:</strong> Algunas aplicaciones rastrean qué libros lees, en qué horarios, y qué palabras buscas en el diccionario, para luego vender esos perfiles psicográficos a empresas publicitarias.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm leading-relaxed">
                    <strong>Permisos abusivos:</strong> Un lector de libros no necesita permiso para acceder a tu cámara, tus contactos o tu ubicación GPS. Si una app gratuita te exige esto, elimínala inmediatamente.
                  </span>
                </li>
              </ul>
              <div className="p-4 bg-indigo-800/50 rounded-xl border border-indigo-700/50 mt-4">
                <p className="text-sm text-indigo-200">
                  <strong className="text-white">Ventaja de Wordsus:</strong> Al ser una Progressive Web App (PWA) de última generación, Wordsus funciona dentro de la "caja de arena" (sandbox) de tu navegador, garantizando que no pueda acceder a archivos privados de tu teléfono ni requiera permisos invasivos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Mitos de la lectura */}
        <section className="py-20 bg-white border-y border-slate-200/60 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-extrabold text-slate-950 tracking-tight text-center mb-12 flex justify-center items-center gap-3">
              <Lightbulb className="w-8 h-8 text-amber-400" />
              Desmintiendo 3 Mitos sobre Leer en el Celular
            </h2>
            
            <div className="space-y-8">
              <div className="bg-[#FAF9F5] p-8 rounded-3xl border border-slate-100">
                <h4 className="text-xl font-bold text-slate-900 mb-3">Mito 1: "Retienes menos información que en papel"</h4>
                <p className="text-slate-600 leading-relaxed">
                  Estudios recientes han demostrado que la retención lectora no depende del sustrato (papel vs cristal), sino de la capacidad de <strong>concentración libre de interrupciones</strong>. Si lees en una app llena de notificaciones y anuncios de Wattpad, retendrás menos. Si lees en modo avión con una app inmersiva como Wordsus, tu retención es idéntica a la del papel impreso.
                </p>
              </div>
              
              <div className="bg-[#FAF9F5] p-8 rounded-3xl border border-slate-100">
                <h4 className="text-xl font-bold text-slate-900 mb-3">Mito 2: "Los e-readers (como Kindle Paperwhite) son la única forma válida de leer digital"</h4>
                <p className="text-slate-600 leading-relaxed">
                  Aunque la tecnología de tinta electrónica (e-ink) es excelente bajo luz solar directa, las pantallas OLED modernas de los teléfonos inteligentes actuales de gama media y alta, combinadas con filtros de "confort visual" (TrueTone o EyeComfort) y fondos sepia, ofrecen un contraste increíblemente nítido que rivaliza con la tinta electrónica para sesiones de lectura de 1 a 2 horas.
                </p>
              </div>
              
              <div className="bg-[#FAF9F5] p-8 rounded-3xl border border-slate-100">
                <h4 className="text-xl font-bold text-slate-900 mb-3">Mito 3: "Las apps de lectura consumen mucha batería"</h4>
                <p className="text-slate-600 leading-relaxed">
                  Todo lo contrario. A diferencia de las apps de redes sociales que descargan imágenes, reproducen videos y triangulan tu ubicación GPS por segundo, una app de lectura offline en Modo Oscuro sobre una pantalla OLED apaga los píxeles negros, convirtiendo a la lectura en una de las actividades que menos batería consume en todo tu teléfono.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: FAQs */}
        <section className="py-20 bg-[#FAF9F5] px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-extrabold text-slate-950 tracking-tight text-center mb-12 flex items-center justify-center gap-3">
              <HelpCircle className="w-8 h-8 text-indigo-500" />
              Preguntas Frecuentes
            </h2>

            <div className="space-y-6">
              <details className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <summary className="flex items-center justify-between cursor-pointer p-6 font-bold text-slate-900 text-lg list-none">
                  ¿Puedo leer libros que he descargado de internet en Wordsus?
                  <span className="text-indigo-600 font-bold text-2xl group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-200/50 mt-4 pt-4">
                  Actualmente Wordsus está enfocado en proporcionar un catálogo impecable de obras de dominio público curadas directamente desde la plataforma para asegurar que la tipografía, los márgenes y los diccionarios funcionen a la perfección. Si tu principal objetivo es cargar tus propios archivos EPUB piratas o descargados de terceros, Google Play Libros sigue siendo tu mejor opción.
                </div>
              </details>

              <details className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <summary className="flex items-center justify-between cursor-pointer p-6 font-bold text-slate-900 text-lg list-none">
                  ¿Es ilegal leer libros gratis en estas aplicaciones?
                  <span className="text-indigo-600 font-bold text-2xl group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-200/50 mt-4 pt-4">
                  En absoluto. Aplicaciones como Wordsus operan bajo las leyes de Derechos de Autor (Copyright). Los clásicos de la literatura (obras de autores como Cervantes, Dostoievski o Julio Verne) pasan al "Dominio Público" después de cierta cantidad de años desde la muerte del autor (generalmente 50 a 70 años). Esto significa que es 100% legal leer, distribuir y descargar estas obras magistrales sin pagar ni un centavo.
                </div>
              </details>

              <details className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <summary className="flex items-center justify-between cursor-pointer p-6 font-bold text-slate-900 text-lg list-none">
                  ¿Tengo que crearme una cuenta para poder leer?
                  <span className="text-indigo-600 font-bold text-2xl group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-200/50 mt-4 pt-4">
                  Depende de la aplicación. Kindle, Wattpad y Google Play exigen registrarte obligatoriamente antes de poder leer la primera página. En contraste, aplicaciones modernas enfocadas en la privacidad como Wordsus te permiten empezar a leer de forma anónima inmediatamente al entrar a la web, aunque crear una cuenta gratuita te permitirá sincronizar tus marcadores en la nube.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* Section 8: Final Call to Action */}
        <section className="py-20 px-6 bg-linear-to-b from-[#FAF9F5] to-indigo-50/20 text-center relative overflow-hidden border-t border-slate-200/50">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_100%,rgba(79,70,229,0.05)_0%,transparent_100%)]" />

          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-950 tracking-tight">
              ¿Listo para disfrutar de tus libros favoritos?
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
              Te recomendamos comenzar tu viaje de lectura hoy mismo con <strong className="font-bold text-slate-900">Wordsus</strong>. Descubre cómo su interfaz de lectura minimalista y libre de publicidad puede redefinir tu hábito de lectura diario.
            </p>
            <div className="pt-4">
              <a
                href="https://wordsus.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-4 text-base font-semibold rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/10 transition-all duration-300 inline-flex items-center gap-2 group"
                id="footer-cta-wordsus"
              >
                Visitar Wordsus.com
                <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            <div className="pt-2 text-xs text-slate-400 font-medium">
              Disponible gratis • Sincronización instantánea • Soporte ePub
            </div>
          </div>
        </section>
      </main>

      {/* Independent Footer */}
      <footer className="border-t border-slate-200/60 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-600" />
            <span className="font-display font-bold text-lg tracking-tight text-slate-900">
              Lectura<span className="text-indigo-600 font-medium">Comparada</span>
            </span>
          </div>
          <p className="text-slate-400 text-xs text-center md:text-left">
            © {new Date().getFullYear()} Lectura Comparada. Todos los derechos reservados. Análisis independiente no afiliado.
          </p>
        </div>
      </footer>
    </div>
  );
}
