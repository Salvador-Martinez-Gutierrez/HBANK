# 🔒 Configuración de Sentry - Guía de Seguridad

## ⚠️ Acción Requerida: Mover el DSN a Variables de Entorno

Se han actualizado los archivos de configuración de Sentry para **NO exponer credenciales directamente en el código**.

## 📋 Pasos para Completar la Configuración

### 1. Agregar el DSN a tu archivo `.env.local`

Abre o crea el archivo `.env.local` en la raíz del proyecto y agrega:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://9e7a6a2f8765a7ec28d2368bc40cc2e8@o4510277898469376.ingest.us.sentry.io/4510277913214976
SENTRY_DSN=https://9e7a6a2f8765a7ec28d2368bc40cc2e8@o4510277898469376.ingest.us.sentry.io/4510277913214976
ENVIRONMENT=development
```

### 2. Para Producción (Vercel/Deployment)

Agrega las mismas variables de entorno en tu plataforma de deployment:

**En Vercel:**

1. Ve a tu proyecto → Settings → Environment Variables
2. Agrega:
    - `NEXT_PUBLIC_SENTRY_DSN` = `https://9e7a6a2f8765a7ec28d2368bc40cc2e8@o4510277898469376.ingest.us.sentry.io/4510277913214976`
    - `SENTRY_DSN` = `https://9e7a6a2f8765a7ec28d2368bc40cc2e8@o4510277898469376.ingest.us.sentry.io/4510277913214976`
    - `ENVIRONMENT` = `production`

### 3. Reinicia el Servidor de Desarrollo

```bash
pnpm dev
```

## 🔐 ¿Por qué es Importante?

Aunque el DSN de Sentry está diseñado para ser público (se envía al cliente), es una **mejor práctica**:

1. **Separación de configuración**: Facilita cambiar entre entornos (dev, staging, prod)
2. **Seguridad por capas**: Evita commits accidentales de credenciales
3. **Gestión centralizada**: Todas las configuraciones sensibles en un solo lugar
4. **Rotación de claves**: Más fácil actualizar si necesitas cambiar el DSN

## ✅ Archivos Actualizados

-   ✅ `sentry.server.config.ts` - Usa `process.env.SENTRY_DSN`
-   ✅ `sentry.edge.config.ts` - Usa `process.env.SENTRY_DSN`
-   ✅ `src/instrumentation-client.ts` - Usa `process.env.NEXT_PUBLIC_SENTRY_DSN`
-   ✅ `.env.example` - Documentado para nuevos desarrolladores

## 📝 Nota sobre `.env.local`

El archivo `.env.local` está (y debe estar) en `.gitignore`, por lo que **nunca se commitea** al repositorio. Esto protege tus credenciales locales.

## 🔄 Para Otros Desarrolladores del Equipo

Si alguien más clona el repositorio, deberá:

1. Copiar `.env.example` a `.env.local`
2. Pedir las credenciales reales al equipo
3. Actualizar `.env.local` con los valores correctos
