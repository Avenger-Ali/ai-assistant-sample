import { configureStore } from '@reduxjs/toolkit';
import authReducer       from './slices/authSlice';
import sessionsReducer   from './slices/sessionsSlice';
import mockReducer       from './slices/mockSlice';
import enterpriseReducer from './slices/enterpriseSlice';
import affiliateReducer  from './slices/affiliateSlice';
import desktopReducer    from './slices/desktopSlice';

export const store = configureStore({
  reducer: {
    auth:       authReducer,
    sessions:   sessionsReducer,
    mock:       mockReducer,
    enterprise: enterpriseReducer,
    affiliate:  affiliateReducer,
    desktop:    desktopReducer,
  },
  middleware: gDM => gDM({ serializableCheck: false }),
});
