import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || "ai-assistant-sample.vercel.app" || '/api';
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('shadow_token')}` });

/**
 * requestLaunchToken
 * Calls the premium-gated endpoint. Server returns 403 + code:'PREMIUM_REQUIRED'
 * if the user isn't on an active paid plan — UI shows an upgrade prompt instead.
 */
export const requestLaunchToken = createAsyncThunk(
  'desktop/requestLaunchToken',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API}/desktop/launch-token`, {}, { headers: H() });
      return res.data; // { token, expiresAt, durationMinutes, deepLink }
    } catch (e) {
      return rejectWithValue({
        message: e.response?.data?.message || 'Failed to create launch token',
        code: e.response?.data?.code || null,
      });
    }
  }
);

export const fetchMyDesktopSession = createAsyncThunk(
  'desktop/fetchMySession',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API}/desktop/my-session`, { headers: H() });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to check session');
    }
  }
);

export const revokeDesktopSession = createAsyncThunk(
  'desktop/revoke',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API}/desktop/revoke`, {}, { headers: H() });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || 'Failed to revoke session');
    }
  }
);

const desktopSlice = createSlice({
  name: 'desktop',
  initialState: {
    // Active session info, mirrored from server (source of truth)
    active: false,
    expiresAt: null,
    secondsRemaining: 0,
    issuedAt: null,
    platform: null,

    // Most recently minted token (only kept in memory long enough to hand off via deep link)
    lastToken: null,
    lastDeepLink: null,

    loading: false,
    error: null,
    errorCode: null,
  },
  reducers: {
    tickCountdown: (state) => {
      if (state.active && state.secondsRemaining > 0) {
        state.secondsRemaining -= 1;
        if (state.secondsRemaining <= 0) {
          state.active = false;
        }
      }
    },
    clearDesktopError: (state) => { state.error = null; state.errorCode = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestLaunchToken.pending, (state) => {
        state.loading = true; state.error = null; state.errorCode = null;
      })
      .addCase(requestLaunchToken.fulfilled, (state, action) => {
        state.loading = false;
        state.lastToken = action.payload.token;
        state.lastDeepLink = action.payload.deepLink;
        state.active = true;
        state.expiresAt = action.payload.expiresAt;
        state.secondsRemaining = action.payload.durationMinutes * 60;
        state.issuedAt = new Date().toISOString();
      })
      .addCase(requestLaunchToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to launch';
        state.errorCode = action.payload?.code || null;
      })
      .addCase(fetchMyDesktopSession.fulfilled, (state, action) => {
        const d = action.payload;
        state.active = d.active;
        if (d.active) {
          state.expiresAt = d.expiresAt;
          state.secondsRemaining = d.secondsRemaining;
          state.issuedAt = d.issuedAt;
          state.platform = d.platform;
        }
      })
      .addCase(revokeDesktopSession.fulfilled, (state) => {
        state.active = false;
        state.secondsRemaining = 0;
        state.lastToken = null;
        state.lastDeepLink = null;
      });
  },
});

export const { tickCountdown, clearDesktopError } = desktopSlice.actions;
export default desktopSlice.reducer;
