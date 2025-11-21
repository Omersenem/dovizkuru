/**
 * Gold API JSON dosyalarından verileri okur
 * public/jsons klasöründeki Gold API JSON dosyalarını kullanır
 * (xau.json, xag.json, btc.json, eth.json, xpd.json, hg.json)
 */

/**
 * Tarih formatını standartlaştırır (YYYY-MM-DD)
 * @param {string|Date} date - Tarih string'i veya Date objesi
 * @returns {string} YYYY-MM-DD formatında tarih
 */
const normalizeDate = (date) => {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // String ise, "YYYY-MM-DD HH:MM:SS" formatından "YYYY-MM-DD" çıkar
  if (typeof date === 'string') {
    return date.split(' ')[0];
  }
  
  return date;
};

/**
 * Tarih string'ini Date objesine çevirir
 * @param {string} dateString - YYYY-MM-DD formatında tarih
 * @returns {Date} Date objesi
 */
const parseDate = (dateString) => {
  const normalized = normalizeDate(dateString);
  const [year, month, day] = normalized.split('-');
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const PUBLIC_BASE_URL = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '');

const buildJSONUrl = (fileName) => {
  return `${PUBLIC_BASE_URL}/jsons/${fileName}`.replace(/\/{2,}/g, '/').replace(':/', '://');
};

/**
 * Gold API sembolünden JSON dosya adını oluşturur
 * @param {string} symbol - Gold API sembolü (XAU, XAG, BTC, ETH, XPD, HG)
 * @returns {string} JSON dosya adı (örn: xau.json)
 */
const getGoldApiFileName = (symbol) => {
  return `${symbol.toLowerCase()}.json`;
};

/**
 * JSON dosyasını yükler
 */
const loadGoldApiJSONFile = async (symbol) => {
  try {
    const fileName = getGoldApiFileName(symbol);
    const response = await fetch(buildJSONUrl(fileName));
    
    if (!response.ok) {
      throw new Error(`JSON dosyası bulunamadı: ${fileName}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[${symbol}] Gold API JSON dosyası yüklenirken hata:`, error);
    return null;
  }
};

/**
 * Cache için JSON verilerini tutar
 */
const goldApiJsonCache = {};

/**
 * JSON dosyasını cache'den veya dosyadan yükler
 */
const getGoldApiJSONData = async (symbol) => {
  // Cache'de varsa direkt döndür
  if (goldApiJsonCache[symbol]) {
    return goldApiJsonCache[symbol];
  }
  
  // Cache'de yoksa yükle
  const data = await loadGoldApiJSONFile(symbol);
  if (data) {
    goldApiJsonCache[symbol] = data;
  }
  return data;
};

/**
 * Belirli bir tarih için değeri bulur (en yakın geçerli değeri bulur)
 */
const findPriceForDate = (items, targetDate) => {
  if (!items || items.length === 0) {
    return null;
  }
  
  const targetDateObj = parseDate(targetDate);
  const targetDateNormalized = normalizeDate(targetDate);
  
  // Önce tam eşleşmeyi ara
  let exactMatch = items.find(item => {
    const itemDate = normalizeDate(item.day);
    return itemDate === targetDateNormalized;
  });
  
  // Tam eşleşme varsa ve değeri geçerliyse döndür
  if (exactMatch && exactMatch.avg_price) {
    const price = parseFloat(exactMatch.avg_price);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  }
  
  // Tam eşleşme yoksa veya geçersizse, en yakın geçerli değeri bul
  let closestItem = null;
  let minDateDiff = Infinity;
  
  for (const item of items) {
    const price = parseFloat(item.avg_price);
    
    // Geçerli bir fiyat olmalı
    if (isNaN(price) || price <= 0) {
      continue;
    }
    
    try {
      const itemDate = parseDate(item.day);
      const dateDiff = Math.abs(itemDate - targetDateObj);
      
      // En yakın tarihi bul
      if (dateDiff < minDateDiff) {
        minDateDiff = dateDiff;
        closestItem = item;
      }
    } catch (e) {
      // Geçersiz tarih, atla
      continue;
    }
  }
  
  if (closestItem) {
    return parseFloat(closestItem.avg_price);
  }
  
  return null;
};

/**
 * Belirli bir tarih aralığı için ilk ve son değerleri getirir
 * @param {string} symbol - Gold API sembolü (XAU, XAG, BTC, ETH, XPD, HG)
 * @param {Date} startDate - Başlangıç tarihi
 * @param {object} usdRange - USD kuru aralığı { firstPrice: number, lastPrice: number }
 * @returns {object|null} { firstPrice: number, lastPrice: number } (TL cinsinden) veya null
 */
export const getGoldApiRangeFromJSON = async (symbol, startDate, usdRange) => {
  try {
    const jsonData = await getGoldApiJSONData(symbol);
    
    if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
      console.warn(`[${symbol}] Gold API JSON verisi geçersiz veya boş`);
      return null;
    }
    
    // İlk değeri bul (startDate'e en yakın)
    const firstPriceUSD = findPriceForDate(jsonData, startDate);
    
    if (firstPriceUSD === null) {
      console.warn(`[${symbol}] Başlangıç tarihi için geçerli değer bulunamadı`);
      return null;
    }
    
    // Son değeri bul (en son tarih)
    let lastPriceUSD = null;
    let lastItem = null;
    
    // En son geçerli değeri bul
    for (let i = jsonData.length - 1; i >= 0; i--) {
      const item = jsonData[i];
      const price = parseFloat(item.avg_price);
      
      if (!isNaN(price) && price > 0) {
        lastPriceUSD = price;
        lastItem = item;
        break;
      }
    }
    
    if (lastPriceUSD === null) {
      console.warn(`[${symbol}] Son tarih için geçerli değer bulunamadı`);
      return null;
    }
    
    // USD kuru ile TL'ye çevir
    let firstPriceInTRY = firstPriceUSD;
    let lastPriceInTRY = lastPriceUSD;
    
    if (usdRange && usdRange.firstPrice && usdRange.lastPrice) {
      // Başlangıç tarihindeki USD kuru ile çarp
      firstPriceInTRY = firstPriceUSD * parseFloat(usdRange.firstPrice);
      // Bugünkü USD kuru ile çarp
      lastPriceInTRY = lastPriceUSD * parseFloat(usdRange.lastPrice);
    }
    
    return {
      firstPrice: firstPriceInTRY,
      lastPrice: lastPriceInTRY
    };
  } catch (error) {
    console.error(`[${symbol}] Gold API JSON'dan veri okunurken hata:`, error);
    return null;
  }
};

/**
 * Cache'i temizler (yeniden yükleme için)
 */
export const clearGoldApiJSONCache = (symbol) => {
  if (symbol) {
    delete goldApiJsonCache[symbol];
  } else {
    Object.keys(goldApiJsonCache).forEach(key => delete goldApiJsonCache[key]);
  }
};

