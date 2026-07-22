Write-Host "Starting deployment to staging server 98.70.11.123..." -ForegroundColor Green
Write-Host "Please enter the SSH password for root@98.70.11.123 when prompted." -ForegroundColor Yellow

ssh root@98.70.11.123 "cd /root/MehndiGo && git pull && pm2 restart all"

if ($LASTEXITCODE -eq 0) {
    Write-Host "DEPLOYMENT SUCCESSFUL! Staging server is now running the latest code." -ForegroundColor Green
} else {
    Write-Host "PM2 reload failed or not found. Trying Docker Staging stack restart..." -ForegroundColor Yellow
    ssh root@98.70.11.123 "cd /root/MehndiGo && git pull && docker compose -f docker-compose.staging.yml up -d --build"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DEPLOYMENT SUCCESSFUL! Docker Staging containers are now running the latest code." -ForegroundColor Green
    } else {
        Write-Host "DEPLOYMENT FAILED. Please check server status or credentials." -ForegroundColor Red
    }
}
