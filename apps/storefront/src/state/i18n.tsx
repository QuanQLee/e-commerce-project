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

const STORAGE_KEY = 'storefront_language'

const languageDescriptors: LanguageDescriptor[] = [
  { code: 'en', label: 'English', locale: 'en-US', currency: 'USD' },
  { code: 'zh-CN', label: '简体中文', locale: 'zh-CN', currency: 'CNY' },
  { code: 'es-ES', label: 'Español', locale: 'es-ES', currency: 'EUR' }
]

const translations: Dictionary = {
  en: {
    common: {
      retry: 'Retry',
      reset: 'Reset',
      soldOut: 'Sold out',
      addToCart: 'Add to cart',
      noDescription: 'No description available yet.'
    },
    nav: {
      brand: 'Storefront',
      products: 'Products',
      cart: 'Cart',
      account: 'Account',
      menu: 'Menu',
      close: 'Close',
      heroTitle: 'Storefront',
      heroSubtitle: 'A modern e-commerce starter. Browse products, add to cart and checkout.',
      browseProducts: 'Browse Products',
      viewCart: 'View Cart',
      highlights: 'Highlights',
      popular: 'Popular',
      newArrivals: 'New Arrivals',
      bestDeals: 'Best Deals'
    },
    home: {
      curatedHeading: 'Curated Collections',
      curatedSubtitle: 'Explore collections curated by our team based on trends and customer favourites.',
      collectionTrending: 'Trending Now',
      collectionEssentials: 'Everyday Essentials',
      collectionSustainable: 'Sustainable Picks',
      collectionTrendingDescription: 'Discover the products everyone is talking about this week.',
      collectionEssentialsDescription: 'Reliable staples you will reach for every single day.',
      collectionSustainableDescription: 'Eco-friendly items crafted with the planet in mind.'
    },
    products: {
      title: 'Products',
      subtitle: 'Tap a card to focus and reveal the finer details.',
      actionReset: 'Clear focus',
      actionRetry: 'Reload',
      actionAddToCart: 'Add to cart',
      actionSoldOut: 'Sold out',
      badgeFreeShipping: 'Free shipping',
      badgeReturns: '30-day returns',
      emptyTitle: 'No products yet',
      emptySubtitle: 'We will populate this catalogue once the catalog service is online. Try again later.',
      errorRequiresLogin: 'You need to sign in before viewing products.',
      errorGeneric: 'Unable to load products right now.',
      noDescription: 'No description available yet.',
      stockOut: 'Out of stock',
      toastAdded: '{name} added to cart'
    },
    errorBoundary: {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Try refreshing the page or return home.',
      actionReload: 'Refresh page',
      actionHome: 'Back to home'
    },
    cart: {
      empty: 'Your cart is currently empty.',
      header: 'Cart',
      remove: 'Remove',
      clear: 'Clear cart',
      proceedToCheckout: 'Proceed to checkout',
      summaryTotal: 'Order total',
      table: {
        product: 'Product',
        price: 'Price',
        quantity: 'Quantity',
        total: 'Subtotal',
        actions: 'Actions'
      }
    },
    checkout: {
      title: 'Checkout',
      success: 'Order placed successfully! Redirecting to your order history...',
      steps: {
        details: 'Details',
        shipping: 'Shipping',
        payment: 'Payment',
        review: 'Review'
      },
      form: {
        name: 'Full name',
        email: 'Email',
        phone: 'Phone number',
        address1: 'Address line 1',
        address2: 'Address line 2 (optional)',
        city: 'City',
        postal: 'Postal code',
        country: 'Country/Region',
        shipping: 'Select a shipping option',
        notes: 'Order notes (optional)',
        payment: 'Choose a payment method',
        cardNumber: 'Card number',
        cardExpiry: 'Expiry (MM/YY)',
        cardCvc: 'Security code'
      },
      shipping: {
        standard: 'Standard (3-5 business days)',
        express: 'Express (1-2 business days, $12)'
      },
      payment: {
        card: 'Credit / Debit Card',
        cod: 'Cash on delivery'
      },
      review: {
        items: 'Items',
        shipping: 'Shipping method',
        payment: 'Payment method'
      },
      summary: {
        items: 'Items subtotal',
        shipping: 'Shipping',
        free: 'Free',
        total: 'Total due'
      },
      actions: {
        back: 'Back',
        next: 'Next step',
        placeOrder: 'Place order',
        submitting: 'Submitting...'
      },
      errors: {
        nameRequired: 'Name is required',
        emailRequired: 'Email is required',
        addressRequired: 'Address is required',
        cityRequired: 'City and country are required',
        postalRequired: 'Postal code is required',
        cardNumber: 'Enter a valid card number',
        cardCvc: 'Enter a valid CVC',
        cardExpiry: 'Use the MM/YY format for expiry',
        emptyCart: 'Your cart is empty. Add items before checking out.',
        submitFailed: 'Failed to submit order. Please try again.'
      }
    },
    account: {
      header: 'Account',
      message: 'Manage your purchases, preferences and saved items.',
      overview: {
        cartItems: 'Items in cart',
        orders: 'Orders',
        ordersHint: 'Track recent purchases and delivery status.',
        viewCart: 'Open cart',
        viewOrders: 'View orders'
      },
      preferences: {
        title: 'Preferences',
        language: 'Current language: {code}',
        support: 'Need help? Contact support any time.'
      },
      orders: {
        title: 'Order history',
        loading: 'Loading orders...',
        empty: 'No orders yet. Start shopping to place your first order.',
        loadFailed: 'Failed to load orders.',
        orderId: 'Order {id}',
        unknownDate: 'Date unavailable',
        toggle: 'Toggle order details',
        itemsHeading: 'Items in this order',
        status: {
          created: 'Created',
          paid: 'Paid',
          fulfilled: 'Fulfilled',
          cancelled: 'Cancelled',
          unknown: 'Unknown status: {fallback}'
        }
      }
    },
    i18n: {
      label: 'Language'
    }
  },
  'zh-CN': {
    common: {
      retry: '重试',
      reset: '清除选中',
      soldOut: '已售罄',
      addToCart: '加入购物车',
      noDescription: '暂时没有产品描述。'
    },
    nav: {
      brand: 'Storefront',
      products: '商品',
      cart: '购物车',
      account: '账户',
      menu: '菜单',
      close: '关闭',
      heroTitle: 'Storefront 店铺',
      heroSubtitle: '现代化电商前台，浏览商品、加入购物车并完成结算。',
      browseProducts: '立即选购',
      viewCart: '查看购物车',
      highlights: '推荐专区',
      popular: '热门',
      newArrivals: '新品',
      bestDeals: '优惠'
    },
    home: {
      curatedHeading: '精选主题',
      curatedSubtitle: '跟随趋势与口碑，看看我们为你准备的热门主题馆。',
      collectionTrending: '本周热度',
      collectionEssentials: '日常必备',
      collectionSustainable: '环保之选',
      collectionTrendingDescription: '发现本周讨论度最高的人气商品。',
      collectionEssentialsDescription: '好用且耐看的日常款式，百搭不过时。',
      collectionSustainableDescription: '兼顾设计与环保理念的可持续商品。'
    },
    products: {
      title: '全部商品',
      subtitle: '点击卡片可聚焦并查看更多信息。',
      actionReset: '清除选中',
      actionRetry: '重新加载',
      actionAddToCart: '加入购物车',
      actionSoldOut: '已售罄',
      badgeFreeShipping: '包邮',
      badgeReturns: '30 天退换',
      emptyTitle: '暂时没有商品',
      emptySubtitle: '待目录服务启动后即可同步展示商品数据，请稍后再试。',
      errorRequiresLogin: '需要登录后才能查看商品，请先登录。',
      errorGeneric: '暂时无法加载商品列表。',
      noDescription: '暂时没有产品描述。',
      stockOut: '缺货',
      toastAdded: '{name} 已加入购物车'
    },
    errorBoundary: {
      title: '页面出错了',
      description: '我们遇到了一点小问题。请刷新页面或返回首页。',
      actionReload: '刷新页面',
      actionHome: '返回首页'
    },
    cart: {
      empty: '购物车功能即将上线。',
      header: '购物车'
    },
    account: {
      header: '账户',
      message: '请先在 Admin 或 Merchant 后台登录以管理账户。'
    },
    i18n: {
      label: '语言'
    }
  },
  'es-ES': {
    common: {
      retry: 'Reintentar',
      reset: 'Limpiar selección',
      soldOut: 'Agotado',
      addToCart: 'Añadir al carrito',
      noDescription: 'Descripción no disponible todavía.'
    },
    nav: {
      brand: 'Storefront',
      products: 'Productos',
      cart: 'Carrito',
      account: 'Cuenta',
      menu: 'Menú',
      close: 'Cerrar',
      heroTitle: 'Storefront',
      heroSubtitle: 'La experiencia moderna de comercio electrónico: busca productos, añádelos al carrito y finaliza la compra.',
      browseProducts: 'Explorar productos',
      viewCart: 'Ver carrito',
      highlights: 'Destacados',
      popular: 'Populares',
      newArrivals: 'Novedades',
      bestDeals: 'Ofertas'
    },
    home: {
      curatedHeading: 'Colecciones destacadas',
      curatedSubtitle: 'Explora colecciones seleccionadas por nuestro equipo según las tendencias y favoritos.',
      collectionTrending: 'Tendencias',
      collectionEssentials: 'Imprescindibles',
      collectionSustainable: 'Selección sostenible',
      collectionTrendingDescription: 'Descubre los productos de los que todo el mundo habla esta semana.',
      collectionEssentialsDescription: 'Básicos confiables para tu día a día.',
      collectionSustainableDescription: 'Artículos respetuosos con el planeta y con estilo.'
    },
    products: {
      title: 'Productos',
      subtitle: 'Pulsa una tarjeta para enfocarla y ver más detalles.',
      actionReset: 'Limpiar selección',
      actionRetry: 'Recargar',
      actionAddToCart: 'Añadir al carrito',
      actionSoldOut: 'Agotado',
      badgeFreeShipping: 'Envío gratis',
      badgeReturns: 'Devoluciones 30 días',
      emptyTitle: 'No hay productos todavía',
      emptySubtitle: 'El catálogo aparecerá en cuanto esté activo el servicio. Vuelve más tarde.',
      errorRequiresLogin: 'Debes iniciar sesión para ver los productos.',
      errorGeneric: 'No se pueden cargar los productos ahora mismo.',
      noDescription: 'Descripción no disponible todavía.',
      stockOut: 'Sin stock',
      toastAdded: '{name} añadido al carrito'
    },
    errorBoundary: {
      title: 'Algo ha fallado',
      description: 'Ha ocurrido un error inesperado. Actualiza la página o vuelve al inicio.',
      actionReload: 'Actualizar',
      actionHome: 'Volver al inicio'
    },
    cart: {
      empty: 'La funcionalidad del carrito estará disponible pronto.',
      header: 'Carrito'
    },
    account: {
      header: 'Cuenta',
      message: 'Inicia sesión desde el portal Admin o Merchant para gestionar tu cuenta.'
    },
    i18n: {
      label: 'Idioma'
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

