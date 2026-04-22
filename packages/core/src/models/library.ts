export const LIBRARY_MARKER = '.library.orbit';
export const LIBRARY_FOLDERS = ['Games', 'UserData', 'Exports'];

export interface LibraryStatus {
  path?: string;
  isLoaded: boolean;
}
