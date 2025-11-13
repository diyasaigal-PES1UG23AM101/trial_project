const getAssets = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(500).json({ error: 'Database connection not available' });

    const start = Date.now();

    // Example optimized query: fetch only required fields
    const [assets] = await pool.query('SELECT Asset_ID, Name, Status FROM Asset LIMIT 100');

    const duration = Date.now() - start;
    console.log(`Assets API responded in ${duration}ms`);

    res.json({ success: true, data: assets });
  } catch (err) {
    console.error('Assets API error:', err.message);
    res.status(500).json({ error: 'Failed to load assets' });
  }
};

const getLicenses = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(500).json({ error: 'Database connection not available' });

    const start = Date.now();
    const [licenses] = await pool.query('SELECT License_ID, Name, Expiry_Date FROM License LIMIT 100');
    const duration = Date.now() - start;
    console.log(`Licenses API responded in ${duration}ms`);

    res.json({ success: true, data: licenses });
  } catch (err) {
    console.error('Licenses API error:', err.message);
    res.status(500).json({ error: 'Failed to load licenses' });
  }
};

const getMonitoring = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(500).json({ error: 'Database connection not available' });

    const start = Date.now();
    const [monitoring] = await pool.query('SELECT Server_ID, Status, CPU_Usage, Memory_Usage FROM Monitoring LIMIT 50');
    const duration = Date.now() - start;
    console.log(`Monitoring API responded in ${duration}ms`);

    res.json({ success: true, data: monitoring });
  } catch (err) {
    console.error('Monitoring API error:', err.message);
    res.status(500).json({ error: 'Failed to load monitoring data' });
  }
};

const getReports = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(500).json({ error: 'Database connection not available' });

    const start = Date.now();
    const [reports] = await pool.query('SELECT Report_ID, Title, Created_At FROM Reports ORDER BY Created_At DESC LIMIT 50');
    const duration = Date.now() - start;
    console.log(`Reports API responded in ${duration}ms`);

    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('Reports API error:', err.message);
    res.status(500).json({ error: 'Failed to load reports' });
  }
};

const getDeviceBandwidth = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(500).json({ error: 'Database connection not available' });

    // Example query: fetch bandwidth per device (Device_ID, Device_Name, Bandwidth_Usage)
    const [devices] = await pool.query('SELECT Device_ID, Device_Name, Bandwidth_Usage FROM Devices ORDER BY Bandwidth_Usage DESC LIMIT 100');
    res.json({ success: true, data: devices });
  } catch (err) {
    console.error('Device Bandwidth API error:', err.message);
    res.status(500).json({ error: 'Failed to load device bandwidth data' });
  }
};

const getDowntimeAlerts = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) return res.status(500).json({ error: 'Database connection not available' });

    // Detect devices that are offline (Status = 'offline') or abnormal traffic (Bandwidth_Usage > threshold)
    const [offlineDevices] = await pool.query("SELECT Device_ID, Device_Name, Status FROM Devices WHERE Status = 'offline' LIMIT 50");
    const [abnormalTraffic] = await pool.query("SELECT Device_ID, Device_Name, Bandwidth_Usage FROM Devices WHERE Bandwidth_Usage > 1000 LIMIT 50"); // Example threshold

    res.json({
      success: true,
      offline: offlineDevices,
      abnormalTraffic: abnormalTraffic
    });
  } catch (err) {
    console.error('Downtime Alerts API error:', err.message);
    res.status(500).json({ error: 'Failed to load downtime/traffic alerts' });
  }
};

module.exports = {
  getAssets,
  getLicenses,
  getMonitoring,
  getReports,
  getDeviceBandwidth,
  getDowntimeAlerts
};
