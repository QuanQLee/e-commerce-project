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
      cancel: 'Cancel',
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
      confirmPasswordLabel: 'Confirm password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      submit: 'Sign in',
      submitting: 'Signing in...',
      createAccount: 'Create account',
      creating: 'Creating...',
      passwordMismatch: 'Passwords do not match.',
      registerSuccess: 'Account created. You can now sign in.',
      noAccountPrompt: 'Need an account?',
      haveAccountPrompt: 'Already have an account?',
      switchToRegister: 'Create one',
      switchToLogin: 'Back to sign in',
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
      placeholder: 'Data coming soon'
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
      stockLabel: 'Stock: {value}',
      createSuccess: 'Product created',
      createFailure: 'Failed to create product',
      formName: 'Name',
      formDescription: 'Description (optional)',
      formPrice: 'Price',
      formCategory: 'Category (optional)',
      formStock: 'Initial stock',
      nameRequired: 'Name is required',
      priceInvalid: 'Enter a valid non-negative price',
      stockInvalid: 'Enter a valid non-negative stock quantity'
    },
    orders: {
      title: 'Orders',
      empty: 'No orders yet.',
      filter: 'Status filter',
      filterAll: 'All statuses',
      reload: 'Reload',
      loadFailed: 'Failed to load orders.',
      updateFailed: 'Failed to update order status.',
      viewDetails: 'View details',
      detailTitle: 'Order {id}',
      noSelection: 'No order selected.',
      itemsHeading: 'Line items',
      quantityLabel: 'Qty: {value}',
      close: 'Close',
      updateLabel: 'Update status',
      table: {
        id: 'Order ID',
        created: 'Created at',
        total: 'Total',
        status: 'Status',
        actions: 'Actions'
      },
      status: {
        created: 'Created',
        paid: 'Paid',
        fulfilled: 'Fulfilled',
        cancelled: 'Cancelled'
      }
    },
    coupons: {
      empty: 'No coupons yet.',
      discount: '{value}% off',
      create: 'Create coupon',
      codeLabel: 'Coupon code',
      discountLabel: 'Discount (%)',
      createSuccess: 'Coupon created',
      createFailure: 'Failed to create coupon',
      codeRequired: 'Code is required',
      discountInvalid: 'Enter a discount between 0 and 100'
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
      cancel: '取消',
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
      placeholder: '数据稍后更新'
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
      stockLabel: '库存：{value}',
      createSuccess: '创建商品成功',
      createFailure: '创建商品失败',
      formName: '商品名称',
      formDescription: '商品描述（可选）',
      formPrice: '价格',
      formCategory: '品类（可选）',
      formStock: '初始库存',
      nameRequired: '商品名称不能为空',
      priceInvalid: '请输入有效的非负价格',
      stockInvalid: '请输入有效的非负库存数量'
    },
    orders: {
      title: '订单管理',
      empty: '暂时没有订单。',
      filter: '按状态筛选',
      filterAll: '全部状态',
      reload: '重新加载',
      loadFailed: '加载订单失败。',
      updateFailed: '更新订单状态失败。',
      viewDetails: '查看详情',
      detailTitle: '订单 {id}',
      noSelection: '未选择订单。',
      itemsHeading: '订单行项目',
      quantityLabel: '数量：{value}',
      close: '关闭',
      updateLabel: '更新状态',
      table: {
        id: '订单号',
        created: '创建时间',
        total: '订单金额',
        status: '状态',
        actions: '操作'
      },
      status: {
        created: '已创建',
        paid: '已支付',
        fulfilled: '已履约',
        cancelled: '已取消'
      }
    },
    coupons: {
      empty: '暂无优惠券。',
      discount: '立减 {value}%',
      create: '新建优惠券',
      codeLabel: '优惠码',
      discountLabel: '折扣（%）',
      createSuccess: '创建优惠券成功',
      createFailure: '创建优惠券失败',
      codeRequired: '优惠码不能为空',
      discountInvalid: '请输入 0-100 之间的折扣'
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
      cancel: 'Cancelar',
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
      placeholder: 'Datos disponibles en breve'
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
      stockLabel: 'Inventario: {value}',
      createSuccess: 'Producto creado',
      createFailure: 'No se pudo crear el producto',
      formName: 'Nombre del producto',
      formDescription: 'Descripción (opcional)',
      formPrice: 'Precio',
      formCategory: 'Categoría (opcional)',
      formStock: 'Inventario inicial',
      nameRequired: 'El nombre es obligatorio',
      priceInvalid: 'Introduce un precio válido y no negativo',
      stockInvalid: 'Introduce una cantidad de inventario válida y no negativa'
    },
    orders: {
      title: 'Pedidos',
      empty: 'Aún no hay pedidos.',
      filter: 'Filtrar por estado',
      filterAll: 'Todos los estados',
      reload: 'Recargar',
      loadFailed: 'No se pudieron cargar los pedidos.',
      updateFailed: 'No se pudo actualizar el estado del pedido.',
      viewDetails: 'Ver detalles',
      detailTitle: 'Pedido {id}',
      noSelection: 'Ningún pedido seleccionado.',
      itemsHeading: 'Artículos',
      quantityLabel: 'Cant.: {value}',
      close: 'Cerrar',
      updateLabel: 'Actualizar estado',
      table: {
        id: 'ID del pedido',
        created: 'Creado',
        total: 'Total',
        status: 'Estado',
        actions: 'Acciones'
      },
      status: {
        created: 'Creado',
        paid: 'Pagado',
        fulfilled: 'Enviado',
        cancelled: 'Cancelado'
      }
    },
    coupons: {
      empty: 'No hay cupones.',
      discount: '{value}% de descuento',
      create: 'Crear cupón',
      codeLabel: 'Código del cupón',
      discountLabel: 'Descuento (%)',
      createSuccess: 'Cupón creado',
      createFailure: 'No se pudo crear el cupón',
      codeRequired: 'El código es obligatorio',
      discountInvalid: 'Introduce un descuento entre 0 y 100'
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
        const fallbackResult = resolveTranslation(translations.en, key)
        if (typeof fallbackResult === 'string') {
          return formatTranslation(fallbackResult, vars)
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
