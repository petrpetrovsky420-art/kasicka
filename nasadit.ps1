<#
  Kasička – nasazení na GitHub Pages (zdarma, s HTTPS, takže jde nainstalovat do mobilu i do PC).

  Spuštění: dvojklik na „Nasadit na GitHub.cmd“, nebo v PowerShellu ve složce projektu:
      powershell -ExecutionPolicy Bypass -File .\nasadit.ps1

  Co skript udělá:
    1. Když chybí GitHub CLI (gh), nainstaluje ho přes winget (Windows se zeptá na oprávnění).
    2. Když nejsi přihlášený, otevře prohlížeč s přihlášením na GitHub.
    3. Uloží změny do gitu, poprvé založí veřejný repozitář „kasicka“ a nahraje do něj kód.
    4. Zapne GitHub Pages. Aplikaci sestaví a nasadí GitHub Actions (asi 1–2 minuty).
    5. Vypíše adresu aplikace a otevře ji v prohlížeči.
  Při dalším spuštění jen nahraje změny a aplikace na webu se sama aktualizuje.
#>

param([string]$RepoName = 'kasicka')

$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot

function Write-Step([string]$Text) {
  Write-Host ''
  Write-Host "==> $Text" -ForegroundColor Green
}

function Write-Note([string]$Text) {
  Write-Host "    $Text" -ForegroundColor Gray
}

function Stop-Script([string]$Text) {
  Write-Host ''
  Write-Host $Text -ForegroundColor Red
  Read-Host 'Stiskni Enter pro zavření' | Out-Null
  exit 1
}

function Update-PathVariable {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Get-LatestRunId {
  $id = gh run list --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $id) { return '' }
  return "$id".Trim()
}

Write-Host 'Kasička – nasazení na GitHub Pages' -ForegroundColor Cyan

# --- 0) Git -------------------------------------------------------------------
Update-PathVariable
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Stop-Script 'Chybí Git. Nainstaluj ho z https://git-scm.com/download/win a spusť skript znovu.'
}

# --- 1) GitHub CLI --------------------------------------------------------------
Write-Step 'Kontroluji GitHub CLI (gh)'
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Note 'GitHub CLI chybí, instaluji ho přes winget…'
  winget install --id GitHub.cli --exact --source winget --accept-package-agreements --accept-source-agreements
  Update-PathVariable
  $ghFolder = Join-Path $env:ProgramFiles 'GitHub CLI'
  if (-not (Get-Command gh -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $ghFolder 'gh.exe'))) {
    $env:Path += ";$ghFolder"
  }
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Stop-Script 'GitHub CLI se nepodařilo nainstalovat. Stáhni ho z https://cli.github.com a spusť skript znovu.'
  }
}
Write-Note 'GitHub CLI je připravené.'

# --- 2) Přihlášení --------------------------------------------------------------
Write-Step 'Kontroluji přihlášení na GitHub'
gh auth status --hostname github.com *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Note 'Otevře se prohlížeč. Přihlas se (nebo si zdarma založ účet) a opiš kód, který se ukáže tady v okně.'
  gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { Stop-Script 'Přihlášení se nepovedlo. Spusť skript znovu.' }
}
gh auth setup-git --hostname github.com *> $null
$login = "$(gh api user --jq .login)".Trim()
$userId = "$(gh api user --jq .id)".Trim()
if (-not $login) { Stop-Script 'Nepodařilo se zjistit tvoje jméno na GitHubu.' }
Write-Note "Přihlášen jako $login."

# --- 3) Uložení změn do gitu -----------------------------------------------------
Write-Step 'Ukládám změny do gitu'
git remote get-url origin *> $null
$hasRemote = ($LASTEXITCODE -eq 0)

if (-not $hasRemote) {
  # Před prvním nahráním podepíšeme commity soukromou adresou z GitHubu, ať není vidět žádný e-mail.
  git config user.name $login
  git config user.email "$userId+$login@users.noreply.github.com"
}

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m 'Kasička: změny před nasazením' | Out-Null
  Write-Note 'Změny jsou uložené.'
} else {
  Write-Note 'Žádné nové změny.'
}

if (-not $hasRemote) {
  $count = [int]"$(git rev-list --count HEAD)".Trim()
  if ($count -le 1) {
    git commit --amend --no-edit --reset-author | Out-Null
  } else {
    git -c sequence.editor=true rebase --root --exec 'git commit --amend --no-edit --reset-author' | Out-Null
  }
}

# --- 4) Repozitář a nahrání ------------------------------------------------------
$previousRun = ''
if (-not $hasRemote) {
  Write-Step "Zakládám veřejný repozitář $login/$RepoName a nahrávám kód"
  gh repo view "$login/$RepoName" *> $null
  while ($LASTEXITCODE -eq 0) {
    $RepoName = Read-Host "Repozitář $RepoName už na tvém účtu existuje. Napiš jiný název (třeba kasicka-app)"
    if (-not $RepoName) { Stop-Script 'Bez názvu repozitáře nejde pokračovat.' }
    gh repo view "$login/$RepoName" *> $null
  }
  gh repo create $RepoName --public --source . --remote origin --push --description 'Kasička – spořicí cíle (PWA)'
  if ($LASTEXITCODE -ne 0) { Stop-Script 'Repozitář se nepodařilo založit nebo nahrát.' }
} else {
  $previousRun = Get-LatestRunId
  Write-Step 'Nahrávám změny na GitHub'
  git push -u origin HEAD
  if ($LASTEXITCODE -ne 0) { Stop-Script 'Nahrání na GitHub se nepovedlo.' }
}

$full = "$(gh repo view --json nameWithOwner --jq .nameWithOwner)".Trim()
if (-not $full) { $full = "$login/$RepoName" }

# --- 5) GitHub Pages ---------------------------------------------------------------
Write-Step 'Zapínám GitHub Pages'
gh api "repos/$full/pages" *> $null
if ($LASTEXITCODE -ne 0) {
  gh api -X POST "repos/$full/pages" -f build_type=workflow *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Note 'Pages se nepodařilo zapnout automaticky. Na GitHubu otevři Settings → Pages a jako Source vyber „GitHub Actions“.'
  }
} else {
  gh api -X PUT "repos/$full/pages" -f build_type=workflow *> $null
}
Write-Note 'GitHub Pages jsou zapnuté.'

# --- 6) Čekání na nasazení --------------------------------------------------------
Write-Step 'Čekám, až GitHub aplikaci sestaví a nasadí (obvykle 1–2 minuty)'
$runId = ''
for ($i = 0; $i -lt 40 -and -not $runId; $i++) {
  Start-Sleep -Seconds 3
  $latest = Get-LatestRunId
  if ($latest -and $latest -ne $previousRun) { $runId = $latest }
}

if ($runId) {
  gh run watch $runId --exit-status
  if ($LASTEXITCODE -ne 0) {
    # Nejčastěji: první běh začal dřív, než se Pages stihly zapnout. Stačí ho spustit znovu.
    Write-Note 'První pokus se nepovedl, zkouším to znovu…'
    gh run rerun $runId --failed *> $null
    Start-Sleep -Seconds 5
    gh run watch $runId --exit-status
    if ($LASTEXITCODE -ne 0) {
      gh run view $runId --web
      Stop-Script 'Nasazení se nepovedlo. V prohlížeči se otevřel záznam s podrobnostmi.'
    }
  }
} else {
  Write-Note 'Nebylo co nového nasazovat, na webu už běží poslední verze.'
}

# --- 7) Hotovo ----------------------------------------------------------------------
$url = "$(gh api "repos/$full/pages" --jq .html_url 2>$null)".Trim()
if (-not $url) {
  $owner, $name = $full.Split('/')
  $url = "https://$($owner.ToLower()).github.io/$name/"
}

Write-Host ''
Write-Host "Hotovo! Kasička běží na adrese: $url" -ForegroundColor Cyan
Write-Host ''
Write-Host 'Do počítače:  v Edgi nebo Chromu klikni v adresním řádku na ikonu „Nainstalovat aplikaci“.'
Write-Host 'Do mobilu:    otevři stejnou adresu (v PC: pravým tlačítkem na stránku → „Vytvořit QR kód“ a naskenuj ho).'
Write-Host '              Android/Chrome: menu ⋮ → „Přidat na plochu“ / „Instalovat aplikaci“.'
Write-Host '              iPhone/Safari: tlačítko Sdílet → „Přidat na plochu“.'
Write-Host ''
Write-Host 'Pozor: každé zařízení má svoje data. Cíle mezi nimi přeneseš přes tlačítko Záloha.' -ForegroundColor Yellow
Start-Process $url
Read-Host 'Stiskni Enter pro zavření' | Out-Null
