
export const markdownToHtml = (markdown: any): string => {
  // Sicherstellen, dass markdown ein String ist
  const markdownStr = typeof markdown === 'string' ? markdown : 
    markdown ? JSON.stringify(markdown) : '';
    
  return markdownStr
    .split('\n')
    .map(line => {
      // Headers
      if (line.startsWith('###')) {
        return `<h3 class="text-xl font-semibold mt-6 mb-3">${line.replace('###', '').trim()}</h3>`;
      }
      // Bold titles with colons
      if (line.match(/^\*\*[^*]+:\*\*/)) {
        return `<h4 class="text-lg font-medium mt-4 mb-2">${line.replace(/\*\*/g, '').trim()}</h4>`;
      }
      // Lists
      if (line.trim().startsWith('-')) {
        return `<ul><li>${line.substring(1).trim()}</li></ul>`;
      }
      // Regular paragraphs
      if (line.trim()) {
        return `<p class="mb-3">${line}</p>`;
      }
      return '';
    })
    .join('\n');
};
