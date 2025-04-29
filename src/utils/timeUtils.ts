
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

/**
 * Berechnet die durchschnittliche Bearbeitungszeit pro Aufgabe
 */
export function calculateAverageTime(totalSeconds: number, count: number): number {
  if (!count || count <= 0 || !totalSeconds) return 0;
  return Math.round(totalSeconds / count);
}

/**
 * Hilfsfunktion zum Formatieren von Zeitwerten in Stunden und Minuten
 */
export function formatTimeHHMM(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) {
    return '00:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Formatiert die verstrichene Zeit seit einem bestimmten Zeitpunkt
 */
export function formatTimeElapsed(startTime: string | Date): string {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const now = new Date();
  
  const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
  return formatDuration(elapsedSeconds);
}
