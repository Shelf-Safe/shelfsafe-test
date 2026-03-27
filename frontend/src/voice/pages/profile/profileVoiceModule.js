export const profileVoice = {
  pageId: 'profile',
  aliases: ['profile', 'my profile', 'account', 'user profile'],
  commands: [
    {
      id: 'profile-logout',
      aliases: [
        'logout',
        'sign out',
        'log out',
        'log me out',
        'sign me out',
        'sign off',
        'log off',
      ],
      action: 'PROFILE_LOGOUT',
    },
    {
      id: 'profile-edit',
      aliases: [
        'edit profile',
        'update profile',
        'change profile',
        'modify profile',
        'open edit profile',
        'account details',
        'edit my profile',
      ],
      route: '/settings?section=account',
    },
    {
      id: 'profile-settings',
      aliases: [
        'profile settings',
        'open profile settings',
        'account settings',
        'my account settings',
      ],
      route: '/settings',
    },
    {
      id: 'profile-change-photo',
      aliases: [
        'change photo',
        'change picture',
        'change avatar',
        'upload photo',
        'upload picture',
        'upload profile picture',
        'new profile picture',
      ],
      action: 'PROFILE_CHANGE_PHOTO',
    },
  ],
};
