param([switch]$Push)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path.TrimEnd('\')
$Source = Join-Path $ProjectRoot 'dist'
$Docs = Join-Path $ProjectRoot 'docs'
$Release = Join-Path $ProjectRoot 'release'
$Zip = Join-Path $Release 'crystal-visualizer.zip'
$ExpectedRemote = 'https://github.com/ryogot85/crystal-viewer.git'

if (-not (Test-Path -LiteralPath (Join-Path $Source 'index.html') -PathType Leaf)) {
  throw 'dist/index.html が見つかりません。'
}

$Node = 'C:\Program Files\nodejs\node.exe'
if (-not (Test-Path -LiteralPath $Node -PathType Leaf)) {
  $Node = (Get-Command node -ErrorAction Stop).Source
}
& $Node '--test' (Join-Path $ProjectRoot 'geometry.test.cjs') (Join-Path $ProjectRoot 'materials.test.cjs')
if ($LASTEXITCODE -ne 0) { throw 'テストが失敗したため、配布物を更新しません。' }

if (-not (Test-Path -LiteralPath $Release)) {
  New-Item -ItemType Directory -Path $Release | Out-Null
}
$ReleaseItem = Get-Item -LiteralPath $Release -Force
if (-not $ReleaseItem.PSIsContainer -or ($ReleaseItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
  throw 'release が通常のフォルダーではありません。'
}
if ((Resolve-Path -LiteralPath $Release).Path.TrimEnd('\') -ne [IO.Path]::GetFullPath($Release).TrimEnd('\')) {
  throw 'release の参照先が想定と異なります。'
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $Zip) { Remove-Item -LiteralPath $Zip -Force }
[IO.Compression.ZipFile]::CreateFromDirectory($Source, $Zip)

# docs は公開用 ZIP から毎回作り直す。削除前に実体がこのプロジェクト直下か検証する。
$ExpectedDocs = [IO.Path]::GetFullPath($Docs).TrimEnd('\')
if ([IO.Path]::GetDirectoryName($ExpectedDocs).TrimEnd('\') -ne $ProjectRoot) {
  throw 'docs の場所がプロジェクト外です。'
}
if (Test-Path -LiteralPath $Docs) {
  $DocsItem = Get-Item -LiteralPath $Docs -Force
  if (-not $DocsItem.PSIsContainer -or ($DocsItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'docs が通常のフォルダーではありません。'
  }
  if ((Resolve-Path -LiteralPath $Docs).Path.TrimEnd('\') -ne $ExpectedDocs) {
    throw 'docs の参照先が想定と異なります。'
  }
  Remove-Item -LiteralPath $Docs -Recurse -Force
}
New-Item -ItemType Directory -Path $Docs | Out-Null
[IO.Compression.ZipFile]::ExtractToDirectory($Zip, $Docs)

$SourceFiles = @(Get-ChildItem -LiteralPath $Source -File -Recurse -Force)
$DocFiles = @(Get-ChildItem -LiteralPath $Docs -File -Recurse -Force)
if ($SourceFiles.Count -ne $DocFiles.Count) { throw 'ZIP 展開後のファイル数が一致しません。' }
foreach ($File in $SourceFiles) {
  $Relative = $File.FullName.Substring($Source.Length).TrimStart([char[]]@('\', '/'))
  $Expanded = Join-Path $Docs $Relative
  if (-not (Test-Path -LiteralPath $Expanded -PathType Leaf)) { throw "展開先に $Relative がありません。" }
  $OriginalHash = (Get-FileHash -LiteralPath $File.FullName -Algorithm SHA256).Hash
  $ExpandedHash = (Get-FileHash -LiteralPath $Expanded -Algorithm SHA256).Hash
  if ($OriginalHash -ne $ExpandedHash) { throw "$Relative の内容が一致しません。" }
}
Write-Host "ZIP とローカル展開を更新しました: $Zip"
Write-Host "SHA-256: $((Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash)"

if (-not $Push) { exit 0 }
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot '.git'))) { throw 'Git リポジトリがありません。' }
$Remote = & git -C $ProjectRoot remote get-url origin
if ($LASTEXITCODE -ne 0 -or $Remote.Trim() -ne $ExpectedRemote) {
  throw "origin が想定の個人リポジトリではありません: $Remote"
}
$Branch = & git -C $ProjectRoot branch --show-current
if ($LASTEXITCODE -ne 0 -or $Branch.Trim() -ne 'main') { throw 'main ブランチで実行してください。' }

$TokenEnteredHere = $false
if (-not $env:GH_TOKEN) {
  $Secret = Read-Host 'crystal-viewer 専用の fine-grained PAT' -AsSecureString
  $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
  try {
    $env:GH_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
    $TokenEnteredHere = $true
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer)
    Remove-Variable -Name Secret,Pointer -ErrorAction SilentlyContinue
  }
}
if (-not $env:GH_TOKEN) { throw 'トークンが入力されていません。' }
try {
  $Paths = @('.gitattributes', '.gitignore', 'README.md', 'PUBLISHING.md', 'package.json', 'geometry.test.cjs', 'materials.test.cjs', 'server.cjs', 'start.ps1', 'START.cmd', 'PUBLISH.cmd', 'publish.ps1', 'dist', 'docs', 'release/crystal-visualizer.zip')
  $ExistingPaths = @($Paths | Where-Object { Test-Path -LiteralPath (Join-Path $ProjectRoot $_) })
  & git -C $ProjectRoot add '-A' '--' $ExistingPaths
  if ($LASTEXITCODE -ne 0) { throw 'Git への追加に失敗しました。' }
  & git -C $ProjectRoot diff --cached --quiet
  if ($LASTEXITCODE -eq 1) {
    & git -C $ProjectRoot commit -m 'Update visualizer and distribution ZIP'
    if ($LASTEXITCODE -ne 0) { throw 'Git のコミットに失敗しました。' }
  } elseif ($LASTEXITCODE -ne 0) {
    throw 'Git の変更確認に失敗しました。'
  }
  & git -C $ProjectRoot push origin main
  if ($LASTEXITCODE -ne 0) { throw 'GitHub への送信に失敗しました。' }
  Write-Host 'GitHub への送信が完了しました。GitHub Pages は main/docs を公開します。'
} finally {
  if ($TokenEnteredHere) { Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue }
}
