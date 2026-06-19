import axios from 'axios';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

export default api;

// ── Analytics ──────────────────────────────
export const getKPI = () => api.get('/api/analytics/kpi').then(r => r.data);
export const getHourlyTrends = () => api.get('/api/analytics/trends/hourly').then(r => r.data);
export const getDailyTrends = () => api.get('/api/analytics/trends/daily').then(r => r.data);
export const getMonthlyTrends = () => api.get('/api/analytics/trends/monthly').then(r => r.data);
export const getSeasonalTrends = () => api.get('/api/analytics/trends/seasonal').then(r => r.data);
export const getVehicles = () => api.get('/api/analytics/vehicles').then(r => r.data);
export const getTopLocations = () => api.get('/api/analytics/locations/top').then(r => r.data);
export const getStations = () => api.get('/api/analytics/stations').then(r => r.data);
export const getJunctions = () => api.get('/api/analytics/junctions').then(r => r.data);
export const getViolationTypes = () => api.get('/api/analytics/violations').then(r => r.data);

// ── Hotspots ───────────────────────────────
export const getHotspots = (limit = 200) => api.get(`/api/hotspots?limit=${limit}`).then(r => r.data);
export const getHeatmap = () => api.get('/api/hotspots/heatmap').then(r => r.data);
export const getHotspotSummary = () => api.get('/api/hotspots/summary').then(r => r.data);

// ── Risk ───────────────────────────────────
export const getRiskData = (limit = 50, riskLevel?: string) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (riskLevel) params.append('risk_level', riskLevel);
  return api.get(`/api/risk?${params}`).then(r => r.data);
};
export const getRiskSummary = () => api.get('/api/risk/summary').then(r => r.data);
export const getRiskHeatmap = () => api.get('/api/risk/heatmap').then(r => r.data);
export const getRiskRankings = (top = 20) => api.get(`/api/risk/rankings?top=${top}`).then(r => r.data);

// ── Predict ────────────────────────────────
export const predict = (data: Record<string, string>) =>
  api.post('/api/predict', data).then(r => r.data);
export const getModelInfo = () => api.get('/api/predict/model-info').then(r => r.data);

// ── Options ────────────────────────────────
export const getOptions = () => api.get('/api/options').then(r => r.data);

// ── Dataset ────────────────────────────────
export const getDatasetStatus = () => api.get('/api/dataset/status').then(r => r.data);
export const uploadDataset = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
   return api.post('/api/dataset/upload', fd, { timeout: 0 }).then(r => r.data);
};
export const startRetrain = () => api.post('/api/dataset/retrain').then(r => r.data);
export const getRetrainStatus = () => api.get('/api/dataset/retrain/status').then(r => r.data);

// ── Reports ────────────────────────────────
export const downloadReport = (type: string, format: string, params: Record<string, string> = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/api/reports/${type}/${format}${query ? '?' + query : ''}`;
  window.open(url, '_blank');
};

export const getHealth = () => api.get('/api/health').then(r => r.data);

// ── Copilot ────────────────────────────────
export const copilotChat = (message: string, history: Array<{role: string; content: string}> = []) =>
  api.post('/api/copilot/chat', { message, history }).then(r => r.data);

// ── Alerts ─────────────────────────────────
export const getLiveAlerts = () => api.get('/api/alerts/live').then(r => r.data);
export const getAlertFeed = (limit = 15) => api.get(`/api/alerts/feed?limit=${limit}`).then(r => r.data);
export const getAlertSummary = () => api.get('/api/alerts/summary').then(r => r.data);
export const getAlerts = () => api.get('/api/alerts/live').then(r => r.data);

// ── Forecast ───────────────────────────────
export const getForecast24h = () => api.get('/api/predict/forecast/24h').then(r => r.data);
