import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, Plus, ChevronRight, User } from 'lucide-react';

export interface MobileUserManagementViewProps {
  onBack: () => void;
  onAddUserClick: () => void;
  authHeaders: Record<string, string>;
}

export const MobileUserManagementView: React.FC<MobileUserManagementViewProps> = ({
  onBack,
  onAddUserClick,
  authHeaders,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([
    { id: '1', fullName: 'Rahul Sharma', role: 'Admin', status: 'Active', avatarBg: '#2E2216', avatarColor: '#BF935A' },
    { id: '2', fullName: 'Priya Mehta', role: 'Staff', status: 'Active', avatarBg: '#1B314B', avatarColor: '#58A6FF' },
    { id: '3', fullName: 'Amit Verma', role: 'Client Leader', status: 'Active', avatarBg: '#173D2C', avatarColor: '#3FB950' },
    { id: '4', fullName: 'Sneha Kapoor', role: 'Client Viewer', status: 'Active', avatarBg: '#3C254C', avatarColor: '#BC8CFF' },
    { id: '5', fullName: 'Arjun Khanna', role: 'Staff', status: 'Inactive', avatarBg: '#482020', avatarColor: '#F85149' },
  ]);

  // Try to fetch real users from backend if endpoint exists
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/admin/users', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setUsers(data);
          }
        }
      } catch (err) {
        // Fallback to initial seeds
      }
    }
    loadUsers();
  }, [authHeaders]);

  const filteredUsers = users.filter((u) =>
    (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Header (Figma: 114:10582) */}
      <div className="figma-subpage-header">
        <div className="figma-header-nav-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              User Management
            </h2>
          </div>

          <button className="figma-btn-gold" onClick={onAddUserClick}>
            <Plus size={16} />
            <span>Add User</span>
          </button>
        </div>

        {/* Search */}
        <div className="figma-search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="figma-search-input"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Users List (Figma: 114:10582) */}
      <div className="figma-list-container">
        {filteredUsers.map((u) => {
          const isActive = u.status === 'Active' || u.isActive !== false;
          return (
            <div
              key={u.id}
              className="figma-item-card"
              onClick={() => alert(`User Details: ${u.fullName} (${u.role}) — Status: ${isActive ? 'Active' : 'Inactive'}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: u.avatarBg || '#2E2216',
                    color: u.avatarColor || '#BF935A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '15px',
                  }}
                >
                  {u.fullName ? u.fullName.charAt(0) : 'U'}
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px 0', color: '#0C0C0D' }}>
                    {u.fullName}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#686869', margin: 0 }}>
                    {u.role}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`figma-badge ${isActive ? 'figma-badge-active' : 'figma-badge-inactive'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
                <ChevronRight size={18} color="#979798" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
