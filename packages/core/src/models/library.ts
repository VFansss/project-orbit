export const LIBRARY_MARKER = 'orbit.library.toml';
export const LIBRARY_FOLDERS = ['Games', 'UserData', 'Exports'];

export interface LibraryStatus {
  path?: string;
  isLoaded: boolean;
}
