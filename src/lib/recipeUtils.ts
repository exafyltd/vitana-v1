export function scaleQuantity(qty: string, scaleFactor: number): string {
  // Parse quantity string (e.g., "170 g", "1 tbsp", "½ cup")
  const match = qty.match(/^([\d./½¼¾]+)\s*(.*)$/);
  if (!match) return qty;
  
  const [, numStr, unit] = match;
  let num = 0;
  
  // Handle fractions
  if (numStr.includes('½')) num = 0.5;
  else if (numStr.includes('¼')) num = 0.25;
  else if (numStr.includes('¾')) num = 0.75;
  else if (numStr.includes('/')) {
    const [n, d] = numStr.split('/').map(Number);
    num = n / d;
  } else {
    num = parseFloat(numStr);
  }
  
  const scaled = num * scaleFactor;
  
  // Format nicely
  if (scaled < 0.25) return `⅛ ${unit}`;
  if (scaled === 0.25) return `¼ ${unit}`;
  if (scaled === 0.5) return `½ ${unit}`;
  if (scaled === 0.75) return `¾ ${unit}`;
  if (scaled === 1) return `1 ${unit}`;
  if (Number.isInteger(scaled)) return `${scaled} ${unit}`;
  
  return `${scaled.toFixed(1)} ${unit}`;
}
