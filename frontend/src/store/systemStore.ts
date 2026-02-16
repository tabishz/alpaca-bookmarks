import { create } from 'zustand';
import api from '../api/client';

interface SystemState {
  iconsEndpoint: string | null;
  iconsLocation: string | null;
  isIconsEnabled: boolean;
  fetchConfig: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  iconsEndpoint: null,
  iconsLocation: null,
  isIconsEnabled: false,

  fetchConfig: async () => {
    try {
      const res = await api.get('/system/config');
      const { icons_endpoint, icons_location } = res.data;
      set({
        iconsEndpoint: icons_endpoint,
        iconsLocation: icons_location,
        isIconsEnabled: !!(icons_endpoint && icons_location),
      });
    } catch (err) {
      console.error("Failed to fetch system config:", err);
    }
  },
}));
