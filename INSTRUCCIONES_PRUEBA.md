# Instrucciones para Probar el Sistema de Anuncios Mejorado

## 🎯 Resumen de Cambios Implementados

Se ha implementado exitosamente un sistema mejorado de visualización de anuncios con las siguientes características:

### ✅ Cambios Completados:

1. **✓ Eliminada la ventana flotante** que aparecía en la página principal
2. **✓ Contador implementado en nueva pestaña** con barra de progreso visual
3. **✓ Page Visibility API integrada** - El contador se pausa automáticamente cuando cambias de pestaña
4. **✓ Barra de progreso horizontal** en la parte superior que cubre todo el ancho
5. **✓ Botón "Reclamar Puntos"** aparece cuando el contador llega a cero
6. **✓ Sistema de puntos automático** - Suma 2 puntos al hacer clic en "Reclamar"
7. **✓ Pestaña permanece abierta** después de reclamar para seguir navegando

---

## 🚀 Cómo Probar el Sistema

### Paso 1: Instalar Dependencias

```bash
cd /home/ubuntu/code_artifacts/sistema-anuncios
npm install
```

### Paso 2: Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

### Paso 3: Probar el Flujo Completo

1. **Navega a la sección de Publicidad**
   - Abre la aplicación en el navegador
   - Ve a la sección "Publicidad de Miembros"
   - Haz clic en "Ver Anuncios"

2. **Haz clic en "Ver Anuncio (2 pts)"**
   - Se abrirá una nueva pestaña
   - Verás la barra de progreso en la parte superior
   - El contador mostrará "10s" y comenzará a descender

3. **Prueba la Pausa del Contador**
   - Cambia a otra pestaña del navegador
   - La barra se volverá amarilla y mostrará "⏸️ Contador Pausado"
   - Vuelve a la pestaña del anuncio
   - El contador se reanudará desde donde se quedó

4. **Espera a que el Contador llegue a cero**
   - La barra de progreso se llenará completamente
   - Cambiará a color verde
   - Aparecerá el botón "Reclamar 2 Puntos"

5. **Reclama los Puntos**
   - Haz clic en "Reclamar 2 Puntos"
   - Verás una alerta de éxito
   - Los 2 puntos se sumarán automáticamente a tu cuenta
   - La pestaña permanecerá abierta para que sigas navegando

6. **Verifica el Bloqueo de 24 horas**
   - Vuelve a la página principal
   - Intenta ver el mismo anuncio nuevamente
   - Verás que el botón está bloqueado
   - Se mostrará el tiempo restante hasta poder ver el anuncio nuevamente

---

## 🎨 Estados Visuales de la Barra de Progreso

| Estado | Color | Descripción |
|--------|-------|-------------|
| 🔵 Visualizando | Azul-Morado | Contador activo |
| ⏸️ Pausado | Amarillo-Naranja | Pestaña no visible |
| ✅ Listo | Verde | Tiempo completado |
| 🎉 Reclamado | Verde Oscuro | Puntos reclamados |
| 🔒 Bloqueado | Rojo | Ya visto en 24h |

---

## 🔍 Archivos Modificados/Creados

### Archivos Nuevos:
- `app/ad-view/[adId]/page.tsx` - Nueva página de visualización con contador y barra de progreso

### Archivos Modificados:
- `components/PublicidadSection.tsx` - Actualizado para abrir nueva pestaña en lugar de modal

### Documentación:
- `CAMBIOS_SISTEMA_ANUNCIOS_MEJORADO.md` - Documentación completa de los cambios
- `INSTRUCCIONES_PRUEBA.md` - Este archivo con instrucciones de prueba

---

## 🧪 Casos de Prueba

### Test 1: Flujo Normal
1. ✓ Abrir anuncio
2. ✓ Esperar 10 segundos
3. ✓ Reclamar puntos
4. ✓ Verificar suma de puntos

### Test 2: Pausa y Reanudación
1. ✓ Abrir anuncio
2. ✓ Esperar 5 segundos
3. ✓ Cambiar de pestaña
4. ✓ Verificar que se pausa
5. ✓ Volver a la pestaña
6. ✓ Verificar que continúa desde 5s

### Test 3: Bloqueo de 24 Horas
1. ✓ Ver y reclamar un anuncio
2. ✓ Intentar ver el mismo anuncio inmediatamente
3. ✓ Verificar mensaje de bloqueo
4. ✓ Verificar tiempo restante

### Test 4: Límite Diario
1. ✓ Ver múltiples anuncios
2. ✓ Alcanzar el límite diario del rango
3. ✓ Verificar que se muestra el mensaje de límite alcanzado
4. ✓ Verificar contador hasta medianoche

---

## 📱 Compatibilidad

✅ **Desktop**: Chrome, Firefox, Safari, Edge
✅ **Mobile**: Navegadores modernos con soporte para Page Visibility API
✅ **Responsive**: Diseño adaptable a diferentes tamaños de pantalla

---

## 🐛 Solución de Problemas

### Problema: El contador no se pausa al cambiar de pestaña
**Solución**: Asegúrate de estar usando un navegador moderno con soporte para Page Visibility API

### Problema: Los puntos no se suman
**Solución**: 
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Application" → "Local Storage"
3. Busca la clave `user_simulation_data`
4. Verifica que el campo `points` se actualiza

### Problema: La barra de progreso no se muestra
**Solución**: 
1. Limpia el caché del navegador
2. Recarga la página con Ctrl+F5
3. Verifica que no hay errores en la consola

---

## 📊 Métricas y Validaciones

El sistema implementa las siguientes validaciones:

✅ **Control de Tiempo**: Contador preciso de 10 segundos
✅ **Validación de Vista**: No permite reclamar antes de completar el tiempo
✅ **Bloqueo de 24h**: Impide ver el mismo anuncio múltiples veces
✅ **Límite Diario**: Respeta el límite de anuncios por día según el rango
✅ **Persistencia**: Guarda el estado en localStorage

---

## 🎯 Características Destacadas

### 1. Page Visibility API
- Detecta automáticamente cuando el usuario cambia de pestaña
- Pausa el contador para evitar abusos
- Reanuda desde el punto exacto cuando regresa

### 2. Feedback Visual Constante
- Barra de progreso animada y suave
- Colores distintos para cada estado
- Iconos y textos descriptivos claros

### 3. Prevención de Abuso
- Validación de 24 horas por anuncio
- Tracking preciso de visualizaciones
- Control de límites diarios por rango

### 4. Experiencia de Usuario Mejorada
- Sin bloqueo de la página principal
- Navegación libre en la nueva pestaña
- Instrucciones claras en todo momento

---

## 📝 Notas Adicionales

- **Modo Desarrollo**: En modo desarrollo, se muestra información de debug en la parte inferior de la barra
- **LocalStorage**: Los datos se guardan en el navegador del usuario
- **SessionStorage**: Se usa para pasar datos del anuncio a la nueva pestaña
- **Responsive**: El diseño se adapta automáticamente a dispositivos móviles

---

## ✨ Próximos Pasos Sugeridos

Una vez probado el sistema, puedes considerar:

1. **Personalizar el tiempo del contador** (actualmente 10 segundos)
2. **Agregar animaciones adicionales** para mejor feedback
3. **Implementar notificaciones toast** en lugar de alerts
4. **Agregar analytics** para rastrear visualizaciones
5. **Crear variantes de la barra** para diferentes tipos de anuncios

---

## 🤝 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa la documentación completa en `CAMBIOS_SISTEMA_ANUNCIOS_MEJORADO.md`
2. Verifica los logs en la consola del navegador
3. Asegúrate de que todas las dependencias estén instaladas

---

**Versión**: 2.0.0  
**Fecha**: 10 de Noviembre de 2025  
**Estado**: ✅ Producción Ready

¡Disfruta del nuevo sistema de anuncios mejorado! 🎉
