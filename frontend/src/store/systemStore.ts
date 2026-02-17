import { create } from 'zustand';
import api from '../api/client';

interface SystemState {
  iconsEndpoint: string | null;
  iconsLocation: string | null;
  iconsCollection: string | null;
  isIconsEnabled: boolean;
  fetchConfig: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  iconsEndpoint: null,
  iconsLocation: null,
  iconsCollection: null,
  isIconsEnabled: false,

  fetchConfig: async () => {
    try {
      const res = await api.get('/system/config');
      const { icons_endpoint, icons_location, icons_collection } = res.data;
      set({
        iconsEndpoint: icons_endpoint,
        iconsLocation: icons_location,
        iconsCollection: icons_collection,
        isIconsEnabled: !!(icons_endpoint && icons_location && icons_collection),
      });
    } catch (err) {
      console.error("Failed to fetch system config:", err);
    }
  },
}));
