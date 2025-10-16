# ServerControl Dashboard - Professional Dark Theme Update

## 🎨 What's New

### Complete UI Redesign
A fully professional, dark-themed dashboard with modern aesthetics and comprehensive game server management features.

---

## ✨ Major Features

### 1. **Professional Dark Theme**
- Modern gradient backgrounds
- Carefully curated color palette
- Smooth animations and transitions
- Professional typography and spacing
- Responsive design for all devices

### 2. **Sidebar Navigation**
- Clean navigation menu with icons
- Active state indicators
- Quick access to Dashboard, Servers, and Create Server
- System status indicator
- Company branding

### 3. **Dashboard Tab** 📊
- Real-time server statistics
  - Total Servers
  - Running Servers
  - Installing Servers
  - Stopped Servers
- Recent servers list
- Quick overview of system health

### 4. **Servers Tab** 🖥️
- Beautiful server cards with hover effects
- Live connection information (IP:Port with copy button)
- Color-coded status badges
  - 🟢 **Running** - Green
  - 🟡 **Installing** - Orange
  - 🔴 **Stopped** - Gray
- Server information display
  - Port number
  - Max players
  - Server ID
  - Current status

### 5. **Game Settings Modal** ⚙️
Complete settings management across three tabs:

#### **General Settings**
- Server Name
- Server Description
- Password Protection

#### **Gameplay Settings**
- Max Players (1-128)
- Difficulty Level (Normal/Hard)
- PvP Toggle
- Item Loss on Death Settings

#### **Server Settings**
- Port Configuration (read-only after creation)
- RCON Enable/Disable
- Community Server Toggle
- Auto Update on Boot

### 6. **Create Server Tab** ➕
- Intuitive server creation form
- Required fields validation
- Optional description
- Easy to use interface

### 7. **Enhanced Server Cards**
Each server displays:
- Server name with status badge
- Real-time connection string (IP:Port)
- One-click copy to clipboard functionality
- Server details (Port, Players, ID, Status)
- Action buttons:
  - ▶️ Start / ⏹️ Stop
  - ⚙️ Settings
  - 📋 Logs
  - 🗑️ Delete

### 8. **Logs Viewer**
- Full-screen logs modal
- Server-specific log viewing
- Syntax highlighting for log readability
- Easy navigation

---

## 📱 Responsive Design

The dashboard works perfectly on:
- 🖥️ Desktop (1920px+)
- 💻 Laptop (1366px+)
- 📱 Tablet (768px+)
- 📞 Mobile (320px+)

Sidebar converts to horizontal navigation on mobile devices.

---

## 🎯 Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Primary | `#7c3aed` | Buttons, highlights, active states |
| Secondary | `#ec4899` | Accents, gradients |
| Accent | `#06b6d4` | Code, connections |
| Success | `#10b981` | Running status, confirmations |
| Warning | `#f59e0b` | Installing status, alerts |
| Danger | `#ef4444` | Delete, critical actions |
| Info | `#3b82f6` | Information, logs |

---

## 🚀 Deployment Instructions

### 1. **Pull Latest Code**
```bash
cd /path/to/ServerControl
git fetch origin
git reset --hard origin/main
```

### 2. **Rebuild Docker Image**
```bash
sudo docker-compose down
sudo docker-compose build --no-cache
sudo docker-compose up -d
```

### 3. **Verify It's Running**
```bash
curl http://localhost:3000/health
```

### 4. **Access the Dashboard**
```
http://your-ip:3000
```

---

## 📝 Technical Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables and gradients
- **Vanilla JavaScript** - No dependencies, pure JS
- **Responsive** - Mobile-first approach

### Backend
- **Express.js** - REST API server
- **Docker API** - Container management
- **File System** - Settings persistence
- **Node.js** - Runtime

### Features
- Real-time server status detection
- Persistent game settings storage
- Automatic log fetching
- Connection string generation
- One-click copy functionality

---

## 🔧 Configuration

### Environment Variables
Set in `docker-compose.yml`:
```yaml
environment:
  - PUBLIC_IP=192.168.1.100  # Your machine's IP (optional)
```

### Settings Storage
Settings are stored in:
```
~/.servercontrol/settings/{server-id}.json
```

---

## 💡 Usage Tips

### Creating a Server
1. Go to **Create Server** tab
2. Enter server name (required)
3. Set max players (1-128)
4. Add password (optional)
5. Click **Create Server**
6. Server will start installing automatically

### Managing a Server
1. View all servers in **Servers** tab
2. Copy connection string with 📋 button
3. Click ⚙️ to modify settings
4. Use ▶️/⏹️ to start/stop
5. View logs with 📋 Logs button

### Customizing Settings
1. Click ⚙️ Settings button on any server
2. Edit across three tabs:
   - General (name, password)
   - Gameplay (difficulty, PvP, etc.)
   - Server (RCON, updates, etc.)
3. Click **Save Settings**
4. Restart server for changes to take effect

---

## 🎬 Quick Start Commands

```bash
# Stop containers
sudo docker-compose down

# Clean rebuild
sudo docker-compose build --no-cache --pull always

# Start containers
sudo docker-compose up -d

# View logs
sudo docker-compose logs -f web

# Check health
curl http://localhost:3000/health
```

---

## 📊 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/servers` | List all servers |
| POST | `/api/servers` | Create new server |
| POST | `/api/servers/:id/start` | Start server |
| POST | `/api/servers/:id/stop` | Stop server |
| DELETE | `/api/servers/:id` | Delete server |
| GET | `/api/servers/:id/logs` | Get server logs |
| GET | `/api/servers/:id/settings` | Get server settings |
| PATCH | `/api/servers/:id/settings` | Update server settings |
| GET | `/health` | Health check |

---

## 🐛 Troubleshooting

### Dashboard shows "Loading..." forever
- Check if Docker is running: `docker ps`
- Verify API is responding: `curl http://localhost:3000/health`
- Check browser console for errors (F12)

### Can't see server connection IP
- Ensure `PUBLIC_IP` environment variable is set
- Or access panel from the machine's IP address (not localhost)
- Check server logs for more info

### Settings not saving
- Ensure `.servercontrol/settings` directory exists
- Check file permissions: `ls -la ~/.servercontrol/`
- Restart server for changes to apply

### Port conflicts
- Check if port 3000 is already in use: `lsof -i :3000`
- Change PORT in server.js or docker-compose.yml

---

## 🎯 Future Enhancements

- [ ] Server performance metrics
- [ ] Player list viewer
- [ ] Real-time chat monitoring
- [ ] Automated backups
- [ ] Server scheduling
- [ ] Multi-user access control
- [ ] Server templates
- [ ] Advanced analytics

---

## 📞 Support

For issues or feature requests, check:
1. Server logs: `sudo docker-compose logs web`
2. Browser console (F12)
3. API health: `curl http://localhost:3000/health`

---

**Version**: 2.0 Professional Dashboard
**Last Updated**: 2024
**Theme**: Dark Professional