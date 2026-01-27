Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Host,
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$KeyPath,
    [Parameter(Mandatory = $true)][string]$Registry,
    [string]$Tag = "latest",
    [string[]]$ComposeFile = @("services/docker-compose.yml"),
    [string]$RemotePath = "/opt/ecommerce",
    [string]$EnvFile,
    [int]$KeepReleases = 5,
    [string]$HealthCheckUrl,
    [int]$HealthCheckTimeoutSeconds = 60,
    [int]$HealthCheckIntervalSeconds = 5,
    [string]$AwsRegion,
    [string[]]$Secrets = @(),
    [switch]$ProvisionDbRoles,
    [ValidateSet("remote", "local")][string]$ProvisionDbRolesMode = "remote",
    [string]$ProvisionDbRolesScript = "scripts/provision-db-roles.sh",
    [switch]$RunSmokeChecks,
    [string]$SmokeChecksScript = "scripts/smoke-checks.sh",
    [switch]$DryRun
)

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw "ssh command not found. Install OpenSSH client before running this script."
}
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    throw "scp command not found. Install OpenSSH client before running this script."
}
if (-not (Test-Path -LiteralPath $KeyPath)) {
    throw "KeyPath '$KeyPath' does not exist."
}
foreach ($file in $ComposeFile) {
    if (-not (Test-Path -LiteralPath $file)) {
        throw "Compose file '$file' does not exist."
    }
}
if ($EnvFile -and -not (Test-Path -LiteralPath $EnvFile)) {
    throw "EnvFile '$EnvFile' does not exist."
}
if ($KeepReleases -lt 1) {
    throw "KeepReleases must be greater than zero."
}
if ($HealthCheckTimeoutSeconds -lt 0) {
    throw "HealthCheckTimeoutSeconds must be zero or greater."
}
if ($HealthCheckIntervalSeconds -lt 1) {
    throw "HealthCheckIntervalSeconds must be at least 1."
}
if ($Secrets.Count -gt 0) {
    if (-not $AwsRegion) {
        throw "AwsRegion must be specified when Secrets are provided."
    }
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        throw "AWS CLI (aws) not found. Install and configure it before using the Secrets parameter."
    }
}
if ($ProvisionDbRoles -and -not (Test-Path -LiteralPath $ProvisionDbRolesScript)) {
    throw "ProvisionDbRolesScript '$ProvisionDbRolesScript' does not exist."
}
if ($RunSmokeChecks -and -not (Test-Path -LiteralPath $SmokeChecksScript)) {
    throw "SmokeChecksScript '$SmokeChecksScript' does not exist."
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$releaseName = "release-$timestamp"
$releaseDir = "$RemotePath/releases/$releaseName"

$script:RemotePath = $RemotePath
$script:Host = $Host
$script:User = $User

$composeUploads = @()
foreach ($file in $ComposeFile) {
    $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("deploy-" + [System.IO.Path]::GetFileName($file))
    Copy-Item -LiteralPath $file -Destination $temp -Force
    $composeUploads += [PSCustomObject]@{
        Temp = $temp
        Name = [System.IO.Path]::GetFileName($file)
    }
}

try {
    $script:sshExe = "ssh"
    $script:scpExe = "scp"
    $script:sshBaseArgs = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new", "$User@$Host")
    $script:scpBaseArgs = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new")
    $script:isDryRun = [bool]$DryRun

    function Invoke-External {
        param(
            [string]$Exe,
            [string[]]$Arguments
        )
        if ($script:isDryRun) {
            Write-Host "[dry-run] $Exe $($Arguments -join ' ')"
            return
        }
        & $Exe @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Exe exited with code $LASTEXITCODE"
        }
    }

    function Invoke-RemoteScript {
        param(
            [string]$Script,
            [string]$Description
        )
        Write-Host $Description -ForegroundColor Cyan
        $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Script))
        $command = "bash -lc `"echo '$encoded' | base64 --decode | bash`""
        Invoke-External $script:sshExe ($script:sshBaseArgs + $command)
    }

    function Invoke-RemoteCommand {
        param(
            [string]$Command
        )
        $arguments = $script:sshBaseArgs + $Command
        if ($script:isDryRun) {
            Write-Host "[dry-run] $script:sshExe $($arguments -join ' ')"
            return ""
        }
        $output = & $script:sshExe @arguments
        if ($LASTEXITCODE -ne 0) {
            throw "ssh command failed with exit code $LASTEXITCODE"
        }
        return $output
    }

    function Copy-ToRemote {
        param(
            [string]$Source,
            [string]$Destination
        )
        $display = "$Destination".Replace("$script:RemotePath", $script:RemotePath)
        Write-Host "Uploading $(Split-Path -Leaf $Source) -> $display" -ForegroundColor Cyan
        $arguments = $script:scpBaseArgs + $Source + "$script:User@$script:Host:$Destination"
        Invoke-External $script:scpExe $arguments
    }

    $previousRelease = ""
    if (-not $script:isDryRun) {
        try {
            $previousRelease = (Invoke-RemoteCommand "readlink -f '$RemotePath/current' 2>/dev/null || true").Trim()
        } catch {
            $previousRelease = ""
        }
    }

    Invoke-RemoteScript @"
set -euo pipefail
mkdir -p '$RemotePath/releases'
mkdir -p '$RemotePath/shared'
mkdir -p '$releaseDir'
"@ "Preparing release directories on $Host"

    $remoteComposeFiles = @()
    foreach ($upload in $composeUploads) {
        $remoteComposeFiles += $upload.Name
        Copy-ToRemote -Source $upload.Temp -Destination "$releaseDir/$($upload.Name)"
    }

    $tempSecretFile = $null
    $combinedEnvFile = $null
    $envFileToUpload = $EnvFile

    if ($Secrets.Count -gt 0) {
        $secretLines = @()
        foreach ($secretId in $Secrets) {
            Write-Host "Fetching secret $secretId from AWS Secrets Manager" -ForegroundColor Cyan
            $secretValue = & aws secretsmanager get-secret-value --secret-id $secretId --region $AwsRegion --query SecretString --output text
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to retrieve secret $secretId from AWS Secrets Manager."
            }
            $secretValue = $secretValue.Trim()
            if ($secretValue) {
                $parsed = $null
                try {
                    $parsed = $secretValue | ConvertFrom-Json -ErrorAction Stop
                } catch {
                    $parsed = $null
                }
                if ($parsed) {
                    foreach ($prop in $parsed.PSObject.Properties) {
                        $secretLines += "$($prop.Name)=$($prop.Value)"
                    }
                } else {
                    $secretLines += $secretValue
                }
            }
        }

        if ($secretLines.Count -eq 0) {
            throw "Secrets were requested but no key/value pairs were produced. Ensure your secrets contain JSON objects or plain key=value strings."
        }

        $tempSecretFile = Join-Path ([System.IO.Path]::GetTempPath()) ("secrets-" + [guid]::NewGuid() + ".env")
        Set-Content -LiteralPath $tempSecretFile -Value ($secretLines -join [Environment]::NewLine) -Encoding UTF8

        if ($EnvFile) {
            $combinedEnvFile = Join-Path ([System.IO.Path]::GetTempPath()) ("env-" + [guid]::NewGuid() + ".env")
            Get-Content -LiteralPath $EnvFile | Set-Content -LiteralPath $combinedEnvFile -Encoding UTF8
            Add-Content -LiteralPath $combinedEnvFile -Value ([Environment]::NewLine + "# Secrets from AWS Secrets Manager") -Encoding UTF8
            Add-Content -LiteralPath $combinedEnvFile -Value ($secretLines -join [Environment]::NewLine) -Encoding UTF8
            $envFileToUpload = $combinedEnvFile
        } else {
            $envFileToUpload = $tempSecretFile
        }
    }

    if ($envFileToUpload) {
        Copy-ToRemote -Source $envFileToUpload -Destination "$RemotePath/shared/.env"
    }

    if ($ProvisionDbRoles -and $ProvisionDbRolesMode -eq "local") {
        if (-not (Get-Command bash -ErrorAction SilentlyContinue)) {
            throw "bash not found. Install bash (WSL/Git Bash) or use -ProvisionDbRolesMode remote."
        }
        if ($envFileToUpload) {
            Get-Content -LiteralPath $envFileToUpload | ForEach-Object {
                if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
                $pair = $_.Split("=", 2)
                if ($pair.Count -eq 2) {
                    $name = $pair[0].Trim()
                    $value = $pair[1].Trim()
                    if ($name) {
                        Set-Item -Path "Env:$name" -Value $value
                    }
                }
            }
        }
        if (-not $env:PGPASSWORD) {
            throw "PGPASSWORD is required for local provisioning. Set it in the environment or in the env file."
        }
        Write-Host "Provisioning database roles locally using $ProvisionDbRolesScript" -ForegroundColor Cyan
        & bash $ProvisionDbRolesScript
        if ($LASTEXITCODE -ne 0) {
            throw "ProvisionDbRoles script failed with exit code $LASTEXITCODE"
        }
    }

    if ($ProvisionDbRoles -and $ProvisionDbRolesMode -eq "remote") {
        Copy-ToRemote -Source $ProvisionDbRolesScript -Destination "$releaseDir/$(Split-Path -Leaf $ProvisionDbRolesScript)"
    }
    if ($RunSmokeChecks) {
        Copy-ToRemote -Source $SmokeChecksScript -Destination "$releaseDir/$(Split-Path -Leaf $SmokeChecksScript)"
    }

    $deploymentSucceeded = $false
    $composeArgs = ($remoteComposeFiles | ForEach-Object { "-f '$($_)'" }) -join " "
    $deployScript = @"
set -euo pipefail
cd '$releaseDir'
if [ -f '$RemotePath/shared/.env' ] && [ ! -f '.env' ]; then
  cp '$RemotePath/shared/.env' .env
fi
project_name="${COMPOSE_PROJECT_NAME:-$(basename "$RemotePath")}" 
export COMPOSE_PROJECT_NAME="$project_name"
export REGISTRY='$Registry'
export TAG='$Tag'
if [ ! -f '.env' ]; then
  echo "Missing .env in $releaseDir; unable to load secrets." >&2
  exit 41
fi
if [ "$ProvisionDbRoles" = "True" ] && [ "$ProvisionDbRolesMode" = "remote" ]; then
  if [ ! -f '$RemotePath/shared/.env' ]; then
    echo "Missing shared .env for provisioning; upload with -EnvFile or -Secrets." >&2
    exit 43
  fi
  chmod +x '$releaseDir/$(Split-Path -Leaf $ProvisionDbRolesScript)'
  set -a
  . '$RemotePath/shared/.env'
  set +a
  '$releaseDir/$(Split-Path -Leaf $ProvisionDbRolesScript)'
fi
docker compose $composeArgs config >/dev/null
docker compose $composeArgs pull
docker compose $composeArgs up -d --remove-orphans
if [ -n "$HealthCheckUrl" ]; then
  echo "Running health check on $HealthCheckUrl"
  deadline=$(($(date +%s) + $HealthCheckTimeoutSeconds))
  success=0
  while [ $(date +%s) -le $deadline ]; do
    if curl -fsS --max-time 5 "$HealthCheckUrl" >/dev/null; then
      success=1
      break
    fi
    sleep $HealthCheckIntervalSeconds
  done
  if [ "$success" -ne 1 ]; then
    echo "Health check failed after $HealthCheckTimeoutSeconds seconds" >&2
    exit 42
  fi
  echo "Health check succeeded."
fi
if [ "$RunSmokeChecks" = "True" ]; then
  chmod +x '$releaseDir/$(Split-Path -Leaf $SmokeChecksScript)'
  '$releaseDir/$(Split-Path -Leaf $SmokeChecksScript)'
fi
ln -sfn '$releaseDir' '$RemotePath/current'
ls -1dt '$RemotePath'/releases/release-* 2>/dev/null | tail -n +$([int]($KeepReleases + 1)) | xargs -r rm -rf
docker compose $composeArgs ps
"@

    try {
        Invoke-RemoteScript $deployScript "Deploying compose stack to $Host"
        $deploymentSucceeded = $true
    }
    catch {
        Write-Host "Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
        $hasPrevious = -not [string]::IsNullOrWhiteSpace($previousRelease)
        if (-not $script:isDryRun -and $hasPrevious) {
            Write-Host "Attempting rollback to $previousRelease" -ForegroundColor Yellow
            $rollbackScript = @"
set -euo pipefail
if [ -d '$releaseDir' ]; then
  cd '$releaseDir'
  project_name="${COMPOSE_PROJECT_NAME:-$(basename "$RemotePath")}" 
  export COMPOSE_PROJECT_NAME="$project_name"
  docker compose $composeArgs down || true
fi
if [ -d '$previousRelease' ]; then
  cd '$previousRelease'
  project_name="${COMPOSE_PROJECT_NAME:-$(basename "$RemotePath")}" 
  export COMPOSE_PROJECT_NAME="$project_name"
  docker compose $composeArgs up -d --remove-orphans
  ln -sfn '$previousRelease' '$RemotePath/current'
fi
"@
            try {
                Invoke-RemoteScript $rollbackScript "Rolling back to $previousRelease"
            }
            catch {
                Write-Host "Rollback failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        elseif (-not $script:isDryRun) {
            Write-Host "No previous release found for rollback." -ForegroundColor Yellow
        }
        throw
    }

    if ($deploymentSucceeded) {
        Write-Host "Deployment completed. Current release: $releaseName" -ForegroundColor Green
    }
}
finally {
    foreach ($upload in $composeUploads) {
        Remove-Item -LiteralPath $upload.Temp -ErrorAction SilentlyContinue
    }
    if ($tempSecretFile) {
        Remove-Item -LiteralPath $tempSecretFile -ErrorAction SilentlyContinue
    }
    if ($combinedEnvFile) {
        Remove-Item -LiteralPath $combinedEnvFile -ErrorAction SilentlyContinue
    }
}
