import { useState, useEffect } from 'react';

const SESSION_KEY = 'pad_session_id';

export const useSession = () => {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get or create session ID
    let storedSessionId = localStorage.getItem(SESSION_KEY);
    
    if (!storedSessionId) {
      // Generate a new session ID
      storedSessionId = Math.random().toString(36).substring(7) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, storedSessionId);
    }
    
    setSessionId(storedSessionId);
  }, []);

  const generateNewSession = () => {
    const newSessionId = Math.random().toString(36).substring(7) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, newSessionId);
    setSessionId(newSessionId);
    return newSessionId;
  };

  return {
    sessionId,
    generateNewSession,
  };
};