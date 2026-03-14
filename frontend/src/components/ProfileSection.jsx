import React, { useEffect, useState } from 'react';
import { updateProfile, requestPasswordReset } from '../services/profileService';


export const ProfileSection = ({ user, onLogout, onProfileUpdated, initialTab = 'account' }) => {
  const [activeProfileTab, setActiveProfileTab] = useState(initialTab);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const [securityData, setSecurityData] = useState({
    password: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    resetContact: '',
  });
  const [resetLinkSending, setResetLinkSending] = useState(false);
  const [resetLinkMessage, setResetLinkMessage] = useState('');
  const [resetLinkError, setResetLinkError] = useState('');

  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const [securityError, setSecurityError] = useState('');

  const [profileData, setProfileData] = useState({
    name: '',
    employeeId: '',
    userRole: '',
    pharmacyOrganization: '',
    email: '',
    phone: '',
    role: '',
    notifications: {
      emailEnabled: true,
      emailAddress: '',
      phoneEnabled: false,
      phoneNumber: '',
    },
  });

  useEffect(() => {
    setProfileData({
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
    setSecurityData({
      password: '',
      confirmPassword: '',
      twoFactorEnabled: user?.twoFactorEnabled ?? false,
      resetContact: user?.email || user?.phone || '',
    });
  }, [user]);

  useEffect(() => {
    setActiveProfileTab(initialTab);
    setNotificationMessage('');
    setNotificationError('');
  }, [initialTab]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    const trimmedName = profileData.name.trim();
    const trimmedEmployeeId = profileData.employeeId.trim();
    const trimmedUserRole = profileData.userRole.trim();
    const trimmedPharmacyOrganization = profileData.pharmacyOrganization.trim();
    const trimmedPhone = profileData.phone.trim();

    if (!trimmedName) {
      setError('Full Name is required');
      setSaveMessage('');
      return;
    }

    if (!trimmedEmployeeId) {
      setError('Employee ID is required');
      setSaveMessage('');
      return;
    }

    if (!trimmedUserRole) {
      setError('User Role is required');
      setSaveMessage('');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSaveMessage('');

      const updatedProfile = await updateProfile({
        name: trimmedName,
        employeeId: trimmedEmployeeId,
        userRole: trimmedUserRole,
        pharmacyOrganization: trimmedPharmacyOrganization,
        phone: trimmedPhone,
      });

      onProfileUpdated(updatedProfile);
      setEditMode(false);
      setSaveMessage('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
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
    setEditMode(false);
    setError('');
    setSaveMessage('');
  };

  const resetNotificationForm = (sourceUser) => {
    setProfileData((prev) => ({
      ...prev,
      notifications: {
        emailEnabled: sourceUser?.notifications?.emailEnabled ?? true,
        emailAddress: sourceUser?.notifications?.emailAddress || sourceUser?.email || '',
        phoneEnabled: sourceUser?.notifications?.phoneEnabled ?? false,
        phoneNumber: sourceUser?.notifications?.phoneNumber || sourceUser?.phone || '',
      },
    }));
  };

  const handleNotificationChange = (e) => {
    const { name, value, type, checked } = e.target;

    setNotificationMessage('');
    setNotificationError('');

    setProfileData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const handleSaveNotifications = async () => {
    const trimmedEmailAddress = profileData.notifications.emailAddress.trim();
    const trimmedPhoneNumber = profileData.notifications.phoneNumber.trim();

    if (profileData.notifications.emailEnabled && !trimmedEmailAddress) {
      setNotificationError('Email address is required when email notifications are enabled.');
      setNotificationMessage('');
      return;
    }

    if (profileData.notifications.phoneEnabled && !trimmedPhoneNumber) {
      setNotificationError('Phone number is required when phone notifications are enabled.');
      setNotificationMessage('');
      return;
    }

    try {
      setNotificationSaving(true);
      setNotificationMessage('');
      setNotificationError('');

      const updatedProfile = await updateProfile({
        notifications: {
          emailEnabled: profileData.notifications.emailEnabled,
          emailAddress: trimmedEmailAddress,
          phoneEnabled: profileData.notifications.phoneEnabled,
          phoneNumber: trimmedPhoneNumber,
        },
      });

      onProfileUpdated(updatedProfile);
      resetNotificationForm(updatedProfile);
      setNotificationMessage('Notification preferences updated successfully!');
    } catch (err) {
      setNotificationError(err.message || 'Failed to update notification preferences');
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;

    setSecurityMessage('');
    setSecurityError('');
    setResetLinkMessage('');
    setResetLinkError('');

    setSecurityData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSecurityCancel = () => {
    setSecurityData({
      password: '',
      confirmPassword: '',
      twoFactorEnabled: user?.twoFactorEnabled ?? false,
      resetContact: user?.email || user?.phone || '',
    });
    setSecurityMessage('');
    setSecurityError('');
    setResetLinkMessage('');
    setResetLinkError('');
  };

  const handleSaveSecurity = async () => {
    const trimmedPassword = securityData.password.trim();
    const trimmedConfirmPassword = securityData.confirmPassword.trim();

    if (trimmedPassword && trimmedPassword.length < 6) {
      setSecurityError('Password must be at least 6 characters long.');
      setSecurityMessage('');
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setSecurityError('Password and Confirm Password must match.');
      setSecurityMessage('');
      return;
    }

    try {
      setSecuritySaving(true);
      setSecurityMessage('');
      setSecurityError('');

      const payload = {
        twoFactorEnabled: securityData.twoFactorEnabled,
      };

      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }

      const updatedProfile = await updateProfile(payload);

      onProfileUpdated(updatedProfile);

      setSecurityData({
        password: '',
        confirmPassword: '',
        twoFactorEnabled: updatedProfile?.twoFactorEnabled ?? false,
        resetContact: updatedProfile?.email || updatedProfile?.phone || '',
      });

      setSecurityMessage('Security settings updated successfully!');
    } catch (err) {
      setSecurityError(err.message || 'Failed to update security settings');
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleSendResetLink = async () => {
    const trimmedResetContact = securityData.resetContact.trim();

    if (!trimmedResetContact) {
      setResetLinkError('Please enter your email or phone number.');
      setResetLinkMessage('');
      return;
    }

    try {
      setResetLinkSending(true);
      setResetLinkMessage('');
      setResetLinkError('');

      const response = await requestPasswordReset(trimmedResetContact);

      setResetLinkMessage(response.message || 'Reset link sent successfully.');
    } catch (err) {
      setResetLinkError(err.message || 'Failed to send reset link');
    } finally {
      setResetLinkSending(false);
    }
  };


  const profileTabs = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'billing', label: 'Billing', icon: '💳' },
  ];

  return (
    <div className="dashboard-section">
      <h2>Profile Settings</h2>

      <div className="profile-tabs">
        {profileTabs.map((tab) => (
          <button
            key={tab.id}
            className={`profile-tab ${activeProfileTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveProfileTab(tab.id);
              if (tab.id === 'notifications') {
                setNotificationMessage('');
                setNotificationError('');
              }
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="profile-content">
        {activeProfileTab === 'account' && (
          <div className="profile-account">
            <div
              className="profile-account-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div>
                <h3>Profile Details</h3>
                <p style={{ margin: '6px 0 0', color: '#666' }}>
                  Manage your account information
                </p>
              </div>

              {!editMode ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditMode(true);
                    setSaveMessage('');
                    setError('');
                  }}
                >
                  Edit Profile
                </button>
              ) : (
                <div
                  className="profile-actions"
                  style={{ display: 'flex', gap: '10px' }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {saveMessage && <p style={{ color: 'green' }}>{saveMessage}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div
              className="profile-summary-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '20px',
                }}
              >
                {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div>
                <h4 style={{ margin: 0 }}>{profileData.name || 'User'}</h4>
                <p style={{ margin: '4px 0 0', color: '#666' }}>
                  {profileData.userRole || 'No role assigned'}
                </p>
              </div>
            </div>

            <form className="profile-edit">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  disabled={!editMode}
                />
              </div>

              <div className="form-group">
                <label>Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={profileData.employeeId}
                  onChange={handleProfileChange}
                  disabled={!editMode}
                />
              </div>

              <div className="form-group">
                <label>User Role</label>
                <input
                  type="text"
                  name="userRole"
                  value={profileData.userRole}
                  onChange={handleProfileChange}
                  disabled={!editMode}
                />
              </div>

              <div className="form-group">
                <label>Pharmacy / Organization</label>
                <input
                  type="text"
                  name="pharmacyOrganization"
                  value={profileData.pharmacyOrganization}
                  onChange={handleProfileChange}
                  disabled={!editMode}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  disabled
                  readOnly
                />
              </div>

              <div className="form-group">
                <label>Phone #</label>
                <input
                  type="text"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  disabled={!editMode}
                />
              </div>

              <div className="form-group">
                <label>System Role</label>
                <input
                  type="text"
                  name="role"
                  value={profileData.role}
                  disabled
                  readOnly
                />
              </div>
            </form>
          </div>
        )}

        {activeProfileTab === 'notifications' && (
          <div className="profile-notifications">
            <h3>Notification Preferences</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Manage how you want to receive alerts and updates.
            </p>
            {notificationMessage && <p style={{ color: 'green' }}>{notificationMessage}</p>}
            {notificationError && <p style={{ color: 'red' }}>{notificationError}</p>}

            <div className="notification-setting">
              <div className="setting-info">
                <p>Email Notifications</p>
                <small>Receive updates and alerts by email</small>
              </div>
              <input
                type="checkbox"
                name="emailEnabled"
                checked={profileData.notifications.emailEnabled}
                onChange={handleNotificationChange}
              />
            </div>

            <div
              className="form-group"
              style={{
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <label>Email Address</label>
              <input
                type="email"
                name="emailAddress"
                value={profileData.notifications.emailAddress}
                onChange={handleNotificationChange}
                disabled={!profileData.notifications.emailEnabled}
              />
            </div>

            <div className="notification-setting" style={{ marginTop: '20px' }}>
              <div className="setting-info">
                <p>Phone Notifications</p>
                <small>Receive updates and alerts by phone</small>
              </div>
              <input
                type="checkbox"
                name="phoneEnabled"
                checked={profileData.notifications.phoneEnabled}
                onChange={handleNotificationChange}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <label>Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                value={profileData.notifications.phoneNumber}
                onChange={handleNotificationChange}
                disabled={!profileData.notifications.phoneEnabled}

              />
              <small style={{ color: '#666' }}>
                Phone preferences are saved now. SMS delivery can be connected later.
              </small>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  resetNotificationForm(user);
                  setNotificationMessage('');
                  setNotificationError('');
                }}
                disabled={notificationSaving}
              >
                Reset
              </button>

              <button
                className="btn btn-primary"
                type="button"
                onClick={handleSaveNotifications}
                disabled={notificationSaving}
              >
                {notificationSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

        {activeProfileTab === 'security' && (
          <div className="profile-security">

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              {securityMessage && <p style={{ color: 'green' }}>{securityMessage}</p>}
              {securityError && <p style={{ color: 'red' }}>{securityError}</p>}
              <h3>Security</h3>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSecurityCancel}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveSecurity}
                  disabled={securitySaving}
                >
                  {securitySaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div
              className="form-group"
              style={{
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={securityData.password}
                onChange={handleSecurityChange}
              />
            </div>

            <div
              className="form-group"
              style={{
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={securityData.confirmPassword}
                onChange={handleSecurityChange}
              />
            </div>

            <div
              className="notification-setting"
              style={{ marginTop: '24px' }}
            >
              <div className="setting-info">
                <p>Enable two-factor authentication</p>
              </div>

              <label
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '46px',
                  height: '24px'
                }}
              >
                <input
                  type="checkbox"
                  name="twoFactorEnabled"
                  checked={securityData.twoFactorEnabled}
                  onChange={handleSecurityChange}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />

                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: securityData.twoFactorEnabled ? '#008c95' : '#ccc',
                    transition: '.3s',
                    borderRadius: '24px'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: securityData.twoFactorEnabled ? '24px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.3s',
                      borderRadius: '50%'
                    }}
                  />
                </span>
              </label>
            </div>

            <div style={{ marginTop: '40px' }}>
              <h4>Forgot Your Password?</h4>

              <p style={{ color: '#666', maxWidth: '600px' }}>
                Don’t worry, we will help you to reset. Enter your email or phone number to receive a one-time password reset link.
              </p>

              {resetLinkMessage && <p style={{ color: 'green' }}>{resetLinkMessage}</p>}
              {resetLinkError && <p style={{ color: 'red' }}>{resetLinkError}</p>}

              <div
                className="form-group"
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <label>Enter your email/phone number</label>

                <input
                  type="text"
                  name="resetContact"
                  value={securityData.resetContact}
                  onChange={handleSecurityChange}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '20px' }}
                onClick={handleSendResetLink}
                disabled={resetLinkSending}
              >
                {resetLinkSending ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            <div style={{ marginTop: '40px' }}>
              <p style={{ color: '#008c95', fontWeight: '500' }}>
                Contact our support
              </p>
            </div>

          </div>
        )}

        {activeProfileTab === 'billing' && (
          <div className="profile-billing">
            <h3>Billing & Plans</h3>
            <div className="billing-info">
              <h4>Current Plan</h4>
              <p>Free Plan</p>
              <small>Upgrade to unlock premium features</small>
            </div>
            <div className="billing-info">
              <h4>Next Billing Date</h4>
              <p>Your current plan is free</p>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '20px' }}>
              Upgrade to Premium
            </button>
          </div>
        )}
      </div>

      <div className="profile-danger-zone" style={{ marginTop: '40px' }}>
        <h3>Danger Zone</h3>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm('Are you sure you want to logout?')) {
              onLogout();
            }
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};
