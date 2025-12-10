'use client';

import React, { useState, useEffect } from 'react';

interface CurrencyConverterProps {
  selectedTheme?: string;
}

interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
}

const CURRENCIES = [
  { code: 'EUR', name: 'Euro' },
  { code: 'MXN', name: 'Peso Mexicano' },
  { code: 'COP', name: 'Peso Colombiano' },
  { code: 'ARS', name: 'Peso Argentino' },
  { code: 'BRL', name: 'Real Brasileño' },
  { code: 'GBP', name: 'Libra Esterlina' },
  { code: 'JPY', name: 'Yen Japonés' },
  { code: 'CAD', name: 'Dólar Canadiense' },
  { code: 'CHF', name: 'Franco Suizo' },
  { code: 'CNY', name: 'Yuan Chino' },
  { code: 'AUD', name: 'Dólar Australiano' },
  { code: 'VES', name: 'Bolívar Venezolano' },

  // Nuevas divisas
  { code: 'CLP', name: 'Peso Chileno' },
  { code: 'PEN', name: 'Sol Peruano' },
  { code: 'UYU', name: 'Peso Uruguayo' },
  { code: 'BOB', name: 'Boliviano' },
  { code: 'PAB', name: 'Balboa Panameño' },
  { code: 'DOP', name: 'Peso Dominicano' },
  { code: 'CRC', name: 'Colón Costarricense' },
  { code: 'GTQ', name: 'Quetzal Guatemalteco' },
  { code: 'HNL', name: 'Lempira Hondureña' },
  { code: 'PYG', name: 'Guaraní Paraguayo' },
  { code: 'INR', name: 'Rupia India' },
  { code: 'RUB', name: 'Rublo Ruso' },
];


function CurrencyConverter({ selectedTheme = 'claro' }: CurrencyConverterProps) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch rates from API
  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        setError(null);

        // Using exchangerate-api.com free tier (no API key required for basic usage)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

        if (!response.ok) {
          throw new Error('Failed to fetch exchange rates');
        }

        const data = await response.json();
        setRates(data.rates);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (err) {
        console.error('Error fetching rates:', err);
        setError('Error al cargar las tasas de cambio');
        setLoading(false);

        // Set fallback rates for demo purposes
        // Set fallback rates for demo purposes
        const fallbackRates: Record<string, number> = {
          EUR: 0.92,
          MXN: 17.13,
          COP: 3791.53,
          ARS: 360.14,
          BRL: 4.97,
          GBP: 0.80,
          JPY: 148.44,
          CAD: 1.36,
          CHF: 0.89,
          CNY: 7.18,
          AUD: 1.50,
          VES: 36.25,

          // Nuevas divisas (valores aproximados solo para modo fallback)
          CLP: 950,
          PEN: 3.7,
          UYU: 39,
          BOB: 6.9,
          PAB: 1,
          DOP: 59,
          CRC: 520,
          GTQ: 7.8,
          HNL: 24.7,
          PYG: 7400,
          INR: 83,
          RUB: 92,
        };

      }
    };

    fetchRates();

    // Refresh rates every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleCurrency = (code: string) => {
    setSelectedCurrencies((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const formatRate = (rate: number, code: string): string => {
    // For currencies like JPY, COP that have large values
    if (['JPY', 'COP', 'ARS', 'VES'].includes(code)) {
      return rate.toFixed(2);
    }
    return rate.toFixed(2);
  };

  const getCurrencySymbol = (code: string): string => {
    const symbols: Record<string, string> = {
      EUR: '€',
      MXN: '$',
      COP: '$',
      ARS: '$',
      BRL: 'R$',
      GBP: '£',
      JPY: '¥',
      CAD: '$',
      CHF: 'Fr',
      CNY: '¥',
      AUD: '$',
      VES: 'Bs',

      // Nuevas divisas
      CLP: '$',
      PEN: 'S/',
      UYU: '$',
      BOB: 'Bs',
      PAB: 'B/.',
      DOP: '$',
      CRC: '₡',
      GTQ: 'Q',
      HNL: 'L',
      PYG: '₲',
      INR: '₹',
      RUB: '₽',
    };
    return symbols[code] || code;
  };


  return (
    <div
      className={`${selectedTheme === 'oscuro' ? 'bg-gray-800 border-gray-600' : 'bg-gray-900 border-gray-700'
        } rounded-xl border p-6 mb-6`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <i className="ri-exchange-dollar-line text-xl"></i>
          Conversión de Divisas (USD Base)
        </h3>
        {lastUpdate && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="px-2 py-1 bg-green-600 text-white rounded-full text-xs font-medium animate-pulse">
              Live
            </span>
            <span>
              {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400">
          <i className="ri-loader-4-line text-3xl animate-spin mb-2"></i>
          <p>Cargando tasas de cambio...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-4 text-yellow-400 text-sm mb-4">
          <i className="ri-error-warning-line mr-1"></i>
          {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="mb-4">
            <p className="text-gray-300 text-sm mb-3">Selecciona las divisas a mostrar:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {CURRENCIES.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => toggleCurrency(currency.code)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedCurrencies.includes(currency.code)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {currency.code}
                </button>
              ))}
            </div>
          </div>

          {selectedCurrencies.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {selectedCurrencies.map((code) => {
                const currency = CURRENCIES.find((c) => c.code === code);
                const rate = rates[code];

                if (!currency || !rate) return null;

                return (
                  <div
                    key={code}
                    className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <span className="font-mono">USD/{code}</span>
                        <span className="px-1.5 py-0.5 bg-green-600 text-white rounded text-[10px] font-medium">
                          Live
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {getCurrencySymbol(code)} {formatRate(rate, code)}
                    </div>
                    <div className="text-xs text-gray-400">{currency.name}</div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedCurrencies.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <i className="ri-information-line text-3xl mb-2"></i>
              <p className="text-sm">Selecciona una o más divisas para ver las tasas de cambio</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CurrencyConverter;
