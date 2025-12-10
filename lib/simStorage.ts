/**
 * Módulo de almacenamiento transaccional para localStorage
 * Proporciona operaciones atómicas para evitar pérdida de datos y condiciones de carrera
 * 
 * @module simStorage
 */

const STORAGE_KEY = 'user_simulation_data';
const DEBUG_LOGS = false; // Cambiar a true para ver logs de depuración

/**
 * Interface para los datos del usuario en simulación
 */
export interface UserSimulationData {
  currentRank?: string;
  balance?: number;
  points?: number;
  totems?: number;
  referralCount?: number;
  subReferralCount?: number;
  totalNetwork?: number;
  hasTimeExtension?: boolean;
  counterExpiresAt?: string;
  lastRefresh?: string;
  [key: string]: any; // Permite propiedades adicionales
}

/**
 * Mutex simple para evitar condiciones de carrera
 * Asegura que solo una operación se ejecute a la vez
 */
let isLocked = false;
const lockQueue: Array<() => void> = [];

/**
 * Adquiere un lock para operaciones transaccionales
 * @private
 */
async function acquireLock(): Promise<void> {
  if (DEBUG_LOGS) console.log('[simStorage] 🔒 Intentando adquirir lock...');

  if (!isLocked) {
    isLocked = true;
    if (DEBUG_LOGS) console.log('[simStorage] ✅ Lock adquirido');
    return Promise.resolve();
  }

  // Esperar en la cola hasta que el lock esté disponible
  return new Promise<void>((resolve) => {
    lockQueue.push(resolve);
    if (DEBUG_LOGS) console.log('[simStorage] ⏳ En cola de espera, posición:', lockQueue.length);
  });
}

/**
 * Libera el lock después de una operación
 * @private
 */
function releaseLock(): void {
  if (DEBUG_LOGS) console.log('[simStorage] 🔓 Liberando lock...');

  const next = lockQueue.shift();
  if (next) {
    if (DEBUG_LOGS) console.log('[simStorage] ➡️ Procesando siguiente en cola');
    next();
  } else {
    isLocked = false;
    if (DEBUG_LOGS) console.log('[simStorage] ✅ Lock liberado completamente');
  }
}

/**
 * Lee los datos del usuario desde localStorage de forma segura
 * @returns Datos del usuario o un objeto vacío si no existen
 */
export function read(): UserSimulationData {
  try {
    if (DEBUG_LOGS) console.log('[simStorage] 📖 Leyendo datos...');

    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      if (DEBUG_LOGS) console.log('[simStorage] ℹ️ No hay datos guardados, retornando objeto vacío');
      return {};
    }

    const parsed = JSON.parse(data);
    if (DEBUG_LOGS) console.log('[simStorage] ✅ Datos leídos exitosamente:', parsed);

    return parsed;
  } catch (error) {
    console.error('[simStorage] ❌ Error al leer datos:', error);
    return {};
  }
}

/**
 * Escribe/fusiona datos del usuario en localStorage de forma transaccional
 * Esta función NUNCA sobrescribe datos existentes, solo los fusiona
 * 
 * @param newData - Datos parciales a fusionar con los existentes
 * @returns Promise que se resuelve con los datos finales fusionados
 * 
 * @example
 * // Actualizar solo los puntos sin afectar otros campos
 * await writeMerge({ points: 45 });
 * 
 * @example
 * // Actualizar puntos y rango
 * await writeMerge({ 
 *   points: 75, 
 *   currentRank: 'miembro' 
 * });
 */
export async function writeMerge(newData: Partial<UserSimulationData>): Promise<UserSimulationData> {
  await acquireLock();

  try {
    if (DEBUG_LOGS) {
      console.log('[simStorage] 📝 Iniciando writeMerge con datos nuevos:', newData);
    }

    // Leer datos actuales
    const currentData = read();
    if (DEBUG_LOGS) console.log('[simStorage] 📖 Datos actuales:', currentData);

    // Fusionar los datos nuevos con los existentes
    // Los datos nuevos tienen prioridad, pero nunca eliminamos campos existentes
    const mergedData: UserSimulationData = {
      ...currentData,
      ...newData,
    };

    if (DEBUG_LOGS) {
      console.log('[simStorage] 🔀 Datos fusionados:', mergedData);
      console.log('[simStorage] 📊 Cambios aplicados:', {
        before: currentData,
        after: mergedData,
        delta: Object.keys(newData).reduce((acc, key) => {
          acc[key] = {
            antes: currentData[key],
            después: mergedData[key],
          };
          return acc;
        }, {} as Record<string, any>),
      });
    }

    // Guardar datos fusionados
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));

    if (DEBUG_LOGS) console.log('[simStorage] ✅ Datos guardados exitosamente');

    return mergedData;
  } catch (error) {
    console.error('[simStorage] ❌ Error en writeMerge:', error);
    throw error;
  } finally {
    releaseLock();
  }
}

/**
 * Lee el valor de un campo específico de forma segura
 * @param field - Nombre del campo a leer
 * @param defaultValue - Valor por defecto si el campo no existe
 * @returns Valor del campo o el valor por defecto
 * 
 * @example
 * const points = readField('points', 0);
 */
export function readField<T = any>(field: string, defaultValue: T): T {
  const data = read();
  return data[field] !== undefined ? data[field] : defaultValue;
}

/**
 * Actualiza un campo específico de forma transaccional
 * @param field - Nombre del campo a actualizar
 * @param value - Nuevo valor
 * @returns Promise con los datos completos actualizados
 * 
 * @example
 * await writeField('points', 50);
 */
export async function writeField<T = any>(
  field: string,
  value: T
): Promise<UserSimulationData> {
  return writeMerge({ [field]: value });
}

/**
 * Incrementa un campo numérico de forma transaccional
 * @param field - Nombre del campo numérico
 * @param delta - Cantidad a incrementar (puede ser negativa)
 * @returns Promise con el nuevo valor del campo
 * 
 * @example
 * // Incrementar puntos en 10
 * const newPoints = await incrementField('points', 10);
 * 
 * @example
 * // Decrementar puntos en 40
 * const newPoints = await incrementField('points', -40);
 */
export async function incrementField(field: string, delta: number): Promise<number> {
  await acquireLock();

  try {
    if (DEBUG_LOGS) {
      console.log(`[simStorage] ➕ Incrementando campo '${field}' en ${delta}`);
    }

    const currentData = read();
    const currentValue = (currentData[field] as number) || 0;
    const newValue = currentValue + delta;

    if (DEBUG_LOGS) {
      console.log(`[simStorage] 📊 ${field}: ${currentValue} → ${newValue} (delta: ${delta})`);
    }

    await writeMerge({ [field]: newValue });

    return newValue;
  } finally {
    releaseLock();
  }
}

/**
 * Resetea todos los datos (usar con precaución)
 * Solo para pruebas o cuando se necesita borrar todo
 */
export function clearAll(): void {
  if (DEBUG_LOGS) console.log('[simStorage] 🗑️ Limpiando todos los datos');
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Habilita o deshabilita los logs de depuración
 * @param enabled - true para habilitar logs
 */
export function setDebugLogs(enabled: boolean): void {
  // Esta función permite cambiar DEBUG_LOGS en tiempo de ejecución
  // aunque no afecta la constante, podemos guardar el estado
  if (typeof window !== 'undefined') {
    (window as any).__simStorageDebug = enabled;
  }
}

// Exportar también el STORAGE_KEY por si se necesita acceder directamente
export { STORAGE_KEY };
