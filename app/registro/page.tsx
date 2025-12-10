'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useReferralLinks } from '../../hooks/useReferralLinks';

// ==== Tipos mínimos para corregir TS ====
interface LinkValidation {
  isValid: boolean;
  referrerId: string | null;
  isLoading: boolean;
  error: string | null;
}

type RegistrationFormData = {
  // Paso 1
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  email: string;
  confirmarEmail: string;
  telefono: string;
  genero: string;

  // Paso 2
  password: string;
  confirmPassword: string;
  pin: string;         // NUEVO
  confirmPin: string;  // NUEVO
  verificationCode: string[];

  // Paso 3
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
  paymentCompleted: boolean;
};

type Errors = {
  [key: string]: string | undefined;
  nombre?: string;
  apellido?: string;
  nombreUsuario?: string;
  email?: string;
  confirmarEmail?: string;
  telefono?: string;
  genero?: string;
  password?: string;
  confirmPassword?: string;
  pin?: string;          // NUEVO
  confirmPin?: string;   // NUEVO
  verificationCode?: string;
  acceptTerms?: string;
  acceptPrivacy?: string;
  payment?: string;
  submit?: string;
};

// Componente interno que usa useSearchParams
function RegistroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [mounted, setMounted] = useState<boolean>(false);
  const [linkValidation, setLinkValidation] = useState<LinkValidation>({
    isValid: true,
    referrerId: 'usuario_demo',
    isLoading: false,
    error: null,
  });

  // Hook de referidos (de momento sigue en modo local, no DB)
  const getCurrentUserId = () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}');
      return userData.id || 'usuario_demo';
    } catch {
      return 'usuario_demo';
    }
  };
  const referralLinks = useReferralLinks(getCurrentUserId());

  const [formData, setFormData] = useState<RegistrationFormData>({
    // Paso 1: Información personal
    nombre: '',
    apellido: '',
    nombreUsuario: '',
    email: '',
    confirmarEmail: '',
    telefono: '',
    genero: '',

    // Paso 2: Verificación de correo
    password: '',
    confirmPassword: '',
    pin: '',          // NUEVO
    confirmPin: '',   // NUEVO
    verificationCode: ['', '', '', '', '', ''],

    // Paso 3: Pago y términos
    acceptTerms: false,
    acceptPrivacy: false,
    acceptMarketing: false,
    paymentCompleted: false,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Errors>({});
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  // Inicialización
  useEffect(() => {
    setMounted(true);
  }, []);

  // Validar enlace de referido (sigue usando hook local por ahora)
  useEffect(() => {
    if (!mounted || !refCode) {
      if (mounted && !refCode) {
        setLinkValidation({
          isValid: true,
          referrerId: 'usuario_demo',
          isLoading: false,
          error: null,
        });

        localStorage.removeItem('user_simulation_data');
        localStorage.removeItem('simulation_notifications');
        localStorage.removeItem('simulation_transactions');
      }
      return;
    }

    setLinkValidation((prev) => ({ ...prev, isLoading: true }));

    try {
      const validation = referralLinks.validateLink(refCode);

      if (!validation.isValid) {
        setLinkValidation({
          isValid: false,
          referrerId: null,
          isLoading: false,
          error: 'El enlace de invitación no es válido o ya ha sido utilizado.',
        });
        return;
      }

      setLinkValidation({
        isValid: true,
        referrerId: validation.referrerId,
        isLoading: false,
        error: null,
      });

      localStorage.removeItem('user_simulation_data');
      localStorage.removeItem('simulation_notifications');
      localStorage.removeItem('simulation_transactions');
    } catch (error) {
      setLinkValidation({
        isValid: false,
        referrerId: null,
        isLoading: false,
        error: 'Error al validar el enlace de invitación.',
      });
    }
  }, [mounted, refCode, referralLinks]);

  // Countdown para reenvío de código
  useEffect(() => {
    if (!mounted || !codeSent) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else {
      setCanResend(true);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mounted, countdown, codeSent]);

  // Acepta inputs y selects
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement | HTMLSelectElement;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...formData.verificationCode];
      newCode[index] = value;
      setFormData((prev) => ({ ...prev, verificationCode: newCode }));

      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !formData.verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Validaciones por paso
  const validateStep = (step: number): boolean => {
    const newErrors: Errors = {};

    if (step === 1) {
      // nombre
      if (!formData.nombre.trim()) {
        newErrors.nombre = 'El nombre es requerido';
      } else if (formData.nombre.trim().length < 2) {
        newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
      }

      // apellido
      if (!formData.apellido.trim()) {
        newErrors.apellido = 'El apellido es requerido';
      } else if (formData.apellido.trim().length < 2) {
        newErrors.apellido = 'El apellido debe tener al menos 2 caracteres';
      }

      // usuario
      if (!formData.nombreUsuario.trim()) {
        newErrors.nombreUsuario = 'El nombre de usuario es requerido';
      } else if (formData.nombreUsuario.trim().length < 3) {
        newErrors.nombreUsuario = 'El nombre de usuario debe tener al menos 3 caracteres';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.nombreUsuario)) {
        newErrors.nombreUsuario = 'Solo se permiten letras, números y guiones bajos';
      }

      // email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim()) {
        newErrors.email = 'El correo electrónico es requerido';
      } else if (!emailRegex.test(formData.email)) {
        newErrors.email = 'El correo electrónico es inválido';
      }

      if (!formData.confirmarEmail.trim()) {
        newErrors.confirmarEmail = 'Confirma tu correo electrónico';
      } else if (formData.email !== formData.confirmarEmail) {
        newErrors.confirmarEmail = 'Los correos electrónicos no coinciden';
      }

      // teléfono
      if (!formData.telefono.trim()) {
        newErrors.telefono = 'El teléfono es requerido';
      } else if (formData.telefono.trim().length < 10) {
        newErrors.telefono = 'El teléfono debe tener al menos 10 caracteres';
      }

      // género
      if (!formData.genero) {
        newErrors.genero = 'El género es requerido';
      }
    }

    if (step === 2) {
      // Validar contraseña
      if (!formData.password) {
        newErrors.password = 'La contraseña es requerida';
      } else if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirma tu contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }

      // Validar PIN
      if (!formData.pin) {
        newErrors.pin = 'Debes crear un PIN de 4 dígitos';
      } else if (!/^\d{4}$/.test(formData.pin)) {
        newErrors.pin = 'El PIN debe ser numérico de 4 dígitos';
      }

      if (!formData.confirmPin) {
        newErrors.confirmPin = 'Debes confirmar tu PIN';
      } else if (formData.pin !== formData.confirmPin) {
        newErrors.confirmPin = 'Los PIN no coinciden';
      }

      // Validar código de verificación (solo si ya se envió)
      if (codeSent && formData.verificationCode.join('').length !== 6) {
        newErrors.verificationCode = 'Ingresa el código completo de 6 dígitos';
      }
    }

    if (step === 3) {
      if (!formData.acceptTerms) newErrors.acceptTerms = 'Debes aceptar los términos y condiciones';
      if (!formData.acceptPrivacy) newErrors.acceptPrivacy = 'Debes aceptar la política de privacidad';
      if (!formData.paymentCompleted) newErrors.payment = 'Debes completar el pago de $3 USD';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => (prev > 1 ? prev - 1 : 1));
  };

  // === NUEVO: enviar código real al backend ===
  const handleSendCode = async () => {
    if (!formData.email) {
      setErrors({ email: 'Ingresa tu correo electrónico' });
      return;
    }

    setIsLoading(true);
    setErrors(prev => ({
      ...prev,
      email: undefined,
      verificationCode: undefined,
    }));

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json().catch(() => ({} as any));
      console.log('[send-code] status', res.status, data);

      if (!res.ok || !data.success) {
        setErrors(prev => ({
          ...prev,
          email: data?.error || 'Error al enviar el código',
        }));
        return;
      }

      // ✅ Código enviado correctamente
      setCodeSent(true);
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      console.error('[send-code] error', err);
      setErrors(prev => ({
        ...prev,
        email: 'Error al enviar el código',
      }));
    } finally {
      setIsLoading(false);
    }
  };



  const handleResendCode = async () => {
    if (!formData.email) {
      setErrors({ email: 'Ingresa tu correo electrónico' });
      return;
    }

    setCanResend(false);
    setCountdown(60);
    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrors({
          email: data?.error || 'Error al reenviar el código',
        });
        return;
      }
    } catch (err) {
      console.error(err);
      setErrors({ verificationCode: 'Error al reenviar el código' });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailCode = async (): Promise<boolean> => {
    const code = formData.verificationCode.join('');

    // Seguridad extra por si acaso
    if (code.length !== 6) {
      setErrors(prev => ({
        ...prev,
        verificationCode: 'Ingresa el código completo de 6 dígitos',
      }));
      return false;
    }

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrors(prev => ({
          ...prev,
          verificationCode:
            data?.error || 'El código es incorrecto o ha expirado',
        }));
        return false;
      }

      // Código correcto → limpiamos error
      setErrors(prev => ({
        ...prev,
        verificationCode: undefined,
      }));

      return true;
    } catch (err) {
      console.error(err);
      setErrors(prev => ({
        ...prev,
        verificationCode: 'Error al verificar el código',
      }));
      return false;
    }
  };


  const handleNext = async () => {
    console.log('[handleNext] paso actual:', currentStep);

    // PASO 1 → solo validamos y avanzamos
    if (currentStep === 1) {
      if (!validateStep(1)) return;
      setCurrentStep(2);
      return;
    }

    // PASO 2 → validar campos y verificar código en el backend
    if (currentStep === 2) {
      const okStep = validateStep(2);
      if (!okStep) {
        console.log('[handleNext] validateStep(2) falló');
        return;
      }

      if (!codeSent) {
        setErrors(prev => ({
          ...prev,
          verificationCode: 'Primero envía el código a tu correo',
        }));
        return;
      }

      const code = formData.verificationCode.join('').trim();
      console.log('[handleNext] código introducido:', code);

      if (code.length !== 6) {
        setErrors(prev => ({
          ...prev,
          verificationCode: 'Ingresa el código completo de 6 dígitos',
        }));
        return;
      }

      setIsLoading(true);
      setErrors(prev => ({ ...prev, verificationCode: undefined }));

      try {
        const res = await fetch('/api/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            code,
          }),
        });

        const data = await res.json().catch(() => ({} as any));
        console.log('[verify-code] status', res.status, data);

        if (!res.ok || !data.success) {
          setErrors(prev => ({
            ...prev,
            verificationCode: data.error || 'Código inválido o expirado',
          }));
          setIsLoading(false);
          return;
        }

        // ✅ Código correcto → pasamos al paso 3
        setCurrentStep(3);
      } catch (err) {
        console.error('[verify-code] error', err);
        setErrors(prev => ({
          ...prev,
          verificationCode: 'Error al verificar el código',
        }));
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // Otros pasos (por si en el futuro hay más)
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };


  // === NUEVO: pago con endpoint real de pago simulado ===
  const handlePayPalPayment = async () => {
    if (!formData.email) {
      setErrors((prev) => ({
        ...prev,
        payment: 'Debes ingresar un correo antes de pagar',
      }));
      return;
    }

    setIsLoading(true);
    setErrors((prev) => ({ ...prev, payment: '' }));

    try {
      const res = await fetch('/api/payments/registration-simulated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          payment: data.error || 'Error al procesar el pago',
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        paymentCompleted: true,
      }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        payment: 'Error al procesar el pago',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // === NUEVO: submit final -> crear usuario REAL en Neon y mandar al login ===
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    setIsLoading(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.nombre,
          lastName: formData.apellido,
          username: formData.nombreUsuario,
          email: formData.email,
          phone: formData.telefono,
          gender: formData.genero,
          password: formData.password,
          pin: formData.pin,
          referralCode: refCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          submit: data.error || 'Error al crear la cuenta',
        }));
        return;
      }

      alert('Cuenta creada con éxito. Ahora puedes iniciar sesión.');
      router.push('/login');
    } catch {
      setErrors((prev) => ({
        ...prev,
        submit:
          'Error al crear la cuenta. Por favor, verifica todos los datos e intenta nuevamente.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Información Personal
            </h3>

            {refCode ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <i className="ri-check-line text-green-600"></i>
                  <span className="text-sm font-medium text-green-800">
                    Enlace de invitación válido
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Fuiste invitado por el usuario: {linkValidation.referrerId}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <i className="ri-information-line text-blue-600"></i>
                  <span className="text-sm font-medium text-blue-800">
                    Modo de laboratorio
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Este entorno está conectado a Neon/Prisma, pero todavía no usa
                  el árbol real de referidos.
                </p>
              </div>
            )}

            {/* ... resto del paso 1 igual que antes ... */}
            {/* Copio igual que tu versión anterior, solo limado donde hacía falta */}
            {/* Nombre y apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.nombre ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Tu nombre"
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.apellido ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Tu apellido"
                />
                {errors.apellido && <p className="text-red-500 text-xs mt-1">{errors.apellido}</p>}
              </div>
            </div>

            {/* Usuario */}
            <div>
              <label
                htmlFor="nombreUsuario"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre de Usuario *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-user-line text-gray-400"></i>
                </div>
                <input
                  type="text"
                  id="nombreUsuario"
                  name="nombreUsuario"
                  value={formData.nombreUsuario}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.nombreUsuario ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="usuario123"
                />
              </div>
              {errors.nombreUsuario && (
                <p className="text-red-500 text-xs mt-1">{errors.nombreUsuario}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-mail-line text-gray-400"></i>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Confirmar email */}
            <div>
              <label
                htmlFor="confirmarEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirmar Correo Electrónico *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-mail-check-line text-gray-400"></i>
                </div>
                <input
                  type="email"
                  id="confirmarEmail"
                  name="confirmarEmail"
                  value={formData.confirmarEmail}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.confirmarEmail ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Confirma tu correo"
                />
              </div>
              {errors.confirmarEmail && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmarEmail}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="telefono" className="block text_sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-phone-line text-gray-400"></i>
                </div>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.telefono ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
            </div>

            {/* Género */}
            <div>
              <label htmlFor="genero" className="block text-sm font-medium text-gray-700 mb-1">
                Género *
              </label>
              <select
                id="genero"
                name="genero"
                value={formData.genero}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8 ${errors.genero ? 'border-red-300' : 'border-gray-300'
                  }`}
              >
                <option value="">Selecciona tu género</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
                <option value="no_especificar">Prefiero no especificar</option>
              </select>
              {errors.genero && <p className="text-red-500 text-xs mt-1">{errors.genero}</p>}
            </div>
          </div>
        );

      case 2:
        // Mantuve tu UI, sólo cambié handlers
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Verificación de Correo
            </h3>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-lock-line text-gray-400"></i>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                >
                  <i
                    className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'
                      } text-gray-400`}
                  />
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <i className="ri-lock-line text-gray-400"></i>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Repite tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                >
                  <i
                    className={`${showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'
                      } text-gray-400`}
                  />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* PIN de 4 dígitos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
                  PIN personal (4 dígitos) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <i className="ri-key-line text-gray-400"></i>
                  </div>
                  <input
                    type="password"
                    id="pin"
                    name="pin"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d*"
                    value={formData.pin}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                      errors.pin ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="••••"
                  />
                </div>
                {errors.pin && <p className="text-red-500 text-xs mt-1">{errors.pin}</p>}
              </div>

              <div>
                <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar PIN *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <i className="ri-key-line text-gray-400"></i>
                  </div>
                  <input
                    type="password"
                    id="confirmPin"
                    name="confirmPin"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d*"
                    value={formData.confirmPin}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                      errors.confirmPin ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="••••"
                  />
                </div>
                {errors.confirmPin && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPin}</p>
                )}
              </div>
            </div>

            {/* Bloque verificación */}
            <div className="border-t pt-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-mail-line text-2xl text-blue-600"></i>
                </div>
                <h4 className="font-medium text-gray-800 mb-2">Verificar tu correo</h4>
                <p className="text-sm text-gray-600">
                  Necesitamos verificar tu dirección de correo electrónico
                </p>
              </div>

              {!codeSent ? (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors whitespace-nowrap ${isLoading
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Enviando código...
                    </div>
                  ) : (
                    'Enviar Código'
                  )}
                </button>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Código enviado a: <span className="font-medium">{formData.email}</span>
                  </p>

                  <div className="flex justify-center space-x-3 mb-4">
                    {formData.verificationCode.map((digit, index) => (
                      <input
                        key={index}
                        id={`code-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-10 h-10 text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
                      />
                    ))}
                  </div>

                  <div className="text-center">
                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm cursor-pointer"
                      >
                        Reenviar código
                      </button>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Reenviar código en {countdown}s
                      </p>
                    )}
                  </div>
                </div>
              )}

              {errors.verificationCode && (
                <p className="text-red-500 text-xs mt-2 text-center">
                  {errors.verificationCode}
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        // Tu UI del paso 3, sólo cambié el handler de pago y el submit final
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pago y Términos</h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-800">Tarifa de Registro</h4>
                  <p className="text-sm text-blue-600">
                    Pago único para activar tu cuenta
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-800">$3.00</span>
                  <p className="text-sm text-blue-600">USD</p>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                  Acepto los{' '}
                  <Link href="/terminos" className="text-blue-600 hover:text-blue-800">
                    términos y condiciones
                  </Link>{' '}
                  de uso de YigiCoin incluyendo beneficios por ascenso de nivel, cláusulas de
                  exoneración por hackeos, robos de datos y políticas de reembolsos *
                </label>
              </div>
              {errors.acceptTerms && (
                <p className="text-red-500 text-xs ml-7">{errors.acceptTerms}</p>
              )}

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="acceptPrivacy"
                  name="acceptPrivacy"
                  checked={formData.acceptPrivacy}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="acceptPrivacy" className="text-sm text-gray-700">
                  Acepto la{' '}
                  <Link href="/privacidad" className="text-blue-600 hover:text-blue-800">
                    política de privacidad
                  </Link>{' '}
                  y el tratamiento de mis datos personales *
                </label>
              </div>
              {errors.acceptPrivacy && (
                <p className="text-red-500 text-xs ml-7">{errors.acceptPrivacy}</p>
              )}

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="acceptMarketing"
                  name="acceptMarketing"
                  checked={formData.acceptMarketing}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="acceptMarketing" className="text-sm text-gray-700">
                  Acepto recibir comunicaciones promocionales y actualizaciones de YigiCoin *
                </label>
              </div>
            </div>

            {/* Pago */}
            <div className="border-t pt-6">
              <div className="text-center mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Procesar Pago</h4>
                <p className="text-sm text-gray-600">
                  Completa el pago de $3 USD para activar tu cuenta
                </p>
              </div>

              {!formData.paymentCompleted ? (
                <button
                  type="button"
                  onClick={handlePayPalPayment}
                  disabled={
                    !formData.acceptTerms ||
                    !formData.acceptPrivacy ||
                    !formData.acceptMarketing ||
                    isLoading
                  }
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors whitespace-nowrap ${!formData.acceptTerms ||
                    !formData.acceptPrivacy ||
                    !formData.acceptMarketing ||
                    isLoading
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer'
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Procesando pago...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <i className="ri-paypal-line text-xl mr-2"></i>
                      Pagar con PayPal (SIMULACIÓN)
                    </div>
                  )}
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="ri-check-line text-xl text-white"></i>
                  </div>
                  <h4 className="font-medium text-green-800 mb-1">¡Pago Completado!</h4>
                  <p className="text-sm text-green-600">
                    Tu pago de $3 USD ha sido procesado exitosamente
                  </p>
                </div>
              )}

              {errors.payment && (
                <p className="text-red-500 text-xs mt-2 text-center">{errors.payment}</p>
              )}
            </div>

            {/* Resumen */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-gray-800 mb-2">Resumen de tu cuenta:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Nombre:</strong> {formData.nombre} {formData.apellido}
                </p>
                <p>
                  <strong>Usuario:</strong> {formData.nombreUsuario}
                </p>
                <p>
                  <strong>Email:</strong> {formData.email}
                </p>
                <p>
                  <strong>Teléfono:</strong> {formData.telefono}
                </p>
                <p>
                  <strong>Género:</strong> {formData.genero}
                </p>
                <p>
                  <strong>Pago:</strong>{' '}
                  {formData.paymentCompleted ? '✅ Completado' : '❌ Pendiente'}
                </p>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('https://readdy.ai/api/search-image?query=modern%20digital%20technology%20background%20with%20blue%20and%20purple%20gradient%20colors%2C%20futuristic%20design%20elements%2C%20cryptocurrency%20theme%2C%20clean%20minimalist%20style%2C%20high%20tech%20atmosphere%2C%20professional%20business%20look&width=1920&height=1080&seq=registro_bg&orientation=landscape')`,
      }}
    >
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="max-w-lg w-full relative z-10">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold font-['Pacifico']">YC</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Únete a YigiCoin</h1>
          <p className="text-gray-200">Crea tu cuenta y comienza tu crecimiento</p>
        </div>

        {/* Indicador de progreso */}
        <div className="mb-8">
          <div className="flex items-center justify_between mb-2">
            <span className="text-sm font-medium text-gray-200">Paso {currentStep} de 3</span>
            <span className="text-sm text-gray-300">
              {Math.round((currentStep / 3) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {/* Botones de navegación */}
            <div className="flex justify-between mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Anterior
                </button>
              )}

              <div className="flex-1"></div>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || !formData.paymentCompleted}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${isLoading || !formData.paymentCompleted
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 cursor-pointer'
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creando cuenta...
                    </div>
                  ) : (
                    'Crear Cuenta'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Componente principal con Suspense
export default function RegistroPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <RegistroContent />
    </Suspense>
  );
}
