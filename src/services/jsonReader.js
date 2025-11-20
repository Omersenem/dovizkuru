/**
 * JSON dosyalarından döviz verilerini okur
 * src/jsons klasöründeki JSON dosyalarını kullanır
 */

// 2005-01-01'de 6 sıfır atıldı (redenomination)
// Bu tarihten önceki değerler 1.000.000'a bölünmeli
const REDENOMINATION_DATE = new Date('2005-01-01');
REDENOMINATION_DATE.setHours(0, 0, 0, 0); // Tarih karşılaştırması için saatleri sıfırla
const REDENOMINATION_FACTOR = 1_000_000;

/**
 * Tarih formatını TCMB formatına çevirir (DD-MM-YYYY)
 */
const formatDateForTCMB = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * TCMB formatındaki tarihi Date objesine çevirir
 */
const parseTCMBDate = (dateString) => {
  const [day, month, year] = dateString.split('-');
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0); // Tarih karşılaştırması için saatleri sıfırla
  return date;
};

/**
 * Fiyatı 2005 para birimi dönüşümüne göre ayarlar
 * 2005-01-01'den önceki tarihler için değeri 1.000.000'a böler
 * 2005-01-01 ve sonrası için değeri olduğu gibi bırakır
 */
const adjustPriceForRedenomination = (priceNum, dateObj) => {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    // Tarih yoksa veya geçersizse, dönüşüm yapma (güvenli tarafta kal)
    return priceNum;
  }
  
  // Tarih karşılaştırması için saatleri sıfırla
  const normalizedDate = new Date(dateObj);
  normalizedDate.setHours(0, 0, 0, 0);
  
  // 2005-01-01'den önceki tarihler için 1.000.000'a böl
  if (normalizedDate < REDENOMINATION_DATE) {
    return priceNum / REDENOMINATION_FACTOR;
  }
  
  // 2005-01-01 ve sonrası için olduğu gibi bırak
  return priceNum;
};

const extractPrice = (item, seriesCode) => {
  const rawPrice = item[seriesCode];
  if (rawPrice === null || rawPrice === undefined) {
    return null;
  }

  const priceNum = parseFloat(rawPrice);
  if (isNaN(priceNum)) {
    return null;
  }

  const tarih = item.Tarih || item.tarih;
  let dateObj = null;
  if (tarih) {
    try {
      dateObj = parseTCMBDate(tarih);
    } catch (error) {
      // Geçersiz tarih formatı, dönüşüm yapılmaz
    }
  }

  return adjustPriceForRedenomination(priceNum, dateObj);
};

/**
 * Seri kodundan dosya adını oluşturur
 * TP.DK.USD.A -> usd.json
 * TP.DK.IRR.A -> ırr.json (Türkçe karakterler için)
 */
const getFileNameFromSeriesCode = (seriesCode) => {
  // Seri kodunu parçala: TP.DK.USD.A
  const parts = seriesCode.split('.');
  
  // 3. parça (index 2) döviz kodudur: USD, EUR, vb.
  if (parts.length >= 3) {
    const currencyCode = parts[2].toLowerCase();
    return `${currencyCode}.json`;
  }
  
  // Fallback: tam seri kodunu kullan
  return seriesCode.replace(/\./g, '_').toLowerCase() + '.json';
};

const PUBLIC_BASE_URL = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '');

const buildJSONUrl = (fileName) => {
  // BASE_URL zaten slash ile başlıyorsa tekrar ekleme
  return `${PUBLIC_BASE_URL}/jsons/${fileName}`.replace(/\/{2,}/g, '/').replace(':/', '://');
};

/**
 * JSON dosyasını yükler
 */
const loadJSONFile = async (seriesCode) => {
  try {
    const fileName = getFileNameFromSeriesCode(seriesCode);
    
    // Public klasöründen oku (Vite public klasörü root'tan erişilebilir)
    const response = await fetch(buildJSONUrl(fileName));
    
    if (!response.ok) {
      // Alternatif: büyük harfle dene
      const parts = seriesCode.split('.');
      if (parts.length >= 3) {
        const altFileName = parts[2].toUpperCase() + '.json';
        const altResponse = await fetch(buildJSONUrl(altFileName));
        
        if (!altResponse.ok) {
          // Son deneme: tam seri kodu ile
          const fullFileName = seriesCode.replace(/\./g, '_').toLowerCase() + '.json';
          const fullResponse = await fetch(buildJSONUrl(fullFileName));
          
          if (!fullResponse.ok) {
            throw new Error(`JSON dosyası bulunamadı: ${fileName}, ${altFileName}, ${fullFileName}`);
          }
          return await fullResponse.json();
        }
        return await altResponse.json();
      }
      throw new Error(`JSON dosyası bulunamadı: ${fileName}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[${seriesCode}] JSON dosyası yüklenirken hata:`, error);
    return null;
  }
};

/**
 * Cache için JSON verilerini tutar (bir kez yüklenir, sonra cache'den okunur)
 */
const jsonCache = {};

/**
 * JSON dosyasını cache'den veya dosyadan yükler
 */
const getJSONData = async (seriesCode) => {
  // Cache'de varsa direkt döndür
  if (jsonCache[seriesCode]) {
    return jsonCache[seriesCode];
  }
  
  // Cache'de yoksa yükle
  const data = await loadJSONFile(seriesCode);
  if (data) {
    jsonCache[seriesCode] = data;
  }
  return data;
};

/**
 * Belirli bir tarih için değeri bulur (null ise en yakın geçerli değeri bulur)
 */
const findPriceForDate = (items, seriesCode, targetDate) => {
  if (!items || items.length === 0) {
    return null;
  }
  
  const targetDateFormatted = formatDateForTCMB(targetDate);
  const targetDateObj = new Date(targetDate);
  
  // Önce tam eşleşmeyi ara
  let exactMatch = items.find(item => {
    const tarih = item.Tarih || item.tarih;
    return tarih === targetDateFormatted;
  });
  
  // Tam eşleşme varsa ve değeri null değilse döndür
  if (exactMatch) {
    const price = extractPrice(exactMatch, seriesCode);
    if (price !== null && price !== undefined && !isNaN(price)) {
      return price;
    }
  }
  
  // Tam eşleşme yoksa veya null ise, en yakın geçerli değeri bul
  let closestItem = null;
  let minDateDiff = Infinity;
  
  for (const item of items) {
    const tarih = item.Tarih || item.tarih;
    const price = extractPrice(item, seriesCode);
    
    // Geçerli bir fiyat olmalı
    if (price === null || price === undefined || isNaN(price)) {
      continue;
    }
    
    try {
      const itemDate = parseTCMBDate(tarih);
      const dateDiff = Math.abs(itemDate - targetDateObj);
      
      // En yakın tarihi bul (hem önceki hem sonraki tarihleri kontrol et)
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
    return extractPrice(closestItem, seriesCode);
  }
  
  return null;
};

/**
 * Belirli bir tarih aralığı için ilk ve son değerleri getirir
 * @param {string} seriesCode - Döviz seri kodu (örn: 'TP.DK.USD.A')
 * @param {Date} startDate - Başlangıç tarihi
 * @returns {object|null} { firstPrice: number, lastPrice: number } veya null
 */
export const getCurrencyRangeFromJSON = async (seriesCode, startDate) => {
  try {
    const jsonData = await getJSONData(seriesCode);
    
    if (!jsonData || !jsonData.items || !Array.isArray(jsonData.items)) {
      console.warn(`[${seriesCode}] JSON verisi geçersiz veya boş`);
      return null;
    }
    
    const items = jsonData.items;
    
    // İlk değeri bul (startDate'e en yakın, null olmayan)
    const firstPrice = findPriceForDate(items, seriesCode, startDate);
    
    if (firstPrice === null) {
      console.warn(`[${seriesCode}] Başlangıç tarihi için geçerli değer bulunamadı`);
      return null;
    }
    
    // Son değeri bul (en son tarih, null olmayan)
    let lastPrice = null;
    let lastItem = null;
    
    // En son geçerli değeri bul
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const price = extractPrice(item, seriesCode);
      
      if (price !== null && price !== undefined && !isNaN(price)) {
        lastPrice = price;
        lastItem = item;
        break;
      }
    }
    
    if (lastPrice === null) {
      console.warn(`[${seriesCode}] Son tarih için geçerli değer bulunamadı`);
      return null;
    }
    
    return {
      firstPrice: firstPrice,
      lastPrice: lastPrice
    };
  } catch (error) {
    console.error(`[${seriesCode}] JSON'dan veri okunurken hata:`, error);
    return null;
  }
};

/**
 * Cache'i temizler (yeniden yükleme için)
 */
export const clearJSONCache = (seriesCode) => {
  if (seriesCode) {
    delete jsonCache[seriesCode];
  } else {
    Object.keys(jsonCache).forEach(key => delete jsonCache[key]);
  }
};

