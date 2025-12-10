
/**
 * Tests unitarios para lib/simStorage.ts
 * 
 * Verifican el funcionamiento correcto de las operaciones transaccionales
 * de lectura y escritura en localStorage
 */

import * as simStorage from '../../lib/simStorage';

// Mock de localStorage para las pruebas
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

// Asignar el mock al global
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('simStorage', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorageMock.clear();
  });

  describe('read()', () => {
    it('debe retornar un objeto vacío cuando no hay datos', () => {
      const result = simStorage.read();
      expect(result).toEqual({});
    });

    it('debe retornar los datos guardados correctamente', () => {
      localStorage.setItem('user_simulation_data', JSON.stringify({
        points: 50,
        currentRank: 'miembro',
      }));

      const result = simStorage.read();
      expect(result).toEqual({
        points: 50,
        currentRank: 'miembro',
      });
    });

    it('debe manejar errores de parsing y retornar objeto vacío', () => {
      localStorage.setItem('user_simulation_data', 'invalid json');

      const result = simStorage.read();
      expect(result).toEqual({});
    });
  });

  describe('writeMerge()', () => {
    it('debe guardar datos nuevos cuando no existen datos previos', async () => {
      await simStorage.writeMerge({ points: 10 });

      const saved = JSON.parse(localStorage.getItem('user_simulation_data') || '{}');
      expect(saved).toEqual({ points: 10 });
    });

    it('debe fusionar datos nuevos con existentes sin sobrescribir', async () => {
      // Guardar datos iniciales
      await simStorage.writeMerge({
        points: 35,
        currentRank: 'registrado',
        balance: 6,
      });

      // Actualizar solo los puntos
      await simStorage.writeMerge({ points: 45 });

      const saved = simStorage.read();
      expect(saved).toEqual({
        points: 45,
        currentRank: 'registrado',
        balance: 6,
      });
    });

    it('debe preservar campos existentes al agregar nuevos', async () => {
      // Guardar datos iniciales
      await simStorage.writeMerge({
        points: 50,
        currentRank: 'miembro',
      });

      // Agregar nuevo campo
      await simStorage.writeMerge({ balance: 100 });

      const saved = simStorage.read();
      expect(saved).toEqual({
        points: 50,
        currentRank: 'miembro',
        balance: 100,
      });
    });
  });

  describe('readField()', () => {
    it('debe retornar el valor del campo si existe', () => {
      localStorage.setItem('user_simulation_data', JSON.stringify({
        points: 75,
      }));

      const points = simStorage.readField('points', 0);
      expect(points).toBe(75);
    });

    it('debe retornar el valor por defecto si el campo no existe', () => {
      const points = simStorage.readField('points', 0);
      expect(points).toBe(0);
    });
  });

  describe('writeField()', () => {
    it('debe actualizar un campo específico', async () => {
      await simStorage.writeMerge({ points: 10, balance: 50 });
      await simStorage.writeField('points', 20);

      const saved = simStorage.read();
      expect(saved.points).toBe(20);
      expect(saved.balance).toBe(50);
    });
  });

  describe('incrementField()', () => {
    it('debe incrementar un campo numérico correctamente', async () => {
      await simStorage.writeMerge({ points: 35 });

      const newValue = await simStorage.incrementField('points', 10);

      expect(newValue).toBe(45);
      expect(simStorage.read().points).toBe(45);
    });

    it('debe decrementar cuando el delta es negativo', async () => {
      await simStorage.writeMerge({ points: 50 });

      const newValue = await simStorage.incrementField('points', -10);

      expect(newValue).toBe(40);
      expect(simStorage.read().points).toBe(40);
    });

    it('debe inicializar en 0 si el campo no existe', async () => {
      const newValue = await simStorage.incrementField('points', 10);

      expect(newValue).toBe(10);
      expect(simStorage.read().points).toBe(10);
    });
  });

  describe('Transaccionalidad', () => {
    it('debe preservar datos durante múltiples escrituras concurrentes', async () => {
      // Simular múltiples escrituras concurrentes
      await simStorage.writeMerge({ points: 0, balance: 100 });

      const promises = [
        simStorage.incrementField('points', 10),
        simStorage.incrementField('points', 10),
        simStorage.incrementField('points', 10),
      ];

      await Promise.all(promises);

      const saved = simStorage.read();
      expect(saved.points).toBe(30);
      expect(saved.balance).toBe(100); // No debe perderse
    });
  });

  describe('clearAll()', () => {
    it('debe eliminar todos los datos', () => {
      localStorage.setItem('user_simulation_data', JSON.stringify({ points: 100 }));

      simStorage.clearAll();

      expect(localStorage.getItem('user_simulation_data')).toBeNull();
    });
  });
});
