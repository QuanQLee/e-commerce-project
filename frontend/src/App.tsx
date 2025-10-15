import { Suspense, lazy, type LazyExoticComponent, type ComponentType } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useNavigate, Navigate } from 'react-router-dom'
import { Button, Container } from '@mui/material'
import Layout, { type NavItem } from './components/Layout'
import DashboardIcon from '@mui/icons-material/Dashboard'
import InventoryIcon from '@mui/icons-material/Inventory'
import AddBoxIcon from '@mui/icons-material/AddBox'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import PeopleIcon from '@mui/icons-material/People'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PaymentsIcon from '@mui/icons-material/Payments'
import PercentIcon from '@mui/icons-material/Percent'
import ReviewsIcon from '@mui/icons-material/Reviews'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import SecurityIcon from '@mui/icons-material/Security'
import ProtectedRoute from './components/ProtectedRoute'
import api from './api/api'
import { clearSession } from './auth'
import Loading from './components/Loading'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProductList = lazy(() => import('./pages/ProductList'))
const AddProduct = lazy(() => import('./pages/AddProduct'))
const OrderList = lazy(() => import('./pages/OrderList'))
const AddOrder = lazy(() => import('./pages/AddOrder'))
const UserList = lazy(() => import('./pages/UserList'))
const AddUser = lazy(() => import('./pages/AddUser'))
const ShipmentList = lazy(() => import('./pages/ShipmentList'))
const AddShipment = lazy(() => import('./pages/AddShipment'))
const PaymentList = lazy(() => import('./pages/PaymentList'))
const AddPayment = lazy(() => import('./pages/AddPayment'))
const CouponList = lazy(() => import('./pages/CouponList'))
const AddCoupon = lazy(() => import('./pages/AddCoupon'))
const ReviewList = lazy(() => import('./pages/ReviewList'))
const AddReview = lazy(() => import('./pages/AddReview'))
const Recommendation = lazy(() => import('./pages/Recommendation'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Metrics = lazy(() => import('./pages/Metrics'))
const RiskCheck = lazy(() => import('./pages/RiskCheck'))
const Login = lazy(() => import('./pages/Login'))

interface RouteConfig {
  path: string
  component: LazyExoticComponent<ComponentType>
  nav?: NavItem
}

const routeConfig: RouteConfig[] = [
  { path: '/', component: Dashboard, nav: { label: 'Dashboard', path: '/', icon: <DashboardIcon /> } },
  { path: '/products', component: ProductList, nav: { label: 'Products', path: '/products', icon: <InventoryIcon /> } },
  { path: '/add-product', component: AddProduct, nav: { label: 'Add Product', path: '/add-product', icon: <AddBoxIcon /> } },
  { path: '/orders', component: OrderList, nav: { label: 'Orders', path: '/orders', icon: <ShoppingCartIcon /> } },
  { path: '/add-order', component: AddOrder, nav: { label: 'Add Order', path: '/add-order', icon: <AddBoxIcon /> } },
  { path: '/users', component: UserList, nav: { label: 'Users', path: '/users', icon: <PeopleIcon /> } },
  { path: '/add-user', component: AddUser, nav: { label: 'Add User', path: '/add-user', icon: <AddBoxIcon /> } },
  { path: '/shipments', component: ShipmentList, nav: { label: 'Shipments', path: '/shipments', icon: <LocalShippingIcon /> } },
  { path: '/add-shipment', component: AddShipment, nav: { label: 'Add Shipment', path: '/add-shipment', icon: <AddBoxIcon /> } },
  { path: '/payments', component: PaymentList, nav: { label: 'Payments', path: '/payments', icon: <PaymentsIcon /> } },
  { path: '/add-payment', component: AddPayment, nav: { label: 'Add Payment', path: '/add-payment', icon: <AddBoxIcon /> } },
  { path: '/coupons', component: CouponList, nav: { label: 'Coupons', path: '/coupons', icon: <PercentIcon /> } },
  { path: '/add-coupon', component: AddCoupon, nav: { label: 'Add Coupon', path: '/add-coupon', icon: <AddBoxIcon /> } },
  { path: '/reviews', component: ReviewList, nav: { label: 'Reviews', path: '/reviews', icon: <ReviewsIcon /> } },
  { path: '/add-review', component: AddReview, nav: { label: 'Add Review', path: '/add-review', icon: <AddBoxIcon /> } },
  { path: '/recommendations', component: Recommendation, nav: { label: 'Recommendations', path: '/recommendations', icon: <AutoGraphIcon /> } },
  { path: '/inventory', component: Inventory, nav: { label: 'Inventory', path: '/inventory', icon: <InventoryIcon /> } },
  { path: '/metrics', component: Metrics, nav: { label: 'Metrics', path: '/metrics', icon: <AutoGraphIcon /> } },
  { path: '/risk-check', component: RiskCheck, nav: { label: 'Risk Check', path: '/risk-check', icon: <SecurityIcon /> } },
]

const navItems: NavItem[] = routeConfig
  .map((route) => route.nav)
  .filter((navItem): navItem is NavItem => Boolean(navItem))

function AdminLayout({ nav }: { nav: NavItem[] }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.warn('[admin] logout failed', error)
    } finally {
      clearSession()
      navigate('/login', { replace: true })
    }
  }

  return (
    <Layout
      title="E-Commerce Admin"
      nav={nav}
      actions={
        <Button variant="outlined" size="small" onClick={handleLogout}>
          Logout
        </Button>
      }
    >
      <Container maxWidth="lg">
        <Outlet />
      </Container>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading lines={3} />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout nav={navItems} />}>
              {routeConfig.map(({ path, component: Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

