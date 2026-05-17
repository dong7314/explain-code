param(
  [string]$Repo = "dong7314/explain-code",
  [string]$Ref = "master",
  [string]$InstallRoot = "$env:USERPROFILE\.explain-code",
  [switch]$CodexOnly,
  [switch]$ClaudeOnly
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[explain-code] $Message"
}

function Copy-CleanDirectory {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Missing source directory: $Source"
  }

  $parent = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force -Path $parent | Out-Null

  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

if (-not $env:USERPROFILE) {
  throw "USERPROFILE is required."
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("explain-code-install-" + [System.Guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempRoot "source.zip"

try {
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

  $archiveUrl = "https://codeload.github.com/$Repo/zip/refs/heads/$Ref"
  Write-Step "Downloading $Repo@$Ref"
  Invoke-WebRequest -Uri $archiveUrl -OutFile $zipPath -UseBasicParsing

  Write-Step "Extracting archive"
  Expand-Archive -LiteralPath $zipPath -DestinationPath $tempRoot -Force
  $sourceRoot = Get-ChildItem -LiteralPath $tempRoot -Directory |
    Where-Object { $_.Name -ne "." -and $_.Name -ne ".." } |
    Select-Object -First 1

  if (-not $sourceRoot) {
    throw "Cannot find extracted source directory."
  }

  $source = $sourceRoot.FullName
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

  $toolSource = Join-Path $source "tools\explain-code-ingest"
  $toolTarget = Join-Path $InstallRoot "tools\explain-code-ingest"
  Write-Step "Installing shared publisher tool"
  Copy-CleanDirectory -Source $toolSource -Destination $toolTarget

  if (-not $ClaudeOnly) {
    $codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
    $codexSkillSource = Join-Path $source "integrations\codex-skill\explain-code-learning"
    $codexSkillTarget = Join-Path $codexHome "skills\explain-code-learning"

    Write-Step "Installing Codex skill"
    Copy-CleanDirectory -Source $codexSkillSource -Destination $codexSkillTarget
  }

  if (-not $CodexOnly) {
    $claudePluginSource = Join-Path $source "integrations\claude-code-plugin"
    $claudePluginTarget = Join-Path $InstallRoot "integrations\claude-code-plugin"

    Write-Step "Installing Claude Code plugin files"
    Copy-CleanDirectory -Source $claudePluginSource -Destination $claudePluginTarget

    $launcherPath = Join-Path $InstallRoot "claude-explain-code.ps1"
    $launcher = @"
param(
  [Parameter(ValueFromRemainingArguments = `$true)]
  [string[]]`$Args
)

& claude --plugin-dir "$claudePluginTarget" @Args
exit `$LASTEXITCODE
"@
    Set-Content -LiteralPath $launcherPath -Value $launcher -Encoding UTF8
  }

  Write-Host ""
  Write-Step "Install complete."
  Write-Host ""

  if (-not $ClaudeOnly) {
    Write-Host "Codex:"
    Write-Host "  1. Restart Codex."
    Write-Host "  2. Ask Codex to use the explain-code-learning skill."
    Write-Host ""
  }

  if (-not $CodexOnly) {
    $launcherPath = Join-Path $InstallRoot "claude-explain-code.ps1"
    Write-Host "Claude Code:"
    Write-Host "  Start Claude Code with the plugin:"
    Write-Host "    powershell -ExecutionPolicy Bypass -File `"$launcherPath`""
    Write-Host "  Then run:"
    Write-Host "    /explain-code:publish-learning"
    Write-Host ""
  }

  Write-Host "Environment:"
  Write-Host "  Required before publishing:"
  Write-Host "    `$env:EXPLAIN_CODE_API_TOKEN = `"expc_live_...`""
  Write-Host "  Optional:"
  Write-Host "    `$env:EXPLAIN_CODE_API_URL = `"http://localhost:4000/api`""
  Write-Host "    `$env:EXPLAIN_CODE_GROUP_KEY = `"coin-trade`""
  Write-Host ""

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warning "Node.js was not found in PATH. Install Node.js before publishing learning episodes."
  }
} finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
