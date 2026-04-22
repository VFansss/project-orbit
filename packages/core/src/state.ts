import type { UserStatus } from './models/user';
import type { PlatformStatus } from './models/platform';
import type { OrbitScope } from './models/auth';

/**
 * TODO: The Global State of Orbit.
 */
export interface OrbitState {
  user: UserStatus;
  platform?: PlatformStatus;
}

let state: OrbitState = {
  user: { isLoggedIn: false }
};

export const Orbit = {
  get state() {
    if (!state.platform) {
      throw new Error("Orbit Core not initialized. Call Orbit.init(platformInfo) first.");
    }
    return state as Required<OrbitState>;
  },
  
  init(platform: PlatformStatus) {
    state.platform = platform;
  },
  
  updateUser(id: string) {
    state.user = { id, isLoggedIn: true };
  },

  /**
   * TODO: Check if the current state satisfies a list of requirements (scopes).
   * This is used by hosts (CLI, Mobile, Web) to grant access to protected commands.
   */
  checkScopes(scopes: OrbitScope[]): { authorized: boolean; missing?: OrbitScope } {
    for (const scope of scopes) {
      // Logic for USER_LOGGED requirement
      if (scope === 'USER_LOGGED' && !state.user.isLoggedIn) {
        return { authorized: false, missing: 'USER_LOGGED' };
      }
    }
    return { authorized: true };
  }
};
