Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Registry,
    [string]$Tag = "latest",
    [string]$ComposeFile = "services/docker-compose.ecs.yml",
    [string]$DockerContext = "ecs"
)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI is not available on PATH. Install Docker Desktop or the CLI before running this script."
}

if (-not (Test-Path $ComposeFile)) {
    Write-Host "Generating $ComposeFile from services/docker-compose.yml" -ForegroundColor Cyan
    python scripts/generate-ecs-compose.py
}

$env:REGISTRY = $Registry
$env:TAG = $Tag

$previousContext = (& docker context show).Trim()
Write-Host "Current docker context: $previousContext" -ForegroundColor DarkGray
Write-Host "Switching to docker context $DockerContext" -ForegroundColor Cyan
& docker context use $DockerContext | Out-Null

try {
    Write-Host "Deploying services to ECS from $ComposeFile" -ForegroundColor Green
    & docker compose -f $ComposeFile up
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose exited with status code $LASTEXITCODE"
    }
}
finally {
    if ($previousContext) {
        Write-Host "Restoring docker context $previousContext" -ForegroundColor DarkGray
        & docker context use $previousContext | Out-Null
    }
}
