# run_attendance.ps1 - One‑shot setup script for the Attendance project
# ------------------------------------------------------------
# 1️  Change to the project root and store it
Set-Location "C:\vicky\attendance"
$projectRoot = Get-Location

# ------------------------------------------------------------
# 2️  Install backend (and front‑end, if the folder exists)
Write-Host "`n=== Installing backend dependencies ===`n"
Set-Location (Join-Path $projectRoot "backend")
npm install

# If a front‑end folder named "front End" exists, install its deps too
$frontendPath = Join-Path $projectRoot "front End"
If (Test-Path $frontendPath) {
    Write-Host "`n=== Installing front‑end dependencies ===`n"
    Set-Location $frontendPath
    npm install
    Set-Location (Join-Path $projectRoot "backend")
}

# ------------------------------------------------------------
# 3️  Ensure a .env file with a valid MongoDB URI exists
$envFile = ".\.env"
If (-not (Test-Path $envFile)) {
    Write-Host "`n=== Creating .env file (replace <7708585916vickysenthil678> & <7708585916vickysenthil6789>) ===`n"
    @"
MONGODB_URI=mongodb+srv://vickysenthil678_db_user:<7708585916vickysenthil678>@cluster0.klzogu.mongodb.net/attendance_db?retryWrites=true&w=majority
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5500
JWT_SECRET=7708585916vickysenthil6789
JWT_EXPIRES_IN=100week
PORT=5000
"@ | Set-Content -Path $envFile -Encoding UTF8
} Else {
    Write-Host "`n=== .env already present ===`n"
}

# ------------------------------------------------------------
# 4️  Start the backend server (nodemon) in a background process
Write-Host "`n=== Starting backend (nodemon) ===`n"
# Use npm.cmd so Windows can locate the command
Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory (Resolve-Path ".") -NoNewWindow
# Give the server a few seconds to initialise and connect to MongoDB
Start-Sleep -Seconds 8

# ------------------------------------------------------------
# 5️  Verify MongoDB connection via health‑check
Write-Host "`n=== Performing health‑check ===`n"
$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -ErrorAction SilentlyContinue
if ($null -eq $health -or $health.database -ne "Connected") {
    Write-Error "MongoDB not connected - aborting script"
    exit 1
}
Write-Host "✅ Health‑check passed - MongoDB connected"

# ------------------------------------------------------------
# 6️  Admin login – replace placeholders with real credentials
# The response token will be stored in the environment variable $env:JWT_TOKEN
Write-Host "`n=== Admin login (replace <admin> and <admin123>) ===`n"
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/login" -ContentType "application/json" -Body $loginBody
    $env:JWT_TOKEN = $loginResponse.token
    Write-Host "✅ Admin logged in - JWT stored in JWT_TOKEN env var"
} catch {
    Write-Error "Admin login failed: $_"
    # Continue without exiting – you may want to run other steps manually
}

# ------------------------------------------------------------
# 7️  (Optional) Start the front‑end dev server, if it exists
If (Test-Path $frontendPath) {
    Write-Host "`n=== Starting front‑end dev server ===`n"
    Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $frontendPath -NoNewWindow
}

# ------------------------------------------------------------
# End of script – you can now use $env:JWT_TOKEN for subsequent API calls
Write-Host "`n=== Script finished ===`n"