# Configuración de Variables de Entorno (.env.local)

Para conectar tu proyecto Next.js con Supabase, crea un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
# Supabase Public Keys (Disponibles en Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Supabase Private Key (Usada en el Webhook para saltar RLS)
# Se encuentra en Settings > API > service_role
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

> [!IMPORTANT]
> Nunca compartas la `SUPABASE_SERVICE_ROLE_KEY` públicamente ni la incluyas en el código del frontend (no debe tener el prefijo `NEXT_PUBLIC_`).

## Estructura de Carpetas Sugerida

```text
finance-helpdesk/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── webhook/
│   │   │       └── hitbot/
│   │   │           └── route.ts      <-- Webhook HITBOT
│   │   ├── dashboard/
│   │   │   └── page.tsx              <-- Lista de Tickets
│   │   ├── ticket/
│   │   │   └── [id]/
│   │   │       └── page.tsx          <-- Detalle de Ticket
│   │   ├── login/
│   │   │   └── page.tsx              <-- Autenticación
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   └── supabaseAdmin.ts          <-- Cliente Supabase (Server)
│   └── middleware.ts                 <-- Protección de Rutas
├── setup.sql                         <-- Script de Base de Datos
└── .env.local                        <-- Configuración (Manual)
```
