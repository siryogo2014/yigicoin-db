'use client';

import { useState, useEffect, useCallback } from 'react';
import * as simStorage from '../lib/simStorage';
import { RANK_BONUS } from '../constants/ranks';
import { counterSecondsForRank, type UserRank as EconomyUserRank } from '../lib/economyConfig';

export interface UserRank {
  id: string;
  name: string;
  price: number;
  maxReferrals: number;
  timerDuration: number; // en segundos
  benefits: string[];
  expectedIncome: number; // Nuevo: ingreso esperado por rango
  // NUEVO: Beneficios de publicidad
  monthlyVisits: number;
  adPackages: number;
  // NUEVO: Límite diario de anuncios que puede ver
  dailyAdsLimit: number;
}

export interface SimulationNotification {
  id: number;
  type: 'payment' | 'upgrade' | 'referral' | 'benefit' | 'time' | 'points' | 'lottery' | 'totem';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'yellow';
}

// NUEVO: Interfaces para publicidad y sorteos
export interface UserAd {
  id: string;
  userId: string;
  userName: string;
  userRank: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  createdAt: string;
  viewsUsed: number;
  maxViews: number;
  isActive: boolean;
}

export interface AdView {
  adId: string;
  userId: string;
  viewedAt: string;
  pointsClaimed: boolean;
  nextClaimTime: string;
}

export interface AdPackage {
  id: string;
  visits: number;
  visitsRemaining: number;
  purchasedAt: string;
  consumedBy?: string[];
}

// NUEVO: Interface para tracking de anuncios diarios
export interface DailyAdTracking {
  date: string; // formato YYYY-MM-DD
  adsViewed: number;
  lastResetTime: string;
}

export interface LotteryEntry {
  id: string;
  userId: string;
  lotteryType: 'semanal' | 'mensual';
  entryDate: string;
  isWinner: boolean;
}

export interface Lottery {
  id: string;
  type: 'semanal' | 'mensual';
  prize: number;
  endDate: string;
  participants: number;
  isActive: boolean;
}

export interface TransactionRecord {
  id: number;
  tipo: 'Ingreso' | 'Compra';
  descripcion: string;
  monto: number;
  fecha: string;
  estado: 'Completado' | 'Pendiente';
  rangoOrigen?: string;
}

export interface SimulationState {
  currentRank: string;
  balance: number;
  referralCount: number;
  subReferralCount: number;
  totalNetwork: number;
  notifications: SimulationNotification[];
  unreadCount: number;
  availableTabs: string[];
  totemCount: number;
  hasTimeExtension: boolean;
  themeOptions: string[];
  digitalBooks: string[];
  lotteries: string[];
  transactionHistory: TransactionRecord[];
  // NUEVO: Sistema de puntos y publicidad
  points: number;
  userAds: UserAd[];
  adViews: AdView[];
  lotteryEntries: LotteryEntry[];
  activeLotteries: Lottery[];
  // NUEVO: Paquetes de anuncios comprados
  adPackages: AdPackage[];
  // NUEVO: Sistema de límites diarios de anuncios
  dailyAdTracking: DailyAdTracking;
}

const RANKS: Record<string, UserRank> = {
  registrado: {
    id: 'registrado',
    name: 'Registrado',
    price: 3,
    maxReferrals: 2,
    timerDuration: counterSecondsForRank('registrado'), // 168 segundos para pruebas
    benefits: ['Acceso básico', 'Enlaces de referido', 'Soporte estándar'],
    expectedIncome: 6,
    monthlyVisits: 0,
    adPackages: 0,
    dailyAdsLimit: 0,
  },
  invitado: {
    id: 'invitado',
    name: 'Invitado',
    price: 5,
    maxReferrals: 4,
    timerDuration: counterSecondsForRank('invitado'), // 72 segundos
    benefits: [
      'Acceso a funciones avanzadas',
      'Mayor límite de referidos',
      'Prioridad en soporte',
    ],
    expectedIncome: 20,
    monthlyVisits: 500,
    adPackages: 1,
    dailyAdsLimit: 10,
  },
  miembro: {
    id: 'miembro',
    name: 'Miembro',
    price: 10,
    maxReferrals: 8,
    timerDuration: counterSecondsForRank('miembro'), // 84 segundos
    benefits: [
      'Acceso a estadísticas avanzadas',
      'Mayor visibilidad',
      'Soporte prioritario',
    ],
    expectedIncome: 80,
    monthlyVisits: 500,
    adPackages: 2,
    dailyAdsLimit: 15, // 15 anuncios por día
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    price: 50,
    maxReferrals: 16,
    timerDuration: counterSecondsForRank('vip'), // 96 segundos
    benefits: [
      'Panel de control',
      '1 Tótem de seguridad',
      'Acceso a sorteos VIP',
      'Mayor visibilidad en la plataforma',
    ],
    expectedIncome: 800,
    monthlyVisits: 1500,
    adPackages: 3,
    dailyAdsLimit: 25, // 25 anuncios por día
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 400,
    maxReferrals: 32,
    timerDuration: counterSecondsForRank('premium'), // 120 segundos
    benefits: [
      'Soporte dedicado',
      'Mayor prioridad en la red',
      'Acceso a funciones exclusivas',
    ],
    expectedIncome: 3200,
    monthlyVisits: 3000,
    adPackages: 4,
    dailyAdsLimit: 40, // 40 anuncios por día
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 6000,
    maxReferrals: 64,
    timerDuration: counterSecondsForRank('elite'), // 168 segundos
    benefits: [
      'Acceso completo a todas las funciones',
      'Máxima prioridad',
      'Participación en decisiones clave de la plataforma',
    ],
    expectedIncome: 48000,
    monthlyVisits: 5000,
    adPackages: 5,
    dailyAdsLimit: -1, // Ilimitado
  },
};

// Beneficios adicionales por rango
const BENEFITS_BY_RANK: Record<
  string,
  {
    totems: number;
    themes: string[];
    digitalBooks: string[];
    lotteries: string[];
  }
> = {
  registrado: {
    totems: 0,
    themes: [],
    digitalBooks: [],
    lotteries: [],
  },
  invitado: {
    totems: 0,
    themes: ['oscuro'],
    digitalBooks: [],
    lotteries: ['sorteos'],
  },
  miembro: {
    totems: 0,
    themes: ['oscuro', 'claro'],
    digitalBooks: ['libro_basico.pdf'],
    lotteries: ['sorteos'],
  },
  vip: {
    totems: 1,
    themes: ['oscuro', 'claro', 'neon'],
    digitalBooks: ['libro_vip.pdf'],
    lotteries: ['sorteos', 'loteria'],
  },
  premium: {
    totems: 2,
    themes: ['oscuro', 'claro', 'neon', 'gold'],
    digitalBooks: ['libro_premium.pdf'],
    lotteries: ['sorteos', 'loteria', 'loteria_vip'],
  },
  elite: {
    totems: 3,
    themes: ['oscuro', 'claro', 'neon', 'gold', 'platinum'],
    digitalBooks: ['libro_elite.pdf'],
    lotteries: ['sorteos', 'loteria', 'loteria_vip'],
  },
};

const BASE_TABS = ['oficina', 'ascender', 'referidos', 'promotor', 'ganancias'];

const getBenefitsForRank = (rank: string) => {
  const rankBenefits = BENEFITS_BY_RANK[rank] || BENEFITS_BY_RANK['registrado'];
  return {
    totemCount: rankBenefits.totems,
    themeOptions: rankBenefits.themes,
    digitalBooks: rankBenefits.digitalBooks,
    lotteries: rankBenefits.lotteries,
  };
};

const initializeLotteries = (): Lottery[] => {
  const now = new Date();

  const weeklyLottery: Lottery = {
    id: `weekly_${now.getTime()}`,
    type: 'semanal',
    prize: 50, // Simulado
    endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    participants: 0,
    isActive: true,
  };

  const monthlyLottery: Lottery = {
    id: `monthly_${now.getTime()}`,
    type: 'mensual',
    prize: 200, // Simulado
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    participants: 0,
    isActive: true,
  };

  return [weeklyLottery, monthlyLottery];
};

const generateTransactionHistory = (
  currentRank: string,
  balance: number
): TransactionRecord[] => {
  const transactions: TransactionRecord[] = [];

  if (currentRank === 'registrado') {
    if (balance >= 6) {
      transactions.push({
        id: 1,
        tipo: 'Ingreso',
        descripcion: 'Pago por referido - Usuario 1',
        monto: 3,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'Completado',
        rangoOrigen: 'Invitado',
      });

      transactions.push({
        id: 2,
        tipo: 'Ingreso',
        descripcion: 'Pago por referido - Usuario 2',
        monto: 3,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'Completado',
        rangoOrigen: 'Invitado',
      });
    }
  }

  return transactions.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
};

export const useSimulation = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>({
    currentRank: 'registrado',
    balance: 10000, // Balance inicial: $10,000 USD
    referralCount: 2,
    subReferralCount: 1,
    totalNetwork: 3,
    notifications: [],
    unreadCount: 0,
    availableTabs: BASE_TABS,
    totemCount: 0,
    hasTimeExtension: false,
    themeOptions: [],
    digitalBooks: [],
    lotteries: [],
    transactionHistory: [],
    // NUEVO: Inicializar sistema de puntos
    points: 1000, // Puntos iniciales: 1,000
    userAds: [],
    adViews: [],
    lotteryEntries: [],
    activeLotteries: [],
    // NUEVO: Paquetes de anuncios comprados
    adPackages: [],
    // NUEVO: Inicializar tracking diario de anuncios
    dailyAdTracking: {
      date: new Date().toISOString().split('T')[0],
      adsViewed: 0,
      lastResetTime: new Date().toISOString(),
    },
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadSimulationData();
  }, []);

  const loadSimulationData = useCallback(() => {
    try {
      // CORREGIDO: Usar simStorage para lectura transaccional segura
      const userData = simStorage.read();
      const notifications = JSON.parse(
        localStorage.getItem('simulation_notifications') || '[]'
      );
      // NUEVO: Cargar datos de publicidad y sorteos
      const userAds = JSON.parse(localStorage.getItem('user_ads') || '[]');
      const adViews = JSON.parse(localStorage.getItem('ad_views') || '[]');
      const lotteryEntries = JSON.parse(
        localStorage.getItem('lottery_entries') || '[]'
      );
      const savedLotteries = JSON.parse(
        localStorage.getItem('active_lotteries') || '[]'
      );
      const dailyAdTrackingData = JSON.parse(
        localStorage.getItem('daily_ad_tracking') || 'null'
      );

      // CORREGIDO: Preservar puntos existentes, NUNCA resetear a 0
      // Si no hay datos de usuario, usar estado inicial por defecto
      const currentRank = userData.currentRank || 'registrado';
      const balance =
        userData.balance !== undefined ? userData.balance : 10000; // Balance inicial: $10,000 USD
      const points = userData.points !== undefined ? userData.points : 1000; // Puntos iniciales: 1,000

      // Log opcional para depuración (solo si hay puntos)
      if (
        points > 0 &&
        typeof window !== 'undefined' &&
        (window as any).__simStorageDebug
      ) {
        console.log('[useSimulation] 📊 Puntos cargados:', {
          puntos: points,
          rango: currentRank,
          balance: balance,
        });
      }

      // NUEVO: Verificar y resetear contador diario si es necesario
      const today = new Date().toISOString().split('T')[0];
      let dailyAdTracking: DailyAdTracking;

      if (!dailyAdTrackingData || dailyAdTrackingData.date !== today) {
        // Nuevo día, resetear contador
        dailyAdTracking = {
          date: today,
          adsViewed: 0,
          lastResetTime: new Date().toISOString(),
        };
        localStorage.setItem(
          'daily_ad_tracking',
          JSON.stringify(dailyAdTracking)
        );
      } else {
        dailyAdTracking = dailyAdTrackingData;
      }

      // Normalizar paquetes de anuncios comprados desde userData
      const rawAdPackages = Array.isArray((userData as any).adPackages)
        ? (userData as any).adPackages
        : [];
      const adPackages: AdPackage[] = rawAdPackages.map(
        (pkg: any, index: number) => {
          const visits = typeof pkg.visits === 'number' ? pkg.visits : 0;
          const visitsRemaining =
            typeof pkg.visitsRemaining === 'number'
              ? pkg.visitsRemaining
              : visits;
          return {
            id: pkg.id || `pkg_${index}_${pkg.purchasedAt || Date.now()}`,
            visits,
            visitsRemaining,
            purchasedAt: pkg.purchasedAt || new Date().toISOString(),
            consumedBy: Array.isArray(pkg.consumedBy) ? pkg.consumedBy : [],
          };
        }
      );

      const availableTabs = getAvailableTabsForRank(currentRank);
      const { totemCount, themeOptions, digitalBooks, lotteries } =
        getBenefitsForRank(currentRank);
      const transactionHistory = generateTransactionHistory(
        currentRank,
        balance
      );

      // Inicializar sorteos si no existen
      const activeLotteries =
        savedLotteries.length > 0 ? savedLotteries : initializeLotteries();
      if (savedLotteries.length === 0) {
        localStorage.setItem(
          'active_lotteries',
          JSON.stringify(activeLotteries)
        );
      }

      setSimulationState({
        currentRank,
        balance,
        referralCount: userData.referralCount || 2,
        subReferralCount: userData.subReferralCount || 1,
        totalNetwork: userData.totalNetwork || 3,
        notifications: notifications,
        unreadCount: notifications.filter(
          (n: { read: boolean }) => !n.read
        ).length,
        availableTabs,
        totemCount,
        hasTimeExtension: userData.hasTimeExtension || false,
        themeOptions,
        digitalBooks,
        lotteries,
        transactionHistory,
        // NUEVO: Cargar datos del sistema de puntos
        points,
        userAds,
        adViews,
        lotteryEntries,
        activeLotteries,
        // NUEVO: Cargar paquetes de anuncios comprados
        adPackages,
        // NUEVO: Cargar tracking diario
        dailyAdTracking,
      });
    } catch (error) {
      console.error('Error loading simulation data:', error);
      // En caso de error, mantener estado inicial
      setSimulationState((prev) => ({
        ...prev,
        currentRank: 'registrado',
        balance: 10000,
        points: 1000,
        referralCount: 2,
        transactionHistory: generateTransactionHistory('registrado', 10000),
        activeLotteries: initializeLotteries(),
      }));
    }
  }, []);

  // hooks/useSimulation.ts

  const getAvailableTabsForRank = (rank: string): string[] => {
    const baseTabs = [
      'oficina',
      'ascender',
      'referidos',
      'promotor',
      'explicacion',
      'notificaciones',
      'configuracion',
    ];

    // 🔥 CORREGIDO: Definir correctamente qué tabs adicionales tiene cada rango
    const tabsRegistry: Record<string, string[]> = {
      registrado: baseTabs,
      invitado: [...baseTabs, 'balance', 'niveles', 'beneficios', 'panel', 'publicidad'],
      miembro: [...baseTabs, 'balance', 'niveles', 'beneficios', 'panel', 'publicidad'],
      vip: [...baseTabs, 'balance', 'niveles', 'beneficios', 'panel', 'publicidad'],
      premium: [...baseTabs, 'balance', 'niveles', 'beneficios', 'panel', 'publicidad'],
      elite: [...baseTabs, 'balance', 'niveles', 'beneficios', 'panel', 'publicidad'],
    };

    return tabsRegistry[rank] || tabsRegistry['registrado'];
  };

  const upgradeToRank = useCallback(
    async (newRank: string) => {
      const currentRankData = RANKS[simulationState.currentRank];
      const targetRankData = RANKS[newRank];

      if (!targetRankData || targetRankData.price <= currentRankData.price) {
        return false;
      }

      const userData = simStorage.read();
      const balance = userData.balance ?? simulationState.balance;

      if (balance < targetRankData.price) {
        return false;
      }

      const newBalance = balance - targetRankData.price;

      // 🔥 CORREGIDO: Obtener TODOS los beneficios del nuevo rango
      const { totemCount, themeOptions, digitalBooks, lotteries } =
        getBenefitsForRank(newRank);

      // 🔥 CORREGIDO: Agregar puntos bonus por el nuevo rango
      const currentPoints = userData.points ?? simulationState.points ?? 0;
      const rankBonus = RANK_BONUS[newRank as keyof typeof RANK_BONUS] || 0;
      const newPoints = currentPoints + rankBonus;

      const updatedState: SimulationState = {
        ...simulationState,
        currentRank: newRank,
        balance: newBalance,
        availableTabs: getAvailableTabsForRank(newRank),
        // 🔥 CORREGIDO: Actualizar TODOS los beneficios
        totemCount,
        themeOptions,
        digitalBooks,
        lotteries,
        points: newPoints,
      };

      setSimulationState(updatedState);

      await simStorage.writeMerge({
        currentRank: newRank,
        balance: newBalance,
        points: newPoints,
        totems: totemCount,
      });

      return true;
    },
    [simulationState]
  );

  const markNotificationAsRead = useCallback((id: number) => {
    setSimulationState((prevState) => {
      const updatedNotifications = prevState.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      );

      const unreadCount = updatedNotifications.filter(
        (n) => !n.read
      ).length;

      localStorage.setItem(
        'simulation_notifications',
        JSON.stringify(updatedNotifications)
      );

      return {
        ...prevState,
        notifications: updatedNotifications,
        unreadCount,
      };
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setSimulationState((prevState) => {
      const updatedNotifications = prevState.notifications.map(
        (notification) => ({
          ...notification,
          read: true,
        })
      );

      localStorage.setItem(
        'simulation_notifications',
        JSON.stringify(updatedNotifications)
      );

      return {
        ...prevState,
        notifications: updatedNotifications,
        unreadCount: 0,
      };
    });
  }, []);

  const simulatePaymentSuccess = useCallback(
    async (newRank: string, method: 'paypal' | 'metamask') => {
      const currentRankData = RANKS[simulationState.currentRank];
      const targetRankData = RANKS[newRank];

      if (!targetRankData || targetRankData.price <= currentRankData.price) {
        return false;
      }

      const userData = simStorage.read();
      const balance = userData.balance ?? simulationState.balance ?? 0;
      const referralCount = userData.referralCount ?? simulationState.referralCount ?? 0;
      const subReferralCount =
        userData.subReferralCount ?? simulationState.subReferralCount ?? 0;
      const totalNetwork =
        userData.totalNetwork ?? simulationState.totalNetwork ?? 0;

      const expectedIncome = RANK_BONUS[newRank as keyof typeof RANK_BONUS] || 0;

      const newBalance = balance + expectedIncome;

      const notificationId = Date.now();
      const now = new Date().toISOString();

      const paymentNotification: SimulationNotification = {
        id: notificationId,
        type: 'payment',
        title: 'Pago Recibido',
        message: `Has recibido un pago de $${expectedIncome} por referidos del nivel ${targetRankData.name}`,
        timestamp: now,
        read: false,
        icon: 'ri-money-dollar-circle-line',
        color: 'green',
      };

      const upgradeNotification: SimulationNotification = {
        id: notificationId + 1,
        type: 'upgrade',
        title: 'Ascenso Disponible',
        message: `¡Felicidades! Has ascendido al nivel ${targetRankData.name}`,
        timestamp: now,
        read: false,
        icon: 'ri-arrow-up-line',
        color: 'purple',
      };

      const pointsReward =
        newRank === 'invitado'
          ? 10
          : newRank === 'miembro'
            ? 30
            : newRank === 'vip'
              ? 100
              : newRank === 'premium'
                ? 250
                : newRank === 'elite'
                  ? 400
                  : 0;

      const timeExtensionReward = newRank !== 'registrado';

      let totemReward = 0;
      if (newRank === 'vip') totemReward = 1;
      if (newRank === 'premium') totemReward = 1;
      if (newRank === 'elite') totemReward = 2;

      const updatedPoints =
        (userData.points ?? simulationState.points ?? 0) + pointsReward;

      const updatedNotifications = [
        paymentNotification,
        upgradeNotification,
      ];

      const transactionDescription = `Pago de ascenso de ${currentRankData.name} a ${targetRankData.name}`;
      const paymentRecord: TransactionRecord = {
        id: Date.now(),
        tipo: 'Ingreso',
        descripcion: transactionDescription,
        monto: expectedIncome,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'Completado',
        rangoOrigen: targetRankData.name,
      };

      const updatedTransactionHistory = [
        ...simulationState.transactionHistory,
        paymentRecord,
      ];

      const updatedState: SimulationState = {
        ...simulationState,
        currentRank: newRank,
        balance: newBalance,
        referralCount,
        subReferralCount,
        totalNetwork,
        notifications: [
          ...simulationState.notifications,
          ...updatedNotifications,
        ],
        unreadCount: simulationState.unreadCount + updatedNotifications.length,
        points: updatedPoints,
        hasTimeExtension:
          simulationState.hasTimeExtension || timeExtensionReward,
        totemCount: simulationState.totemCount + totemReward,
        transactionHistory: updatedTransactionHistory,
        availableTabs: getAvailableTabsForRank(newRank),
      };

      setSimulationState(updatedState);

      await simStorage.writeMerge({
        currentRank: newRank,
        balance: newBalance,
        referralCount,
        subReferralCount,
        totalNetwork,
        points: updatedPoints,
        hasTimeExtension:
          simulationState.hasTimeExtension || timeExtensionReward,
        totems: simulationState.totemCount + totemReward,
      });

      localStorage.setItem(
        'simulation_notifications',
        JSON.stringify(updatedState.notifications)
      );
      localStorage.setItem(
        'simulation_transactions',
        JSON.stringify(updatedTransactionHistory)
      );

      return true;
    },
    [simulationState]
  );

  const getCurrentRankData = () => {
    return RANKS[simulationState.currentRank];
  };

  const getNextRankData = () => {
    const rankOrder = ['registrado', 'invitado', 'miembro', 'vip', 'premium', 'elite'];
    const currentRankIndex = rankOrder.indexOf(simulationState.currentRank);
    const nextRank =
      currentRankIndex >= 0 && currentRankIndex < rankOrder.length - 1
        ? rankOrder[currentRankIndex + 1]
        : null;
    return nextRank ? RANKS[nextRank] : null;
  };

  const canUpgrade = () => {
    const nextRankData = getNextRankData();
    if (!nextRankData) return false;
    return simulationState.balance >= nextRankData.price;
  };

  const useTotem = useCallback(async () => {
    if (simulationState.totemCount <= 0) {
      return false;
    }

    const newTotemCount = simulationState.totemCount - 1;

    const now = new Date();
    const notification: SimulationNotification = {
      id: Date.now(),
      type: 'totem',
      title: 'Tótem Consumido',
      message:
        'Has consumido un tótem y tu cuenta ha sido protegida y el temporizador reiniciado.',
      timestamp: now.toISOString(),
      read: false,
      icon: 'ri-shield-line',
      color: 'purple',
    };

    const updatedNotifications = [
      notification,
      ...simulationState.notifications,
    ];

    const updatedState: SimulationState = {
      ...simulationState,
      totemCount: newTotemCount,
      hasTimeExtension: true,
      notifications: updatedNotifications,
      unreadCount: simulationState.unreadCount + 1,
    };

    setSimulationState(updatedState);

    const userData = JSON.parse(
      localStorage.getItem('user_simulation_data') || '{}'
    );
    userData.totems = newTotemCount;
    userData.hasTimeExtension = true;
    localStorage.setItem('user_simulation_data', JSON.stringify(userData));
    localStorage.setItem(
      'simulation_notifications',
      JSON.stringify(updatedNotifications)
    );

    return true;
  }, [simulationState]);

  // NUEVO: Consumir una visita de un anuncio del usuario (rango + paquetes)
  const consumeAdVisit = useCallback(
    async (adId: string) => {
      const userData = simStorage.read();
      const rawAds: UserAd[] = Array.isArray((userData as any).userAds)
        ? (userData as any).userAds
        : simulationState.userAds;

      const ads = [...rawAds];
      const adIndex = ads.findIndex((ad) => ad.id === adId);
      if (adIndex === -1) {
        return false;
      }

      const ad = { ...ads[adIndex] };

      const rawAdPackages = Array.isArray((userData as any).adPackages)
        ? (userData as any).adPackages
        : [];
      let adPackages: AdPackage[] = rawAdPackages.map(
        (pkg: any, index: number) => {
          const visits = typeof pkg.visits === 'number' ? pkg.visits : 0;
          const visitsRemaining =
            typeof pkg.visitsRemaining === 'number'
              ? pkg.visitsRemaining
              : visits;
          return {
            id: pkg.id || `pkg_${index}_${pkg.purchasedAt || Date.now()}`,
            visits,
            visitsRemaining,
            purchasedAt: pkg.purchasedAt || new Date().toISOString(),
            consumedBy: Array.isArray(pkg.consumedBy) ? pkg.consumedBy : [],
          };
        }
      );

      if (ad.viewsUsed < ad.maxViews) {
        ad.viewsUsed += 1;
      } else {
        const pkgIndex = adPackages.findIndex(
          (pkg) => pkg.visitsRemaining > 0
        );
        if (pkgIndex === -1) {
          return false;
        }

        const pkg = { ...adPackages[pkgIndex] };
        pkg.visitsRemaining = Math.max(0, pkg.visitsRemaining - 1);

        if (!pkg.consumedBy) {
          pkg.consumedBy = [ad.id];
        } else if (!pkg.consumedBy.includes(ad.id)) {
          pkg.consumedBy.push(ad.id);
        }

        adPackages[pkgIndex] = pkg;
      }

      ads[adIndex] = ad;

      await simStorage.writeMerge({
        userAds: ads,
        adPackages,
      });

      setSimulationState((prev) => ({
        ...prev,
        userAds: ads,
        adPackages,
      }));

      return true;
    },
    [simulationState.userAds]
  );

  const createUserAd = useCallback(
    (
      adData: Omit<
        UserAd,
        | 'id'
        | 'userId'
        | 'userName'
        | 'userRank'
        | 'createdAt'
        | 'viewsUsed'
        | 'isActive'
      >
    ) => {
      const currentRankData = RANKS[simulationState.currentRank];

      // Considerar paquetes adicionales comprados almacenados en simStorage
      const userData = simStorage.read();
      const extraPackages = Array.isArray((userData as any).adPackages)
        ? (userData as any).adPackages.length
        : 0;
      const basePackages = currentRankData.adPackages || 0;
      const maxAds = basePackages + extraPackages;

      if (simulationState.userAds.length >= maxAds) {
        return false;
      }

      const newAd: UserAd = {
        id: `ad_${Date.now()}`,
        userId: 'current_user',
        userName: 'Usuario Demo',
        userRank: simulationState.currentRank,
        ...adData,
        createdAt: new Date().toISOString(),
        viewsUsed: 0,
        maxViews: currentRankData.monthlyVisits,
        isActive: true,
      };

      const updatedAds = [...simulationState.userAds, newAd];
      const updatedState = { ...simulationState, userAds: updatedAds };

      setSimulationState(updatedState);
      localStorage.setItem('user_ads', JSON.stringify(updatedAds));

      return true;
    },
    [simulationState]
  );

  const claimAdPoints = useCallback(
    async (adId: string) => {
      const now = new Date();
      const userId = 'current_user';
      const today = new Date().toISOString().split('T')[0];

      const currentRankData = RANKS[simulationState.currentRank];
      const dailyLimit = currentRankData.dailyAdsLimit;

      let dailyTracking = simulationState.dailyAdTracking;
      if (dailyTracking.date !== today) {
        dailyTracking = {
          date: today,
          adsViewed: 0,
          lastResetTime: now.toISOString(),
        };
      }

      if (
        dailyLimit !== -1 &&
        dailyTracking.adsViewed >= dailyLimit
      ) {
        console.warn(
          `[useSimulation] ⚠️ Límite diario alcanzado: ${dailyTracking.adsViewed}/${dailyLimit}`
        );
        return false;
      }

      const existingView = simulationState.adViews.find(
        (view) => view.adId === adId && view.userId === userId
      );

      if (existingView && new Date(existingView.nextClaimTime) > now) {
        return false;
      }

      const nextClaimTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const newView: AdView = {
        adId,
        userId,
        viewedAt: now.toISOString(),
        pointsClaimed: true,
        nextClaimTime: nextClaimTime.toISOString(),
      };

      const updatedViews = existingView
        ? simulationState.adViews.map((view) =>
          view.adId === adId && view.userId === userId ? newView : view
        )
        : [...simulationState.adViews, newView];

      const updatedDailyTracking: DailyAdTracking = {
        ...dailyTracking,
        adsViewed: dailyTracking.adsViewed + 1,
      };

      const userData = simStorage.read();
      const basePoints =
        userData.points ?? simulationState.points ?? 0;
      const pointsToAdd = 2;
      const newPoints = basePoints + pointsToAdd;

      if (
        typeof window !== 'undefined' &&
        (window as any).__simStorageDebug
      ) {
        console.log('[useSimulation] 📺 Puntos reclamados de anuncio:', {
          anuncioId: adId,
          puntosBase: basePoints,
          incremento: pointsToAdd,
          puntosFinales: newPoints,
          anunciosVistosHoy: updatedDailyTracking.adsViewed,
          limiteDialo: dailyLimit,
        });
      }

      const updatedState = {
        ...simulationState,
        adViews: updatedViews,
        points: newPoints,
        dailyAdTracking: updatedDailyTracking,
      };

      setSimulationState(updatedState);
      localStorage.setItem('ad_views', JSON.stringify(updatedViews));
      localStorage.setItem(
        'daily_ad_tracking',
        JSON.stringify(updatedDailyTracking)
      );

      await simStorage.writeMerge({ points: newPoints });

      return true;
    },
    [simulationState]
  );

  const enterLottery = useCallback(
    async (type: 'semanal' | 'mensual') => {
      const userId = 'current_user';
      const userData = simStorage.read();
      const currentPoints = userData.points ?? simulationState.points ?? 0;

      const cost = type === 'semanal' ? 200 : 800;

      if (currentPoints < cost) {
        return false;
      }

      const newPoints = currentPoints - cost;

      const newEntry: LotteryEntry = {
        id: `entry_${Date.now()}`,
        userId,
        lotteryType: type,
        entryDate: new Date().toISOString(),
        isWinner: false,
      };

      const updatedEntries = [...simulationState.lotteryEntries, newEntry];
      const updatedState: SimulationState = {
        ...simulationState,
        lotteryEntries: updatedEntries,
        points: newPoints,
      };

      setSimulationState(updatedState);
      localStorage.setItem(
        'lottery_entries',
        JSON.stringify(updatedEntries)
      );

      await simStorage.writeMerge({ points: newPoints });

      return true;
    },
    [simulationState]
  );

  const usePointsForTimeExtension = useCallback(async () => {
    const userData = simStorage.read();
    const currentPoints =
      userData.points ?? simulationState.points ?? 0;

    if (currentPoints < 100) {
      return false;
    }

    const newPoints = currentPoints - 100;

    if (
      typeof window !== 'undefined' &&
      (window as any).__simStorageDebug
    ) {
      console.log(
        '[useSimulation] ⏳ Extensión de tiempo con puntos:',
        {
          puntosBase: currentPoints,
          costo: 100,
          puntosFinales: newPoints,
        }
      );
    }

    const notification: SimulationNotification = {
      id: Date.now(),
      type: 'time',
      title: 'Tiempo Extendido',
      message: 'Tu tiempo de cuenta ha sido renovado a 5 minutos',
      timestamp: new Date().toISOString(),
      read: false,
      icon: 'ri-time-line',
      color: 'blue',
    };

    const updatedNotifications = [
      notification,
      ...simulationState.notifications,
    ];

    const updatedState: SimulationState = {
      ...simulationState,
      points: newPoints,
      hasTimeExtension: true,
      notifications: updatedNotifications,
      unreadCount: simulationState.unreadCount + 1,
    };

    setSimulationState(updatedState);

    await simStorage.writeMerge({
      points: newPoints,
      hasTimeExtension: true,
    });

    localStorage.setItem(
      'simulation_notifications',
      JSON.stringify(updatedNotifications)
    );

    return true;
  }, [simulationState]);

  const usePointsForTimerUpdate = useCallback(async () => {
    const userData = simStorage.read();
    const currentPoints =
      userData.points ?? simulationState.points ?? 0;

    if (currentPoints < 5) {
      return false;
    }

    const newPoints = currentPoints - 5;

    if (
      typeof window !== 'undefined' &&
      (window as any).__simStorageDebug
    ) {
      console.log(
        '[useSimulation] 🔄 Actualización de contador con puntos:',
        {
          puntosBase: currentPoints,
          costo: 5,
          puntosFinales: newPoints,
        }
      );
    }

    const notification: SimulationNotification = {
      id: Date.now(),
      type: 'time',
      title: 'Contador Actualizado',
      message:
        'Has utilizado 5 puntos para actualizar tu contador de tiempo.',
      timestamp: new Date().toISOString(),
      read: false,
      icon: 'ri-time-line',
      color: 'blue',
    };

    const updatedNotifications = [
      notification,
      ...simulationState.notifications,
    ];

    const updatedState: SimulationState = {
      ...simulationState,
      points: newPoints,
      notifications: updatedNotifications,
      unreadCount: simulationState.unreadCount + 1,
    };

    setSimulationState(updatedState);

    await simStorage.writeMerge({
      points: newPoints,
    });

    localStorage.setItem(
      'simulation_notifications',
      JSON.stringify(updatedNotifications)
    );

    return true;
  }, [simulationState]);

  return {
    mounted,
    simulationState,
    upgradeToRank,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    simulatePaymentSuccess,
    getCurrentRankData,
    getNextRankData,
    canUpgrade,
    useTotem,
    // NUEVO: Funciones para publicidad y sorteos
    createUserAd,
    claimAdPoints,
    enterLottery,
    consumeAdVisit,
    // NUEVAS: Funciones para usar puntos
    usePointsForTimeExtension,
    usePointsForTimerUpdate,
    RANKS,
  };
};
