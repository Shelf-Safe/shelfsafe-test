import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, requestPasswordReset } from '../services/profileService';

import SettingsSidebar from './SettingsSidebar';
import AccountSection from './AccountSection';
import NotificationsSection from './NotificationsSection';
import SecuritySection from './SecuritySection';
import BillingSection from './BillingSection';

import '../styles/ProfileSettingsMobile.css';
import {
  FiSettings,
  FiBell,
  FiLock,
  FiDollarSign,
} from 'react-icons/fi';

const Messages = ({ success, error }) => (
  <>
    {success && <p className="mb-4 text-sm text-green-600">{success}</p>}
    {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
  </>
);

const MENU_ITEMS = [
  {
    id: 'account',
    label: 'Account',
    description: 'Update your name, username, photo, and contact details.',
    icon: <FiSettings size={20} color="#00808d" />,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Preferences for email or in-app notification updates.',
    icon: <FiBell size={20} color="#00808d" />,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Password update, enable two-factor authentication.',
    icon: <FiLock size={20} color="#00808d" />,
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Review your subscription plan, payment method, and invoices.',
    icon: <FiDollarSign size={20} color="#00808d" />,
  },
];

const buildProfileData = (user) => ({
  name: user?.name || '',
  employeeId: user?.employeeId || '',
  userRole: user?.userRole || '',
  pharmacyOrganization: user?.pharmacyOrganization || '',
  email: user?.email || '',
  phone: user?.phone || '',
  role: user?.role || '',
  notifications: {
    emailEnabled: user?.notifications?.emailEnabled ?? true,
    emailAddress: user?.notifications?.emailAddress || user?.email || '',
    phoneEnabled: user?.notifications?.phoneEnabled ?? false,
    phoneNumber: user?.notifications?.phoneNumber || user?.phone || '',
  },
});

const buildSecurityData = (user) => ({
  password: '',
  confirmPassword: '',
  twoFactorEnabled: user?.twoFactorEnabled ?? false,
  resetContact: user?.email || user?.phone || '',
});

export const ProfileSection = ({ user, onProfileUpdated, initialTab = null }) => {
  const [activeTab, setActiveTab] = useState(initialTab || null);
  const [profileData, setProfileData] = useState(buildProfileData(user));
  const [securityData, setSecurityData] = useState(buildSecurityData(user));

  const [fb, setFb] = useState({ msg: '', err: '' });
  const [notifFb, setNotifFb] = useState({ msg: '', err: '' });
  const [secFb, setSecFb] = useState({ msg: '', err: '' });
  const [resetFb, setResetFb] = useState({ msg: '', err: '' });

  const [saving, setSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [secSaving, setSecSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const navigate = useNavigate();
  const [showMobilePanel, setShowMobilePanel] = useState(Boolean(initialTab));

  useEffect(() => {
    setProfileData(buildProfileData(user));
    setSecurityData(buildSecurityData(user));
  }, [user]);

  useEffect(() => {
    setActiveTab(initialTab || null);
    setShowMobilePanel(Boolean(initialTab));
    setNotifFb({ msg: '', err: '' });
  }, [initialTab]);

  const clearAllFeedback = () => {
    setFb({ msg: '', err: '' });
    setNotifFb({ msg: '', err: '' });
    setSecFb({ msg: '', err: '' });
    setResetFb({ msg: '', err: '' });
  };

  const switchTab = (id) => {
    setActiveTab(id);
    setShowMobilePanel(true);
    clearAllFeedback();
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((p) => ({ ...p, [name]: value }));
  };

  const handleSaveProfile = async () => {
    const { name, employeeId, userRole, pharmacyOrganization, phone } = profileData;

    if (!name.trim()) return setFb({ msg: '', err: 'Full Name is required' });
    if (!employeeId.trim()) return setFb({ msg: '', err: 'Employee ID is required' });
    if (!userRole.trim()) return setFb({ msg: '', err: 'User Role is required' });

    try {
      setSaving(true);
      setFb({ msg: '', err: '' });

      const updated = await updateProfile({
        name: name.trim(),
        employeeId: employeeId.trim(),
        userRole: userRole.trim(),
        pharmacyOrganization: pharmacyOrganization.trim(),
        phone: phone.trim(),
      });

      onProfileUpdated(updated);
      setFb({ msg: 'Profile updated successfully!', err: '' });
    } catch (e) {
      setFb({ msg: '', err: e.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setProfileData(buildProfileData(user));
    setFb({ msg: '', err: '' });
  };

  const handleNotifChange = (e) => {
    const { name, value } = e.target;
    setNotifFb({ msg: '', err: '' });
    setProfileData((p) => ({
      ...p,
      notifications: { ...p.notifications, [name]: value },
    }));
  };

  const handleNotifToggle = (key, value) => {
    setNotifFb({ msg: '', err: '' });
    setProfileData((p) => ({
      ...p,
      notifications: { ...p.notifications, [key]: value },
    }));
  };

  const handleSaveNotifications = async () => {
    const { emailEnabled, emailAddress, phoneEnabled, phoneNumber } =
      profileData.notifications;

    if (emailEnabled && !emailAddress.trim()) {
      return setNotifFb({
        msg: '',
        err: 'Email address is required when email notifications are enabled.',
      });
    }

    if (phoneEnabled && !phoneNumber.trim()) {
      return setNotifFb({
        msg: '',
        err: 'Phone number is required when phone notifications are enabled.',
      });
    }

    try {
      setNotifSaving(true);
      setNotifFb({ msg: '', err: '' });

      const updated = await updateProfile({
        notifications: {
          emailEnabled,
          emailAddress: emailAddress.trim(),
          phoneEnabled,
          phoneNumber: phoneNumber.trim(),
        },
      });

      onProfileUpdated(updated);
      setProfileData((p) => ({
        ...p,
        notifications: buildProfileData(updated).notifications,
      }));
      setNotifFb({
        msg: 'Notification preferences updated successfully!',
        err: '',
      });
    } catch (e) {
      setNotifFb({
        msg: '',
        err: e.message || 'Failed to update notification preferences',
      });
    } finally {
      setNotifSaving(false);
    }
  };

  const handleCancelNotif = () => {
    setProfileData((p) => ({
      ...p,
      notifications: buildProfileData(user).notifications,
    }));
    setNotifFb({ msg: '', err: '' });
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecFb({ msg: '', err: '' });
    setResetFb({ msg: '', err: '' });
    setSecurityData((p) => ({ ...p, [name]: value }));
  };

  const handleSaveSecurity = async () => {
    const { password, confirmPassword, twoFactorEnabled } = securityData;
    const pwd = password.trim();

    if (pwd && pwd.length < 6) {
      return setSecFb({
        msg: '',
        err: 'Password must be at least 6 characters long.',
      });
    }

    if (pwd !== confirmPassword.trim()) {
      return setSecFb({
        msg: '',
        err: 'Password and Confirm Password must match.',
      });
    }

    try {
      setSecSaving(true);
      setSecFb({ msg: '', err: '' });

      const payload = {
        twoFactorEnabled,
        ...(pwd && { password: pwd }),
      };

      const updated = await updateProfile(payload);
      onProfileUpdated(updated);
      setSecurityData(buildSecurityData(updated));
      setSecFb({ msg: 'Security settings updated successfully!', err: '' });
    } catch (e) {
      setSecFb({
        msg: '',
        err: e.message || 'Failed to update security settings',
      });
    } finally {
      setSecSaving(false);
    }
  };

  const handleCancelSecurity = () => {
    setSecurityData(buildSecurityData(user));
    setSecFb({ msg: '', err: '' });
    setResetFb({ msg: '', err: '' });
  };

  const handleGoBackToProfile = () => {
    clearAllFeedback();
    navigate('/profile');
  };

  const handleSendResetLink = async () => {
    const contact = securityData.resetContact.trim();

    if (!contact) {
      return setResetFb({
        msg: '',
        err: 'Please enter your email or phone number.',
      });
    }

    try {
      setResetSending(true);
      setResetFb({ msg: '', err: '' });
      const res = await requestPasswordReset(contact);
      setResetFb({ msg: res.message || 'Reset link sent successfully.', err: '' });
    } catch (e) {
      setResetFb({
        msg: '',
        err: e.message || 'Failed to send reset link',
      });
    } finally {
      setResetSending(false);
    }
  };

  const activeFeedback =
    activeTab === 'account'
      ? fb
      : activeTab === 'notifications'
        ? notifFb
        : activeTab === 'security'
          ? secFb
          : null;

  return (
    <div
      className={`ps-shell w-full ${showMobilePanel ? 'mobile-panel' : 'mobile-menu'}`}
    >
      <div className="flex w-full flex-col lg:flex-row">
        <SettingsSidebar
          menuItems={MENU_ITEMS}
          activeTab={activeTab}
          onTabChange={switchTab}
        />

        <div className="ps-panel min-h-screen flex-1 overflow-visible bg-[#f5f5f5] px-4 pt-4 lg:px-0 lg:pl-6 lg:pr-10 lg:pt-6">
          {activeTab === 'account' && (
            <div className="mb-6 flex flex-col gap-3 pr-2 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="pt-4 text-[22px] font-bold text-[#1e1e1e] sm:pt-16 lg:text-[22px]">
                Profile Details
              </h2>

              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={handleGoBackToProfile}
                  className="rounded-md border border-[#d2d2d2] bg-white px-4 py-[7px] text-sm font-medium text-[#1e1e1e] transition hover:bg-[#f5f5f5]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="rounded-md bg-[#00808d] px-4 py-[7px] text-sm font-medium text-white transition hover:bg-[#006d77]"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="mb-6 flex flex-col gap-3 pr-[8px] sm:flex-row sm:items-start sm:justify-between">
              <h2 className="pt-0 text-[22px] font-bold text-[#1e1e1e] lg:pt-16 lg:text-[22px]">
                Security
              </h2>

              <div className="flex w-full items-center justify-end gap-2 pt-1 sm:w-auto sm:pt-0">
                <button
                  type="button"
                  onClick={handleGoBackToProfile}
                  className="rounded-md border border-[#d2d2d2] bg-white px-4 py-[7px] text-sm font-medium text-[#1e1e1e] transition hover:bg-[#f5f5f5]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSecurity}
                  className="rounded-md bg-[#00808d] px-4 py-[7px] text-sm font-medium text-white transition hover:bg-[#006d77]"
                >
                  {secSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          <div
            className={`ps-panel-inner ${activeTab === 'notifications'
              ? 'max-w-none pr-[8px]'
              : activeTab === 'security'
                ? 'max-w-none pr-[8px]'
                : activeTab === 'billing'
                  ? 'max-w-none pr-[4px]'
                  : 'max-w-[700px] pr-0 sm:pr-8'
              }`}
          >
            {activeFeedback && (
              <Messages success={activeFeedback.msg} error={activeFeedback.err} />
            )}

            {activeTab === 'account' && (
              <AccountSection
                profileData={profileData}
                onChange={handleProfileChange}
                avatarUrl={user?.avatarUrl || user?.profileImageUrl || ''}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsSection
                notifications={profileData.notifications}
                onChange={handleNotifChange}
                onToggle={handleNotifToggle}
                onSave={handleSaveNotifications}
                onCancel={handleGoBackToProfile}
                saving={notifSaving}
              />
            )}

            {activeTab === 'security' && (
              <SecuritySection
                securityData={securityData}
                onChange={handleSecurityChange}
                onToggle2FA={(v) =>
                  setSecurityData((p) => ({ ...p, twoFactorEnabled: v }))
                }
                onSendReset={handleSendResetLink}
                resetSending={resetSending}
                resetMsg={resetFb.msg}
                resetErr={resetFb.err}
              />
            )}

            {activeTab === 'billing' && (
              <BillingSection onCancel={handleGoBackToProfile} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};