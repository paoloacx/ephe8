# Ephemerides v5.0 - Local First Migration

## 🎯 Cambios Principales

### Sistema de Storage
- **ANTES**: Firebase obligatorio, datos en Firestore
- **AHORA**: localStorage por defecto, Firebase opcional

### Archivos Modificados

#### 1. `store.js` (REESCRITO COMPLETO)
**Cambios:**
- Sistema de storage local con localStorage
- Imágenes guardadas como base64
- 14 efemérides de ejemplo precargadas
- Nueva función `clearSampleData()` para borrar ejemplos
- Mantiene API compatible con versión anterior

**Efemérides de ejemplo incluidas:**
- Triunfo Revolución Cubana (1 enero 1959)
- Patente del teléfono (14 febrero 1876)
- Nacimiento Einstein (14 marzo 1879)
- Nacimiento Van Gogh (30 marzo 1853)
- Yuri Gagarin en el espacio (12 abril 1961)
- Nacimiento Audrey Hepburn (4 mayo 1929)
- Nacimiento Rousseau (28 junio 1712)
- Lanzamiento Apolo 11 (16 julio 1969)
- Luna pisada (20 julio 1969)
- Nacimiento Napoleón (15 agosto 1769)
- Nacimiento Agatha Christie (15 septiembre 1890)
- 95 tesis de Lutero (31 octubre 1517)
- Caída Muro Berlín (9 noviembre 1989)
- Nacimiento Newton (25 diciembre 1642)

#### 2. `auth.js` (REESCRITO)
**Cambios:**
- Firebase Auth se carga dinámicamente solo si se necesita
- Nueva función `isAuthAvailable()`
- Login completamente opcional
- Funciona sin Firebase desde el inicio

#### 3. `main.js` (ADAPTADO)
**Cambios:**
- Ya NO espera autenticación para iniciar
- Función `initializeLocalSession()` arranca directo con datos locales
- Auth verificado en segundo plano
- Nuevo callback `onClearExamples` para borrar efemérides de ejemplo
- Removida dependencia de `initFirebase()` en el arranque

#### 4. `settings.js` (ACTUALIZADO)
**Añadido:**
- Botón "Borrar Ejemplos" para eliminar efemérides de muestra
- Info de versión: "5.0 (Local First)"
- Texto explicativo sobre funcionamiento offline

#### 5. `index.html` (MEJORADO)
**Añadido:**
- Splash screen con Crumbie (1.5s)
- Welcome banner explicativo (solo primera vez)
- Mejor experiencia de onboarding
- Crumbie como favicon
- Versión actualizada: 5.0

#### 6. `firebase.js` (SIMPLIFICADO)
**Cambios:**
- Inicialización lazy (solo cuando se necesita)
- Nueva función `isFirebaseAvailable()`
- Ya no se auto-inicializa

## 🚀 Flujo de Usuario

### Primera Ejecución
1. **Splash Screen** (1.5s) - Logo Crumbie
2. **Inicialización**:
   - Genera 366 días limpios
   - Carga 14 efemérides de ejemplo
3. **Welcome Banner**: Explica que hay ejemplos
4. **App lista**: Usuario puede explorar inmediatamente

### Uso Normal
- App funciona completamente offline
- No requiere login
- Datos guardados en localStorage
- Firebase opcional (futuro: para backups)

## 📁 Estructura de Datos Local

### localStorage Keys:
- `ephem_days` - 366 días del año
- `ephem_memories` - Todas las memorias organizadas por día
- `ephem_images` - Imágenes en base64
- `ephem_first_run` - Flag de primera ejecución
- `ephem_welcome_shown` - Flag de welcome banner
- `ephem_viewMode` - Preferencia de vista (calendar/timeline)

### Formato de Memoria:
```javascript
{
  id: "abc123",
  Tipo: "Texto|Lugar|Musica|Imagen",
  Descripcion: "...",
  Fecha_Original: "2024-01-01T00:00:00.000Z",
  Creado_En: "2025-10-31T12:00:00.000Z",
  isExample: true  // Solo para efemérides de muestra
}
```

## ✅ Funcionalidades Mantenidas

- ✅ Calendario de 366 días
- ✅ Timeline
- ✅ Búsqueda
- ✅ Almacén por tipo
- ✅ Shuffle aleatorio
- ✅ Memorias: Texto, Lugar, Música, Imagen
- ✅ Exportar/Importar CSV
- ✅ Spotlight de hoy
- ✅ Nombres especiales de días
- ✅ Mapas (Leaflet)

## 🆕 Funcionalidades Nuevas

- ✅ Funciona sin Firebase
- ✅ Splash screen con Crumbie
- ✅ Welcome banner inteligente
- ✅ Efemérides de ejemplo precargadas
- ✅ Opción de borrar ejemplos
- ✅ Mejor onboarding

## 🔮 Siguiente Paso: Capacitor

Esta versión está lista para:
1. Migrar a Capacitor sin cambios mayores
2. Storage nativo (reemplazar localStorage por Preferences API)
3. Filesystem nativo para imágenes
4. Backups opcionales a Google Drive/iCloud
5. Integración con calendario nativo

## 🐛 Notas Importantes

1. **Límites de localStorage**: ~5-10MB dependiendo del navegador
2. **Imágenes**: Ahora en base64, considerar migrar a IndexedDB si hay muchas
3. **Firebase**: Código preparado para reactivarlo cuando se necesite sync
4. **CSS**: Sin cambios - mantiene estilo iOS 1.0-6.0

## 📝 Testing Checklist

- [ ] Primera ejecución muestra splash + welcome
- [ ] 14 efemérides visibles en días correspondientes
- [ ] Borrar ejemplos funciona correctamente
- [ ] Añadir memoria sin login funciona
- [ ] Exportar/Importar CSV funciona
- [ ] App funciona offline completamente
- [ ] Búsqueda encuentra efemérides de ejemplo
- [ ] Shuffle incluye días con ejemplos

## 🎨 Assets Necesarios

- `crumbie.png` - Logo/mascota (subido por el usuario)

---

**Versión**: 5.0 (Local First)  
**Fecha**: 31 Octubre 2025  
**Estado**: ✅ Listo para testing
