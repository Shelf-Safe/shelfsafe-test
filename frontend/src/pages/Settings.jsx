import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { ProfileSection } from '../components/ProfileSection';
import { getProfile } from '../services/profileService';

export const Settings = () => {
  const { logout, updateUser } = useAuth();
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
  };

  const section = searchParams.get('section');

  return (
    <DashboardLayout>
      <div className="p-0">
        {loading ? (
          <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 text-sm text-[#636363]">
            Loading settings...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 text-sm text-red-500">
            {error}
          </div>
        ) : profile ? (
          <ProfileSection
            user={profile}
            onLogout={handleLogout}
            onProfileUpdated={handleProfileUpdated}
            initialTab={section || null}
          />
        ) : (
          <div className="rounded-xl border border-[#e6e6e6] bg-white p-6 text-sm text-[#636363]">
            Profile not found.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};