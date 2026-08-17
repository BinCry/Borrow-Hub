param(
  [switch]$PrintOnly
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$cacheRoot = 'D:\DevCache\BorrowHub'
$tempRoot = Join-Path $cacheRoot 'temp'
$npmCacheRoot = Join-Path $cacheRoot 'npm-cache'
$gradleRoot = Join-Path $cacheRoot 'gradle'
$expoRoot = Join-Path $cacheRoot 'expo'
$pnpmStoreRoot = Join-Path $repoRoot '.pnpm-store'

$directories = @(
  $cacheRoot,
  $tempRoot,
  $npmCacheRoot,
  $gradleRoot,
  $expoRoot,
  $pnpmStoreRoot
)

foreach ($directory in $directories) {
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }
}

$env:TEMP = $tempRoot
$env:TMP = $tempRoot
$env:TMPDIR = $tempRoot
$env:npm_config_cache = $npmCacheRoot
$env:npm_config_tmp = $tempRoot
$env:pnpm_config_store_dir = $pnpmStoreRoot
$env:GRADLE_USER_HOME = $gradleRoot
$env:EXPO_HOME = $expoRoot

$summary = [ordered]@{
  TEMP = $env:TEMP
  TMP = $env:TMP
  TMPDIR = $env:TMPDIR
  npm_config_cache = $env:npm_config_cache
  npm_config_tmp = $env:npm_config_tmp
  pnpm_config_store_dir = $env:pnpm_config_store_dir
  GRADLE_USER_HOME = $env:GRADLE_USER_HOME
  EXPO_HOME = $env:EXPO_HOME
}

if ($PrintOnly) {
  $summary.GetEnumerator() | ForEach-Object {
    Write-Output ("{0}={1}" -f $_.Key, $_.Value)
  }

  return
}

Write-Host 'Borrow Hub dev cache configured on D:' -ForegroundColor Green
$summary.GetEnumerator() | ForEach-Object {
  Write-Host ("  {0}={1}" -f $_.Key, $_.Value)
}

Write-Host ''
Write-Host 'Run repo commands in this shell to keep temporary files off C:.' -ForegroundColor Yellow
