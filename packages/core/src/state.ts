import type { UserStatus } from './models/user';
import type { PlatformStatus } from './models/platform';

/**
 * TODO: The Global State of Orbit.
 * Now it's truly agnostic: it doesn't know HOW platforms are detected.
 */
export interface OrbitState {
  user: UserStatus;
  platform?: PlatformStatus;
}

let state: OrbitState = {
  user: { isLoggedIn: false }
};

export const Orbit = {
  /**
   * TODO: Access the state. 
   * We use a getter to ensure we always get the latest reference.
   */
  get state() {
    if (!state.platform) {
      throw new Error("Orbit Core not initialized. Call Orbit.init(platformInfo) first.");
    }
    return state as Required<OrbitState>;
  },
  
  /**
   * TODO: The Host (CLI, Android, Web) must call this at startup
   * providing its specific platform information.
   */
  init(platform: PlatformStatus) {
    state.platform = platform;
  },
  
  updateUser(id: string) {
    state.user = { id, isLoggedIn: true };
  }
};
