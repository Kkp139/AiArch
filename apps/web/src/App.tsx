import React, { useState } from 'react';
import { AuthProvider, useAuth, UserProfile } from './context/AuthContext';
import { Shell } from './components/layout/Shell';

function MainApp() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('projects');

  // If no user is logged in for preview/dev, default to Kamal Patel (Admin)
  const currentUser: UserProfile = user || {
    id: 'user-admin-1',
    fullName: 'Kamal Patel',
    role: 'ADMIN',
  };

  return (
    <Shell
      user={currentUser}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab)}
      onLogout={() => {}}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Active workspace view for {currentUser.fullName}
        </p>
      </div>
    </Shell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
