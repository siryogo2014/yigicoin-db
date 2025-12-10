#!/usr/bin/env ts-node

/**
 * Script CLI para ejecutar sorteos programados
 * 
 * Uso:
 *   npx ts-node scripts/execute-draws.ts
 *   
 * O agregar a package.json:
 *   "scripts": {
 *     "draws:execute": "ts-node scripts/execute-draws.ts"
 *   }
 */

import { main } from '../lib/executeDraws'

main().catch((error) => {
  console.error('Error al ejecutar sorteos:', error)
  process.exit(1)
})
