import React, { useEffect, useState } from "react";
import { fetchLicenses } from "../services/dashboardService";

export default function Licenses() {
  const [licenses, setLicenses] = useState([]);

  useEffect(() => {
    fetchLicenses().then(data => setLicenses(data.licenses));
  }, []);

  return (
    <div>
      <h2>Licenses</h2>
      <ul>
        {licenses.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
