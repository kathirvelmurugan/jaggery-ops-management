import { useStore } from '../store/store'
import { Field } from './Field'
import { Button } from './Button'
import { Table } from './Table'
import { useState } from 'react'

export function UserRoles() {
  const s = useStore()
  const [showAddUser, setShowAddUser] = useState(false)
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'dispatch'
  })

  const handleAddUser = async () => {
    if (!form.username.trim() || !form.fullName.trim()) {
      alert('Username and full name are required')
      return
    }
    
    try {
      await s.addUser(form)
      setForm({
        username: '',
        fullName: '',
        email: '',
        role: 'dispatch'
      })
      setShowAddUser(false)
      alert('User added successfully!')
    } catch (error) {
      alert('Error adding user: ' + error.message)
    }
  }

  const handleSwitchUser = (user) => {
    s.setCurrentUser(user)
    alert(`Switched to ${user.full_name} (${user.role})`)
  }

  return (
    <div className="user-roles-container">
      {/* Current User Display */}
      <div className="panel">
        <h2>👤 Current User & Role</h2>
        {s.currentUser ? (
          <div className="current-user-display">
            <div className="user-info">
              <div className="user-name">{s.currentUser.full_name}</div>
              <div className="user-details">
                <span className={`role-badge role-${s.currentUser.role}`}>
                  {s.currentUser.role.toUpperCase()}
                </span>
                <span className="user-email">{s.currentUser.email}</span>
              </div>
            </div>
            <div className="permissions-info">
              <h4>Permissions:</h4>
              <div className="permissions-list">
                <span className={`permission-item ${s.hasPermission('read') ? 'allowed' : 'denied'}`}>
                  📖 Read Data
                </span>
                <span className={`permission-item ${s.hasPermission('write') ? 'allowed' : 'denied'}`}>
                  ✏️ Write Data
                </span>
                <span className={`permission-item ${s.hasPermission('delete') ? 'allowed' : 'denied'}`}>
                  🗑️ Delete Records
                </span>
                <span className={`permission-item ${s.hasPermission('financial') ? 'allowed' : 'denied'}`}>
                  💰 Financial Data
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-user">No user logged in</div>
        )}
      </div>

      {/* Quick User Switcher */}
      <div className="panel">
        <h3>🔄 Quick User Switch (Demo)</h3>
        <div className="user-switcher">
          {s.users.map(user => (
            <button
              key={user.user_id}
              className={`user-switch-btn ${s.currentUser?.user_id === user.user_id ? 'active' : ''}`}
              onClick={() => handleSwitchUser(user)}
            >
              <div className="switch-user-name">{user.full_name}</div>
              <div className={`switch-role-badge role-${user.role}`}>
                {user.role}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* User Management (Admin Only) */}
      {s.isAdmin() && (
        <div className="panel">
          <div className="row" style={{justifyContent: 'space-between', alignItems: 'center'}}>
            <h3>👥 User Management</h3>
            <Button variant="primary" onClick={() => setShowAddUser(!showAddUser)}>
              {showAddUser ? '❌ Cancel' : '➕ Add User'}
            </Button>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <div className="add-user-form">
              <div className="grid grid-2">
                <Field label="Username *">
                  <input 
                    value={form.username} 
                    onChange={e => setForm({...form, username: e.target.value})}
                    placeholder="Enter username"
                  />
                </Field>
                <Field label="Full Name *">
                  <input 
                    value={form.fullName} 
                    onChange={e => setForm({...form, fullName: e.target.value})}
                    placeholder="Enter full name"
                  />
                </Field>
              </div>
              <div className="grid grid-2">
                <Field label="Email">
                  <input 
                    type="email"
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="user@email.com"
                  />
                </Field>
                <Field label="Role">
                  <select 
                    value={form.role} 
                    onChange={e => setForm({...form, role: e.target.value})}
                  >
                    <option value="dispatch">Dispatch Officer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </Field>
              </div>
              <div className="form-actions">
                <Button variant="primary" onClick={handleAddUser}>
                  ✅ Add User
                </Button>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="users-list">
            <Table
              columns={[
                { header: 'Username', key: 'username' },
                { header: 'Full Name', key: 'full_name' },
                { header: 'Email', key: 'email' },
                { 
                  header: 'Role', 
                  render: user => (
                    <span className={`role-badge role-${user.role}`}>
                      {user.role.toUpperCase()}
                    </span>
                  )
                },
                {
                  header: 'Status',
                  render: user => (
                    <span className={`badge ${user.is_active ? 'good' : 'bad'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )
                },
                {
                  header: 'Actions',
                  render: user => (
                    <div className="action-buttons">
                      <Button 
                        variant="secondary" 
                        onClick={() => handleSwitchUser(user)}
                      >
                        🔄 Switch
                      </Button>
                    </div>
                  )
                }
              ]}
              rows={s.users}
            />
          </div>
        </div>
      )}

      {/* Role Descriptions */}
      <div className="panel">
        <h3>📋 Role Descriptions</h3>
        <div className="role-descriptions">
          <div className="role-desc admin">
            <h4>👑 Administrator</h4>
            <ul>
              <li>Full access to all features</li>
              <li>Can view financial data</li>
              <li>Can delete records</li>
              <li>User management capabilities</li>
            </ul>
          </div>
          <div className="role-desc manager">
            <h4>👔 Manager</h4>
            <ul>
              <li>Read and write access</li>
              <li>Can view financial data</li>
              <li>Cannot delete records</li>
              <li>No user management</li>
            </ul>
          </div>
          <div className="role-desc dispatch">
            <h4>📦 Dispatch Officer</h4>
            <ul>
              <li>Read and write access</li>
              <li>Cannot view financial data</li>
              <li>Cannot delete records</li>
              <li>Focus on operational tasks</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .user-roles-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .current-user-display {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }

        .user-details {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .role-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .role-badge.role-admin {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
        }

        .role-badge.role-manager {
          background: rgba(34, 211, 238, 0.15);
          color: #0891b2;
        }

        .role-badge.role-dispatch {
          background: rgba(16, 185, 129, 0.15);
          color: #059669;
        }

        .user-email {
          font-size: 12px;
          color: var(--muted);
        }

        .permissions-info {
          flex: 1;
        }

        .permissions-info h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: var(--text);
        }

        .permissions-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .permission-item {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .permission-item.allowed {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .permission-item.denied {
          background: rgba(156, 163, 175, 0.1);
          color: var(--muted);
        }

        .user-switcher {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .user-switch-btn {
          padding: 16px;
          border: 2px solid var(--border);
          border-radius: 8px;
          background: var(--panel);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .user-switch-btn:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }

        .user-switch-btn.active {
          border-color: var(--accent);
          background: rgba(34, 211, 238, 0.05);
        }

        .switch-user-name {
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .switch-role-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 8px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .add-user-form {
          margin: 16px 0;
          padding: 16px;
          background: var(--nav-bg);
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .form-actions {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .users-list {
          margin-top: 16px;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .role-descriptions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .role-desc {
          padding: 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .role-desc.admin {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .role-desc.manager {
          background: rgba(34, 211, 238, 0.05);
          border-color: rgba(34, 211, 238, 0.2);
        }

        .role-desc.dispatch {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .role-desc h4 {
          margin: 0 0 8px 0;
          color: var(--text);
        }

        .role-desc ul {
          margin: 0;
          padding-left: 16px;
          font-size: 13px;
          color: var(--muted);
        }

        .role-desc li {
          margin: 4px 0;
        }

        .no-user {
          text-align: center;
          color: var(--muted);
          font-style: italic;
          padding: 40px;
        }

        @media (max-width: 768px) {
          .current-user-display {
            flex-direction: column;
          }

          .user-switcher {
            grid-template-columns: 1fr;
          }

          .role-descriptions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default UserRoles