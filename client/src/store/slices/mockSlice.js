import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API =
  process.env.REACT_APP_API_URL || "ai-assistant-sample.vercel.app" || "/api";
const H = () => ({
  Authorization: `Bearer ${localStorage.getItem("shadow_token")}`,
});

export const fetchMocks = createAsyncThunk(
  "mock/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const r = await axios.get(`${API}/mock`, { headers: H() });
      return r.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message);
    }
  }
);

export const createMock = createAsyncThunk(
  "mock/create",
  async (data, { rejectWithValue }) => {
    try {
      const r = await axios.post(`${API}/mock`, data, { headers: H() });
      return r.data;
    } catch (e) {
      // Return a minimal mock object so the UI can continue even if server is offline
      return { mock: { _id: null, ...data, createdAt: new Date() } };
    }
  }
);

export const completeMock = createAsyncThunk(
  "mock/complete",
  async ({ id, analytics, postInterviewNotes }, { rejectWithValue }) => {
    try {
      if (!id) return { mock: { analytics, postInterviewNotes } };
      const r = await axios.put(
        `${API}/mock/${id}/complete`,
        { analytics, postInterviewNotes },
        { headers: H() }
      );
      return r.data;
    } catch (e) {
      return { mock: { analytics, postInterviewNotes } };
    }
  }
);

export const deleteMock = createAsyncThunk(
  "mock/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API}/mock/${id}`, { headers: H() });
      return id;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message);
    }
  }
);

const mockSlice = createSlice({
  name: "mock",
  initialState: {
    mocks: [],
    activeMock: null,
    loading: false,
    error: null,
    // Live coaching state
    isRunning: false,
    currentPaceWPM: 0,
    fillerWordCount: 0,
    detectedFillers: [],
    confidenceScore: 100,
    liveAlerts: [],
  },
  reducers: {
    setActiveMock: (s, a) => {
      s.activeMock = a.payload;
    },
    setRunning: (s, a) => {
      s.isRunning = a.payload;
    },
    updatePace: (s, a) => {
      s.currentPaceWPM = a.payload;
    },
    addFiller: (s, a) => {
      s.fillerWordCount += 1;
      s.detectedFillers.push(a.payload);
    },
    updateConfidence: (s, a) => {
      s.confidenceScore = a.payload;
    },
    addAlert: (s, a) => {
      s.liveAlerts.unshift({ ...a.payload, id: Date.now() });
      if (s.liveAlerts.length > 5) s.liveAlerts.pop();
    },
    dismissAlert: (s, a) => {
      s.liveAlerts = s.liveAlerts.filter((x) => x.id !== a.payload);
    },
    clearMockSession: (s) => {
      s.activeMock = null;
      s.isRunning = false;
      s.currentPaceWPM = 0;
      s.fillerWordCount = 0;
      s.detectedFillers = [];
      s.confidenceScore = 100;
      s.liveAlerts = [];
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMocks.pending, (s) => {
      s.loading = true;
    })
      .addCase(fetchMocks.fulfilled, (s, a) => {
        s.loading = false;
        s.mocks = a.payload.mocks;
      })
      .addCase(fetchMocks.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(createMock.fulfilled, (s, a) => {
        s.mocks.unshift(a.payload.mock);
        s.activeMock = a.payload.mock;
      })
      .addCase(completeMock.fulfilled, (s, a) => {
        const i = s.mocks.findIndex((m) => m._id === a.payload.mock._id);
        if (i >= 0) s.mocks[i] = a.payload.mock;
      })
      .addCase(deleteMock.fulfilled, (s, a) => {
        s.mocks = s.mocks.filter((m) => m._id !== a.payload);
      });
  },
});

export const {
  setActiveMock,
  setRunning,
  updatePace,
  addFiller,
  updateConfidence,
  addAlert,
  dismissAlert,
  clearMockSession,
} = mockSlice.actions;
export default mockSlice.reducer;
