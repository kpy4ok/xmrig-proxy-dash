// State management
const state = {
  proxyInfo: null,
  workersInfo: null,
  loading: false,
  error: null,
  config: {
    apiUrl: 'http://localhost:4333',
    accessToken: '',
    autoRefresh: true,
    refreshInterval: 30
  },
  sorting: {
    column: 'hashrate',
    direction: 'desc' // 'asc' or 'desc'
  },
  filters: {
    hideInactive: false // hide workers inactive for more than 10 minutes
  },
  hashrateHistory: {
    timestamps: [],
    values: [],
    lastUpdate: null
  }
};

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
      </main>
      ${renderFooter()}
    </div>
  `;
  
  // Add event listeners after rendering
  addEventListeners();
  
  // Initialize hashrate chart if data exists
  if (state.proxyInfo && document.getElementById('hashrate-chart')) {
    initializeHashrateChart();
  }
}

function renderHeader() {
  return `
    <header>
      <div class="container header-content">
        <h1>Mining Proxy Dashboard</h1>
        <div class="flex items-center">
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
          <h2>Hashrate Graph</h2>
          <div style="height: 200px;">
            <canvas id="hashrate-chart"></canvas>
          </div>
        </div>
        
        <div class="card" style="margin-top: 1rem;">
          <h2>Current Hashrate</h2>
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
  
  let workers = state.workersInfo.workers;
  
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
  
  // Apply filters
  if (state.filters.hideInactive) {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    workers = workers.filter(worker => worker[7] >= tenMinutesAgo);
  }
  
  // Sort workers based on current sorting settings
  workers = sortWorkers(workers, state.sorting.column, state.sorting.direction);
  
  // Count active vs inactive workers
  const activeWorkers = workers.filter(worker => {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    return worker[7] >= tenMinutesAgo;
  }).length;
  const inactiveWorkers = state.workersInfo.workers.length - activeWorkers;
  
  const getSortIcon = (column) => {
    if (state.sorting.column === column) {
      return state.sorting.direction === 'asc' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>' 
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    }
    return '';
  };
  
  return `
    <div class="card">
      <div class="p-4 border-b">
        <div class="flex justify-between items-center mb-3">
          <h2 class="mb-0">Workers (${workers.length})</h2>
          <div>
            <button id="toggle-inactive" class="btn ${state.filters.hideInactive ? 'btn-active' : ''}" style="background-color: ${state.filters.hideInactive ? '#f59e0b' : '#4b5563'}">
              ${state.filters.hideInactive ? 'Show All Workers' : 'Hide Inactive Workers'}
            </button>
          </div>
        </div>
        
        <div class="flex">
          <div class="text-sm mr-4">
            <span class="text-green-600 font-semibold">${activeWorkers}</span> active workers
          </div>
          <div class="text-sm">
            <span class="text-gray-500 font-semibold">${inactiveWorkers}</span> inactive workers ${state.filters.hideInactive ? '(hidden)' : ''}
          </div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-100">
              <th class="py-2 px-2 text-left sort-header" data-sort="name">
                <div class="flex items-center cursor-pointer">
                  <span>Name</span>
                  ${getSortIcon('name')}
                </div>
              </th>
              <th class="py-2 px-2 text-left sort-header" data-sort="ip">
                <div class="flex items-center cursor-pointer">
                  <span>IP Address</span>
                  ${getSortIcon('ip')}
                </div>
              </th>
              <th class="py-2 px-2 text-center sort-header" data-sort="connections">
                <div class="flex items-center justify-center cursor-pointer">
                  <span>Conn.</span>
                  ${getSortIcon('connections')}
                </div>
              </th>
              <th class="py-2 px-2 text-center sort-header" data-sort="accepted">
                <div class="flex items-center justify-center cursor-pointer">
                  <span>Accepted</span>
                  ${getSortIcon('accepted')}
                </div>
              </th>
              <th class="py-2 px-2 text-right sort-header" data-sort="hashrate">
                <div class="flex items-center justify-end cursor-pointer">
                  <span>1m</span>
                  ${getSortIcon('hashrate')}
                </div>
              </th>
              <th class="py-2 px-2 text-right sort-header" data-sort="hashrate10m">
                <div class="flex items-center justify-end cursor-pointer">
                  <span>10m</span>
                  ${getSortIcon('hashrate10m')}
                </div>
              </th>
              <th class="py-2 px-2 text-right sort-header" data-sort="hashrate1h">
                <div class="flex items-center justify-end cursor-pointer">
                  <span>1h</span>
                  ${getSortIcon('hashrate1h')}
                </div>
              </th>
              <th class="py-2 px-2 text-right sort-header" data-sort="hashrate12h">
                <div class="flex items-center justify-end cursor-pointer">
                  <span>12h</span>
                  ${getSortIcon('hashrate12h')}
                </div>
              </th>
              <th class="py-2 px-2 text-right sort-header" data-sort="hashrate24h">
                <div class="flex items-center justify-end cursor-pointer">
                  <span>24h</span>
                  ${getSortIcon('hashrate24h')}
                </div>
              </th>
              <th class="py-2 px-2 text-right sort-header" data-sort="lastseen">
                <div class="flex items-center justify-end cursor-pointer">
                  <span>Last Seen</span>
                  ${getSortIcon('lastseen')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            ${workers.map((worker, index) => {
              // Determine if worker is inactive (last seen > 10 min ago)
              const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
              const isActive = worker[7] >= tenMinutesAgo;
              
              return `
                <tr class="border-t hover ${isActive ? '' : 'text-gray-400'}" data-worker-index="${index}">
                  <td class="py-2 px-2">${worker[0]}</td>
                  <td class="py-2 px-2 font-mono text-sm">${worker[1]}</td>
                  <td class="py-2 px-2 text-center">${worker[2]}</td>
                  <td class="py-2 px-2 text-center ${isActive ? 'text-green-600' : 'text-gray-400'}">${worker[3]}</td>
                  <td class="py-2 px-2 text-right font-semibold ${isActive ? '' : 'text-gray-400'}">${formatHashrate(worker[8])}</td>
                  <td class="py-2 px-2 text-right font-semibold ${isActive ? '' : 'text-gray-400'}">${formatHashrate(worker[9])}</td>
                  <td class="py-2 px-2 text-right font-semibold ${isActive ? '' : 'text-gray-400'}">${formatHashrate(worker[10])}</td>
                  <td class="py-2 px-2 text-right font-semibold ${isActive ? '' : 'text-gray-400'}">${formatHashrate(worker[11])}</td>
                  <td class="py-2 px-2 text-right font-semibold ${isActive ? '' : 'text-gray-400'}">${formatHashrate(worker[12])}</td>
                  <td class="py-2 px-2 text-right ${isActive ? '' : 'text-orange-500'}">${getLastSeen(worker[7])}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
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

// Initialize hashrate chart
function initializeHashrateChart() {
  // Collect data for the chart
  updateHashrateHistory();
  
  const labels = state.hashrateHistory.timestamps.map(timestamp => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  
  const ctx = document.getElementById('hashrate-chart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.hashrateChart) {
    window.hashrateChart.destroy();
  }
  
  window.hashrateChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hashrate (H/s)',
        data: state.hashrateHistory.values,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#2563eb',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatHashrate(value);
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatHashrate(context.parsed.y);
            }
          }
        }
      }
    }
  });
}

// Update hashrate history
function updateHashrateHistory() {
  const now = Date.now();
  
  // Only add new data points every 30 seconds to avoid cluttering the chart
  if (state.hashrateHistory.lastUpdate && (now - state.hashrateHistory.lastUpdate < 30000)) {
    return;
  }
  
  if (state.proxyInfo && state.proxyInfo.hashrate) {
    // Add current hashrate to the history
    state.hashrateHistory.timestamps.push(now);
    state.hashrateHistory.values.push(state.proxyInfo.hashrate.total[0]);
    state.hashrateHistory.lastUpdate = now;
    
    // Keep only the last 20 data points
    if (state.hashrateHistory.timestamps.length > 20) {
      state.hashrateHistory.timestamps.shift();
      state.hashrateHistory.values.shift();
    }
  }
}

// Sorting function for workers
function sortWorkers(workers, column, direction) {
  const columnIndexMap = {
    'name': 0,
    'ip': 1,
    'connections': 2,
    'accepted': 3,
    'rejected': 4,
    'invalid': 5,
    'hashes': 6,
    'lastseen': 7,
    'hashrate': 8,
    'hashrate10m': 9,
    'hashrate1h': 10,
    'hashrate12h': 11,
    'hashrate24h': 12
  };
  
  return [...workers].sort((a, b) => {
    const columnIndex = columnIndexMap[column];
    let valueA = a[columnIndex];
    let valueB = b[columnIndex];
    
    // Special handling for string columns
    if (column === 'name' || column === 'ip') {
      return direction === 'asc' 
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
    
    // Convert to numbers for numeric columns
    valueA = Number(valueA);
    valueB = Number(valueB);
    
    return direction === 'asc' ? valueA - valueB : valueB - valueA;
  });
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
    });
  }
  
  // Access token input
  const accessTokenInput = document.getElementById('access-token');
  if (accessTokenInput) {
    accessTokenInput.addEventListener('change', (e) => {
      state.config.accessToken = e.target.value;
    });
  }
  
  // Auto refresh checkbox
  const autoRefreshCheckbox = document.getElementById('auto-refresh');
  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.addEventListener('change', (e) => {
      state.config.autoRefresh = e.target.checked;
      document.getElementById('refresh-interval-container').style.display = 
        state.config.autoRefresh ? 'block' : 'none';
      
      setupAutoRefresh();
    });
  }
  
  // Refresh interval select
  const refreshIntervalSelect = document.getElementById('refresh-interval');
  if (refreshIntervalSelect) {
    refreshIntervalSelect.addEventListener('change', (e) => {
      state.config.refreshInterval = parseInt(e.target.value);
      setupAutoRefresh();
    });
  }
  
  // Toggle inactive workers button
  const toggleInactiveBtn = document.getElementById('toggle-inactive');
  if (toggleInactiveBtn) {
    toggleInactiveBtn.addEventListener('click', () => {
      state.filters.hideInactive = !state.filters.hideInactive;
      renderApp();
    });
  }
  
  // Table sorting
  const sortHeaders = document.querySelectorAll('.sort-header');
  sortHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort');
      
      // Toggle direction if clicking the same column
      if (state.sorting.column === column) {
        state.sorting.direction = state.sorting.direction === 'asc' ? 'desc' : 'asc';
      } else {
        state.sorting.column = column;
        // Default to descending for numeric columns, ascending for text
        if (column === 'name' || column === 'ip') {
          state.sorting.direction = 'asc';
        } else {
          state.sorting.direction = 'desc';
        }
      }
      
      renderApp();
    });
  });
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
  }
}

async function fetchData() {
  state.loading = true;
  renderApp();
  
  try {
    const headers = {};
    if (state.config.accessToken) {
      headers['Authorization'] = `Bearer ${state.config.accessToken}`;
    }
    
    // Fetch proxy info
    const proxyResponse = await fetch(`${state.config.apiUrl}/1/summary`, {
      headers,
      mode: 'cors'
    }).catch(err => {
      throw new Error(`Network error: ${err.message}`);
    });
    
    if (!proxyResponse.ok) {
      throw new Error(`Error fetching proxy data: ${proxyResponse.status}`);
    }
    
    const proxyData = await proxyResponse.json();
    state.proxyInfo = proxyData;
    
    // Fetch workers info
    const workersResponse = await fetch(`${state.config.apiUrl}/1/workers`, {
      headers,
      mode: 'cors'
    }).catch(err => {
      throw new Error(`Network error when fetching workers: ${err.message}`);
    });
    
    if (!workersResponse.ok) {
      throw new Error(`Error fetching workers data: ${workersResponse.status}`);
    }
    
    const workersData = await workersResponse.json();
    state.workersInfo = workersData;
    
    // Connection successful
    state.error = null;
    setupAutoRefresh();
    
    // Update hashrate history for the chart
    updateHashrateHistory();
  } catch (err) {
    console.error('Failed to fetch data:', err);
    state.error = err.message;
  } finally {
    state.loading = false;
    renderApp();
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
