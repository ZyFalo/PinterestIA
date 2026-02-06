"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!terms) {
      setError("Debes aceptar los términos y condiciones");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      router.push(ROUTES.inicio);
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e.detail || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Image */}
      <div
        className="w-1/2 h-screen relative bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1743664611439-6ad18af1a849?w=1200&h=1800&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-4 px-20">
          <h1 className="font-playfair text-[48px] font-bold text-white text-center">
            OutfitBase
          </h1>
          <p className="text-[18px] text-white/85 text-center">
            Tu armario, analizado por IA
          </p>
        </div>
      </div>

      {/* Right Form */}
      <div className="w-1/2 h-screen flex items-center justify-center px-[120px] py-10">
        <div className="w-full max-w-[480px] bg-white rounded-2xl border border-[#F0F0F0] p-12 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="font-playfair text-[28px] font-bold text-text-primary">
              Crear cuenta
            </h2>
            <p className="text-[15px] text-text-secondary mt-2">
              Descubre tu estilo perfecto
            </p>
          </div>

          {error && (
            <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-4 py-3 text-center">
              {error}
            </p>
          )}

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">
                Nombre completo
              </label>
              <input
                type="text"
                placeholder="María García"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg border border-border-default text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">
                Email
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg border border-border-default text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-lg border border-border-default text-[15px] text-text-primary outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px] text-text-tertiary" />
                  ) : (
                    <Eye className="w-[18px] h-[18px] text-text-tertiary" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg border border-border-default text-[15px] text-text-primary outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red transition-colors"
              />
            </div>

            {/* Terms */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="w-4 h-4 rounded border-border-default text-accent-red focus:ring-accent-red"
              />
              <span className="text-[13px] text-text-secondary">
                Acepto los términos y condiciones
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4">
            <button
              onClick={handleSubmit}
              disabled={loading || !name || !email || !password || !confirmPassword}
              className="w-full bg-accent-red hover:bg-accent-red-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[14px] tracking-[1.5px] py-4 rounded-lg transition-colors"
            >
              {loading ? "CARGANDO..." : "CREAR CUENTA"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border-default" />
              <span className="text-[12px] text-text-tertiary">o</span>
              <div className="flex-1 h-px bg-border-default" />
            </div>

            <button className="w-full flex items-center justify-center gap-2 border border-border-default py-3.5 rounded-lg text-[14px] text-text-primary hover:bg-bg-muted transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </button>

            <p className="text-center text-[14px] text-text-secondary">
              ¿Ya tienes cuenta?{" "}
              <Link href={ROUTES.login} className="text-accent-red hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
