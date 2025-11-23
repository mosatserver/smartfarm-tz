# PowerShell script to start server and test registration

Write-Host "🚀 Starting SmartFarm TZ Server..." -ForegroundColor Green

# Start the server in background
$serverJob = Start-Job -ScriptBlock {
    Set-Location "C:\smartfarm-tz\server"
    npm start
}

Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Server is running successfully!" -ForegroundColor Green
        
        Write-Host "🧪 Testing registration fix..." -ForegroundColor Cyan
        # Run the test
        Set-Location "C:\smartfarm-tz"
        node test_registration_fix.js
    }
} catch {
    Write-Host "❌ Server failed to start or is not responding" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Clean up
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Stop-Job $serverJob -PassThru | Remove-Job

Write-Host "✨ Test completed!" -ForegroundColor Green
