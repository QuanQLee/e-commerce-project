import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AppBar, Toolbar, Button, Container } from '@mui/material'
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
  return (
    <BrowserRouter>
      <AppBar position="static">
        <Toolbar sx={{ flexWrap: 'wrap' }}>
          <Button color="inherit" component={Link} to="/">Products</Button>
          <Button color="inherit" component={Link} to="/add-product">Add Product</Button>
          <Button color="inherit" component={Link} to="/orders">Orders</Button>
          <Button color="inherit" component={Link} to="/add-order">Add Order</Button>
          <Button color="inherit" component={Link} to="/users">Users</Button>
          <Button color="inherit" component={Link} to="/add-user">Add User</Button>
          <Button color="inherit" component={Link} to="/shipments">Shipments</Button>
          <Button color="inherit" component={Link} to="/add-shipment">Add Shipment</Button>
          <Button color="inherit" component={Link} to="/payments">Payments</Button>
          <Button color="inherit" component={Link} to="/add-payment">Add Payment</Button>
          <Button color="inherit" component={Link} to="/coupons">Coupons</Button>
          <Button color="inherit" component={Link} to="/add-coupon">Add Coupon</Button>
          <Button color="inherit" component={Link} to="/reviews">Reviews</Button>
          <Button color="inherit" component={Link} to="/add-review">Add Review</Button>
          <Button color="inherit" component={Link} to="/recommendations">Recommendations</Button>
          <Button color="inherit" component={Link} to="/inventory">Inventory</Button>
          <Button color="inherit" component={Link} to="/metrics">Metrics</Button>
          <Button color="inherit" component={Link} to="/risk-check">Risk Check</Button>
          <Button color="inherit" component={Link} to="/login">Login</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 2 }}>
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
    </BrowserRouter>
  )
}
