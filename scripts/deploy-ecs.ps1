param(
    [Parameter(Mandatory=$true)][string]$Registry,
    [string]$Tag = "latest",
    [string]$ComposeFile = "services/docker-compose.ecs.yml",
    [string]$DockerContext = "ecs"
)

if (-not (Test-Path $ComposeFile)) {
    Write-Host "Generating $ComposeFile from services/docker-compose.yml" -ForegroundColor Cyan
    python scripts/generate-ecs-compose.py
}

$env:REGISTRY = $Registry
$env:TAG = $Tag

Write-Host "Using docker context $DockerContext" -ForegroundColor Cyan
& docker context use $DockerContext | Out-Null

Write-Host "Deploying services to ECS from $ComposeFile" -ForegroundColor Green
& docker compose -f $ComposeFile up
