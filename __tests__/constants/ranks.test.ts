
/**
 * Tests unitarios para constants/ranks.ts
 * 
 * Verifican que los bonos de puntos por rango estén correctamente definidos
 */

import {
  RANK_BONUS,
  getRankBonus,
  getRankName,
  getRankIndex,
  isRankHigher,
  getNextRank,
  getTotalBonusUpToRank,
  type RankId,
} from '../../constants/ranks';

describe('constants/ranks', () => {
  describe('RANK_BONUS', () => {
    it('debe tener los bonos correctos para cada rango', () => {
      expect(RANK_BONUS.registrado).toBe(0);
      expect(RANK_BONUS.invitado).toBe(10);
      expect(RANK_BONUS.miembro).toBe(30);
      expect(RANK_BONUS.vip).toBe(100);
      expect(RANK_BONUS.premium).toBe(250);
      expect(RANK_BONUS.elite).toBe(400);
    });
  });

  describe('getRankBonus()', () => {
    it('debe retornar el bonus correcto para cada rango', () => {
      expect(getRankBonus('registrado')).toBe(0);
      expect(getRankBonus('invitado')).toBe(10);
      expect(getRankBonus('miembro')).toBe(30);
      expect(getRankBonus('vip')).toBe(100);
      expect(getRankBonus('premium')).toBe(250);
      expect(getRankBonus('elite')).toBe(400);
    });

    it('debe retornar 0 para rangos no válidos', () => {
      expect(getRankBonus('invalid' as RankId)).toBe(0);
    });
  });

  describe('getRankName()', () => {
    it('debe retornar el nombre legible del rango', () => {
      expect(getRankName('registrado')).toBe('Registrado');
      expect(getRankName('invitado')).toBe('Invitado');
      expect(getRankName('miembro')).toBe('Miembro');
      expect(getRankName('vip')).toBe('VIP');
      expect(getRankName('premium')).toBe('Premium');
      expect(getRankName('elite')).toBe('Elite');
    });
  });

  describe('getRankIndex()', () => {
    it('debe retornar el índice correcto en la jerarquía', () => {
      expect(getRankIndex('registrado')).toBe(0);
      expect(getRankIndex('invitado')).toBe(1);
      expect(getRankIndex('miembro')).toBe(2);
      expect(getRankIndex('vip')).toBe(3);
      expect(getRankIndex('premium')).toBe(4);
      expect(getRankIndex('elite')).toBe(5);
    });
  });

  describe('isRankHigher()', () => {
    it('debe comparar rangos correctamente', () => {
      expect(isRankHigher('vip', 'miembro')).toBe(true);
      expect(isRankHigher('miembro', 'vip')).toBe(false);
      expect(isRankHigher('elite', 'registrado')).toBe(true);
      expect(isRankHigher('invitado', 'premium')).toBe(false);
    });
  });

  describe('getNextRank()', () => {
    it('debe retornar el siguiente rango en la jerarquía', () => {
      expect(getNextRank('registrado')).toBe('invitado');
      expect(getNextRank('invitado')).toBe('miembro');
      expect(getNextRank('miembro')).toBe('vip');
      expect(getNextRank('vip')).toBe('premium');
      expect(getNextRank('premium')).toBe('elite');
    });

    it('debe retornar null para el rango máximo', () => {
      expect(getNextRank('elite')).toBeNull();
    });
  });

  describe('getTotalBonusUpToRank()', () => {
    it('debe calcular correctamente el total acumulado de bonos', () => {
      // registrado: 0
      expect(getTotalBonusUpToRank('registrado')).toBe(0);

      // registrado + invitado: 0 + 10 = 10
      expect(getTotalBonusUpToRank('invitado')).toBe(10);

      // registrado + invitado + miembro: 0 + 10 + 30 = 40
      expect(getTotalBonusUpToRank('miembro')).toBe(40);

      // registrado + invitado + miembro + vip: 0 + 10 + 30 + 100 = 140
      expect(getTotalBonusUpToRank('vip')).toBe(140);

      // registrado + invitado + miembro + vip + premium: 0 + 10 + 30 + 100 + 250 = 390
      expect(getTotalBonusUpToRank('premium')).toBe(390);

      // registrado + invitado + miembro + vip + premium + elite: 0 + 10 + 30 + 100 + 250 + 400 = 790
      expect(getTotalBonusUpToRank('elite')).toBe(790);
    });
  });
});
