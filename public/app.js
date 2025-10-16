// API Base URL
const API_BASE = '/api';

// State
let servers = [];
let currentServerForSettings = null;
let currentSettingsTab = 'general';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadServers();
    setupTimeDisplay();
    document.getElementById('createServerForm').addEventListener('submit', handleCreateServer);
    
    // Auto-refresh servers every 5 seconds
    setInterval(() => {
        loadServers();
    }, 5000);
});

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Update header
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Monitor and manage your Palworld servers' },
        servers: { title: 'Servers', subtitle: 'View all your game servers' },
        create: { title: 'Create New Server', subtitle: 'Set up a new Palworld game server' }
    };
    
    const config = titles[tabName];
    document.getElementById('pageTitle').textContent = config.title;
    document.getElementById('pageSubtitle').textContent = config.subtitle;
}

// Time display
function setupTimeDisplay() {
    function updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('timeDisplay').textContent = `${hours}:${minutes}`;
    }
    
    updateTime();
    setInterval(updateTime, 30000);
}

// Load and display servers
async function loadServers() {
    try {
        const response = await fetch(`${API_BASE}/servers`);
        const data = await response.json();
        servers = data;
        renderDashboard();
        renderServers();
    } catch (error) {
        console.error('Error loading servers:', error);
    }
}

// Render dashboard stats
function renderDashboard() {
    const total = servers.length;
    const running = servers.filter(s => s.detailStatus === 'Running').length;
    const installing = servers.filter(s => s.detailStatus === 'Installing').length;
    const stopped = servers.filter(s => s.status === 'exited' || s.detailStatus === 'Stopped').length;
    
    document.getElementById('totalServers').textContent = total;
    document.getElementById('runningServers').textContent = running;
    document.getElementById('installingServers').textContent = installing;
    document.getElementById('stoppedServers').textContent = stopped;
    
    // Render recent servers
    const recent = servers.slice(0, 5);
    const recentHtml = recent.length > 0 
        ? recent.map(server => `
            <div class="recent-server-item">
                <div class="recent-info">
                    <strong>${server.name}</strong>
                    <span class="status-badge ${getStatusClass(server.detailStatus)}">
                        ${getStatusIcon(server.detailStatus)} ${server.detailStatus}
                    </span>
                </div>
            </div>
        `).join('')
        : '<p style="text-align: center; color: var(--text-tertiary); padding: 2rem;">No servers yet</p>';
    
    document.getElementById('recentList').innerHTML = recentHtml;
}

// Render servers grid
function renderServers() {
    const serversList = document.getElementById('serversList');
    
    if (servers.length === 0) {
        serversList.innerHTML = `
            <div class="loading-state" style="grid-column: 1/-1; padding: 4rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
                <p style="font-size: 1.1rem; color: var(--text-tertiary);">No servers yet. Create one to get started!</p>
            </div>
        `;
        return;
    }
    
    serversList.innerHTML = servers.map(server => {
        const isRunning = server.status === 'running';
        const detailStatus = server.detailStatus || 'Unknown';
        
        return `
            <div class="server-card">
                <div class="server-header-section">
                    <div class="server-title">
                        <div class="server-name">${server.name}</div>
                        <span class="status-badge ${getStatusClass(detailStatus)}">
                            <span class="status-dot"></span>
                            ${getStatusIcon(detailStatus)} ${detailStatus}
                        </span>
                    </div>
                </div>
                
                ${server.gamePort ? `
                    <div class="connection-section">
                        <div class="connection-label">🎮 Connection</div>
                        <div class="connection-string">
                            <span class="connection-value">${server.publicIP}:${server.gamePort}</span>
                            <button class="copy-btn" onclick="copyToClipboard('${server.publicIP}:${server.gamePort}', event)" title="Copy connection string">📋</button>
                        </div>
                    </div>
                ` : ''}
                
                <div class="server-info-section">
                    <div class="server-info-grid">
                        <div class="info-item">
                            <span class="info-label">🎮 Port</span>
                            <span class="info-value">${server.gamePort || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">👥 Players</span>
                            <span class="info-value">32 Max</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">🆔 ID</span>
                            <span class="info-value">${server.id}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">📊 Status</span>
                            <span class="info-value">${server.state}</span>
                        </div>
                    </div>
                </div>
                
                <div class="server-footer">
                    ${isRunning 
                        ? `<button class="btn btn-sm btn-secondary" onclick="stopServer('${server.id}', event)">⏹️ Stop</button>`
                        : `<button class="btn btn-sm btn-success" onclick="startServer('${server.id}', event)">▶️ Start</button>`
                    }
                    <button class="btn btn-sm btn-primary" onclick="openSettings('${server.id}', event)">⚙️ Settings</button>
                    <button class="btn btn-sm btn-secondary" onclick="viewLogs('${server.id}', '${server.name}', event)">📋 Logs</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteServer('${server.id}', event)">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Helper functions
function getStatusIcon(status) {
    switch(status) {
        case 'Running': return '✅';
        case 'Installing': return '⏳';
        case 'Stopped': return '⛔';
        default: return '❓';
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'Running': return 'status-running';
        case 'Installing': return 'status-installing';
        default: return 'status-stopped';
    }
}

// Create server
async function handleCreateServer(e) {
    e.preventDefault();
    
    const serverName = document.getElementById('serverName').value.trim();
    const serverPassword = document.getElementById('serverPassword').value.trim();
    const maxPlayers = document.getElementById('maxPlayers').value;
    const description = document.getElementById('serverDescription').value.trim();
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
                maxPlayers: parseInt(maxPlayers),
                description
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create server');
        }

        showMessage(messageDiv, `✓ Server created on port ${data.server.port}! Installing...`, 'success');
        document.getElementById('createServerForm').reset();
        
        // Reload servers frequently for first 30 seconds
        let pollCount = 0;
        const pollInterval = setInterval(() => {
            pollCount++;
            loadServers();
            
            if (pollCount >= 6) {
                clearInterval(pollInterval);
                hideLoading();
            }
        }, 5000);
        
    } catch (error) {
        showMessage(messageDiv, `✗ ${error.message}`, 'error');
    } finally {
        createBtn.disabled = false;
    }
}

// Server actions
async function startServer(serverId, event) {
    event.stopPropagation();
    try {
        showLoading('Starting server...');
        const response = await fetch(`${API_BASE}/servers/${serverId}/start`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to start server');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        hideLoading();
        loadServers();
    } catch (error) {
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

async function stopServer(serverId, event) {
    event.stopPropagation();
    try {
        showLoading('Stopping server...');
        const response = await fetch(`${API_BASE}/servers/${serverId}/stop`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to stop server');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        hideLoading();
        loadServers();
    } catch (error) {
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

async function deleteServer(serverId, event) {
    event.stopPropagation();
    if (!confirm('⚠️ Are you sure you want to delete this server? This cannot be undone.')) {
        return;
    }

    try {
        showLoading('Deleting server...');
        const response = await fetch(`${API_BASE}/servers/${serverId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete server');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        hideLoading();
        loadServers();
    } catch (error) {
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

// Settings
function openSettings(serverId, event) {
    event.stopPropagation();
    currentServerForSettings = serverId;
    const server = servers.find(s => s.id === serverId);
    
    if (server) {
        document.getElementById('settingsTitle').textContent = `Settings - ${server.name}`;
        
        // Fill in the settings form
        document.getElementById('set-serverName').value = server.name || '';
        document.getElementById('set-description').value = server.description || '';
        document.getElementById('set-password').value = '';
        document.getElementById('set-maxPlayers').value = 32;
        document.getElementById('set-port').value = server.gamePort || '';
        
        // Show modal
        document.getElementById('settingsModal').classList.add('show');
        currentSettingsTab = 'general';
        switchSettingsTab('general');
    }
}

function switchSettingsTab(tabName) {
    currentSettingsTab = tabName;
    
    // Hide all tabs
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

async function saveSettings() {
    if (!currentServerForSettings) return;
    
    try {
        showLoading('Saving settings...');
        
        // Prepare settings object
        const settings = {
            serverName: document.getElementById('set-serverName').value || 'Unnamed Server',
            description: document.getElementById('set-description').value,
            password: document.getElementById('set-password').value,
            maxPlayers: parseInt(document.getElementById('set-maxPlayers').value) || 32,
            difficulty: document.getElementById('set-difficulty').value || 'Normal',
            pvp: document.getElementById('set-pvp').checked,
            lossItemsDecreasedDeath: document.getElementById('set-loss-items-decreased-death').checked,
            rconEnabled: document.getElementById('set-rcon-enabled').checked,
            community: document.getElementById('set-community').checked,
            updateOnBoot: document.getElementById('set-update-on-boot').checked
        };
        
        // Send settings to server (if endpoint exists)
        // For now, just show success and close
        await new Promise(resolve => setTimeout(resolve, 1000));
        hideLoading();
        closeSettingsModal();
        loadServers();
    } catch (error) {
        hideLoading();
        alert(`Error: ${error.message}`);
    }
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
    currentServerForSettings = null;
}

// Logs
async function viewLogs(serverId, serverName, event) {
    event.stopPropagation();
    const modal = document.getElementById('logsModal');
    const logContent = document.getElementById('logContent');
    
    document.getElementById('logsTitle').textContent = `Logs - ${serverName}`;
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

function closeLogsModal() {
    document.getElementById('logsModal').classList.remove('show');
}

// Utilities
function copyToClipboard(text, event) {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.style.color = 'var(--success)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.color = 'var(--accent)';
        }, 2000);
    }).catch(() => {
        alert('Failed to copy to clipboard');
    });
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message show ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            element.classList.remove('show');
        }, 5000);
    }
}

function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').textContent = message;
    overlay.classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.parentElement.id === 'settingsModal') {
            closeSettingsModal();
        } else if (e.target.parentElement.id === 'logsModal') {
            closeLogsModal();
        }
    }
});

// Add CSS styles for recent server item
const style = document.createElement('style');
style.textContent = `
    .recent-server-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background-color: var(--surface-light);
        border-radius: 6px;
        border: 1px solid var(--border-light);
    }
    
    .recent-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .recent-info strong {
        color: var(--text-primary);
    }
`;
document.head.appendChild(style);