import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Container } from '@mui/material'
import Layout, { type NavItem } from './components/Layout'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AddBoxIcon from '@mui/icons-material/AddBox'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import PeopleIcon from '@mui/icons-material/People'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PaymentsIcon from '@mui/icons-material/Payments'
import InventoryIcon from '@mui/icons-material/Inventory'
import PercentIcon from '@mui/icons-material/Percent'
import ReviewsIcon from '@mui/icons-material/Reviews'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import SecurityIcon from '@mui/icons-material/Security'
import LoginIcon from '@mui/icons-material/Login'
import ProductList from './pages/ProductList'
import AddProduct from './pages/AddProduct'
import OrderList from './pages/OrderList'
import AddOrder from './pages/AddOrder'
import UserList from './pages/UserList'
import AddUser from './pages/AddUser'
import ShipmentList from './pages/ShipmentList'
import AddShipment from './pages/AddShipment'
import PaymentList from './pages/PaymentList'
import AddPayment from './pages/AddPayment'
import Metrics from './pages/Metrics'
import Login from './pages/Login'
import RiskCheck from './pages/RiskCheck'
import Inventory from './pages/Inventory'
import AddCoupon from './pages/AddCoupon'
import CouponList from './pages/CouponList'
import AddReview from './pages/AddReview'
import ReviewList from './pages/ReviewList'
import Recommendation from './pages/Recommendation'

export default function App() {
  const nav: NavItem[] = [
    { label: 'Products', path: '/', icon: <DashboardIcon /> },
    { label: 'Add Product', path: '/add-product', icon: <AddBoxIcon /> },
    { label: 'Orders', path: '/orders', icon: <ShoppingCartIcon /> },
    { label: 'Add Order', path: '/add-order', icon: <AddBoxIcon /> },
    { label: 'Users', path: '/users', icon: <PeopleIcon /> },
    { label: 'Add User', path: '/add-user', icon: <AddBoxIcon /> },
    { label: 'Shipments', path: '/shipments', icon: <LocalShippingIcon /> },
    { label: 'Add Shipment', path: '/add-shipment', icon: <AddBoxIcon /> },
    { label: 'Payments', path: '/payments', icon: <PaymentsIcon /> },
    { label: 'Add Payment', path: '/add-payment', icon: <AddBoxIcon /> },
    { label: 'Coupons', path: '/coupons', icon: <PercentIcon /> },
    { label: 'Add Coupon', path: '/add-coupon', icon: <AddBoxIcon /> },
    { label: 'Reviews', path: '/reviews', icon: <ReviewsIcon /> },
    { label: 'Add Review', path: '/add-review', icon: <AddBoxIcon /> },
    { label: 'Recommendations', path: '/recommendations', icon: <AutoGraphIcon /> },
    { label: 'Inventory', path: '/inventory', icon: <InventoryIcon /> },
    { label: 'Metrics', path: '/metrics', icon: <AutoGraphIcon /> },
    { label: 'Risk Check', path: '/risk-check', icon: <SecurityIcon /> },
    { label: 'Login', path: '/login', icon: <LoginIcon /> },
  ]
  return (
    <BrowserRouter>
      <Layout title="E‑Commerce Admin" nav={nav}>
        <Container maxWidth="lg">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/add-order" element={<AddOrder />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/add-user" element={<AddUser />} />
            <Route path="/shipments" element={<ShipmentList />} />
            <Route path="/add-shipment" element={<AddShipment />} />
            <Route path="/payments" element={<PaymentList />} />
            <Route path="/add-payment" element={<AddPayment />} />
            <Route path="/coupons" element={<CouponList />} />
            <Route path="/add-coupon" element={<AddCoupon />} />
            <Route path="/reviews" element={<ReviewList />} />
            <Route path="/add-review" element={<AddReview />} />
            <Route path="/recommendations" element={<Recommendation />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/login" element={<Login />} />
            <Route path="/risk-check" element={<RiskCheck />} />
          </Routes>
        </Container>
      </Layout>
    </BrowserRouter>
  )
}
