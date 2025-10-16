# ServerControl Setup Script for Windows PowerShell

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ServerControl Setup Script" -ForegroundColor Cyan
Write-Host "  Palworld Game Server Management Panel" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Function to check if choco command exists
function Test-ChocoInstalled {
    return Test-CommandExists -command choco
}

# Step 1: Check and install Docker
Write-Host "Step 1: Checking Docker installation..." -ForegroundColor Yellow
if (-not (Test-CommandExists -command docker)) {
    Write-Host "Docker not found. Installing Docker Desktop..."
    
    if (Test-ChocoInstalled) {
        choco install docker-desktop -y
    } else {
        Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        Write-Host "After installation, run this script again." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Docker installed" -ForegroundColor Green
} else {
    Write-Host "✓ Docker is installed" -ForegroundColor Green
}

# Step 2: Check Docker daemon
Write-Host "Step 2: Checking Docker daemon..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "Docker daemon is not running." -ForegroundColor Yellow
    Write-Host "Please start Docker Desktop and run this script again." -ForegroundColor Yellow
    exit 1
}

# Step 3: Check and install cloudflared
Write-Host "Step 3: Checking Cloudflare Tunnel (cloudflared)..." -ForegroundColor Yellow
if (-not (Test-CommandExists -command cloudflared)) {
    Write-Host "cloudflared not found. Installing..."
    
    if (Test-ChocoInstalled) {
        choco install cloudflare-warp-cli -y
    } else {
        Write-Host "Please install cloudflared from: https://developers.cloudflare.com/cloudflare-one/connections/connect-applications/install-and-setup/tunnel-guide/local/as-a-user/" -ForegroundColor Red
        Write-Host "Or install Chocolatey first: https://chocolatey.org/install" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ cloudflared installed" -ForegroundColor Green
} else {
    Write-Host "✓ cloudflared is installed" -ForegroundColor Green
}

# Step 4: Verify Node.js installation and upgrade if needed
Write-Host "Step 4: Checking Node.js..." -ForegroundColor Yellow
if (-not (Test-CommandExists -command node)) {
    Write-Host "Node.js not found. Installing Node.js 20 LTS..."
    
    if (Test-ChocoInstalled) {
        choco install nodejs --version=20.0.0 -y
    } else {
        Write-Host "Please install Node.js 20 LTS from: https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Node.js 20 LTS installed" -ForegroundColor Green
} else {
    $nodeVersion = node -v
    $majorVersion = $nodeVersion -replace 'v(\d+)\..*', '$1'
    
    if ([int]$majorVersion -lt 14) {
        Write-Host "Node.js version is too old ($nodeVersion). Upgrading to Node.js 20 LTS..." -ForegroundColor Yellow
        
        if (Test-ChocoInstalled) {
            choco install nodejs --version=20.0.0 -y --force
        } else {
            Write-Host "Please upgrade Node.js 20 LTS from: https://nodejs.org/" -ForegroundColor Red
            exit 1
        }
        Write-Host "✓ Node.js upgraded to $(node --version)" -ForegroundColor Green
    } else {
        Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
    }
}

# Step 5: Build Docker images
Write-Host "Step 5: Building Docker images..." -ForegroundColor Yellow
Write-Host "Installing Node.js dependencies..."
npm install --production

Write-Host "Building ServerControl panel image..."
docker build -f Dockerfile.web -t servercontrol-panel:latest .
Write-Host "✓ Images built" -ForegroundColor Green

# Step 6: Start containers
Write-Host "Step 6: Starting containers..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "✓ Containers started" -ForegroundColor Green

# Wait for panel to be ready
Write-Host "Waiting for panel to be ready..."
$attempts = 0
while ($attempts -lt 30) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Panel is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Panel not ready yet
    }
    
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 1
    $attempts++
}

# Step 7: Start Cloudflare tunnel
Write-Host ""
Write-Host "Step 7: Starting Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host "This will make your panel publicly accessible"
Write-Host "Press Ctrl+C to stop the tunnel"
Write-Host ""
cloudflared tunnel --url http://localhost:3000

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your ServerControl panel is running at:"
Write-Host "  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Public URL via Cloudflare Tunnel shown above"
Write-Host ""
Write-Host "Docker containers running:"
docker ps --filter "name=servercontrol" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
Write-Host ""