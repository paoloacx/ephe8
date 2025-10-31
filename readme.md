# Ephemerides v5.0 - Google Drive Backup

## ✅ Cambios Implementados

### 🎨 Efemérides Ampliadas
- **ANTES**: 14 efemérides
- **AHORA**: 43 efemérides con énfasis en arte y astronomía

**Nuevas efemérides incluidas:**
- **Arte**: Miguel Ángel, Leonardo da Vinci, Picasso, Monet, Bach, Beethoven, Tchaikovsky, Dvořák, Liszt
- **Astronomía**: Galileo, Copérnico, Hubble, Neptuno, Sputnik, Apolo 11, Newton, Einstein, Hawking
- **Otros**: Tesla, Marie Curie, Fleming, Walt Disney, Tutankamón

### ☁️ Google Drive Backup

**Nuevo módulo `gdrive.js`:**
- Autenticación con Google Drive API
- Backup manual con un click
- Restore desde Drive
- Backup automático cada 30min (opcional)
- Detecta cambios automáticamente

**Configuración:**
- Client ID: `360961314777-27a79o8blr5usg3qpqblrv5jckq5278v.apps.googleusercontent.com`
- Scope: `https://www.googleapis.com/auth/drive.file`
- Carpeta en Drive: `Ephemerides/ephemerides_backup.json`

### 🔄 Flujo de Usuario

**Login con Google Drive:**
1. Click en botón Google del header
2. Autoriza acceso a Drive
3. Icono cambia a "cloud_done" + "Drive"
4. Ya puede hacer backups

**Backup Manual:**
1. Settings → "Hacer Backup Ahora"
2. Sube JSON con todos los datos
3. Muestra timestamp del último backup

**Backup Automático:**
1. Settings → Toggle "Backup Automático"
2. Cada 30min si hay cambios
3. Contador de cambios resetea después de cada backup

**Restore:**
1. Settings → "Restaurar desde Drive"
2. Descarga último backup
3. Reemplaza datos locales
4. Recarga la página

### 📦 Archivos Modificados

1. **store.js** - 43 efemérides (arte + astronomía)
2. **gdrive.js** - NUEVO módulo completo
3. **auth.js** - REESCRITO para Google Drive
4. **main.js** - Integración backup/restore + auto-backup
5. **settings.js** - Nuevas opciones de Drive
6. **index.html** - Botón login siempre visible
7. **CAMBIO_MANUAL_UI.md** - Instrucción para cambio en ui.js

### ⚙️ Configuración de Google Drive API

**Ya configurado:**
- ✅ Proyecto creado
- ✅ Drive API habilitada
- ✅ OAuth 2.0 Client ID
- ✅ Orígenes autorizados: `https://paoloacx.github.io`
- ✅ URI redirect: `https://paoloacx.github.io/ephe8/`

### 📊 Estructura del Backup (JSON)

```json
{
  "version": "5.0",
  "timestamp": "2025-10-31T19:00:00.000Z",
  "data": {
    "days": "{...}",
    "memories": "{...}",
    "viewMode": "calendar",
    "first_run": "true",
    "welcome_shown": "true"
  }
}
```

### 🔧 Sistema de Auto-Backup

**Funcionamiento:**
- Contador de cambios en `main.js`
- Se incrementa después de cada: `saveDayName`, `saveMemory`, `deleteMemory`
- Cada 30min: si `changeCounter > 0` y user conectado → backup automático
- Después del backup: `changeCounter = 0`

**Control:**
- Setting: `ephem_autoBackup` (true/false)
- Toggle en Settings
- Se inicia automáticamente si está activado

### 🎯 Funciones Nuevas en main.js

```javascript
_handleDriveBackup()      // Backup manual
_handleDriveRestore()     // Restore desde Drive
_handleAutoBackupToggle() // Activar/desactivar auto-backup
_startAutoBackup()        // Inicia interval de 30min
_stopAutoBackup()         // Detiene interval
_markDataChanged()        // Incrementa contador
```

### 📱 UI/UX

**Header:**
- Botón Google siempre visible
- Al conectar: icono cambia a "cloud_done" + texto "Drive"
- Al desconectar: vuelve a botón Google normal

**Settings:**
- Nueva sección "Google Drive Backup"
- 3 opciones: Backup Ahora / Restore / Auto-Backup toggle
- Texto de estado: muestra último backup o "Conecta con Drive"

### ⚠️ Cambio Manual Requerido

**ui.js necesita un cambio:**
Ver archivo `CAMBIO_MANUAL_UI.md` con instrucciones exactas.

**Razón:** ui.js no estaba en Desktop, hay que modificarlo manualmente en GitHub.

### 🧪 Testing Checklist

- [ ] Botón Google aparece en header
- [ ] Click abre popup de autorización
- [ ] Después de autorizar: muestra "Drive" en header
- [ ] Settings muestra opciones de Drive
- [ ] "Hacer Backup Ahora" sube archivo a Drive
- [ ] Verificar en Drive: carpeta "Ephemerides" con backup.json
- [ ] "Restaurar desde Drive" descarga y aplica backup
- [ ] Toggle "Backup Automático" funciona
- [ ] Después de hacer cambios: auto-backup en 30min
- [ ] 43 efemérides visibles en calendario
- [ ] Logout cierra sesión correctamente

### 📋 Próximos Pasos

1. Subir archivos a GitHub
2. Hacer cambio manual en ui.js
3. Probar autorización de Drive
4. Verificar backups funcionan
5. Testar auto-backup (30min)

### 🔐 Seguridad

- Solo accede a archivos creados por la app
- Scope limitado: `drive.file`
- No lee otros archivos del usuario
- Token se guarda en gapi.client (session)
- Revocable desde Google Account

### 💾 Limitaciones

- Backup en JSON (no imágenes por ahora)
- Auto-backup cada 30min fijo
- Un solo backup (no historial)
- Requiere conexión para backup/restore

---

**Versión**: 5.0 + Google Drive  
**Fecha**: 31 Octubre 2025  
**Estado**: ✅ Listo para testing (requiere cambio en ui.js)
