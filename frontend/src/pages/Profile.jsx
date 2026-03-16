import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../services/profileService';

function IconVerify() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="inline-block">
      <path
        d="M12 2L14.4 7.26L20.4 7.86L16.2 11.54L17.52 17.4L12 14.28L6.48 17.4L7.8 11.54L3.6 7.86L9.6 7.26L12 2Z"
        stroke="#00808d"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <polyline
        points="9 12 11 14 15 10"
        stroke="#00808d"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGear() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00808d"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconRibbon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00808d"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M8.56 14.63L7 22l5-3 5 3-1.56-7.37" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00808d"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState('');

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

  const displayProfile = {
    name: profile?.name || user?.name || 'User',
    userRole: profile?.userRole || 'No role assigned',
    employeeId: profile?.employeeId || 'Not provided',
    pharmacyOrganization: profile?.pharmacyOrganization || 'Not provided',
    email: profile?.email || user?.email || 'Not provided',
    phone: profile?.phone || 'Not provided',
    avatarUrl: previewImage || profile?.avatarUrl || user?.avatarUrl || '',
    createdAt: 'Account available',
    preferences: {
      language: 'English (Canada)',
      timezone: 'Pacific Time (Vancouver)',
      utcOffset: 'UTC-08:00 • UTC-07:00',
    },
    recentActivity:
      profile?.recentActivity?.length > 0
        ? profile.recentActivity
          .slice()
          .reverse()
          .map((item) => item.action)
        : ['No recent activity available'],
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setPreviewImage(imageUrl);
    setError('');
  };


  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        {loading ? (
          <div className="rounded-xl border border-line bg-white p-6">
            <p>Loading profile...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-line bg-white p-6">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-3xl font-bold text-[#1e1e1e]">
                  Profile
                  <button
                    onClick={() =>
                      navigate(window.innerWidth >= 1024 ? '/settings?section=account' : '/settings')
                    }
                    className="ml-1 rounded p-1 transition-colors hover:bg-[#f1f1f1]"
                    aria-label="Settings"
                  >
                    <IconGear />
                  </button>
                </h1>
                <p className="mt-1 text-sm text-[#636363]">
                  Access your personal and professional details.
                </p>
              </div>

              <div className="mt-1 flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-[#d2d2d2] bg-white px-5 py-2 text-sm font-semibold text-[#1e1e1e] transition-colors hover:bg-[#f5f5f5]"
                >
                  Logout
                </button>
                <button
                  onClick={() =>
                    navigate(window.innerWidth >= 1024 ? '/settings?section=account' : '/settings')
                  }
                  className="rounded-lg bg-[#00808d] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#006e79]"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-5 lg:flex-row">
              <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#e6e6e6] bg-white">
                <div className="flex items-center gap-4 p-6">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#e5e7eb] text-2xl font-bold text-[#1e1e1e] transition hover:opacity-90"
                    aria-label="Upload profile picture"
                  >
                    {displayProfile.avatarUrl ? (
                      <img
                        src={displayProfile.avatarUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      displayProfile.name.charAt(0).toUpperCase()
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />

                  <div>
                    <p className="text-2xl font-bold text-[#1e1e1e]">
                      {displayProfile.name}
                    </p>
                    <p className="mt-0.5 text-sm text-[#636363]">
                      {displayProfile.userRole}
                    </p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#00808d]">
                      <IconVerify /> Verified User
                    </span>
                  </div>
                </div>

                <hr className="mx-6 border-[#e6e6e6]" />

                <div className="p-6">
                  <h3 className="mb-4 text-lg font-bold text-[#1e1e1e]">
                    Account Information
                  </h3>

                  <div className="flex flex-col gap-3">
                    {[
                      ['Full Name', displayProfile.name],
                      ['Employee ID', displayProfile.employeeId],
                      ['User Role', displayProfile.userRole],
                      ['Pharmacy Organization', displayProfile.pharmacyOrganization],
                      ['Email', displayProfile.email],
                      ['Phone', displayProfile.phone],
                    ].map(([label, value]) => (
                      <p key={label} className="text-sm text-[#1e1e1e]">
                        <span className="font-bold">{label}:</span>{' '}
                        <span className="text-[#4f5250]">{value}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#e6e6e6] bg-[#f5f5f5] px-6 py-3">
                  <p className="text-xs text-[#a6a6a6]">
                    {displayProfile.createdAt}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-5 lg:w-80 xl:w-96">
                <div className="rounded-xl border border-[#e6e6e6] bg-white p-6">
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1e1e1e]">
                    <IconRibbon /> Preferences
                  </h3>
                  <ul className="flex flex-col gap-1.5 text-sm text-[#4f5250]">
                    <li>• Language: {displayProfile.preferences.language}</li>
                    <li>• Time Zone: {displayProfile.preferences.timezone}</li>
                    <li>• UTC Offset: {displayProfile.preferences.utcOffset}</li>
                  </ul>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#e6e6e6] bg-white p-6">
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1e1e1e]">
                    <IconShield /> Recent Activity
                  </h3>
                  <div className="max-h-52 overflow-y-auto pr-1">
                    <ul className="flex flex-col gap-2.5 text-sm text-[#4f5250]">
                      {displayProfile.recentActivity.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};