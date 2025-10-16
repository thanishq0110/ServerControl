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

# Step 4: Verify Node.js installation (needed for development)
echo -e "${YELLOW}Step 4: Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install node
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    echo -e "${GREEN}✓ Node.js installed${NC}"
else
    echo -e "${GREEN}✓ Node.js is installed: $(node --version)${NC}"
fi

# Step 5: Build Docker images
echo -e "${YELLOW}Step 5: Building Docker images...${NC}"
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