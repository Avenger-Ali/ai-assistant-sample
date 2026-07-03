import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '/api';
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('shadow_token')}` });

export const fetchSessions = createAsyncThunk('sessions/fetchAll', async (_, { rejectWithValue }) => {
  try { const r = await axios.get(`${API}/sessions`, { headers: H() }); return r.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const createSession = createAsyncThunk('sessions/create', async (data, { rejectWithValue }) => {
  try { const r = await axios.post(`${API}/sessions`, data, { headers: H() }); return r.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Server not running — start the backend'); }
});

export const endSession = createAsyncThunk('sessions/end', async ({ id, aiNotes }, { rejectWithValue }) => {
  try { const r = await axios.put(`${API}/sessions/${id}/end`, { aiNotes }, { headers: H() }); return r.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const deleteSession = createAsyncThunk('sessions/delete', async (id, { rejectWithValue }) => {
  try { await axios.delete(`${API}/sessions/${id}`, { headers: H() }); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState: {
    sessions: [],
    activeSession: null,
    loading: false,
    error: null,
    isListening: false,
    liveQuestion: '',
    answers: [],
  },
  reducers: {
    setActiveSession: (s, a) => { s.activeSession = a.payload; },
    setListening:     (s, a) => { s.isListening = a.payload; },
    setLiveQuestion:  (s, a) => { s.liveQuestion = a.payload; },
    addAnswer:        (s, a) => { s.answers.unshift(a.payload); },
    clearLiveSession: s => { s.activeSession = null; s.isListening = false; s.liveQuestion = ''; s.answers = []; },
  },
  extraReducers: b => {
    b.addCase(fetchSessions.pending,   s => { s.loading = true; })
     .addCase(fetchSessions.fulfilled, (s, a) => { s.loading = false; s.sessions = a.payload.sessions || []; })
     .addCase(fetchSessions.rejected,  (s, a) => { s.loading = false; s.error = a.payload; s.sessions = []; })
     .addCase(createSession.fulfilled, (s, a) => { if (a.payload?.session) { s.sessions.unshift(a.payload.session); s.activeSession = a.payload.session; } })
     .addCase(endSession.fulfilled,    (s, a) => { if (a.payload?.session) { const i = s.sessions.findIndex(x => x._id === a.payload.session._id); if (i >= 0) s.sessions[i] = a.payload.session; } })
     .addCase(deleteSession.fulfilled, (s, a) => { s.sessions = s.sessions.filter(x => x._id !== a.payload); });
  }
});

export const { setActiveSession, setListening, setLiveQuestion, addAnswer, clearLiveSession } = sessionsSlice.actions;
export default sessionsSlice.reducer;
