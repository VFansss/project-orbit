export type OS = 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'unknown';

export interface PlatformStatus {
  os: OS;
  arch: string;
  isMobile: boolean;
}
