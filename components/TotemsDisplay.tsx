'use client';

import React, { useState, useEffect } from 'react';

interface TotemsDisplayProps {
  totems?: number;
  selectedTheme?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

/**
 * TotemsDisplay Component
 * Displays user's totem count with visual indicators
 * - Shows alert style when totems = 0
 * - Animates when totem is used
 */
function TotemsDisplay({
  totems = 0,
  selectedTheme = 'claro',
  showLabel = true,
  size = 'md',
  className = '',
  animate = false,
}: TotemsDisplayProps) {
  const [userTotems, setUserTotems] = useState(totems);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Load totems from localStorage if not provided
    if (totems === undefined || totems === 0) {
      loadUserTotems();
      const interval = setInterval(loadUserTotems, 2000);
      return () => clearInterval(interval);
    } else {
      setUserTotems(totems);
    }
  }, [totems]);

  useEffect(() => {
    if (animate) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  const loadUserTotems = () => {
    const userData = JSON.parse(localStorage.getItem('user_simulation_data') || '{}');
    setUserTotems(userData.totems || 0);
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 'text-sm',
      text: 'text-xs',
      padding: 'px-2 py-1',
    },
    md: {
      icon: 'text-base',
      text: 'text-sm',
      padding: 'px-3 py-1',
    },
    lg: {
      icon: 'text-lg',
      text: 'text-base',
      padding: 'px-4 py-2',
    },
  };

  const config = sizeConfig[size];

  // Alert style when no totems
  const isAlert = userTotems === 0;

  const baseClasses = `${selectedTheme === 'oscuro' ? 'bg-gray-700 border-gray-600' : isAlert ? 'bg-red-50 border-red-300' : 'bg-purple-50 border-purple-200'} border rounded-lg ${config.padding} ${className}`;

  const iconClasses = `ri-shield-line ${config.icon} ${isAlert ? 'text-red-600' : 'text-purple-600'}`;

  const textClasses = `${config.text} font-bold ${isAlert ? 'text-red-600' : 'text-purple-600'}`;

  return (
    <div
      className={`${baseClasses} ${isAnimating ? 'animate-totem-glow' : ''} transition-all duration-300`}
      title={`Tótems: ${userTotems} - ${isAlert ? 'Sin protección! Compra tótems para evitar suspensión.' : 'Protección activa contra expiración del contador'}`}
    >
      <div className="flex items-center space-x-2">
        <i className={iconClasses}></i>
        <div className="text-center">
          {showLabel && (
            <p
              className={`text-xs font-medium ${selectedTheme === 'oscuro' ? 'text-gray-300' : isAlert ? 'text-red-500' : 'text-gray-600'}`}
            >
              Tótems
            </p>
          )}
          <p className={textClasses}>
            {userTotems}
            {isAlert && <i className="ri-alert-line ml-1"></i>}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TotemsDisplay;
