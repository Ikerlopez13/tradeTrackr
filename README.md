# TradeTracker - Aplicación de Trading Journal

Una aplicación moderna para registrar y analizar tus trades de trading, construida con Next.js 15, TypeScript, Supabase y Tailwind CSS.

## 🚀 Características

- ✅ Autenticación completa (email/password y OAuth con Google)
- ✅ Registro de trades con formulario intuitivo
- ✅ Dashboard con estadísticas de rendimiento
- ✅ Diseño espacial moderno con tema oscuro
- ✅ Interfaz en español
- ✅ Base de datos segura con Row Level Security
- ✅ Responsive design

## 🛠️ Configuración

### 1. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una nueva cuenta
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** en el dashboard de Supabase
4. Ejecuta el contenido del archivo `supabase-schema.sql` para crear las tablas y configuraciones

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

**Para obtener estas credenciales:**
1. Ve a tu proyecto en Supabase
2. Ve a **Settings** → **API**
3. Copia la **Project URL** y la **anon public key**

### 3. Configurar Autenticación OAuth (Opcional)

Para habilitar login con Google:

1. Ve a **Authentication** → **Providers** en Supabase
2. Habilita **Google**
3. Configura tu **Google OAuth Client ID** y **Client Secret**
4. Añade tu dominio a las **Redirect URLs**

### 4. Instalar Dependencias y Ejecutar

```bash
npm install
npm run dev
```

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── login/page.tsx          # Página de inicio de sesión
│   ├── signup/page.tsx         # Página de registro
│   ├── dashboard/page.tsx      # Dashboard con estadísticas
│   ├── page.tsx               # Formulario de registro de trades
│   ├── layout.tsx            # Layout principal
│   └── globals.css           # Estilos globales
├── lib/
│   └── supabase/
│       ├── client.ts         # Cliente de Supabase (browser)
│       └── server.ts         # Cliente de Supabase (server)
├── types/
│   └── database.ts           # Tipos de TypeScript para la DB
└── middleware.ts             # Middleware de autenticación
```

## 🗄️ Esquema de Base de Datos

### Tablas principales:

- **profiles**: Perfiles de usuario
- **trades**: Registro de trades
- **user_stats**: Estadísticas calculadas automáticamente

### Características de seguridad:
- Row Level Security habilitado
- Políticas de acceso por usuario
- Triggers automáticos para actualizar estadísticas

## 🎨 Diseño

- **Tema**: Espacial oscuro con gradientes
- **Colores**: Negros, grises y acentos azules/verdes/rojos
- **Efectos**: Glass-morphism y backdrop blur
- **Responsive**: Optimizado para desktop y móvil

## 📊 Funcionalidades del Trading Journal

### Registro de Trades:
- Título personalizado
- Par de divisas
- Timeframe
- Sesión de trading
- Bias del mercado (Alcista/Bajista)
- Risk:Reward ratio
- Resultado (Win/Loss/BE)
- Nivel de confianza con slider
- Descripción detallada
- Upload de screenshots (próximamente)

### Dashboard:
- Total de trades
- Trades ganadores/perdedores
- Win rate calculado automáticamente
- Lista de trades recientes
- Estadísticas visuales

## 🔧 Tecnologías Utilizadas

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Deployment**: Vercel (recomendado)

## 🚀 Deployment

### Vercel (Recomendado):

1. Conecta tu repositorio de GitHub con Vercel
2. Configura las variables de entorno en Vercel
3. Deploy automático

### Variables de entorno en producción:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Próximas Funcionalidades

- [ ] Upload de screenshots
- [ ] Gráficos de rendimiento
- [ ] Análisis por pares de divisas
- [ ] Exportar datos a CSV
- [ ] Modo claro/oscuro
- [ ] Notificaciones push
- [ ] Integración con APIs de trading

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ve el archivo [LICENSE](LICENSE) para más detalles.

---

**¡Happy Trading! 📈** 