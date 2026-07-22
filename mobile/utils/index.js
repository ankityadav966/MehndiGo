// Utility functions go here. Keep helpers lightweight and reusable.

export const formatCurrency = (value) => {
  return `$${Number(value).toFixed(2)}`;
};
