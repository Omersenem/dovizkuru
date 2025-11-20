/**
 * Yatırım kar/zarar hesaplama fonksiyonları
 */

/**
 * Altın yatırımı kar/zarar hesaplar
 * @param {number} amount - Yatırılan miktar (TL)
 * @param {number} startPrice - Başlangıç altın fiyatı (gram)
 * @param {number} endPrice - Bitiş altın fiyatı (gram)
 * @returns {object} Kar/zarar bilgileri
 */
export const calculateGoldReturn = (amount, startPrice, endPrice) => {
  const startGrams = amount / startPrice;
  const endValue = startGrams * endPrice;
  const profit = endValue - amount;
  const profitPercentage = (profit / amount) * 100;
  
  return {
    startValue: amount,
    endValue: endValue,
    profit: profit,
    profitPercentage: profitPercentage,
    grams: startGrams
  };
};

/**
 * Döviz yatırımı kar/zarar hesaplar
 * @param {number} amount - Yatırılan miktar (TL)
 * @param {number} startPrice - Başlangıç döviz kuru
 * @param {number} endPrice - Bitiş döviz kuru
 * @returns {object} Kar/zarar bilgileri
 */
export const calculateCurrencyReturn = (amount, startPrice, endPrice) => {
  const startCurrency = amount / startPrice;
  const endValue = startCurrency * endPrice;
  const profit = endValue - amount;
  const profitPercentage = (profit / amount) * 100;
  
  return {
    startValue: amount,
    endValue: endValue,
    profit: profit,
    profitPercentage: profitPercentage,
    currency: startCurrency
  };
};

/**
 * Borsa yatırımı kar/zarar hesaplar
 * @param {number} amount - Yatırılan miktar (TL)
 * @param {number} startIndex - Başlangıç endeks değeri
 * @param {number} endIndex - Bitiş endeks değeri
 * @returns {object} Kar/zarar bilgileri
 */
export const calculateStockReturn = (amount, startIndex, endIndex) => {
  const startUnits = amount / startIndex;
  const endValue = startUnits * endIndex;
  const profit = endValue - amount;
  const profitPercentage = (profit / amount) * 100;
  
  return {
    startValue: amount,
    endValue: endValue,
    profit: profit,
    profitPercentage: profitPercentage,
    units: startUnits
  };
};

/**
 * Tüm yatırım seçeneklerini hesaplar
 * @param {number} amount - Yatırılan miktar (TL)
 * @param {object} startPrices - Başlangıç fiyatları
 * @param {object} endPrices - Bitiş fiyatları
 * @returns {object} Tüm yatırım seçeneklerinin sonuçları
 */
export const calculateAllReturns = (amount, startPrices, endPrices) => {
  return {
    gold: calculateGoldReturn(amount, startPrices.gold, endPrices.gold),
    usd: calculateCurrencyReturn(amount, startPrices.usd, endPrices.usd),
    eur: calculateCurrencyReturn(amount, startPrices.eur, endPrices.eur),
    stock: calculateStockReturn(amount, startPrices.stock, endPrices.stock)
  };
};

