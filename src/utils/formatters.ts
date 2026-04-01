export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};
