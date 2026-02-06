import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { Link2, Sparkles, ShoppingBag } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section
        className="relative h-[560px] bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1727515546577-f7d82a47b51d?w=1920&h=1080&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-80 text-center gap-6">
          <h1 className="font-playfair text-[56px] font-bold text-white">
            OutfitBase
          </h1>
          <p className="text-[24px] text-white font-inter">
            Tu armario, analizado por IA
          </p>
          <p className="text-[17px] text-white/85 font-inter max-w-[600px] leading-relaxed">
            Importa tus tableros de Pinterest y descubre qué prendas componen
            tus outfits favoritos. Nuestra inteligencia artificial identifica
            cada prenda y te ayuda a encontrar productos similares.
          </p>
          <Link
            href={ROUTES.registro}
            className="mt-2 bg-accent-red hover:bg-accent-red-dark text-white font-semibold text-[15px] tracking-[1.5px] px-12 py-[18px] rounded-lg transition-colors"
          >
            COMENZAR AHORA
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-[120px]">
        <div className="flex flex-col items-center gap-12">
          <h2 className="font-playfair text-[36px] font-bold text-text-primary text-center">
            ¿Cómo funciona?
          </h2>
          <div className="flex gap-12 w-full">
            {[
              {
                icon: Link2,
                title: "Importa tu tablero",
                desc: "Pega la URL de tu tablero de Pinterest y nosotros hacemos el resto.",
              },
              {
                icon: Sparkles,
                title: "Análisis con IA",
                desc: "Nuestra IA identifica cada prenda: tipo, color, material, estilo y más.",
              },
              {
                icon: ShoppingBag,
                title: "Encuentra productos",
                desc: "Busca prendas similares en tiendas online y arma tu look perfecto.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="flex-1 flex flex-col items-center text-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-accent-red-light flex items-center justify-center">
                  <feat.icon className="w-7 h-7 text-accent-red" />
                </div>
                <h3 className="text-[18px] font-semibold text-text-primary">
                  {feat.title}
                </h3>
                <p className="text-[14px] text-text-secondary leading-relaxed max-w-[280px]">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#F9FAFB] py-12 px-[120px]">
        <div className="flex flex-col items-center gap-6">
          <h2 className="font-playfair text-[32px] font-bold text-text-primary text-center">
            ¿Lista para descubrir tu estilo?
          </h2>
          <p className="text-[16px] text-text-secondary text-center">
            Únete gratis y empieza a analizar tus tableros de Pinterest hoy
            mismo.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={ROUTES.registro}
              className="bg-accent-red hover:bg-accent-red-dark text-white font-semibold text-[14px] tracking-[1.5px] px-10 py-4 rounded-lg transition-colors"
            >
              CREAR CUENTA GRATIS
            </Link>
            <Link
              href={ROUTES.login}
              className="text-[14px] text-text-secondary hover:text-text-primary transition-colors"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] px-[120px] py-6 flex items-center justify-between">
        <span className="font-playfair text-[18px] font-bold text-white">
          OutfitBase
        </span>
        <span className="text-[13px] text-white/60">
          © 2025 OutfitBase. Todos los derechos reservados.
        </span>
      </footer>
    </div>
  );
}
