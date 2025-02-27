// State management
const state = {
  proxyInfo: null,
  workersInfo: null,
  loading: false,
  error: null,
  dashboardView: 'proxy',
  config: {
    apiUrl: 'http://localhost:4333',
    accessToken: '',
    autoRefresh: true,
    refreshInterval: 30
  },
  debug: {
    enabled: false,
    logs: []
  }
};


// Debug functions
function debugLog(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const log = { timestamp, message, type };
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  state.debug.logs.unshift(log);
  // Keep only the last 100 logs
  if (state.debug.logs.length > 100) {
    state.debug.logs.pop();
  }
  
  // Update debug window if it's open
  const debugWindow = document.getElementById('debug-window');
  if (debugWindow && state.debug.enabled) {
    renderDebugWindow();
  }
}

// Render functions
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex flex-col min-h-screen">
      ${renderHeader()}
      <main class="container p-4" style="flex: 1;">
        <div class="flex flex-col-md" style="margin-bottom: 1rem;">
          ${renderSettings()}
          ${renderMainContent()}
        </div>
        ${state.workersInfo ? renderWorkers() : ''}
        ${state.debug.enabled ? renderDebugWindow() : ''}
      </main>
      ${renderFooter()}
    </div>
  `;
  
  // Add event listeners after rendering
  addEventListeners();
}

function renderHeader() {
  return `
    <header>
      <div class="container header-content">
        <h1>Mining Proxy Dashboard</h1>
        <div class="flex items-center">
          <button id="debug-toggle" class="btn mr-2 ${state.debug.enabled ? 'btn-active' : ''}" style="background-color: ${state.debug.enabled ? '#9333ea' : '#4b5563'}">
            ${getIcon('terminal', 16)} Debug
          </button>
          <button id="refresh-btn" class="btn" ${state.loading ? 'disabled' : ''}>
            ${getIcon('refresh', 16)} Refresh
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderSettings() {
  return `
    <div class="card" style="flex: 1; margin-right: 1rem; margin-bottom: 1rem;">
      <h2>Connection Settings</h2>
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-gray-600 mb-1">API URL</label>
          <input 
            id="api-url" 
            type="text" 
            value="${state.config.apiUrl}" 
            class="w-full px-3 py-2 border rounded"
            placeholder="http://localhost:4333"
          />
        </div>
        
        <div>
          <label class="block text-sm text-gray-600 mb-1">Access Token (optional)</label>
          <input 
            id="access-token" 
            type="password" 
            value="${state.config.accessToken}" 
            class="w-full px-3 py-2 border rounded"
            placeholder="Bearer token"
          />
        </div>
        
        <div class="flex items-center">
          <input 
            id="auto-refresh" 
            type="checkbox" 
            ${state.config.autoRefresh ? 'checked' : ''}
            class="mr-2"
          />
          <label for="auto-refresh" class="text-sm text-gray-600">Auto refresh</label>
          
          <div class="ml-4" id="refresh-interval-container" style="${state.config.autoRefresh ? '' : 'display: none;'}">
            <select 
              id="refresh-interval"
              class="px-2 py-1 border rounded"
            >
              <option value="10" ${state.config.refreshInterval === 10 ? 'selected' : ''}>10 sec</option>
              <option value="30" ${state.config.refreshInterval === 30 ? 'selected' : ''}>30 sec</option>
              <option value="60" ${state.config.refreshInterval === 60 ? 'selected' : ''}>1 min</option>
              <option value="300" ${state.config.refreshInterval === 300 ? 'selected' : ''}>5 min</option>
            </select>
          </div>
        </div>
        
        <div>
          <button 
            id="connect-btn"
            class="btn w-full py-2"
            ${state.loading ? 'disabled' : ''}
          >
            ${state.loading ? 'Loading...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderMainContent() {
  if (state.error) {
    return `
      <div class="flex mb-4">
        <button id="view-proxy" class="btn mr-2 ${state.dashboardView === 'proxy' ? 'btn-active' : ''}">Proxy</button>
        <button id="view-hashrate" class="btn ${state.dashboardView === 'hashrate' ? 'btn-active' : ''}">Hashrate</button>
      </div>
      <div class="card bg-red-100 text-red-800" style="flex: 2;">
        <h2>Connection Error</h2>
        <p>${state.error}</p>
        <p class="mt-2 text-sm">Please check your connection settings and try again.</p>
        <div class="mt-2 p-2 bg-white rounded border">
          <p class="text-sm font-semibold">Troubleshooting Tips:</p>
          <ul class="text-sm mt-1 space-y-1" style="list-style: disc; padding-left: 1.5rem;">
            <li>Verify that your mining proxy is running</li>
            <li>Check if the API URL is correct (including http:// or https://)</li>
            <li>Make sure the proxy server allows external connections</li>
            <li>Check firewall settings for the port you're trying to access</li>
            <li>Try accessing the API directly in your browser</li>
          </ul>
        </div>
      </div>
    `;
  } else if (state.proxyInfo) {
    return `
      <div class="flex mb-4">
        <button id="view-proxy" class="btn mr-2 ${state.dashboardView === 'proxy' ? 'btn-active' : ''}">Proxy</button>
        <button id="view-hashrate" class="btn ${state.dashboardView === 'hashrate' ? 'btn-active' : ''}">Hashrate</button>
      </div>
      ${state.dashboardView === 'proxy' ? `
        <div style="flex: 2;">
          <div class="grid grid-cols-2" style="gap: 1rem;">
            <div class="card">
              <h2>Proxy Info</h2>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">ID:</span>
                  <span class="font-mono">${state.proxyInfo.id}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Worker ID:</span>
                  <span>${state.proxyInfo.worker_id}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Version:</span>
                  <span>${state.proxyInfo.version}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Uptime:</span>
                  <span>${formatTimespan(state.proxyInfo.uptime)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Miners:</span>
                  <span>${state.proxyInfo.miners.now} / ${state.proxyInfo.miners.max}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Upstreams:</span>
                  <span>${state.proxyInfo.upstreams}</span>
                </div>
              </div>
            </div>
            
            <div class="card">
              <h2>Results</h2>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Accepted:</span>
                  <span class="text-green-600">${state.proxyInfo.results.accepted}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Rejected:</span>
                  <span class="text-red-600">${state.proxyInfo.results.rejected}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Invalid:</span>
                  <span class="text-red-600">${state.proxyInfo.results.invalid}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Avg Time:</span>
                  <span>${state.proxyInfo.results.avg_time} ms</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Latency:</span>
                  <span>${state.proxyInfo.results.latency} ms</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Total Hashes:</span>
                  <span>${state.proxyInfo.results.hashes_total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card" style="margin-top: 1rem;">
            <h2>Hashrate</h2>
            <div class="grid-hashrate">
              <div class="text-center p-2 bg-gray-100 rounded">
                <div class="text-sm text-gray-600">1 min</div>
                <div class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[0])}</div>
              </div>
              <div class="text-center p-2 bg-gray-100 rounded">
                <div class="text-sm text-gray-600">10 min</div>
                <div class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[1])}</div>
              </div>
              <div class="text-center p-2 bg-gray-100 rounded">
                <div class="text-sm text-gray-600">1 hour</div>
                <div class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[2])}</div>
              </div>
              <div class="text-center p-2 bg-gray-100 rounded">
                <div class="text-sm text-gray-600">12 hours</div>
                <div class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[3])}</div>
              </div>
              <div class="text-center p-2 bg-gray-100 rounded">
                <div class="text-sm text-gray-600">24 hours</div>
                <div class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[4])}</div>
              </div>
            </div>
          </div>
        </div>
      ` : `
        <div class="grid grid-cols-2 gap-4">
          <div class="card col-span-2">
            <h2 class="mb-4">Total Hashrate Over Time</h2>
            <div class="bg-gray-100 p-4 rounded text-center">
              Hashrate visualization would be rendered here
            </div>
          </div>
          <div class="card">
            <h2>Hashrate Summary</h2>
            <div class="space-y-2">
              <div class="flex justify-between p-2 bg-gray-100 rounded">
                <span class="text-gray-600">1 min</span>
                <span class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[0])}</span>
              </div>
              <div class="flex justify-between p-2 bg-gray-100 rounded">
                <span class="text-gray-600">10 min</span>
                <span class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[1])}</span>
              </div>
              <div class="flex justify-between p-2 bg-gray-100 rounded">
                <span class="text-gray-600">1 hour</span>
                <span class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[2])}</span>
              </div>
              <div class="flex justify-between p-2 bg-gray-100 rounded">
                <span class="text-gray-600">12 hours</span>
                <span class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[3])}</span>
              </div>
              <div class="flex justify-between p-2 bg-gray-100 rounded">
                <span class="text-gray-600">24 hours</span>
                <span class="font-semibold">${formatHashrate(state.proxyInfo.hashrate.total[4])}</span>
              </div>
            </div>
          </div>
          <div class="card">
            <h2>Hash Performance</h2>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Total Hashes</span>
                <span class="font-semibold">
                  ${state.proxyInfo.results.hashes_total.toLocaleString()}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Average Hashrate</span>
                <span class="font-semibold">
                  ${formatHashrate(
                    (state.proxyInfo.hashrate.total[0] + 
                     state.proxyInfo.hashrate.total[1] + 
                     state.proxyInfo.hashrate.total[2] + 
                     state.proxyInfo.hashrate.total[3] + 
                     state.proxyInfo.hashrate.total[4]) / 5
                  )}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Highest Interval</span>
                <span class="font-semibold text-green-600">
                  ${formatHashrate(Math.max(...state.proxyInfo.hashrate.total))}
                </span>
              </div>
            </div>
          </div>
        </div>
      `}
        
      </div>
    `;
  } else {
    return `
      <div class="card flex items-center justify-center text-center" style="flex: 2; min-height: 300px;">
        ${state.loading ? `
          <div>
            <div class="animated-spinner"></div>
            <p>Loading proxy data...</p>
          </div>
        ` : `
          <div class="text-gray-500">
            ${getIcon('server', 48)}
            <p style="margin-top: 0.5rem;">Enter connection details and click Connect to view proxy statistics</p>
          </div>
        `}
      </div>
    `;
  }
}

function renderWorkers() {
  if (!state.workersInfo || !state.workersInfo.workers) {
    return '';
  }
  
  const workers = state.workersInfo.workers;
  
  if (workers.length === 0) {
    return `
      <div class="card text-center p-4">
        <h2>Workers</h2>
        <div class="p-4 text-gray-500">
          ${getIcon('users', 48)}
          <p style="margin-top: 0.5rem;">No workers connected</p>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="card">
      <div class="p-4 border-b">
        <h2>Workers</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-100">
              <th class="py-2 px-4 text-left">Name</th>
              <th class="py-2 px-4 text-left">IP Address</th>
              <th class="py-2 px-4 text-center">Connections</th>
              <th class="py-2 px-4 text-center">Accepted</th>
              <th class="py-2 px-4 text-center">Rejected</th>
              <th class="py-2 px-4 text-center">Invalid</th>
              <th class="py-2 px-4 text-right">Total Hashes</th>
              <th class="py-2 px-4 text-right">Last Seen</th>
              <th class="py-2 px-4 text-right">Hashrate (1m)</th>
            </tr>
          </thead>
          <tbody>
            ${workers.map((worker, index) => `
              <tr class="border-t hover">
                <td class="py-3 px-4">${worker[0]}</td>
                <td class="py-3 px-4 font-mono text-sm">${worker[1]}</td>
                <td class="py-3 px-4 text-center">${worker[2]}</td>
                <td class="py-3 px-4 text-center text-green-600">${worker[3]}</td>
                <td class="py-3 px-4 text-center text-red-600">${worker[4]}</td>
                <td class="py-3 px-4 text-center text-red-600">${worker[5]}</td>
                <td class="py-3 px-4 text-right">${worker[6].toLocaleString()}</td>
                <td class="py-3 px-4 text-right">${getLastSeen(worker[7])}</td>
                <td class="py-3 px-4 text-right font-semibold">${formatHashrate(worker[8])}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDebugWindow() {
  const logs = state.debug.logs;
  
  return `
    <div id="debug-window" class="card mt-4">
      <div class="flex justify-between items-center p-2 border-b bg-gray-100">
        <h2 class="font-mono">Debug Console</h2>
        <div>
          <button id="debug-clear" class="btn py-1 px-2" style="background-color: #4b5563;">Clear</button>
          <button id="debug-close" class="btn py-1 px-2 ml-2" style="background-color: #ef4444;">Close</button>
        </div>
      </div>
      <div class="overflow-y-auto" style="max-height: 300px; font-family: monospace; font-size: 0.875rem; background-color: #1e293b; color: #e2e8f0; padding: 0.5rem;">
        ${logs.length === 0 ? 
          '<div class="p-2 text-gray-400">No logs yet. Connect to the proxy to see debug information.</div>' : 
          logs.map(log => {
            let color = '#e2e8f0'; // Default light gray
            if (log.type === 'error') color = '#f87171'; // Red for errors
            if (log.type === 'warning') color = '#fbbf24'; // Yellow for warnings
            if (log.type === 'success') color = '#4ade80'; // Green for success
            
            return `<div class="py-1" style="color: ${color};">[${log.timestamp.split('T')[1].split('.')[0]}] ${log.type.toUpperCase()}: ${log.message}</div>`;
          }).join('')
        }
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer>
      <p>Mining Proxy Dashboard • Connected to ${state.config.apiUrl}</p>
    </footer>
  `;
}

// Event listeners
function addEventListeners() {
  // Connect button
  const connectBtn = document.getElementById('connect-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', fetchData);
  }
  
  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', fetchData);
  }
  
  // API URL input
  const apiUrlInput = document.getElementById('api-url');
  if (apiUrlInput) {
    apiUrlInput.addEventListener('change', (e) => {
      state.config.apiUrl = e.target.value;
      debugLog(`API URL changed to: ${state.config.apiUrl}`, 'info');
    });
  }
  
  // Access token input
  const accessTokenInput = document.getElementById('access-token');
  if (accessTokenInput) {
    accessTokenInput.addEventListener('change', (e) => {
      state.config.accessToken = e.target.value;
      debugLog(`Access token ${e.target.value ? 'set' : 'cleared'}`, 'info');
    });
  }
  
  // Auto refresh checkbox
  const autoRefreshCheckbox = document.getElementById('auto-refresh');
  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.addEventListener('change', (e) => {
      state.config.autoRefresh = e.target.checked;
      document.getElementById('refresh-interval-container').style.display = 
        state.config.autoRefresh ? 'block' : 'none';
      
      debugLog(`Auto refresh ${state.config.autoRefresh ? 'enabled' : 'disabled'}`, 'info');
      setupAutoRefresh();
    });
  }
  
  // Refresh interval select
  const refreshIntervalSelect = document.getElementById('refresh-interval');
  if (refreshIntervalSelect) {
    refreshIntervalSelect.addEventListener('change', (e) => {
      state.config.refreshInterval = parseInt(e.target.value);
      debugLog(`Refresh interval set to ${state.config.refreshInterval} seconds`, 'info');
      setupAutoRefresh();
    });
  }
  
  // Debug toggle button
  const debugToggleBtn = document.getElementById('debug-toggle');
  if (debugToggleBtn) {
    debugToggleBtn.addEventListener('click', () => {
      state.debug.enabled = !state.debug.enabled;
      debugLog(`Debug window ${state.debug.enabled ? 'opened' : 'closed'}`, 'info');
      renderApp();
    });
  }
  
  // Debug clear button
  const debugClearBtn = document.getElementById('debug-clear');
  if (debugClearBtn) {
    debugClearBtn.addEventListener('click', () => {
      state.debug.logs = [];
      debugLog('Debug logs cleared', 'info');
      renderDebugWindow();
    });
  }
  
  // Debug close button
  const debugCloseBtn = document.getElementById('debug-close');
  if (debugCloseBtn) {
    debugCloseBtn.addEventListener('click', () => {
      state.debug.enabled = false;
      renderApp();
    });
  }
}

// View switching for Proxy and Hashrate
  const viewProxyBtn = document.getElementById('view-proxy');
  const viewHashrateBtn = document.getElementById('view-hashrate');

  if (viewProxyBtn) {
    viewProxyBtn.addEventListener('click', () => {
      state.dashboardView = 'proxy';
      renderApp();
    });
  }

  if (viewHashrateBtn) {
    viewHashrateBtn.addEventListener('click', () => {
      state.dashboardView = 'hashrate';
      renderApp();
    });
  }
}

// Utility functions
function getIcon(name, size = 24) {
  const icon = document.getElementById(`icon-${name}`);
  if (!icon) return '';
  
  const iconSvg = icon.cloneNode(true);
  iconSvg.setAttribute('width', size);
  iconSvg.setAttribute('height', size);
  iconSvg.style.display = 'inline-block';
  
  const wrapper = document.createElement('div');
  wrapper.appendChild(iconSvg);
  return wrapper.innerHTML;
}

function formatHashrate(hashrate) {
  if (!hashrate || isNaN(hashrate)) return '0.00 H/s';
  
  if (hashrate >= 1000000) {
    return `${(hashrate / 1000000).toFixed(2)} MH/s`;
  } else if (hashrate >= 1000) {
    return `${(hashrate / 1000).toFixed(2)} KH/s`;
  } else {
    return `${hashrate.toFixed(2)} H/s`;
  }
}

function formatTimespan(seconds) {
  if (!seconds || isNaN(seconds)) return '0s';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

function getLastSeen(timestamp) {
  if (!timestamp) return 'N/A';
  
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  
  return formatTimespan(diff) + ' ago';
}

// Data fetching
let refreshInterval = null;

function setupAutoRefresh() {
  // Clear existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  
  // Set up new interval if auto-refresh is enabled
  if (state.config.autoRefresh) {
    refreshInterval = setInterval(fetchData, state.config.refreshInterval * 1000);
    debugLog(`Auto refresh scheduled every ${state.config.refreshInterval} seconds`, 'info');
  }
}

async function fetchData() {
  state.loading = true;
  renderApp();
  
  try {
    debugLog(`Fetching proxy data from: ${state.config.apiUrl}`, 'info');
    const headers = {};
    if (state.config.accessToken) {
      headers['Authorization'] = `Bearer ${state.config.accessToken}`;
      debugLog('Using authorization bearer token', 'info');
    }
    
    // Fetch proxy info - UPDATED TO USE CORRECT ENDPOINT
    debugLog(`GET request to: ${state.config.apiUrl}/1/summary`, 'info');
    const proxyStartTime = Date.now();
    const proxyResponse = await fetch(`${state.config.apiUrl}/1/summary`, {
      headers,
      mode: 'cors'
    }).catch(err => {
      throw new Error(`Network error: ${err.message}`);
    });
    
    const proxyFetchTime = Date.now() - proxyStartTime;
    debugLog(`Received response in ${proxyFetchTime}ms with status: ${proxyResponse.status}`, 
             proxyResponse.ok ? 'success' : 'error');
    
    if (!proxyResponse.ok) {
      throw new Error(`Error fetching proxy data: ${proxyResponse.status}`);
    }
    
    const proxyData = await proxyResponse.json();
    debugLog('Successfully parsed proxy data JSON', 'success');
    state.proxyInfo = proxyData;
    
    // Fetch workers info - UPDATED TO USE CORRECT ENDPOINT
    debugLog(`GET request to: ${state.config.apiUrl}/1/workers`, 'info');
    const workersStartTime = Date.now();
    const workersResponse = await fetch(`${state.config.apiUrl}/1/workers`, {
      headers,
      mode: 'cors'
    }).catch(err => {
      throw new Error(`Network error when fetching workers: ${err.message}`);
    });
    
    const workersFetchTime = Date.now() - workersStartTime;
    debugLog(`Received workers response in ${workersFetchTime}ms with status: ${workersResponse.status}`, 
             workersResponse.ok ? 'success' : 'error');
    
    if (!workersResponse.ok) {
      throw new Error(`Error fetching workers data: ${workersResponse.status}`);
    }
    
    const workersData = await workersResponse.json();
    debugLog('Successfully parsed workers data JSON', 'success');
    state.workersInfo = workersData;
    
    // Connection successful
    debugLog('Connection successful! All data fetched and parsed.', 'success');
    state.error = null;
    setupAutoRefresh();
  } catch (err) {
    console.error('Failed to fetch data:', err);
    debugLog(`Error: ${err.message}`, 'error');
    state.error = err.message;
  } finally {
    state.loading = false;
    renderApp();
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  debugLog('Dashboard initialized', 'info');
  renderApp();
});
