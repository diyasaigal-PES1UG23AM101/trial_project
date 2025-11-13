import React, { useEffect, useState } from "react";
import { fetchReports } from "../services/dashboardService";

export default function Reports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports().then(data => setReports(data.reports));
  }, []);

  return (
    <div>
      <h2>Reports</h2>
      <ul>
        {reports.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
