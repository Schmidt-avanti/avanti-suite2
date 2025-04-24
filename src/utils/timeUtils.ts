
/**
 * Formats time duration from seconds to a human-readable string format
 */
export function formatDuration(seconds: number): string {
  // Handle invalid or zero input
  if (!seconds || typeof seconds !== 'number' || isNaN(seconds)) {
    return '0m';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  return `${hours}h ${minutes}m`;
}
