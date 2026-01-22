import { configureStore } from '@reduxjs/toolkit';
import authReducer, { loadFromStorage as loadAuthFromStorage } from './slices/authSlice';
import { useDispatch, useSelector } from 'react-redux';

// Configure the store
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  preloadedState: {}
});

// Dispatch auth loadFromStorage manually
store.dispatch(loadAuthFromStorage());

// Typed hooks
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;