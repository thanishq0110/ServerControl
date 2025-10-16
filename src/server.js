const express = require('express');
const path = require('path');
const Docker = require('dockerode');
const fs = require('fs');
const os = require('os');

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

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Get all running servers
app.get('/api/servers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const servers = containers
      .filter(c => c.Names && c.Names[0] && c.Names[0].includes('palworld-server-'))
      .map(c => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0].replace('/', ''),
        status: c.State,
        state: c.Status,
        ports: c.Ports || [],
        image: c.Image
      }));
    
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ServerControl Panel running on port ${PORT}`);
  console.log(`Access it at http://localhost:${PORT}`);
});