// API Base URL
const API_BASE = '/api';

// State
let servers = [];
let currentServerId = null;
let isLoading = false;

// Helper functions for loading
function showLoading(message = 'Loading...') {
    isLoading = true;
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').textContent = message;
    overlay.classList.add('show');
}

function hideLoading() {
    isLoading = false;
    document.getElementById('loadingOverlay').classList.remove('show');
}

function setLoadingText(message) {
    document.getElementById('loadingText').textContent = message;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadServers();
    document.getElementById('createServerForm').addEventListener('submit', handleCreateServer);
    
    // Auto-refresh servers every 5 seconds
    setInterval(() => {
        if (!isLoading) {
            loadServers();
        }
    }, 5000);
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
        const detailStatus = server.detailStatus || 'Unknown';
        const statusBadgeColor = 
            detailStatus === 'Running' ? 'status-running' :
            detailStatus === 'Installing' ? 'status-installing' :
            'status-stopped';
        
        const statusIcon = 
            detailStatus === 'Running' ? '✅' :
            detailStatus === 'Installing' ? '⏳' :
            '⛔';

        return `
            <div class="server-item">
                <div class="server-info">
                    <div class="server-header">
                        <div class="server-name">${server.name}</div>
                        <span class="status-badge ${statusBadgeColor}">
                            <span class="status-dot"></span>
                            ${statusIcon} ${detailStatus}
                        </span>
                    </div>
                    <div class="server-connection-info">
                        ${server.gamePort ? `
                            <div class="connection-detail">
                                <strong>🎮 Join:</strong> <code>${server.publicIP}:${server.gamePort}</code>
                                <button class="copy-btn" onclick="copyToClipboard('${server.publicIP}:${server.gamePort}')">📋</button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="server-details">
                        <span><strong>ID:</strong> ${server.id}</span>
                        <span><strong>Port:</strong> ${server.gamePort || 'N/A'}</span>
                        <span><strong>Status:</strong> ${server.state}</span>
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
    const createBtn = document.getElementById('createBtn');
    
    if (!serverName) {
        showMessage(messageDiv, 'Server name is required', 'error');
        return;
    }

    try {
        createBtn.disabled = true;
        showLoading(`Creating server "${serverName}"...`);
        
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

        hideLoading();
        showMessage(messageDiv, `✓ Server created on port ${data.server.port}! Installing...`, 'success');
        document.getElementById('createServerForm').reset();
        
        // Start polling for updates
        setLoadingText('Server is being installed and started...');
        showLoading('Server is being installed and started...');
        
        // Reload servers frequently for first 30 seconds
        let pollCount = 0;
        const pollInterval = setInterval(() => {
            pollCount++;
            loadServers();
            
            if (pollCount >= 6) { // 30 seconds (5 second intervals)
                clearInterval(pollInterval);
                hideLoading();
            }
        }, 5000);
        
    } catch (error) {
        hideLoading();
        showMessage(messageDiv, `✗ ${error.message}`, 'error');
    } finally {
        createBtn.disabled = false;
    }
}

// Start server
async function startServer(serverId) {
    try {
        showLoading('Starting server...');
        const response = await fetch(`${API_BASE}/servers/${serverId}/start`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to start server');
        
        setLoadingText('Server is starting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        hideLoading();
        loadServers();
    } catch (error) {
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

// Stop server
async function stopServer(serverId) {
    try {
        showLoading('Stopping server...');
        const response = await fetch(`${API_BASE}/servers/${serverId}/stop`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to stop server');
        
        setLoadingText('Server is shutting down...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        hideLoading();
        loadServers();
    } catch (error) {
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

// Delete server
async function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server? This cannot be undone.')) {
        return;
    }

    try {
        showLoading('Deleting server...');
        const response = await fetch(`${API_BASE}/servers/${serverId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete server');
        
        setLoadingText('Server deleted. Refreshing...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        hideLoading();
        loadServers();
    } catch (error) {
        hideLoading();
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
        showLoading('Fetching server logs...');
        const response = await fetch(`${API_BASE}/servers/${serverId}/logs`);
        const data = await response.json();
        hideLoading();
        logContent.textContent = data.logs || 'No logs available';
    } catch (error) {
        hideLoading();
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

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(() => {
        alert('Failed to copy to clipboard');
    });
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('logModal');
    if (e.target === modal) {
        closeLogModal();
    }
});