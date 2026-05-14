import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('job_token')) {
      setBooting(false);
      return;
    }

    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => {
        setToken('');
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  const signin = useCallback(async (payload) => {
    const data = await api.signin(payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await api.signup(payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      booting,
      signin,
      signup,
      logout,
      authenticated: Boolean(user)
    }),
    [booting, logout, signin, signup, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
