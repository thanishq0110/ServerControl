#!/bin/bash

set -e

echo "=========================================="
echo "  ServerControl Setup Script"
echo "  Palworld Game Server Management Panel"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on WSL/Linux/Mac
if [[ "$OSTYPE" != "linux-gnu"* ]] && [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}This script is for Linux/WSL/Mac. For Windows, use setup.ps1${NC}"
    exit 1
fi

# Step 1: Check and install Docker
echo -e "${YELLOW}Step 1: Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
        exit 1
    else
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y docker.io docker-compose
        sudo usermod -aG docker $USER
        echo -e "${GREEN}✓ Docker installed${NC}"
        echo "You may need to log out and back in for group changes to take effect"
    fi
else
    echo -e "${GREEN}✓ Docker is installed${NC}"
fi

# Step 2: Check Docker Daemon
echo -e "${YELLOW}Step 2: Checking Docker daemon...${NC}"
if ! docker ps &> /dev/null; then
    echo "Docker daemon is not running. Starting Docker..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start docker
    fi
    sleep 2
fi
echo -e "${GREEN}✓ Docker daemon is running${NC}"

# Step 3: Check and install cloudflared
echo -e "${YELLOW}Step 3: Checking Cloudflare Tunnel (cloudflared)...${NC}"
if ! command -v cloudflared &> /dev/null; then
    echo "cloudflared not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install cloudflare/cloudflare/cloudflared
    else
        # Ubuntu/Debian
        curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared.deb
        rm cloudflared.deb
    fi
    echo -e "${GREEN}✓ cloudflared installed${NC}"
else
    echo -e "${GREEN}✓ cloudflared is installed${NC}"
fi

# Step 4: Verify Node.js installation and upgrade if needed
echo -e "${YELLOW}Step 4: Checking Node.js...${NC}"
NODE_VERSION_CHECK=$(node -v 2>/dev/null || echo "v0.0.0")
NODE_MAJOR=$(echo $NODE_VERSION_CHECK | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 14 ]; then
    echo "Current Node.js version is too old ($NODE_VERSION_CHECK). Installing Node.js 20 LTS..."
    
    # Remove old nodejs packages
    sudo apt-get remove -y nodejs npm 2>/dev/null || true
    
    # Install nvm first if not present
    if ! command -v nvm &> /dev/null; then
        echo "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    # Install Node.js 20 LTS via nvm
    source ~/.nvm/nvm.sh
    nvm install 20
    nvm use 20
    nvm alias default 20
    
    # Verify installation
    NODE_VERSION_NEW=$(node -v)
    echo -e "${GREEN}✓ Node.js upgraded to $NODE_VERSION_NEW${NC}"
else
    echo -e "${GREEN}✓ Node.js is installed: $NODE_VERSION_CHECK${NC}"
fi

# Verify final Node.js version
FINAL_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$FINAL_NODE" -lt 14 ]; then
    echo -e "${RED}✗ Node.js is still outdated. Please manually install Node.js 20 LTS${NC}"
    exit 1
fi

# Step 5: Build Docker images
echo -e "${YELLOW}Step 5: Building Docker images...${NC}"

# Clean npm cache to ensure fresh install with new Node.js
echo "Cleaning npm cache..."
npm cache clean --force

# Ensure nvm is sourced for current shell
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh"

echo "Installing Node.js dependencies..."
npm install --production

echo "Building ServerControl panel image..."
docker build -f Dockerfile.web -t servercontrol-panel:latest .
echo -e "${GREEN}✓ Images built${NC}"

# Step 6: Start containers
echo -e "${YELLOW}Step 6: Starting containers...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Wait for panel to be ready
echo "Waiting for panel to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Panel is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Step 7: Start Cloudflare tunnel
echo ""
echo -e "${YELLOW}Step 7: Starting Cloudflare Tunnel...${NC}"
echo "This will make your panel publicly accessible"
echo "Press Ctrl+C to stop the tunnel"
echo ""
cloudflared tunnel --url http://localhost:3000

echo ""
echo -e "${GREEN}=========================================="
echo "  Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Your ServerControl panel is running at:"
echo -e "  ${GREEN}http://localhost:3000${NC}"
echo ""
echo "Public URL via Cloudflare Tunnel shown above"
echo ""
echo "Docker containers running:"
docker ps --filter "name=servercontrol" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""