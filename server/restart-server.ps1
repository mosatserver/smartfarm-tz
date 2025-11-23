# PowerShell script to restart SmartFarm TZ Server
Write-Host "Restarting SmartFarm TZ Server..." -ForegroundColor Yellow

# Kill any existing processes on port 5000
$processes = netstat -ano | findstr :5000 | ForEach-Object { ($_ -split '\s+')[4] } | Sort-Object -Unique
foreach ($pid in $processes) {
    if ($pid -ne "0" -and $pid -match '^\d+$') {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped process $pid" -ForegroundColor Green
        } catch {
            Write-Host "Could not stop process $pid" -ForegroundColor Yellow
        }
    }
}

# Wait a moment for processes to fully terminate
Start-Sleep -Seconds 2

# Start the server
Write-Host "Starting server..." -ForegroundColor Blue
Set-Location -Path $PSScriptRoot
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $PSScriptRoot

# Wait a moment and check if it's running
Start-Sleep -Seconds 3
$isRunning = netstat -ano | findstr :5000
if ($isRunning) {
    Write-Host "Server is now running on port 5000" -ForegroundColor Green
    Write-Host "Health check: http://localhost:5000/health" -ForegroundColor Cyan
    Write-Host "CORS test: http://localhost:5000/api/test-cors" -ForegroundColor Cyan
} else {
    Write-Host "Server failed to start" -ForegroundColor Red
}
