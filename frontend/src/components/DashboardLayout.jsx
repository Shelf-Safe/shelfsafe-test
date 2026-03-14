import React from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';

export const DashboardLayout = ({ children }) => {
  const { user } = useAuth();
  const displayName = user?.name || user?.fullName || user?.email || 'User';
  const profileImageUrl = user?.profileImageUrl || user?.avatarUrl || user?.photoURL;
  const initial = (displayName?.trim()?.[0] || 'U').toUpperCase();

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-layout-main">
        <header className="dashboard-layout-header">
          <div className="header-left" />
          <Link to="/profile" className="header-user-link">
            <span className="header-user-avatar" aria-hidden="true">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="" className="header-user-avatar-img" />
              ) : (
                <span className="header-user-avatar-initial">{initial}</span>
              )}
            </span>
            <span>{displayName}</span>
          </Link>
        </header>
        <main className="dashboard-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};//tes
