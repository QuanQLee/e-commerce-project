# Cart Service Minimum Requirements

## Base URL
- **HTTP**: `http://<host>:5010`

## Example Endpoints
- `GET /cart/{userId}` – get cart items
- `POST /cart/{userId}/items` – add product to cart
- `PUT /cart/{userId}/items/{productId}` – update quantity
- `POST /cart/{userId}/checkout` – checkout and create order
