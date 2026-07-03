import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API =
  process.env.REACT_APP_API_URL || "ai-assistant-sample.vercel.app" || "/api";
const H = () => ({
  Authorization: `Bearer ${localStorage.getItem("shadow_token")}`,
});

export const fetchEnterprise = createAsyncThunk(
  "enterprise/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const r = await axios.get(`${API}/enterprise/my`, { headers: H() });
      return r.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message);
    }
  }
);

export const createEnterprise = createAsyncThunk(
  "enterprise/create",
  async (data, { rejectWithValue }) => {
    try {
      const r = await axios.post(`${API}/enterprise`, data, { headers: H() });
      return r.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message);
    }
  }
);

export const assignSeat = createAsyncThunk(
  "enterprise/assignSeat",
  async (email, { rejectWithValue }) => {
    try {
      const r = await axios.post(
        `${API}/enterprise/seats/assign`,
        { email },
        { headers: H() }
      );
      return r.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message);
    }
  }
);

export const revokeSeat = createAsyncThunk(
  "enterprise/revokeSeat",
  async (seatId, { rejectWithValue }) => {
    try {
      const r = await axios.put(
        `${API}/enterprise/seats/${seatId}/revoke`,
        {},
        { headers: H() }
      );
      return r.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message);
    }
  }
);

export const fetchEnterpriseAnalytics = createAsyncThunk(
  "enterprise/analytics",
  async (_, { rejectWithValue }) => {
    try {
      const r = await axios.get(`${API}/enterprise/analytics`, {
        headers: H(),
      });
      return r.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message);
    }
  }
);

const enterpriseSlice = createSlice({
  name: "enterprise",
  initialState: {
    enterprise: null,
    analytics: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearEnterprise: (s) => {
      s.enterprise = null;
      s.analytics = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchEnterprise.pending, (s) => {
      s.loading = true;
    })
      .addCase(fetchEnterprise.fulfilled, (s, a) => {
        s.loading = false;
        s.enterprise = a.payload.enterprise;
      })
      .addCase(fetchEnterprise.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(createEnterprise.fulfilled, (s, a) => {
        s.enterprise = a.payload.enterprise;
      })
      .addCase(assignSeat.fulfilled, (s, a) => {
        s.enterprise = a.payload.enterprise;
      })
      .addCase(revokeSeat.fulfilled, (s, a) => {
        s.enterprise = a.payload.enterprise;
      })
      .addCase(fetchEnterpriseAnalytics.fulfilled, (s, a) => {
        s.analytics = a.payload;
      });
  },
});

export const { clearEnterprise } = enterpriseSlice.actions;
export default enterpriseSlice.reducer;
