'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    pin: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!formData.email || !formData.password || !formData.pin) {
        setError('Debes ingresar correo, contraseña y PIN');
        setIsLoading(false);
        return;
      }

      if (!/^\d{4}$/.test(formData.pin)) {
        setError('El PIN debe ser de 4 dígitos numéricos');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          pin: formData.pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        localStorage.setItem('user_simulation_data', JSON.stringify(data.user));
      }

      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('https://static.readdy.ai/image/9b224c7a8d8b0a0eae81859cd336f4cd41635f/ebaf276b4f400c457fd43c320cfe98d3.jfif')`,
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/30">
            <span className="text-white text-2xl font-bold font-['Pacifico']">YC</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bienvenido a YigiCoin</h1>
          <p className="text-gray-200">Inicia sesión para acceder a tu cuenta</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-mail-line text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                  placeholder="usuario@ejemplo.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-lock-line text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                >
                  <i
                    className={
                      showPassword ? 'ri-eye-off-line text-gray-400' : 'ri-eye-line text-gray-400'
                    }
                  />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                PIN personal (4 dígitos)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-key-line text-gray-400" />
                </div>
                <input
                  type="password"
                  id="pin"
                  name="pin"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="\d*"
                  value={formData.pin}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                  placeholder="••••"
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm flex items-center justify-center transition-colors ${
                isLoading
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 cursor-pointer'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                'Entrar'
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <a
                href="/recuperar-password"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </form>

          <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <i className="ri-shield-check-line text-green-500" />
              <span className="text-sm font-medium text-gray-700">
                Seguridad reforzada
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Tu cuenta requiere correo, contraseña y un PIN personal de 4 dígitos para acceder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
