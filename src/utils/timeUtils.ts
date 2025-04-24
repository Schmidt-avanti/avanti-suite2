
/**
 * Formatiert eine Zeitdauer in Sekunden in ein menschenlesbares Format
 */
export function formatDuration(seconds: number): string {
  // Behandlung ungültiger oder Null-Eingaben
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) {
    return '0m';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}
