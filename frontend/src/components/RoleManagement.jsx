import React, { useState, useEffect } from "react";
import {
  createRole,
  getAllRoles,
  findUserByEmployeeId,
  assignRoleToUser,
} from "../services/roleService";
import "./RoleManagement.css";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("roles"); // 'roles' or 'assign'

  const [newRole, setNewRole] = useState({
    roleName: "",
    description: "",
    permissions: {
      manage_users: false,
      manage_roles: false,
      manage_infrastructure: false,
      view_reports: false,
      manage_settings: false,
    },
  });

  const [assignment, setAssignment] = useState({
    employeeId: '',
    roleId: ''
  });

  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const rolesData = await getAllRoles();
      setRoles(rolesData.roles || []);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchEmployee = async () => {
    if (!assignment.employeeId || assignment.employeeId.trim() === '') {
      setError('Please enter an employee ID');
      setFoundUser(null);
      return;
    }

    try {
      setSearching(true);
      setError('');
      const result = await findUserByEmployeeId(assignment.employeeId.trim());
      setFoundUser(result.user);
      setSuccess(`User found: ${result.user.fullName}`);
    } catch (err) {
      setError(err.message || 'User not found');
      setFoundUser(null);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await createRole(
        newRole.roleName,
        newRole.description,
        newRole.permissions
      );
      setSuccess("Role created successfully!");
      setNewRole({
        roleName: "",
        description: "",
        permissions: {
          manage_users: false,
          manage_roles: false,
          manage_infrastructure: false,
          view_reports: false,
          manage_settings: false,
        },
      });
      loadData();
    } catch (err) {
      setError(err.message || "Failed to create role");
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!foundUser) {
      setError('Please search and find a user by employee ID first');
      return;
    }

    if (!assignment.roleId) {
      setError('Please select a role');
      return;
    }

    try {
      await assignRoleToUser(
        null,
        parseInt(assignment.roleId, 10),
        assignment.employeeId
      );
      setSuccess(`Role assigned successfully to ${foundUser.fullName}!`);
      setAssignment({ employeeId: '', roleId: '' });
      setFoundUser(null);
    } catch (err) {
      setError(err.message || 'Failed to assign role');
    }
  };

  const togglePermission = (permission) => {
    setNewRole({
      ...newRole,
      permissions: {
        ...newRole.permissions,
        [permission]: !newRole.permissions[permission],
      },
    });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="role-management-container">
      <div className="role-management-header">
        <h1>Role Management</h1>
        <p>Create and assign roles to users</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "roles" ? "active" : ""}`}
          onClick={() => setActiveTab("roles")}
        >
          Manage Roles
        </button>
        <button
          className={`tab ${activeTab === "assign" ? "active" : ""}`}
          onClick={() => setActiveTab("assign")}
        >
          Assign Roles
        </button>
      </div>

      {activeTab === "roles" && (
        <div className="role-management-content">
          <div className="create-role-section">
            <h2>Create New Role</h2>
            <form onSubmit={handleCreateRole} className="role-form">
              <div className="form-group">
                <label htmlFor="roleName">Role Name *</label>
                <input
                  type="text"
                  id="roleName"
                  value={newRole.roleName}
                  onChange={(e) =>
                    setNewRole({ ...newRole, roleName: e.target.value })
                  }
                  placeholder="e.g., Manager, Developer"
                  required
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole({ ...newRole, description: e.target.value })
                  }
                  placeholder="Describe the role's purpose and responsibilities"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Permissions</label>
                <div className="permissions-grid">
                  {Object.keys(newRole.permissions).map((permission) => (
                    <label key={permission} className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={newRole.permissions[permission]}
                        onChange={() => togglePermission(permission)}
                      />
                      <span>
                        {permission
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="submit-button">
                Create Role
              </button>
            </form>
          </div>

          <div className="roles-list-section">
            <h2>Existing Roles</h2>
            {roles.length === 0 ? (
              <p className="no-data">No roles found. Create your first role above.</p>
            ) : (
              <div className="roles-grid">
                {roles.map((role) => (
                  <div key={role.id} className="role-card">
                    <h3>{role.name}</h3>
                    {role.description && <p>{role.description}</p>}
                    <div className="permissions-list">
                      <strong>Permissions:</strong>
                      <ul>
                        {Object.entries(role.permissions || {})
                          .filter(([, value]) => value)
                          .map(([key]) => (
                            <li key={key}>{key.replace(/_/g, " ")}</li>
                          ))}
                        {Object.values(role.permissions || {}).every((v) => !v) && (
                          <li>No permissions</li>
                        )}
                      </ul>
                    </div>
                    <div className="role-meta">
                      <span>
                        Created: {new Date(role.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "assign" && (
        <div className="role-management-content">
          <div className="assign-role-section">
            <h2>Assign Role to User</h2>
            <form onSubmit={handleAssignRole} className="role-form">
              <div className="form-group">
                <label htmlFor="employeeId">Employee ID *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    id="employeeId"
                    value={assignment.employeeId}
                    onChange={(e) => {
                      setAssignment({ ...assignment, employeeId: e.target.value });
                      setFoundUser(null);
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !searching &&
                        assignment.employeeId.trim()
                      ) {
                        e.preventDefault();
                        handleSearchEmployee();
                      }
                    }}
                    placeholder="Enter employee ID (e.g., EMP001)"
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchEmployee}
                    disabled={searching || !assignment.employeeId.trim()}
                    className="search-button"
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
                {foundUser && (
                  <div className="user-info-card" style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f0f7ff',
                    border: '1px solid #4a90e2',
                    borderRadius: '6px'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>User Found:</h4>
                    <p style={{ margin: '4px 0', color: '#666' }}><strong>Name:</strong> {foundUser.fullName}</p>
                    <p style={{ margin: '4px 0', color: '#666' }}><strong>Username:</strong> {foundUser.username}</p>
                    <p style={{ margin: '4px 0', color: '#666' }}><strong>Email:</strong> {foundUser.email}</p>
                    {foundUser.department && (
                      <p style={{ margin: '4px 0', color: '#666' }}><strong>Department:</strong> {foundUser.department}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="roleId">Role *</label>
                <select
                  id="roleId"
                  value={assignment.roleId}
                  onChange={(e) =>
                    setAssignment({ ...assignment, roleId: e.target.value })
                  }
                  required
                  disabled={!foundUser}
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

               <button
                 type="submit"
                 className="submit-button"
                 disabled={!foundUser || !assignment.roleId}
               >
                 Assign Role
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
