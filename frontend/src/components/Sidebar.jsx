import React from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Dashboard</h2>
      <ul>
        <li><Link to="/assets">Assets</Link></li>
        <li><Link to="/licenses">Licenses</Link></li>
        <li><Link to="/monitoring">Monitoring</Link></li>
        <li><Link to="/reports">Reports</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;
