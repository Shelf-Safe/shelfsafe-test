import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from './VoiceContext';
import { subscribeVoiceAppEvent } from './eventBus';

export function VoiceBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { setRoutePath, stopListening } = useVoice();
  const authVoiceRef = useRef({});
  authVoiceRef.current = { logout, navigate };

  useEffect(() => {
    setRoutePath(location.pathname);
  }, [location.pathname, setRoutePath]);

  useEffect(() => subscribeVoiceAppEvent((detail) => {
    const a = authVoiceRef.current;
    switch (detail.type) {
      case 'NAVIGATE':
        navigate(detail.route);
        break;
      case 'GO_BACK':
        navigate(-1);
        break;
      case 'STOP_LISTENING':
        stopListening();
        break;
      case 'PROFILE_LOGOUT':
        a.logout?.();
        a.navigate?.('/login', { replace: true });
        break;
      default:
        break;
    }
  }), [navigate, stopListening]);

  return null;
}
