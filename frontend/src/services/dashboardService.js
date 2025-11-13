// src/services/dashboardService.js
const API_BASE = "http://localhost:5000/api/dashboard";

export const fetchAssets = async () => {
  const res = await fetch(`${API_BASE}/assets`);
  return res.json();
};

export const fetchLicenses = async () => {
  const res = await fetch(`${API_BASE}/licenses`);
  return res.json();
};

export const fetchMonitoring = async () => {
  const res = await fetch(`${API_BASE}/monitoring`);
  return res.json();
};

export const fetchReports = async () => {
  const res = await fetch(`${API_BASE}/reports`);
  return res.json();
};

export const fetchDeviceBandwidth = async () => {
  const res = await fetch(`${API_BASE}/device-bandwidth`);
  return res.json();
};
