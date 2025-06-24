# TradeTrackr - Trading Journal App

Una aplicación completa de diario de trading construida con Next.js 15, TypeScript, Supabase y Tailwind CSS.

![TradeTrackr Logo](public/logo.jpeg)

## 🚀 Características

### ✅ Páginas Implementadas
- **🏠 Página Principal**: Formulario completo de registro de trades con slider de confianza
- **📊 Dashboard**: Vista completa con estadísticas, gráficos de rendimiento y trades recientes
- **👤 Perfil**: Sistema de referidos, progreso PRO y configuración de cuenta
- **🔐 Autenticación**: Login y registro con validación completa
- **📱 Diseño Móvil**: Optimizado para dispositivos móviles con el mismo ancho en todas las páginas

### 🎯 Funcionalidades Principales
- **Registro de Trades**: Título, par, temporalidad, sesión, bias, risk:reward, resultado
- **Slider de Confianza**: Gradiente de colores (rojo-amarillo-verde) con emojis
- **Subida de Screenshots**: Área drag & drop para capturas de pantalla
- **Estadísticas en Tiempo Real**: Win rate, profit factor, expectancy automáticos
- **Rendimiento Mensual**: Tracking de rendimiento por meses
- **Sistema de Referidos**: Códigos únicos y recompensas
- **Accuracy Grid**: Visualización tipo GitHub de actividad de trading

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15.3.4, React 19, TypeScript
- **Styling**: Tailwind CSS v3 (optimizado para móvil)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Deployment**: Vercel-ready

## 📦 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/Ikerlopez13/tradeTrackr.git
cd tradeTrackr
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Supabase

#### Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia la URL y la clave anon

#### Configurar variables de entorno
Crea un archivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

#### Ejecutar las queries SQL
1. Ve al SQL Editor en tu dashboard de Supabase
2. Copia y ejecuta todo el contenido de `supabase_setup.sql`
3. Esto creará todas las tablas, políticas RLS, triggers y funciones necesarias

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
tradetrackrapp/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Dashboard completo
│   │   ├── login/
│   │   │   └── page.tsx          # Página de login
│   │   ├── signup/
│   │   │   └── page.tsx          # Página de registro
│   │   ├── profile/
│   │   │   └── page.tsx          # Página de perfil
│   │   ├── globals.css           # Estilos globales + slider
│   │   ├── layout.tsx            # Layout principal
│   │   └── page.tsx              # Página principal (registro de trades)
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts         # Cliente Supabase
│   │       └── server.ts         # Servidor Supabase
│   └── types/
│       └── database.ts           # Tipos TypeScript
├── public/
│   └── logo.jpeg                 # Logo de la aplicación
├── supabase_setup.sql            # Queries SQL para configuración
└── README.md                     # Este archivo
```

## 🎨 Diseño y UX

### Tema Visual
- **Color de fondo**: `#010314` (azul muy oscuro espacial)
- **Estilo**: Glass-morphism con efectos de desenfoque
- **Logo**: Animación de respiración (escala 1 → 1.2 → 1)
- **Responsive**: Optimizado mobile-first

### Componentes Destacados

#### Slider de Confianza
- Gradiente de 3 colores: rojo (0-33%), amarillo (33-66%), verde (66-100%)
- Emojis dinámicos: 😞 Mal, 🤔 Regular, 😊 Genial
- Porcentaje en tiempo real
- Compatible con todos los navegadores

#### Cards de Estadísticas
- Profit Factor, Expectancy, Win Rate
- Datos calculados automáticamente
- Actualizaciones en tiempo real

#### Lista de Trades
- Diseño tipo tarjeta con toda la información
- Badges de resultado coloreados
- Descripción truncada con line-clamp

## 🗄️ Base de Datos

### Tablas Principales
- **profiles**: Perfiles de usuario con códigos de referido
- **trades**: Todos los trades registrados
- **user_stats**: Estadísticas calculadas automáticamente
- **monthly_performance**: Rendimiento mensual
- **referrals**: Sistema de referidos

### Características de la DB
- **RLS (Row Level Security)**: Cada usuario solo ve sus datos
- **Triggers automáticos**: Estadísticas se actualizan automáticamente
- **Índices optimizados**: Para consultas rápidas
- **Validaciones**: Constraints en campos críticos

## 🚀 Deployment

### Vercel (Recomendado)
1. Conecta tu repositorio de GitHub
2. Configura las variables de entorno en Vercel
3. Deploy automático

### Variables de entorno para producción
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

## 📱 Funcionalidades por Página

### Página Principal (`/`)
- ✅ Formulario completo de registro de trades
- ✅ Slider de confianza con gradiente
- ✅ Área de subida de screenshots
- ✅ Validación de campos
- ✅ Guardado en Supabase

### Dashboard (`/dashboard`)
- ✅ Cards de estadísticas principales
- ✅ Rendimiento mensual (últimos 6 meses)
- ✅ Lista de trades recientes
- ✅ Gráfico de performance con métricas
- ✅ Accuracy Grid (estilo GitHub)

### Perfil (`/profile`)
- ✅ Avatar con iniciales del usuario
- ✅ Sistema de referidos con código único
- ✅ Contador de referidos y recompensas
- ✅ Barra de progreso PRO
- ✅ Enlaces de navegación

### Autenticación (`/login`, `/signup`)
- ✅ Formularios limpios y validados
- ✅ Manejo de errores
- ✅ Redirección automática
- ✅ Confirmación por email

## 🔧 Personalización

### Cambiar colores del tema
Edita `src/app/globals.css`:
```css
/* Cambiar color de fondo */
background-color: #010314; /* Tu color aquí */

/* Cambiar colores del slider */
.bg-red-600 { background-color: tu-color; }
.bg-yellow-500 { background-color: tu-color; }
.bg-green-500 { background-color: tu-color; }
```

### Agregar nuevos campos al formulario
1. Actualiza la interfaz en `src/types/database.ts`
2. Modifica el formulario en `src/app/page.tsx`
3. Actualiza la tabla `trades` en Supabase

## 🐛 Solución de Problemas

### Error de Tailwind CSS
- Asegúrate de usar Tailwind CSS v3, no v4
- Verifica que `postcss.config.js` esté configurado correctamente

### Problemas de autenticación
- Verifica las variables de entorno
- Asegúrate de que las políticas RLS estén configuradas
- Revisa que las tablas existan en Supabase

### Slider no se muestra correctamente
- Verifica que los estilos CSS estén cargados
- Asegúrate de que el gradiente esté configurado con z-index correcto

## 📈 Próximas Funcionalidades

- [ ] Subida real de screenshots
- [ ] Gráficos interactivos con Chart.js
- [ ] Exportación de datos a CSV/PDF
- [ ] Notificaciones push
- [ ] Modo oscuro/claro
- [ ] Integración con APIs de trading

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👨‍💻 Autor

**Iker López** - [GitHub](https://github.com/Ikerlopez13)

---

⭐ ¡Dale una estrella si este proyecto te ayudó! 