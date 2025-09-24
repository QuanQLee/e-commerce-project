import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'en' | 'zh-CN' | 'es-ES'

interface TranslationRecord { [key: string]: string | TranslationRecord }

type Dictionary = Record<Language, TranslationRecord>

type Variables = Record<string, string | number>

type LanguageDescriptor = {
  code: Language
  label: string
  locale: string
  currency: string
}

type I18nContextValue = {
  language: Language
  locale: string
  currency: string
  languages: LanguageDescriptor[]
  t: (key: string, vars?: Variables) => string
  setLanguage: (lang: Language) => void
}

const STORAGE_KEY = 'merchant_language'

const languageDescriptors: LanguageDescriptor[] = [
  { code: 'en', label: 'English', locale: 'en-US', currency: 'USD' },
  { code: 'zh-CN', label: '简体中文', locale: 'zh-CN', currency: 'CNY' },
  { code: 'es-ES', label: 'Español', locale: 'es-ES', currency: 'EUR' }
]

const translations: Dictionary = {
  en: {
    common: {
      loading: 'Loading...',
      retry: 'Retry',
      logout: 'Logout',
      searchPlaceholder: 'Search...',
      errorGeneric: 'Something went wrong.'
    },
    nav: {
      brand: 'Merchant Portal',
      dashboard: 'Dashboard',
      products: 'Products',
      orders: 'Orders',
      coupons: 'Coupons',
      login: 'Login',
      language: 'Language'
    },
    login: {
      heroTitle: 'Merchant Portal',
      heroSubtitle: 'Manage catalog, fulfil orders and track promotions in one place.',
      welcome: 'Welcome back',
      usernameLabel: 'Username or email',
      passwordLabel: 'Password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      submit: 'Sign in',
      submitting: 'Signing in...',
      sso: 'Sign in with SSO',
      disclaimer: 'By signing in you agree to our Terms of Service and Privacy Policy.',
      error: 'Sign in failed'
    },
    dashboard: {
      cards: {
        sales: 'Sales',
        orders: 'Orders',
        products: 'Products',
        coupons: 'Coupons'
      },
      placeholder: '—'
    },
    products: {
      title: 'Products',
      subtitle: 'Review and manage the items in your catalogue.',
      searchPlaceholder: 'Search products',
      empty: 'No products found.',
      error401: 'You need to sign in before accessing products.',
      errorGeneric: 'Failed to load products.',
      reload: 'Reload',
      add: 'Add product',
      stockLabel: 'Stock: {value}'
    },
    orders: {
      empty: 'No orders yet.'
    },
    coupons: {
      empty: 'No coupons yet.',
      discount: '{value}% off'
    },
    errorBoundary: {
      title: 'Something went wrong',
      description: 'Please refresh the page or go back to the dashboard.',
      refresh: 'Refresh page',
      home: 'Back to dashboard'
    }
  },
  'zh-CN': {
    common: {
      loading: '加载中...',
      retry: '重试',
      logout: '退出登录',
      searchPlaceholder: '搜索...',
      errorGeneric: '发生了一些错误。'
    },
    nav: {
      brand: '商家管理后台',
      dashboard: '概览',
      products: '商品',
      orders: '订单',
      coupons: '优惠券',
      login: '登录',
      language: '语言'
    },
    login: {
      heroTitle: '商家管理后台',
      heroSubtitle: '在这里管理商品、处理订单并追踪优惠活动。',
      welcome: '欢迎回来',
      usernameLabel: '用户名或邮箱',
      passwordLabel: '密码',
      rememberMe: '记住我',
      forgotPassword: '忘记密码？',
      submit: '登录',
      submitting: '正在登录...',
      sso: '使用 SSO 登录',
      disclaimer: '登录表示你同意我们的服务条款和隐私政策。',
      error: '登录失败'
    },
    dashboard: {
      cards: {
        sales: '销售额',
        orders: '订单数',
        products: '商品数',
        coupons: '优惠券'
      },
      placeholder: '—'
    },
    products: {
      title: '商品管理',
      subtitle: '查看并维护商品目录。',
      searchPlaceholder: '搜索商品',
      empty: '没有找到商品。',
      error401: '请先登录后再访问商品列表。',
      errorGeneric: '加载商品失败。',
      reload: '重新加载',
      add: '新增商品',
      stockLabel: '库存：{value}'
    },
    orders: {
      empty: '暂时没有订单。'
    },
    coupons: {
      empty: '暂无优惠券。',
      discount: '立减 {value}%'
    },
    errorBoundary: {
      title: '页面发生错误',
      description: '请刷新页面或返回概览页。',
      refresh: '刷新页面',
      home: '返回概览'
    }
  },
  'es-ES': {
    common: {
      loading: 'Cargando...',
      retry: 'Reintentar',
      logout: 'Cerrar sesión',
      searchPlaceholder: 'Buscar...',
      errorGeneric: 'Ha ocurrido un error.'
    },
    nav: {
      brand: 'Portal de Comerciantes',
      dashboard: 'Panel',
      products: 'Productos',
      orders: 'Pedidos',
      coupons: 'Cupones',
      login: 'Acceso',
      language: 'Idioma'
    },
    login: {
      heroTitle: 'Portal de Comerciantes',
      heroSubtitle: 'Gestiona catálogo, pedidos y promociones en un solo lugar.',
      welcome: 'Bienvenido de nuevo',
      usernameLabel: 'Usuario o correo',
      passwordLabel: 'Contraseña',
      rememberMe: 'Recordarme',
      forgotPassword: '¿Olvidaste la contraseña?',
      submit: 'Iniciar sesión',
      submitting: 'Iniciando...',
      sso: 'Acceder con SSO',
      disclaimer: 'Al iniciar sesión aceptas nuestros Términos y Política de privacidad.',
      error: 'Error al iniciar sesión'
    },
    dashboard: {
      cards: {
        sales: 'Ventas',
        orders: 'Pedidos',
        products: 'Productos',
        coupons: 'Cupones'
      },
      placeholder: '—'
    },
    products: {
      title: 'Productos',
      subtitle: 'Revisa y gestiona los artículos del catálogo.',
      searchPlaceholder: 'Buscar productos',
      empty: 'No se encontraron productos.',
      error401: 'Debes iniciar sesión para acceder a los productos.',
      errorGeneric: 'No se pudieron cargar los productos.',
      reload: 'Recargar',
      add: 'Añadir producto',
      stockLabel: 'Inventario: {value}'
    },
    orders: {
      empty: 'Aún no hay pedidos.'
    },
    coupons: {
      empty: 'No hay cupones.',
      discount: '{value}% de descuento'
    },
    errorBoundary: {
      title: 'Ha ocurrido un problema',
      description: 'Actualiza la página o vuelve al panel.',
      refresh: 'Actualizar',
      home: 'Volver al panel'
    }
  }
}

function resolveTranslation(record: TranslationRecord, key: string): string | TranslationRecord | undefined {
  if (!key.includes('.')) {
    return record[key]
  }
  const [segment, ...rest] = key.split('.')
  const next = record[segment]
  if (!next || typeof next === 'string') {
    return next
  }
  return resolveTranslation(next, rest.join('.'))
}

function formatTranslation(template: string, vars?: Variables) {
  if (!vars) return template
  return template.replace(/\{(.*?)\}/g, (_, token) => {
    const value = vars[token.trim()]
    return value !== undefined ? String(value) : ''
  })
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en'
    const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null
    if (stored && languageDescriptors.some((item) => item.code === stored)) {
      return stored
    }
    return 'en'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language)
    }
  }, [language])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const descriptor = languageDescriptors.find((item) => item.code === language)
      if (descriptor) {
        document.documentElement.lang = descriptor.locale
      }
    }
  }, [language])

  const descriptor = languageDescriptors.find((item) => item.code === language) ?? languageDescriptors[0]

  const translate = useMemo(
    () =>
      (key: string, vars?: Variables) => {
        const dict = translations[language]
        const result = resolveTranslation(dict, key)
        if (typeof result === 'string') {
          return formatTranslation(result, vars)
        }
        return key
      },
    [language]
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale: descriptor.locale,
      currency: descriptor.currency,
      t: translate,
      setLanguage,
      languages: languageDescriptors
    }),
    [descriptor.currency, descriptor.locale, language, translate]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}
