
/**
 * Configuración inicial de Jest
 * Se ejecuta antes de los tests
 */

// Extender expect con matchers personalizados si es necesario
// import '@testing-library/jest-dom';

// Mock global de console para tests más limpios (opcional)
global.console = {
  ...console,
  // Descomentar para silenciar logs en tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error, // Mantener errores visibles
};
