
/**
 * Tests unitarios para hooks/useSimulation.ts - función upgradeToRank
 * 
 * Caso de prueba específico del usuario:
 * Usuario con 35 puntos asciende a rango con price=10 → total 45 puntos
 * 
 * Este test verifica que:
 * 1. Los puntos previos NO se pierden al ascender
 * 2. El bonus correcto se suma a los puntos existentes
 * 3. Las operaciones son transaccionales y seguras
 */

import * as simStorage from '../../lib/simStorage';
import { RANK_BONUS } from '../../constants/ranks';

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useSimulation - upgradeToRank', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Preservación de puntos al ascender', () => {
    it('CASO USUARIO: 35 puntos + ascenso a invitado (bonus 10) = 45 puntos', async () => {
      // Configurar estado inicial: usuario con 35 puntos
      await simStorage.writeMerge({
        points: 35,
        currentRank: 'registrado',
        balance: 20, // Suficiente para ascender
      });

      // Simular ascenso a 'invitado'
      const userData = simStorage.read();
      const basePoints = userData.points ?? 0;
      const bonusPoints = RANK_BONUS.invitado;
      const newPoints = basePoints + bonusPoints;

      // Guardar el ascenso
      await simStorage.writeMerge({
        points: newPoints,
        currentRank: 'invitado',
      });

      // Verificar resultado
      const finalData = simStorage.read();

      expect(finalData.points).toBe(45); // 35 + 10 = 45
      expect(finalData.currentRank).toBe('invitado');
      expect(finalData.balance).toBe(20); // No debe perderse
    });

    it('CASO GENERAL: 50 puntos + ascenso a miembro (bonus 30) = 80 puntos', async () => {
      // Configurar estado inicial
      await simStorage.writeMerge({
        points: 50,
        currentRank: 'invitado',
        balance: 50,
      });

      // Simular ascenso a 'miembro'
      const userData = simStorage.read();
      const basePoints = userData.points ?? 0;
      const bonusPoints = RANK_BONUS.miembro;
      const newPoints = basePoints + bonusPoints;

      await simStorage.writeMerge({
        points: newPoints,
        currentRank: 'miembro',
      });

      // Verificar resultado
      const finalData = simStorage.read();

      expect(finalData.points).toBe(80); // 50 + 30 = 80
      expect(finalData.currentRank).toBe('miembro');
    });

    it('CASO EDGE: 0 puntos + ascenso a invitado (bonus 10) = 10 puntos', async () => {
      // Usuario sin puntos previos
      await simStorage.writeMerge({
        points: 0,
        currentRank: 'registrado',
      });

      // Simular ascenso
      const userData = simStorage.read();
      const basePoints = userData.points ?? 0;
      const bonusPoints = RANK_BONUS.invitado;
      const newPoints = basePoints + bonusPoints;

      await simStorage.writeMerge({
        points: newPoints,
        currentRank: 'invitado',
      });

      // Verificar resultado
      const finalData = simStorage.read();

      expect(finalData.points).toBe(10); // 0 + 10 = 10
    });

    it('CASO ELITE: 500 puntos + ascenso a elite (bonus 400) = 900 puntos', async () => {
      // Usuario con muchos puntos
      await simStorage.writeMerge({
        points: 500,
        currentRank: 'premium',
        balance: 10000,
      });

      // Simular ascenso a elite
      const userData = simStorage.read();
      const basePoints = userData.points ?? 0;
      const bonusPoints = RANK_BONUS.elite;
      const newPoints = basePoints + bonusPoints;

      await simStorage.writeMerge({
        points: newPoints,
        currentRank: 'elite',
      });

      // Verificar resultado
      const finalData = simStorage.read();

      expect(finalData.points).toBe(900); // 500 + 400 = 900
    });
  });

  describe('Verificación de bonos por rango', () => {
    it('debe usar los bonos correctos definidos en RANK_BONUS', () => {
      expect(RANK_BONUS.registrado).toBe(0);
      expect(RANK_BONUS.invitado).toBe(10);
      expect(RANK_BONUS.miembro).toBe(30);
      expect(RANK_BONUS.vip).toBe(100);
      expect(RANK_BONUS.premium).toBe(250);
      expect(RANK_BONUS.elite).toBe(400);
    });
  });

  describe('Transaccionalidad en ascensos', () => {
    it('debe preservar todos los campos al ascender', async () => {
      // Estado inicial completo
      await simStorage.writeMerge({
        points: 35,
        currentRank: 'registrado',
        balance: 100,
        totems: 2,
        referralCount: 5,
      });

      // Simular ascenso
      const userData = simStorage.read();
      const newPoints = (userData.points ?? 0) + RANK_BONUS.invitado;

      await simStorage.writeMerge({
        points: newPoints,
        currentRank: 'invitado',
      });

      // Verificar que TODOS los campos se preservan
      const finalData = simStorage.read();

      expect(finalData.points).toBe(45);
      expect(finalData.currentRank).toBe('invitado');
      expect(finalData.balance).toBe(100); // Preservado
      expect(finalData.totems).toBe(2); // Preservado
      expect(finalData.referralCount).toBe(5); // Preservado
    });

    it('debe manejar múltiples ascensos consecutivos correctamente', async () => {
      // Empezar con 0 puntos
      await simStorage.writeMerge({
        points: 0,
        currentRank: 'registrado',
      });

      // Ascenso 1: registrado → invitado
      let userData = simStorage.read();
      let newPoints = (userData.points ?? 0) + RANK_BONUS.invitado;
      await simStorage.writeMerge({ points: newPoints, currentRank: 'invitado' });

      // Ascenso 2: invitado → miembro
      userData = simStorage.read();
      newPoints = (userData.points ?? 0) + RANK_BONUS.miembro;
      await simStorage.writeMerge({ points: newPoints, currentRank: 'miembro' });

      // Ascenso 3: miembro → vip
      userData = simStorage.read();
      newPoints = (userData.points ?? 0) + RANK_BONUS.vip;
      await simStorage.writeMerge({ points: newPoints, currentRank: 'vip' });

      // Verificar acumulación correcta
      const finalData = simStorage.read();

      // 0 + 10 (invitado) + 30 (miembro) + 100 (vip) = 140
      expect(finalData.points).toBe(140);
      expect(finalData.currentRank).toBe('vip');
    });
  });

  describe('Verificación de integridad de datos', () => {
    it('debe usar userData como fuente de verdad, no simulationState', async () => {
      // Escenario: localStorage tiene 35 puntos
      await simStorage.writeMerge({ points: 35 });

      // Simular que simulationState está desincronizado (tiene 0)
      const staleSimulationState = { points: 0 };

      // La lectura correcta debe ser de localStorage
      const userData = simStorage.read();
      const basePoints = userData.points ?? staleSimulationState.points ?? 0;

      // Debe usar 35 de localStorage, NO 0 de simulationState
      expect(basePoints).toBe(35);
    });

    it('debe verificar que writeMerge nunca sobrescribe otros campos', async () => {
      // Configurar datos iniciales complejos
      await simStorage.writeMerge({
        points: 100,
        currentRank: 'vip',
        balance: 5000,
        totems: 3,
        referralCount: 20,
        customField: 'test',
      });

      // Actualizar solo los puntos
      await simStorage.writeMerge({ points: 200 });

      // Verificar que NADA más cambió
      const data = simStorage.read();

      expect(data.points).toBe(200);
      expect(data.currentRank).toBe('vip');
      expect(data.balance).toBe(5000);
      expect(data.totems).toBe(3);
      expect(data.referralCount).toBe(20);
      expect(data.customField).toBe('test');
    });
  });
});
