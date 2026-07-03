import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || "ai-assistant-sample.vercel.app" || '/api';
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('shadow_token')}` });

export const fetchAffiliate = createAsyncThunk('affiliate/fetch', async (_, { rejectWithValue }) => {
  try { const r = await axios.get(`${API}/affiliate/me`, { headers: H() }); return r.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const applyAffiliate = createAsyncThunk('affiliate/apply', async (data, { rejectWithValue }) => {
  try { const r = await axios.post(`${API}/affiliate/apply`, data, { headers: H() }); return r.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const fetchAffiliateStats = createAsyncThunk('affiliate/stats', async (_, { rejectWithValue }) => {
  try { const r = await axios.get(`${API}/affiliate/stats`, { headers: H() }); return r.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

export const addContentLink = createAsyncThunk('affiliate/addContent', async (data, { rejectWithValue }) => {
  try { const r = await axios.post(`${API}/affiliate/content`, data, { headers: H() }); return r.data; }
  catch (e) { return rejectWithValue(e.response?.data?.message); }
});

const affiliateSlice = createSlice({
  name: 'affiliate',
  initialState: { affiliate: null, stats: null, loading: false, error: null },
  reducers: {},
  extraReducers: b => {
    b.addCase(fetchAffiliate.fulfilled, (s, a) => { s.affiliate = a.payload.affiliate; })
     .addCase(applyAffiliate.fulfilled, (s, a) => { s.affiliate = a.payload.affiliate; })
     .addCase(fetchAffiliateStats.fulfilled, (s, a) => { s.stats = a.payload; })
     .addCase(addContentLink.fulfilled, (s, a) => { s.affiliate = a.payload.affiliate; })
     .addCase(fetchAffiliate.pending, s => { s.loading = true; })
     .addCase(fetchAffiliate.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  }
});

export default affiliateSlice.reducer;
