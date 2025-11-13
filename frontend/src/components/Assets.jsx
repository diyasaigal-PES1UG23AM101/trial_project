import React, { useEffect, useState } from "react";
import { fetchAssets } from "../services/dashboardService";

const Assets = () => {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    fetchAssets().then(data => setAssets(data.assets));
  }, []);

  return (
    <div>
      <h1>Assets</h1>
      <ul>
        {assets.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default Assets;
