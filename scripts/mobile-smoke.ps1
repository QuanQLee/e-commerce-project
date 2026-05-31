param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$Username = "user1",
    [string]$Password = "pass1",
    [string]$TenantId = "tenant-a",
    [switch]$CreateOrder
)

$ErrorActionPreference = "Stop"

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    $invokeParams = @{
        Method      = $Method
        Uri         = $Url
        Headers     = $Headers
        ContentType = "application/json"
    }

    if ($null -ne $Body) {
        $invokeParams.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    Invoke-RestMethod @invokeParams
}

$normalizedBase = $BaseUrl.TrimEnd("/")

try {
    $healthStatus = Invoke-WebRequest -UseBasicParsing -Uri "$normalizedBase/healthz" -TimeoutSec 5
    if ($healthStatus.StatusCode -lt 200 -or $healthStatus.StatusCode -ge 300) {
        throw "Gateway health check returned HTTP $($healthStatus.StatusCode)."
    }
} catch {
    throw "Cannot reach $normalizedBase. Start Docker Desktop and bring up the Gateway/Bff stack before running mobile-smoke."
}

Write-Host "[1/4] Signing in through mobile auth..."
$loginResponse = Invoke-JsonRequest `
    -Method "POST" `
    -Url "$normalizedBase/auth/mobile/login" `
    -Body @{
        username  = $Username
        password  = $Password
        tenant_id = $TenantId
        scope     = "api1 offline_access"
    }

if (-not $loginResponse.access_token) {
    throw "Mobile login did not return an access token."
}

$headers = @{
    Authorization = "Bearer $($loginResponse.access_token)"
    "X-Tenant-Id" = $loginResponse.tenant_id
    Accept        = "application/json"
}

Write-Host "[2/4] Fetching products..."
$products = Invoke-JsonRequest `
    -Method "GET" `
    -Url "$normalizedBase/api/v1/catalog/products" `
    -Headers $headers

$productCount = @($products).Count
Write-Host "Products returned: $productCount"

Write-Host "[3/4] Fetching orders..."
$orders = Invoke-JsonRequest `
    -Method "GET" `
    -Url "$normalizedBase/api/v1/order/orders" `
    -Headers $headers

$orderCount = @($orders).Count
Write-Host "Orders returned: $orderCount"

if ($CreateOrder) {
    $firstProduct = @($products) | Select-Object -First 1
    if ($null -eq $firstProduct) {
        throw "No product available to create a smoke order."
    }

    Write-Host "[4/4] Creating a smoke order..."
    $orderResponse = Invoke-JsonRequest `
        -Method "POST" `
        -Url "$normalizedBase/api/v1/order/orders" `
        -Headers $headers `
        -Body @{
            items  = @(
                @{
                    productName = $firstProduct.name
                    price       = $firstProduct.price
                }
            )
            total = $firstProduct.price
        }

    Write-Host "Smoke order created: $orderResponse"
} else {
    Write-Host "[4/4] Skipping order creation. Pass -CreateOrder to exercise POST /api/v1/order/orders."
}

Write-Host "Mobile smoke passed."
