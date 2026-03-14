import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { ProfileSection } from '../components/ProfileSection';
import { getProfile } from '../services/profileService';

export const Settings = () => {
  const { logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const profileData = await getProfile();
        setProfile(profileData);
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile);
    updateUser(updatedProfile);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const section = searchParams.get('section');

  return (
    <DashboardLayout>
      <div className="profile-page">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1 className="profile-page-title" style={{ marginBottom: '6px' }}>
              Settings
            </h1>
            <p style={{ color: '#666', margin: 0 }}>
              Manage your account settings and profile details.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/profile')}
          >
            Back to Profile
          </button>
        </div>

        {loading ? (
          <div className="dashboard-section">
            <p>Loading settings...</p>
          </div>
        ) : error ? (
          <div className="dashboard-section">
            <p>{error}</p>
          </div>
        ) : profile ? (
          <ProfileSection
            user={profile}
            onLogout={handleLogout}
            onProfileUpdated={handleProfileUpdated}
            initialTab={section || 'account'}
          />
        ) : (
          <div className="dashboard-section">
            <p>Profile not found.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};