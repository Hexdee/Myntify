export const formatValue = (value: number, decimals: number = 0): string => {
  const adjustedValue = value / Math.pow(10, decimals);

  if (adjustedValue === 0) return "0";

  if (Math.abs(adjustedValue) < 0.00001) {
    return "< 0.00001";
  }

  if (Math.abs(adjustedValue) >= 1000000000) {
    return parseFloat((adjustedValue / 1000000000).toFixed(2)) + "B";
  }

  if (Math.abs(adjustedValue) >= 1000000) {
    return parseFloat((adjustedValue / 1000000).toFixed(2)) + "M";
  }

  if (Math.abs(adjustedValue) >= 1000) {
    return parseFloat((adjustedValue / 1000).toFixed(2)) + "K";
  }

  const decimalPlaces = adjustedValue.toString().split(".")[1]?.length || 0;
  if (decimalPlaces > 6) {
    return parseFloat(adjustedValue.toFixed(6)).toString();
  }

  return parseFloat(adjustedValue.toString()).toString();
};
