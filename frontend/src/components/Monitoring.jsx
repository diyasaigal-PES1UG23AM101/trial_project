import React, { useEffect, useState } from "react";
import { fetchMonitoring, fetchDeviceBandwidth } from "../services/dashboardService";

export default function Monitoring() {
  const [monitoringData, setMonitoringData] = useState([]);
  const [deviceBandwidth, setDeviceBandwidth] = useState([]);

  useEffect(() => {
    fetchMonitoring().then(data => setMonitoringData(data.monitoring));
    fetchDeviceBandwidth().then(data => setDeviceBandwidth(data.bandwidth || []));
  }, []);

  return (
    <div>
      <h2>Monitoring</h2>
      <ul>
        {monitoringData.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      <h3>Per-Device Bandwidth</h3>
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Bandwidth (Mbps)</th>
          </tr>
        </thead>
        <tbody>
          {deviceBandwidth.map((dev, idx) => (
            <tr key={idx}>
              <td>{dev.deviceName || dev.device_id}</td>
              <td>{dev.bandwidth}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
