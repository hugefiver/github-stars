export const getFundingIcon = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'github':
      return '💖';
    case 'patreon':
      return '🎭';
    case 'open collective':
      return '🏛️';
    case 'ko-fi':
      return '☕';
    case 'tidelift':
      return '🛡️';
    case 'community bridge':
      return '🌉';
    case 'liberapay':
      return '💳';
    case 'issuehunt':
      return '🏆';
    case 'otechie':
      return '👨‍💻';
    default:
      return '💰';
  }
};