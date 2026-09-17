/**
 * Formats a number or string into Indian Rupee (INR) currency format.
 * Example: 129999 -> ₹1,29,999
 * @param {number|string} amount
 * @returns {string} Formatted INR currency string
 */
export const formatINR = (amount) => {
  const numericAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numericAmount);
};

export default formatINR;
