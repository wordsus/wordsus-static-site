"use client";

import React, { useState } from "react";
import { Check, X, Star } from "lucide-react";

type CompetitorKey = "kindle" | "googlebooks" | "wattpad";

interface CompetitorData {
  name: string;
  focus: string;
  ads: React.ReactNode;
  ui: string;
  studyTools: string;
  audio: string;
  price: string;
  easeOfUse: string;
}

export function ComparisonTable() {
  const [compareWith, setCompareWith] = useState<CompetitorKey>("kindle");

  const competitors: Record<CompetitorKey, CompetitorData> = {
    kindle: {
      name: "Kindle App",
      focus: "Compra de bestsellers y sincronización con e-readers.",
      ads: (
        <div className="flex items-center gap-1.5 text-slate-700">
          <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>Sin anuncios internos (pero promociona la tienda)</span>
        </div>
      ),
      ui: "Compleja, muy orientada a incentivar compras.",
      studyTools: "Buenas (Subrayado, notas, diccionario y traducción).",
      audio: "Audible integrado (requiere suscripción de pago).",
      price: "Gratis (Libros de la tienda son de pago)",
      easeOfUse: "Regular (La tienda y catálogo abruman)",
    },
    googlebooks: {
      name: "Google Play Libros",
      focus: "Lectura y almacenamiento de archivos personales (EPUB/PDF).",
      ads: (
        <div className="flex items-center gap-1.5 text-emerald-700">
          <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>Sin anuncios</span>
        </div>
      ),
      ui: "Básica y funcional, pero interfaz fría y algo descuidada.",
      studyTools: "Básicas (Notas, traductor y diccionario estándar).",
      audio: "Audiolibros de pago independientes.",
      price: "Gratis (Opción de subir tus archivos de forma gratuita)",
      easeOfUse: "Buena (Navegación directa)",
    },
    wattpad: {
      name: "Wattpad",
      focus: "Lectura de historias amateurs e interacción social.",
      ads: (
        <div className="flex items-center gap-1.5 text-red-700 font-medium">
          <X className="h-4.5 w-4.5 text-red-500 shrink-0" />
          <span>Publicidad muy invasiva</span>
        </div>
      ),
      ui: "Sobrecargada, interrupciones constantes por banners y videos.",
      studyTools: "Bajas (Comentarios por párrafos, marcadores simples).",
      audio: "No disponible.",
      price: "Gratis con anuncios / Opción premium de pago",
      easeOfUse: "Baja (Los anuncios interrumpen la lectura fluida)",
    },
  };

  const selectedCompetitor = competitors[compareWith];

  return (
    <div className="w-full">
      {/* Mobile-Only Pill Selector */}
      <div className="md:hidden flex flex-col gap-2.5 mb-6 bg-[#FAF9F5] p-3.5 rounded-2xl border border-slate-200/50">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
          Comparar Wordsus con:
        </span>
        <div className="flex gap-1.5 justify-center">
          <button
            onClick={() => setCompareWith("kindle")}
            className={`grow py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 border ${
              compareWith === "kindle"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            id="mobile-btn-books-kindle"
          >
            Kindle
          </button>
          <button
            onClick={() => setCompareWith("googlebooks")}
            className={`grow py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 border ${
              compareWith === "googlebooks"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            id="mobile-btn-books-google"
          >
            Play Libros
          </button>
          <button
            onClick={() => setCompareWith("wattpad")}
            className={`grow py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 border ${
              compareWith === "wattpad"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            id="mobile-btn-books-wattpad"
          >
            Wattpad
          </button>
        </div>
      </div>

      {/* Mobile-Only 3-Column Table (No scroll needed, fits 100% viewport) */}
      <div className="md:hidden rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)] bg-white overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left bg-white">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="py-4 px-3.5 font-semibold text-slate-600 text-xs w-[30%]">Característica</th>
              <th className="py-4 px-3 text-xs relative w-[35%] bg-indigo-50/40 border-x border-indigo-100/50">
                <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500" />
                <span className="font-extrabold text-slate-950 block">Wordsus</span>
                <span className="inline-block rounded bg-indigo-100 px-1 py-0.5 text-[8px] font-bold text-indigo-800 mt-0.5">
                  Recomendado
                </span>
              </th>
              <th className="py-4 px-3 font-bold text-slate-800 text-xs w-[35%]">
                {selectedCompetitor.name}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] leading-relaxed">
            <tr>
              <td className="py-4 px-3.5 font-bold text-slate-900 bg-slate-50/10">Enfoque</td>
              <td className="py-4 px-3 font-medium text-slate-900 bg-indigo-50/10 border-x border-indigo-100/20">
                Lectura fluida de clásicos gratis sin publicidad.
              </td>
              <td className="py-4 px-3 text-slate-600">{selectedCompetitor.focus}</td>
            </tr>
            <tr>
              <td className="py-4 px-3.5 font-bold text-slate-900 bg-slate-50/10">Anuncios</td>
              <td className="py-4 px-3 font-medium text-slate-900 bg-indigo-50/10 border-x border-indigo-100/20">
                <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Cero Anuncios</span>
                </div>
              </td>
              <td className="py-4 px-3 text-slate-600">{selectedCompetitor.ads}</td>
            </tr>
            <tr>
              <td className="py-4 px-3.5 font-bold text-slate-900 bg-slate-50/10">Diseño</td>
              <td className="py-4 px-3 font-medium text-slate-900 bg-indigo-50/10 border-x border-indigo-100/20">
                Limpio, elegante, tipografía premium.
              </td>
              <td className="py-4 px-3 text-slate-600">{selectedCompetitor.ui}</td>
            </tr>
            <tr>
              <td className="py-4 px-3.5 font-bold text-slate-900 bg-slate-50/10">Herramientas</td>
              <td className="py-4 px-3 font-medium text-slate-900 bg-indigo-50/10 border-x border-indigo-100/20">
                Diccionario, notas y tipografía personalizable.
              </td>
              <td className="py-4 px-3 text-slate-600">{selectedCompetitor.studyTools}</td>
            </tr>
            <tr>
              <td className="py-4 px-3.5 font-bold text-slate-900 bg-slate-50/10">Audio</td>
              <td className="py-4 px-3 font-medium text-slate-900 bg-indigo-50/10 border-x border-indigo-100/20">
                Voz natural premium.
              </td>
              <td className="py-4 px-3 text-slate-600">{selectedCompetitor.audio}</td>
            </tr>
            <tr>
              <td className="py-4 px-3.5 font-bold text-slate-900 bg-slate-50/10">Precio</td>
              <td className="py-4 px-3 font-medium text-slate-900 bg-indigo-50/10 border-x border-indigo-100/20">
                100% Gratis
              </td>
              <td className="py-4 px-3 text-slate-600">{selectedCompetitor.price}</td>
            </tr>
            <tr>
              <td className="py-4 px-3.5 font-bold text-slate-900 bg-slate-50/10">Facilidad</td>
              <td className="py-4 px-3 font-medium text-slate-900 bg-indigo-50/10 border-x border-indigo-100/20">
                Excelente (Intuitiva)
              </td>
              <td className="py-4 px-3 text-slate-600">{selectedCompetitor.easeOfUse}</td>
            </tr>

          </tbody>
        </table>
      </div>

      {/* Desktop-Only 5-Column Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] custom-scrollbar">
        <table className="w-full min-w-[800px] border-collapse text-left bg-white">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="py-5 px-6 font-semibold text-slate-600 text-sm w-1/5">Característica</th>
              
              {/* Column 0: Wordsus (Highlighted) */}
              <th className="py-5 px-6 text-sm relative w-1/5 bg-indigo-55/50 border-x border-indigo-100/60">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-500" />
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-950 text-base">Wordsus</span>
                  <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    Recomendado
                  </span>
                </div>
                <span className="block text-slate-400 text-[11px] font-normal mt-0.5">wordsus.com</span>
              </th>

              <th className="py-5 px-6 font-semibold text-slate-800 text-sm w-1/5">Kindle App</th>
              <th className="py-5 px-6 font-semibold text-slate-800 text-sm w-1/5">Google Play Libros</th>
              <th className="py-5 px-6 font-semibold text-slate-800 text-sm w-1/5">Wattpad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {/* Row 1: Enfoque Principal */}
            <tr>
              <td className="py-5 px-6 font-bold text-slate-900 bg-slate-50/20">Enfoque Principal</td>
              <td className="py-5 px-6 font-medium text-slate-900 bg-indigo-50/20 border-x border-indigo-100/30">
                Lectura fluida de clásicos gratis sin publicidad ni distracciones.
              </td>
              <td className="py-5 px-6 text-slate-600">Compra de bestsellers y sincronización con e-readers.</td>
              <td className="py-5 px-6 text-slate-600">Lectura y almacenamiento de archivos personales (EPUB/PDF).</td>
              <td className="py-5 px-6 text-slate-600">Lectura de historias amateurs e interacción social.</td>
            </tr>

            {/* Row 2: Anuncios */}
            <tr>
              <td className="py-5 px-6 font-bold text-slate-900 bg-slate-50/20">Publicidad / Anuncios</td>
              <td className="py-5 px-6 font-medium text-slate-900 bg-indigo-50/20 border-x border-indigo-100/30">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  Totalmente Limpia (Sin anuncios)
                </div>
              </td>
              <td className="py-5 px-6 text-slate-600">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  Sin anuncios internos (pero promociona la tienda)
                </div>
              </td>
              <td className="py-5 px-6 text-slate-600">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  Sin anuncios
                </div>
              </td>
              <td className="py-5 px-6 text-slate-600">
                <div className="flex items-center gap-1.5 text-red-700 font-medium">
                  <X className="h-4.5 w-4.5 text-red-500 shrink-0" />
                  Publicidad muy invasiva y molesta
                </div>
              </td>
            </tr>

            {/* Row 3: Interfaz */}
            <tr>
              <td className="py-5 px-6 font-bold text-slate-900 bg-slate-50/20">Diseño e Interfaz</td>
              <td className="py-5 px-6 font-medium text-slate-900 bg-indigo-50/20 border-x border-indigo-100/30">
                Moderna, minimalista, tipografía premium de libro.
              </td>
              <td className="py-5 px-6 text-slate-600">Compleja, muy orientada a incentivar compras.</td>
              <td className="py-5 px-6 text-slate-600">Básica y funcional, pero interfaz fría y descuidada.</td>
              <td className="py-5 px-6 text-slate-600">Sobrecargada, con muchas secciones e interrupciones.</td>
            </tr>

            {/* Row 4: Herramientas */}
            <tr>
              <td className="py-5 px-6 font-bold text-slate-900 bg-slate-50/20">Herramientas de Lectura</td>
              <td className="py-5 px-6 font-medium text-slate-900 bg-indigo-50/20 border-x border-indigo-100/30">
                Excelentes (Diccionario, notas, marcadores y tipografía personalizable).
              </td>
              <td className="py-5 px-6 text-slate-600">Buenas (Subrayado, notas, diccionario y traducción).</td>
              <td className="py-5 px-6 text-slate-600">Básicas (Notas, traductor y diccionario estándar).</td>
              <td className="py-5 px-6 text-slate-600">Bajas (Comentarios por párrafos, marcadores simples).</td>
            </tr>

            {/* Row 5: Audio */}
            <tr>
              <td className="py-5 px-6 font-bold text-slate-900 bg-slate-50/20">Lectura por Voz (Audio)</td>
              <td className="py-5 px-6 font-medium text-slate-900 bg-indigo-50/20 border-x border-indigo-100/30">
                Sí, voz natural premium con IA.
              </td>
              <td className="py-5 px-6 text-slate-600">Audible integrado (requiere suscripción de pago).</td>
              <td className="py-5 px-6 text-slate-600">Audiolibros de pago independientes.</td>
              <td className="py-5 px-6 text-slate-600">No disponible.</td>
            </tr>

            {/* Row 6: Precio */}
            <tr>
              <td className="py-5 px-6 font-bold text-slate-900 bg-slate-50/20">Precio</td>
              <td className="py-5 px-6 font-medium text-slate-900 bg-indigo-50/20 border-x border-indigo-100/30">
                100% Gratis
              </td>
              <td className="py-5 px-6 text-slate-600">Gratis (Libros de la tienda son de pago)</td>
              <td className="py-5 px-6 text-slate-600">Gratis (Opción de subir tus archivos de forma gratuita)</td>
              <td className="py-5 px-6 text-slate-600">Gratis con anuncios / Opción premium de pago</td>
            </tr>

            {/* Row 7: Facilidad de Uso */}
            <tr>
              <td className="py-5 px-6 font-bold text-slate-900 bg-slate-50/20">Facilidad de Uso</td>
              <td className="py-5 px-6 font-medium text-slate-900 bg-indigo-50/20 border-x border-indigo-100/30">
                Excelente (Ideal para leer de corrido)
              </td>
              <td className="py-5 px-6 text-slate-600">Regular (La tienda y catálogo abruman)</td>
              <td className="py-5 px-6 text-slate-600">Buena (Navegación directa)</td>
              <td className="py-5 px-6 text-slate-600">Baja (Los anuncios interrumpen la lectura fluida)</td>
            </tr>

            {/* Row 8: Calificación */}

          </tbody>
        </table>
      </div>
    </div>
  );
}
