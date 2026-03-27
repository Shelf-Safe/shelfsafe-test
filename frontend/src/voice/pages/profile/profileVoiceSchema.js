export const PROFILE_VOICE_SCHEMA = {
  page: 'profile',
  entityType: 'user',
  allowedIntents: ['logout', 'edit_profile', 'change_avatar', 'open_settings', 'navigate'],
  controls: ['logoutButton', 'editProfileButton', 'avatarUpload', 'settingsLink'],
  actions: ['PROFILE_LOGOUT', 'PROFILE_CHANGE_PHOTO', 'NAVIGATE'],
};
