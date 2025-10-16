// API Base URL
const API_BASE = '/api';

// State
let servers = [];
let currentServerId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadServers();
    document.getElementById('createServerForm').addEventListener('submit', handleCreateServer);
    
    // Auto-refresh servers every 5 seconds
    setInterval(loadServers, 5000);
});

// Load and display servers
async function loadServers() {
    try {
        const response = await fetch(`${API_BASE}/servers`);
        const data = await response.json();
        servers = data;
        renderServers();
    } catch (error) {
        console.error('Error loading servers:', error);
        document.getElementById('serversList').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Failed to load servers. Make sure Docker is running.</p>
            </div>
        `;
    }
}

// Render servers list
function renderServers() {
    const serversList = document.getElementById('serversList');
    
    if (servers.length === 0) {
        serversList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚀</div>
                <p>No servers yet. Create one to get started!</p>
            </div>
        `;
        return;
    }

    serversList.innerHTML = servers.map(server => {
        const isRunning = server.status === 'running';
        const portInfo = server.ports && server.ports.length > 0 
            ? server.ports.map(p => `${p.PublicPort || '?'}/${p.Type}`).join(', ')
            : 'Not mapped';

        return `
            <div class="server-item">
                <div class="server-info">
                    <div class="server-name">${server.name}</div>
                    <div class="server-status">
                        <span class="status-badge ${isRunning ? 'status-running' : 'status-stopped'}">
                            <span class="status-dot ${isRunning ? 'running' : 'stopped'}"></span>
                            ${isRunning ? 'Running' : 'Stopped'}
                        </span>
                    </div>
                    <div class="server-details">
                        <span><strong>Container ID:</strong> ${server.id}</span>
                        <span><strong>Status:</strong> ${server.state}</span>
                        <span><strong>Ports:</strong> ${portInfo}</span>
                    </div>
                </div>
                <div class="server-actions">
                    <div class="action-group">
                        ${isRunning 
                            ? `<button class="btn btn-sm btn-secondary" onclick="stopServer('${server.id}')">Stop</button>`
                            : `<button class="btn btn-sm btn-success" onclick="startServer('${server.id}')">Start</button>`
                        }
                        <button class="btn btn-sm btn-secondary" onclick="viewLogs('${server.id}', '${server.name}')">Logs</button>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteServer('${server.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Handle create server form submission
async function handleCreateServer(e) {
    e.preventDefault();
    
    const serverName = document.getElementById('serverName').value.trim();
    const serverPassword = document.getElementById('serverPassword').value.trim();
    const maxPlayers = document.getElementById('maxPlayers').value;
    const messageDiv = document.getElementById('createMessage');
    
    if (!serverName) {
        showMessage(messageDiv, 'Server name is required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/servers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serverName,
                serverPassword,
                maxPlayers: parseInt(maxPlayers)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create server');
        }

        showMessage(messageDiv, `✓ Server created! Port: ${data.server.port}`, 'success');
        document.getElementById('createServerForm').reset();
        
        // Reload servers
        setTimeout(loadServers, 1000);
    } catch (error) {
        showMessage(messageDiv, `✗ ${error.message}`, 'error');
    }
}

// Start server
async function startServer(serverId) {
    try {
        const response = await fetch(`${API_BASE}/servers/${serverId}/start`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to start server');
        loadServers();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Stop server
async function stopServer(serverId) {
    try {
        const response = await fetch(`${API_BASE}/servers/${serverId}/stop`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to stop server');
        loadServers();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Delete server
async function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server? This cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/servers/${serverId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete server');
        loadServers();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// View server logs
async function viewLogs(serverId, serverName) {
    const modal = document.getElementById('logModal');
    const logContent = document.getElementById('logContent');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = `Logs - ${serverName}`;
    logContent.textContent = 'Loading logs...';
    modal.classList.add('show');
    
    try {
        const response = await fetch(`${API_BASE}/servers/${serverId}/logs`);
        const data = await response.json();
        logContent.textContent = data.logs || 'No logs available';
    } catch (error) {
        logContent.textContent = `Error loading logs: ${error.message}`;
    }
}

// Close log modal
function closeLogModal() {
    document.getElementById('logModal').classList.remove('show');
}

// Show message
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            element.className = 'message';
        }, 5000);
    }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('logModal');
    if (e.target === modal) {
        closeLogModal();
    }
});