import { render, screen } from '@testing-library/react'
import ProductList from './ProductList'
import api from '../api/api'

jest.mock('../api/api')

describe('ProductList', () => {
  it('renders products from API', async () => {
    const products = [
      { id: '1', name: 'Test Product', description: 'Desc', price: 10 }
    ]
    ;(api.get as jest.Mock).mockResolvedValue({ data: products })

    render(<ProductList />)

    expect(api.get).toHaveBeenCalledWith('/api/v1/catalog/products')
    expect(await screen.findByText('Test Product')).toBeInTheDocument()
  })
})
