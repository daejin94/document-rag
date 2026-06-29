# run-backend.ps1 — Windows PowerShell 용 백엔드 실행 스크립트 (run-backend.sh 대응)
# .env를 환경변수로 로드하고, 로컬 DB URL이면 Docker Postgres를 띄운 뒤 gradlew bootRun 한다.
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $ScriptDir '.env'
$BackendDir = Join-Path $ScriptDir 'backend'
$Compose = Join-Path $ScriptDir 'docker-compose.yml'

if (-not (Test-Path $EnvFile)) {
    Write-Error "Missing .env file: $EnvFile"
    exit 1
}

$GradlewBat = Join-Path $BackendDir 'gradlew.bat'
if (-not (Test-Path $GradlewBat)) {
    Write-Error "Missing Gradle wrapper: $GradlewBat"
    exit 1
}

# .env 로드: 빈 줄/주석(#) 건너뛰고, 첫 '=' 기준으로만 분리(값에 '='가 있어도 안전).
# 따옴표로 감싼 값은 양끝 따옴표를 제거한다. 셸의 `set -a` + `. .env`와 동일한 효과.
# -Encoding UTF8 필수: Windows PowerShell 5.1의 기본값은 ANSI(CP949)라 UTF-8 한글 주석을
# 잘못 디코딩하면서 줄바꿈을 삼켜 다음 줄과 합쳐버린다(주석 뒤 변수가 통째로 누락됨).
foreach ($line in Get-Content -LiteralPath $EnvFile -Encoding UTF8) {
    $trimmed = $line.Trim()
    if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }
    $idx = $trimmed.IndexOf('=')
    if ($idx -lt 1) { continue }
    $name = $trimmed.Substring(0, $idx).Trim()
    $value = $trimmed.Substring($idx + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    Set-Item -Path "Env:$name" -Value $value
}

# 로컬 Postgres(localhost/127.0.0.1)를 가리키면 Docker 컨테이너를 띄우고 준비될 때까지 대기한다.
$dsUrl = $env:SPRING_DATASOURCE_URL
if ($dsUrl -match '^jdbc:postgresql://(localhost|127\.0\.0\.1):') {
    Write-Host 'Ensuring local PostgreSQL container is running...'
    docker compose -f $Compose up -d postgres
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        docker compose -f $Compose exec -T postgres pg_isready -U rag_user -d rag_db *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        Write-Error "PostgreSQL container did not become ready in time. Check: docker compose ps postgres"
        exit 1
    }
}

$topK = if ($env:RAG_TOP_K) { $env:RAG_TOP_K } else { '5' }
$threshold = if ($env:RAG_SIMILARITY_THRESHOLD) { $env:RAG_SIMILARITY_THRESHOLD } else { '0.70' }
Write-Host "Starting backend with RAG_TOP_K=$topK, RAG_SIMILARITY_THRESHOLD=$threshold"

Set-Location $BackendDir
& $GradlewBat bootRun
