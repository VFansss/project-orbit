import type { UserStatus } from './models/user';
import type { PlatformStatus } from './models/platform';
import type { OrbitScope } from './models/auth';
import type { LibraryStatus } from './models/library';
import { Logger } from './logger';
import type { LogLevel } from './models/config';

/**
 * TODO: The Global State of Orbit.
 */
export interface OrbitState {
  user: UserStatus;
  platform?: PlatformStatus;
  library: LibraryStatus;
}

let state: OrbitState = {
  user: { isLoggedIn: false },
  library: { isLoaded: false }
};

export const Orbit = {
  /**
   * TODO: Access the shared logger.
   */
  Logger,

  get state() {
    if (!state.platform) {
      throw new Error("Orbit Core not initialized. Call Orbit.init(platformInfo) first.");
    }
    return state as Required<OrbitState>;
  },
  
  /**
   * TODO: Initialize core and the logger.
   */
  init(platform: PlatformStatus, logLevel: LogLevel = 'ERROR') {
    state.platform = platform;
    Logger.setLogLevel(logLevel);
  },
  
  updateUser(id: string) {
    state.user = { id, isLoggedIn: true };
  },

  updateLibrary(path: string) {
    state.library = { path, isLoaded: true };
  },

  checkScopes(scopes: OrbitScope[]): { authorized: boolean; missing?: OrbitScope } {
    for (const scope of scopes) {
      if (scope === 'USER_LOGGED' && !state.user.isLoggedIn) {
        return { authorized: false, missing: 'USER_LOGGED' };
      }
    }
    return { authorized: true };
  }
};
