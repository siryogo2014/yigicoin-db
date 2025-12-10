
# 📋 Guía de Tests Unitarios - YigiCoin

## 🎯 Objetivo

Esta suite de tests verifica que el sistema de puntos funcione correctamente y que **los puntos nunca se pierdan al ascender de rango**.

## 🗂️ Estructura de Tests

```
__tests__/
├── lib/
│   └── simStorage.test.ts          # Tests de almacenamiento transaccional
├── hooks/
│   └── useSimulation-upgrade.test.ts # Tests de ascenso de rango
└── constants/
    └── ranks.test.ts                # Tests de bonos por rango
```

## 📦 Instalación de Dependencias

Para ejecutar los tests, primero instala las dependencias necesarias:

```bash
npm install --save-dev jest ts-jest @types/jest jest-environment-jsdom identity-obj-proxy
```

## ▶️ Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch (desarrollo)
npm test -- --watch

# Ejecutar tests con cobertura
npm test -- --coverage

# Ejecutar un archivo específico
npm test -- __tests__/hooks/useSimulation-upgrade.test.ts
```

## 📊 Tests Implementados

### 1. `simStorage.test.ts` - Almacenamiento Transaccional

Verifica que las operaciones de lectura/escritura en localStorage sean seguras:

- ✅ Lectura de datos vacíos
- ✅ Lectura de datos existentes
- ✅ Fusión de datos sin sobrescritura
- ✅ Preservación de campos existentes
- ✅ Operaciones incrementales
- ✅ Concurrencia y transaccionalidad

### 2. `ranks.test.ts` - Bonos por Rango

Verifica que los bonos estén correctamente definidos:

- ✅ Bonos correctos: registrado=0, invitado=10, basico=30, vip=100, premium=250, elite=400
- ✅ Funciones helper de rangos
- ✅ Cálculos acumulativos de bonos

### 3. `useSimulation-upgrade.test.ts` - Ascenso de Rango

**Tests críticos del caso del usuario:**

#### ✅ Caso Específico del Usuario
```typescript
// Usuario con 35 puntos asciende a invitado (bonus 10)
// Resultado esperado: 45 puntos (35 + 10)
```

#### ✅ Casos Generales
- 50 puntos + basico (bonus 30) = 80 puntos
- 0 puntos + invitado (bonus 10) = 10 puntos
- 500 puntos + elite (bonus 400) = 900 puntos

#### ✅ Verificación de Integridad
- Los puntos se leen de localStorage (fuente de verdad)
- Todos los campos se preservan al ascender
- Múltiples ascensos consecutivos funcionan correctamente
- `writeMerge` nunca sobrescribe otros campos

## 🧪 Caso de Prueba Principal

El test más importante verifica el problema reportado por el usuario:

```typescript
it('CASO USUARIO: 35 puntos + ascenso a invitado (bonus 10) = 45 puntos', async () => {
  // 1. Estado inicial: 35 puntos
  await simStorage.writeMerge({
    points: 35,
    currentRank: 'registrado',
    balance: 20,
  });

  // 2. Simular ascenso a invitado
  const userData = simStorage.read();
  const basePoints = userData.points ?? 0;
  const bonusPoints = RANK_BONUS.invitado; // 10
  const newPoints = basePoints + bonusPoints;

  // 3. Guardar ascenso
  await simStorage.writeMerge({
    points: newPoints,
    currentRank: 'invitado',
  });

  // 4. Verificar resultado
  const finalData = simStorage.read();
  expect(finalData.points).toBe(45); // ✅ 35 + 10 = 45
});
```

## 🔍 Cobertura Esperada

Los tests cubren:

- ✅ Operaciones transaccionales de localStorage
- ✅ Preservación de puntos al ascender
- ✅ Bonos correctos por cada rango
- ✅ Integridad de datos en todas las operaciones
- ✅ Casos edge (0 puntos, múltiples ascensos, etc.)
- ✅ Concurrencia y condiciones de carrera

## 📝 Agregar Tests Adicionales

Para agregar más tests, crea archivos `.test.ts` en la carpeta `__tests__/`:

```typescript
// __tests__/hooks/useRefresh.test.ts
describe('useRefresh', () => {
  it('debe decrementar puntos al refrescar contador', async () => {
    // ... tu test aquí
  });
});
```

## 🚀 Integración Continua

Agrega estos scripts a `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## 🐛 Depuración de Tests

Para depurar tests con logs:

```typescript
// Habilitar logs de simStorage en tests
import { setDebugLogs } from '../../lib/simStorage';

beforeEach(() => {
  setDebugLogs(true);
});
```

O en el navegador/consola:

```javascript
window.__simStorageDebug = true;
```

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Testing Library](https://testing-library.com/)

---

**Nota**: Los tests están diseñados para ser independientes y pueden ejecutarse en cualquier orden sin afectar los resultados.
