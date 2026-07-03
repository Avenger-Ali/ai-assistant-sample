import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '/api';

export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await axios.post(`${API}/auth/register`, data);
    localStorage.setItem('shadow_token', res.data.token);
    return res.data;
  } catch (e) { return rejectWithValue(e.response?.data?.message || 'Registration failed'); }
});

export const login = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await axios.post(`${API}/auth/login`, data);
    localStorage.setItem('shadow_token', res.data.token);
    return res.data;
  } catch (e) { return rejectWithValue(e.response?.data?.message || 'Login failed'); }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('shadow_token');
    if (!token) return rejectWithValue('No token');
    const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  } catch (e) {
    localStorage.removeItem('shadow_token');
    return rejectWithValue(e.response?.data?.message || 'Failed');
  }
});

export const updateSettings = createAsyncThunk('auth/updateSettings', async (settings, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('shadow_token');
    const res = await axios.put(`${API}/user/settings`, settings, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  } catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('shadow_token') || null,
    loading: false,
    error: null,
    isAuthenticated: false,
  },
  reducers: {
    logout: (state) => {
      state.user = null; state.token = null; state.isAuthenticated = false;
      localStorage.removeItem('shadow_token');
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: b => {
    // register
    b.addCase(register.pending,   s => { s.loading = true; s.error = null; })
     .addCase(register.fulfilled, (s, a) => { s.loading = false; s.user = a.payload.user; s.token = a.payload.token; s.isAuthenticated = true; })
     .addCase(register.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
    // login
     .addCase(login.pending,   s => { s.loading = true; s.error = null; })
     .addCase(login.fulfilled, (s, a) => { s.loading = false; s.user = a.payload.user; s.token = a.payload.token; s.isAuthenticated = true; })
     .addCase(login.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
    // fetchMe
     .addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload.user; s.isAuthenticated = true; })
     .addCase(fetchMe.rejected,  s => { s.user = null; s.isAuthenticated = false; s.token = null; })
    // updateSettings
     .addCase(updateSettings.fulfilled, (s, a) => { if (a.payload.user) s.user = a.payload.user; });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
