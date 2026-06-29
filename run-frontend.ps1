# run-frontend.ps1 — Windows PowerShell 용 프론트엔드 실행 스크립트 (run-frontend.sh 대응)
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ScriptDir 'frontend'

if (-not (Test-Path (Join-Path $FrontendDir 'package.json'))) {
    Write-Error "Missing frontend project: $FrontendDir\package.json"
    exit 1
}

# Push/Pop-Location: 스크립트 종료(정상·에러·Ctrl+C) 후 호출자의 작업 디렉터리를 원래대로 복원한다.
# (Set-Location은 세션 전역이라 그냥 쓰면 종료 후에도 frontend 폴더에 남는다.)
Push-Location $FrontendDir
try {
    # 의존성이 미설치이거나 package-lock.json이 마지막 설치 이후 바뀌었을 때만 설치한다
    # (npm이 설치 상태로 기록하는 node_modules/.package-lock.json과 비교 — 매번 npm ci 하는 비용 회피)
    $installedLock = 'node_modules/.package-lock.json'
    $sourceLock = 'package-lock.json'
    $needInstall = $true
    if (Test-Path $installedLock) {
        $installedTime = (Get-Item $installedLock).LastWriteTime
        $sourceTime = (Get-Item $sourceLock).LastWriteTime
        if ($sourceTime -le $installedTime) {
            $needInstall = $false
        }
    }

    if ($needInstall) {
        Write-Host 'Installing frontend dependencies...'
        npm ci
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } else {
        Write-Host 'Dependencies up to date, skipping install.'
    }

    Write-Host 'Starting frontend dev server on http://localhost:5173'
    npm run dev
}
finally {
    Pop-Location
}
