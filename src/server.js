const express = require('express');
const path = require('path');
const Docker = require('dockerode');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;

// Initialize Docker connection
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Ensure persistent data directory exists
const DATA_DIR = path.join(os.homedir(), '.servercontrol', 'palworld-servers');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
fs.chmodSync(DATA_DIR, 0o777);

// Helper function to get public IP
function getPublicIP() {
  try {
    // Try environment variable first
    if (process.env.PUBLIC_IP) {
      return process.env.PUBLIC_IP;
    }
    
    // Try to get the host IP from Docker bridge network
    const result = execSync("ip -4 addr show docker0 | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'").toString().trim();
    if (result) {
      return result;
    }
    
    // Fallback: try default docker bridge gateway
    return '172.17.0.1';
  } catch (error) {
    // Last resort: return docker default
    return '172.17.0.1';
  }
}

// Helper function to detect server status from logs
async function getServerStatus(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({ 
      stdout: true, 
      stderr: true,
      follow: false,
      tail: 200
    });
    const logsText = logs.toString();
    
    // Check for specific patterns in logs
    if (logsText.includes('Running Palworld dedicated server')) {
      return 'Running';
    } else if (logsText.includes('Starting Installation') || 
               logsText.includes('Downloading update') ||
               logsText.includes('Installing update') ||
               logsText.includes('Extracting package')) {
      return 'Installing';
    } else if (logsText.includes('[S_API FAIL]') && !logsText.includes('Running Palworld')) {
      return 'Installing';
    }
    return 'Starting';
  } catch (error) {
    console.error('Error getting server status:', error);
    return 'Unknown';
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Get all running servers with detailed status
app.get('/api/servers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    
    // Get public IP from multiple sources
    let publicIP = process.env.PUBLIC_IP;
    
    // If not set, try to get from request hostname
    if (!publicIP) {
      const host = req.get('host');
      if (host) {
        publicIP = host.split(':')[0]; // Remove port if present
      }
    }
    
    // If still not available, use getPublicIP()
    if (!publicIP) {
      publicIP = getPublicIP();
    }
    
    const servers = await Promise.all(
      containers
        .filter(c => c.Names && c.Names[0] && c.Names[0].includes('palworld-server-'))
        .map(async (c) => {
          const isRunning = c.State === 'running';
          let detailStatus = 'Stopped';
          
          if (isRunning) {
            detailStatus = await getServerStatus(c.Id);
          }
          
          // Extract game port (specifically 8211/udp)
          let gamePort = null;
          if (c.Ports && c.Ports.length > 0) {
            // Look specifically for the game port (8211/udp)
            const gamePortMapping = c.Ports.find(p => 
              p.Type === 'udp' && p.PrivatePort === 8211 && p.PublicPort
            );
            gamePort = gamePortMapping ? gamePortMapping.PublicPort : null;
          }
          
          return {
            id: c.Id.substring(0, 12),
            name: c.Names[0].replace('/', ''),
            status: c.State,
            detailStatus: detailStatus,
            state: c.Status,
            ports: c.Ports || [],
            gamePort: gamePort,
            publicIP: publicIP,
            image: c.Image
          };
        })
    );
    
    res.json(servers);
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

// Create a new Palworld server
app.post('/api/servers', async (req, res) => {
  try {
    const { serverName, serverPassword, maxPlayers } = req.body;
    
    if (!serverName) {
      return res.status(400).json({ error: 'Server name is required' });
    }

    const containerName = `palworld-server-${Date.now()}`;
    
    // Find available port (starting from 8211)
    let port = 8211;
    let portAvailable = false;
    const existingContainers = await docker.listContainers({ all: true });
    
    for (let p = 8211; p < 8300; p++) {
      const portTaken = existingContainers.some(c => 
        c.Ports && c.Ports.some(portInfo => portInfo.PublicPort === p)
      );
      if (!portTaken) {
        port = p;
        portAvailable = true;
        break;
      }
    }

    if (!portAvailable) {
      return res.status(400).json({ error: 'No available ports' });
    }

    // Pull the latest image first
    console.log('Pulling latest Palworld server image...');
    await docker.pull('thijsvanloef/palworld-server-docker:latest');

    // Create server-specific data directory with proper permissions
    const serverDataDir = path.join(DATA_DIR, containerName);
    if (!fs.existsSync(serverDataDir)) {
      fs.mkdirSync(serverDataDir, { recursive: true });
    }
    
    // Make directory world-writable so container can access it
    fs.chmodSync(serverDataDir, 0o777);

    const container = await docker.createContainer({
      Image: 'thijsvanloef/palworld-server-docker:latest',
      name: containerName,
      HostConfig: {
        PortBindings: {
          '8211/udp': [{ HostPort: port.toString() }],
          '27015/udp': [{ HostPort: (port + 16804).toString() }]
        },
        Memory: 6442450944, // 6GB
        Binds: [
          `${serverDataDir}:/palworld`
        ]
      },
      ExposedPorts: {
        '8211/udp': {},
        '27015/udp': {}
      },
      Env: [
        'PUID=1000',
        'PGID=1000',
        `PORT=8211`,
        'QUERY_PORT=27015',
        'MULTITHREADING=true',
        'RCON_ENABLED=true',
        'RCON_PORT=25575',
        'TZ=UTC',
        `SERVER_NAME=${serverName}`,
        `SERVER_PASSWORD=${serverPassword || ''}`,
        `PLAYERS=${maxPlayers || 32}`,
        'COMMUNITY=false',
        'UPDATE_ON_BOOT=true'
      ]
    });

    await container.start();

    res.json({
      success: true,
      message: 'Server created and started',
      server: {
        id: container.id.substring(0, 12),
        name: containerName,
        port: port
      }
    });
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: 'Failed to create server', details: error.message });
  }
});

// Start a server
app.post('/api/servers/:id/start', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.start();
    res.json({ success: true, message: 'Server started' });
  } catch (error) {
    console.error('Error starting server:', error);
    res.status(500).json({ error: 'Failed to start server' });
  }
});

// Stop a server
app.post('/api/servers/:id/stop', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.stop({ t: 30 });
    res.json({ success: true, message: 'Server stopped' });
  } catch (error) {
    console.error('Error stopping server:', error);
    res.status(500).json({ error: 'Failed to stop server' });
  }
});

// Delete a server
app.delete('/api/servers/:id', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    
    // Stop if running
    try {
      await container.stop({ t: 10 });
    } catch (e) {
      // Already stopped
    }
    
    // Remove container
    await container.remove({ force: true });
    
    res.json({ success: true, message: 'Server deleted' });
  } catch (error) {
    console.error('Error deleting server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// Get server logs
app.get('/api/servers/:id/logs', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const logs = await container.logs({ 
      stdout: true, 
      stderr: true,
      follow: false,
      tail: 100
    });
    res.json({ logs: logs.toString() });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Update server settings
app.patch('/api/servers/:id/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    const container = docker.getContainer(req.params.id);
    
    // Get current container info
    const containerInfo = await container.inspect();
    const currentEnv = containerInfo.Config.Env || [];
    
    // Update environment variables based on settings
    const newEnv = currentEnv.map(envVar => {
      const [key] = envVar.split('=');
      
      if (key === 'SERVER_NAME' && settings.serverName) {
        return `SERVER_NAME=${settings.serverName}`;
      }
      if (key === 'SERVER_PASSWORD' && settings.password !== undefined) {
        return `SERVER_PASSWORD=${settings.password || ''}`;
      }
      if (key === 'PLAYERS' && settings.maxPlayers) {
        return `PLAYERS=${settings.maxPlayers}`;
      }
      if (key === 'DIFFICULTY' && settings.difficulty) {
        return `DIFFICULTY=${settings.difficulty}`;
      }
      
      return envVar;
    });
    
    // Add new settings if not already present
    if (!currentEnv.some(e => e.startsWith('DIFFICULTY='))) {
      newEnv.push(`DIFFICULTY=${settings.difficulty || 'Normal'}`);
    }
    
    // Store settings in a metadata file for persistence
    const settingsFile = path.join(os.homedir(), '.servercontrol', 'settings', `${req.params.id}.json`);
    const settingsDir = path.dirname(settingsFile);
    
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    
    res.json({ success: true, message: 'Settings saved. Restart the server for changes to take effect.' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  }
});

// Get server settings
app.get('/api/servers/:id/settings', async (req, res) => {
  try {
    const settingsFile = path.join(os.homedir(), '.servercontrol', 'settings', `${req.params.id}.json`);
    
    if (fs.existsSync(settingsFile)) {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      res.json(settings);
    } else {
      res.json({
        serverName: 'Unnamed Server',
        description: '',
        difficulty: 'Normal',
        pvp: false,
        lossItemsDecreasedDeath: false,
        rconEnabled: true,
        community: false,
        updateOnBoot: true
      });
    }
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ServerControl Panel running on port ${PORT}`);
  console.log(`Access it at http://localhost:${PORT}`);
});