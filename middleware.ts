import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas que NO requieren autenticación
  const publicPaths = ['/login', '/signup', '/landing', '/api/health']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Si es una ruta pública, permitir acceso
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Para archivos estáticos, permitir acceso
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon.ico') || 
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    // Verificar usuario OBLIGATORIAMENTE
    const { data: { user }, error } = await supabase.auth.getUser()

    // Si NO hay usuario o hay error, REDIRIGIR A LOGIN INMEDIATAMENTE
    if (error || !user) {
      console.log('🚨 Usuario no autenticado, redirigiendo a login')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Si hay usuario, continuar normalmente
    return supabaseResponse
  } catch (error) {
    console.error('❌ Error en middleware:', error)
    // En caso de error, redirigir a login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 