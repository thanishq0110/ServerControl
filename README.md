# 🎮 ServerControl - Palworld Game Server Management Panel

A **fully dockerized**, dark-themed web panel for managing Palworld game servers. Create, start, stop, and manage real Palworld servers with a single click, with automatic Cloudflare Tunnel integration for public access.

## ✨ Features

- ✅ **Web Dashboard** - Create, start, stop, and manage Palworld servers from your browser
- ✅ **Real Servers Only** - Uses `thijsvanloef/palworld-server-docker` for authentic Palworld servers
- ✅ **Dark Theme** - Modern, sleek dark UI
- ✅ **No Authentication** - Zero-friction access (suitable for private networks)
- ✅ **Dockerized** - Everything runs in Docker containers
- ✅ **Cloudflare Tunnel** - Automatic public access via tunnel
- ✅ **One-Command Setup** - Single setup script handles everything
- ✅ **Dynamic Port Assignment** - Automatic port allocation for multiple servers
- ✅ **Server Logs** - View live logs for each server
- ✅ **Windows & Linux Support** - Works on Windows, WSL, Linux, and Mac

## 📋 Prerequisites

Before starting, you'll need:

1. **Docker** - [Install Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Engine and Docker Compose)
2. **Git** - For cloning repositories
3. **Cloudflare Account** - Free account needed for Tunnel
4. **Administrator Access** - Required to install dependencies

## 🚀 Quick Start

### On Windows (PowerShell)

```powershell
# Run the setup script
.\setup.ps1
```

### On Linux/WSL/Mac (Bash)

```bash
# Make script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

That's it! The setup script will:
- ✓ Install Docker (if not present)
- ✓ Install cloudflared (Cloudflare Tunnel CLI)
- ✓ Install Node.js dependencies
- ✓ Build Docker images
- ✓ Start all containers
- ✓ Launch the Cloudflare Tunnel for public access

## 🌐 Accessing the Panel

### Local Access (Private Network)
```
http://localhost:3000
```

### Public Access (via Cloudflare Tunnel)
After running the setup script, you'll see a public URL like:
```
https://example-1234.trycloudflare.com
```

This URL is automatically generated and accessible anywhere in the world!

## 📚 Usage Guide

### Creating a Server

1. Open the web panel at `http://localhost:3000`
2. Fill in the server details:
   - **Server Name** (required) - Choose a name for your server
   - **Password** (optional) - Leave empty for no password
   - **Max Players** - Default is 32
3. Click **Create Server**
4. The server will start automatically and appear in the list below

### Managing Servers

Each server card shows:
- **Server Status** - Running (green) or Stopped (gray)
- **Container ID** - Unique identifier
- **Ports** - Game port assignments
- **Actions**:
  - **Start/Stop** - Toggle server state
  - **Logs** - View server logs
  - **Delete** - Remove the server

### Viewing Logs

Click the **Logs** button on any server to view real-time logs in a modal. This helps diagnose issues or monitor server activity.

## 🏗️ Project Structure

```
ServerControl/
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile.web           # Web panel Docker image
├── Dockerfile.palworld      # Palworld server Docker image
├── package.json             # Node.js dependencies
├── setup.sh                 # Setup script for Linux/WSL/Mac
├── setup.ps1                # Setup script for Windows
├── README.md                # This file
├── src/
│   └── server.js            # Express.js backend
└── public/
    ├── index.html           # Web dashboard
    ├── app.js               # Frontend JavaScript
    └── styles.css           # Dark theme CSS
```

## 🔧 System Architecture

```
┌─────────────────────────────────────────┐
│     Cloudflare Tunnel                   │
│     (Public Access)                     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   ServerControl Web Panel               │
│   (Node.js/Express)                     │
│   Port: 3000                            │
│   Container: servercontrol-panel        │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    ┌───▼────────┐    ┌───┬──▼──┬───┐
    │  Docker    │    │   Palworld Servers   │
    │  Daemon    │    │   (Dynamic)          │
    │            │    │   Port: 8211+        │
    └────────────┘    └──────────────────────┘
```

## 🐳 Docker Details

### Web Panel Container
- **Image**: `servercontrol-panel:latest`
- **Port**: 3000
- **Volume**: Mounts Docker socket for server management
- **Network**: `servercontrol-network`

### Palworld Server Containers
- **Image**: `thijsvanloef/palworld-server-docker:latest`
- **Ports**: 8211+ (UDP) - Automatically assigned
- **Memory**: 6GB (adjustable)
- **Network**: `servercontrol-network`

## 🔐 Security Notes

- **No Authentication**: This panel is designed for **private networks only**. Do not expose it to the internet directly.
- **Cloudflare Tunnel**: Uses Cloudflare's secure tunnel - only accessible via the generated URL.
- **Docker Socket**: The panel requires access to Docker socket for container management.

## ⚙️ Configuration

### Adjusting Server Defaults

Edit `src/server.js` to modify default server settings:

```javascript
Env: [
  `SERVER_NAME=${serverName}`,
  `SERVER_PASSWORD=${serverPassword || ''}`,
  `MAX_PLAYERS=${maxPlayers || 32}`,
  'Community=true',
  'DIFFICULTY=None',
  'DEATH_PENALTY_LOSS_RATE_DAMAGE=100',
  'ENABLE_PVP=false',
  'ENABLE_PLAYER_TO_PLAYER_DAMAGE=false'
]
```

### Adjusting Memory Allocation

In `src/server.js`, modify the memory setting:

```javascript
HostConfig: {
  Memory: 6442450944 // Change 6GB to desired amount (in bytes)
}
```

## 📦 Port Assignment

Ports are automatically assigned starting from **8211** (the default Palworld port):
- Server 1: 8211
- Server 2: 8212
- Server 3: 8213
- etc.

## 🛑 Stopping Everything

To stop all containers:

```bash
docker-compose down
```

To stop and remove all data:

```bash
docker-compose down -v
```

## 🔄 Restarting the Panel

### With setup script running
If the setup script is still running (and the tunnel is active), just press `Ctrl+C` to stop it, then run again:

```bash
# Linux/WSL/Mac
./setup.sh

# Windows
.\setup.ps1
```

### Manual restart
```bash
docker-compose up -d
cloudflared tunnel --url http://localhost:3000
```

## 🐛 Troubleshooting

### Panel not accessible at localhost:3000
- Ensure Docker is running: `docker ps`
- Check container status: `docker-compose ps`
- View logs: `docker-compose logs web-panel`

### Can't create servers / Servers not showing
- Verify Docker daemon is running
- Check Docker socket permissions
- View Docker logs: `docker logs servercontrol-panel`

### Cloudflare Tunnel not starting
- Ensure cloudflared is installed: `cloudflared --version`
- Verify internet connection
- Check Cloudflare account status

### Containers not starting
- Check available disk space
- Verify Docker has sufficient permissions
- View detailed logs: `docker-compose logs`

### Memory issues
- Reduce per-server memory allocation in `src/server.js`
- Close other applications
- Increase system resources (RAM)

## 📝 Logs

### Panel logs
```bash
docker-compose logs web-panel
```

### Server logs
```bash
docker-compose logs servercontrol-panel
docker logs <container-name>
```

### Live tail
```bash
docker-compose logs -f web-panel
```

## 🔄 Updates

To update the panel with latest changes:

```bash
# Stop containers
docker-compose down

# Pull latest images
docker pull thijsvanloef/palworld-server-docker:latest

# Rebuild and restart
./setup.sh  # Linux/WSL/Mac
# or
.\setup.ps1 # Windows
```

## 💾 Backup & Restore

### Backup server data
```bash
# List containers
docker ps -a

# Copy server data
docker cp <container-name>:/palworld ./backup_palworld
```

### Restore server data
```bash
docker cp ./backup_palworld <container-name>:/palworld
```

## 🎯 Performance Tips

1. **Monitor System Resources** - Use `docker stats` to monitor container performance
2. **Adjust Player Count** - Fewer players = lower resource usage
3. **Update Regularly** - Keep Docker images updated for performance improvements
4. **Use SSD** - For faster server startup and save file access
5. **Network Optimization** - Use wired connection for better stability

## 🌟 Features Roadmap

Potential future enhancements:
- [ ] Server backup/restore functionality
- [ ] Player management and whitelist
- [ ] Advanced server statistics
- [ ] Server scheduling
- [ ] Multi-region support
- [ ] Web-based terminal
- [ ] API authentication
- [ ] Server templates

## 📄 License

This project is provided as-is for personal use.

## 🙏 Credits

- **Palworld Server Docker**: [thijsvanloef/palworld-server-docker](https://github.com/thijsvanloef/palworld-server-docker)
- **Cloudflare Tunnel**: [Cloudflare](https://www.cloudflare.com/products/tunnel/)

## 💬 Support

For issues related to:
- **Palworld Server**: https://github.com/thijsvanloef/palworld-server-docker
- **Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/
- **Docker**: https://docs.docker.com/

## 🚀 Getting Help

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Docker logs: `docker-compose logs`
3. Ensure all prerequisites are installed
4. Verify Docker daemon is running
5. Check available system resources

---

**Ready to manage your Palworld servers? Run the setup script and start playing!** 🎮