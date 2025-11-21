import axios from 'axios';

// Backend API Base URL
// Development: Vite proxy üzerinden (/api/tcmb)
// Production: Environment variable'dan veya varsayılan olarak Render URL'i
const BACKEND_API_URL = import.meta.env.VITE_API_URL || '/api/tcmb';

// Gold API Proxy URL - Backend proxy üzerinden
// Vite base URL'i otomatik olarak ekler (örn: /dovizkuru/api/gold)
const GOLD_API_PROXY_URL = import.meta.env.VITE_GOLD_API_PROXY || '/api/gold';

/**
 * Tarih formatını API formatına çevirir (YYYY-MM-DD)
 */
const formatDateForAPI = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
 * Altın fiyatını getirir (Gram altın - Türkiye)
 * TCMB API'si kullanılıyor (ücretsiz)
 */
export const getGoldPrice = async () => {
  console.warn('Altın serisi geçici olarak devre dışı bırakıldı.');
  return null;
};

/**
 * Dolar/TL kurunu getirir
 * TCMB API'si kullanılıyor
 */
export const getUSDPrice = async (date) => {
  try {
    const formattedDate = formatDateForTCMB(date);
    const today = new Date();
    
    // Backend proxy üzerinden TCMB API - USD/TRY kuru (TP.DK.USD.A serisi)
    const response = await axios.get(BACKEND_API_URL, {
      params: {
        series: 'TP.DK.USD.A',
        startDate: formattedDate,
        endDate: formatDateForTCMB(today)
      },
      timeout: 15000
    });
    console.log('getUSDPrice raw response:', response.data);

    if (response.data && response.data.items && response.data.items.length > 0) {
      const targetDate = formatDateForTCMB(date);
      let closestItem = null;
      let minDateDiff = Infinity;
      
      // Önce tam eşleşmeyi ara
      for (const item of response.data.items) {
        if (item.TARIH === targetDate) {
          closestItem = item;
          break;
        }
        
        // Tam eşleşme yoksa, en yakın tarihi bul
        if (item.TARIH && item['TP.DK.USD.A']) {
          const itemDate = new Date(item.TARIH.split('-').reverse().join('-'));
          const targetDateObj = new Date(date);
          const dateDiff = Math.abs(itemDate - targetDateObj);
          
          if (dateDiff < minDateDiff) {
            minDateDiff = dateDiff;
            closestItem = item;
          }
        }
      }
      
      if (closestItem && closestItem['TP.DK.USD.A']) {
        const price = parseFloat(closestItem['TP.DK.USD.A']);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Dolar kuru alınırken hata:', error);
    return null;
  }
};

/**
 * Euro/TL kurunu getirir
 * TCMB API'si kullanılıyor
 */
export const getEURPrice = async (date) => {
  try {
    const formattedDate = formatDateForTCMB(date);
    const today = new Date();
    
    // Backend proxy üzerinden TCMB API - EUR/TRY kuru (TP.DK.EUR.A serisi)
    const response = await axios.get(BACKEND_API_URL, {
      params: {
        series: 'TP.DK.EUR.A',
        startDate: formattedDate,
        endDate: formatDateForTCMB(today)
      },
      timeout: 15000
    });
    console.log('getEURPrice raw response:', response.data);

    if (response.data && response.data.items && response.data.items.length > 0) {
      const targetDate = formatDateForTCMB(date);
      let closestItem = null;
      let minDateDiff = Infinity;
      
      // Önce tam eşleşmeyi ara
      for (const item of response.data.items) {
        if (item.TARIH === targetDate) {
          closestItem = item;
          break;
        }
        
        // Tam eşleşme yoksa, en yakın tarihi bul
        if (item.TARIH && item['TP.DK.EUR.A']) {
          const itemDate = new Date(item.TARIH.split('-').reverse().join('-'));
          const targetDateObj = new Date(date);
          const dateDiff = Math.abs(itemDate - targetDateObj);
          
          if (dateDiff < minDateDiff) {
            minDateDiff = dateDiff;
            closestItem = item;
          }
        }
      }
      
      if (closestItem && closestItem['TP.DK.EUR.A']) {
        const price = parseFloat(closestItem['TP.DK.EUR.A']);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Euro kuru alınırken hata:', error);
    return null;
  }
};

/**
 * Genel döviz için startDate'den bugüne kadar veri çeker ve ilk-son değerleri döndürür
 * @param {Date} startDate - Başlangıç tarihi
 * @param {string} seriesCode - Döviz seri kodu (örn: 'TP.DK.USD.A')
 * @returns {object|null} { firstPrice: number, lastPrice: number } veya null
 */
export const getCurrencyRange = async (startDate, seriesCode) => {
  try {
    const startDateFormatted = formatDateForTCMB(startDate);
    const today = new Date();
    const endDateFormatted = formatDateForTCMB(today);
    
    // Tek bir istek ile startDate'den bugüne kadar veri çek
    const response = await axios.get(BACKEND_API_URL, {
      params: {
        series: seriesCode,
        startDate: startDateFormatted,
        endDate: endDateFormatted
      },
      timeout: 15000
    });

    // Eğer response.data string ise JSON parse yap
    let responseData = response.data;
    if (typeof responseData === 'string') {
      try {
        const cleanedString = responseData.replace(/:\s*NaN\s*([,\}])/g, ': null$1');
        responseData = JSON.parse(cleanedString);
      } catch (e) {
        console.error(`${seriesCode} JSON parse hatası:`, e);
        return null;
      }
    }

    // Response formatını kontrol et
    let items = null;
    if (responseData) {
      if (Array.isArray(responseData)) {
        items = responseData;
      } else if (responseData.items && Array.isArray(responseData.items)) {
        items = responseData.items;
      }
    }

    if (items && items.length > 0) {
      // Geçerli değerlere sahip item'ları filtrele
      const validItems = items.filter(item => {
        const tarih = item.Tarih || item.TARIH || item.tarih;
        const price = item[seriesCode] || item[seriesCode.replace(/\./g, '_')];
        const priceNum = parseFloat(price);
        return tarih && price !== null && price !== undefined && !isNaN(priceNum) && priceNum > 0;
      });
      
      if (validItems.length === 0) {
        return null;
      }
      
      // İlk değeri bul
      const startDateFormattedSearch = formatDateForTCMB(startDate);
      let firstItem = null;
      let minDateDiff = Infinity;
      
      for (const item of validItems) {
        const tarih = item.Tarih || item.TARIH || item.tarih;
        
        if (tarih === startDateFormattedSearch) {
          firstItem = item;
          break;
        }
        
        try {
          const itemDate = new Date(tarih.split('-').reverse().join('-'));
          const targetDateObj = new Date(startDate);
          const dateDiff = Math.abs(itemDate - targetDateObj);
          
          if (dateDiff < minDateDiff) {
            minDateDiff = dateDiff;
            firstItem = item;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
      
      if (!firstItem) {
        firstItem = validItems[0];
      }
      
      // Son değeri bul
      let lastItem = null;
      let latestDate = null;
      
      for (const item of validItems) {
        const tarih = item.Tarih || item.TARIH || item.tarih;
        try {
          const itemDate = new Date(tarih.split('-').reverse().join('-'));
          
          if (!latestDate || itemDate > latestDate) {
            latestDate = itemDate;
            lastItem = item;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
      
      if (!lastItem) {
        lastItem = validItems[validItems.length - 1];
      }
      
      if (firstItem && lastItem) {
        const firstPrice = parseFloat(firstItem[seriesCode] || firstItem[seriesCode.replace(/\./g, '_')]);
        const lastPrice = parseFloat(lastItem[seriesCode] || lastItem[seriesCode.replace(/\./g, '_')]);
        
        if (!isNaN(firstPrice) && firstPrice > 0 && !isNaN(lastPrice) && lastPrice > 0) {
          return {
            firstPrice: firstPrice,
            lastPrice: lastPrice
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`${seriesCode} kuru aralığı alınırken hata:`, error);
    return null;
  }
};

/**
 * Dolar için startDate'den bugüne kadar veri çeker ve ilk-son değerleri döndürür
 * @param {Date} startDate - Başlangıç tarihi
 * @returns {object|null} { firstPrice: number, lastPrice: number } veya null
 */
export const getUSDRange = async (startDate) => {
  return getCurrencyRange(startDate, 'TP.DK.USD.A');
};

/**
 * Euro için startDate'den bugüne kadar veri çeker ve ilk-son değerleri döndürür
 * @param {Date} startDate - Başlangıç tarihi
 * @returns {object|null} { firstPrice: number, lastPrice: number } veya null
 */
export const getEURRange = async (startDate) => {
  return getCurrencyRange(startDate, 'TP.DK.EUR.A');
};

/**
 * Borsa endeksi getirir (BIST100)
 * Borsa İstanbul API'si veya alternatif kaynak
 */
export const getStockIndex = async (date, indexType = 'BIST100') => {
  try {
    // Borsa İstanbul için ücretsiz API yok, bu yüzden alternatif kaynak kullanıyoruz
    // Yahoo Finance veya başka bir kaynak kullanılabilir
    // Şimdilik null döndürüyoruz - gerçek API entegrasyonu yapılabilir
    return null;
  } catch (error) {
    console.error('Borsa endeksi alınırken hata:', error);
    return null;
  }
};

/**
 * Gold API sembolleri enum
 */
export const GOLD_API_SYMBOLS = {
  XAG: 'XAG', // Silver
  XAU: 'XAU', // Gold
  BTC: 'BTC', // Bitcoin
  ETH: 'ETH', // Ethereum
  XPD: 'XPD', // Palladium
  HG: 'HG'    // Copper
};

/**
 * Tarihi Unix timestamp'e çevirir
 * @param {Date} date - Tarih objesi
 * @returns {number} Unix timestamp (saniye cinsinden)
 */
const dateToUnixTimestamp = (date) => {
  return Math.floor(date.getTime() / 1000);
};

/**
 * Günde 1 defa Gold API'ye istek atar ve JSON dosyalarını günceller
 * localStorage kullanarak son güncelleme tarihini kontrol eder
 */
export const updateGoldApiDataIfNeeded = async () => {
  try {
    const LAST_UPDATE_KEY = 'goldApiLastUpdate';
    const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
    const today = new Date().toDateString();
    
    // Eğer bugün güncellenmişse, tekrar istek atma
    if (lastUpdate === today) {
      console.log('Gold API verileri bugün zaten güncellenmiş, tekrar istek atılmıyor.');
      return;
    }
    
    const apiKey = import.meta.env.VITE_GOLD_API_KEY;
    if (!apiKey) {
      console.warn('Gold API key bulunamadı, JSON güncellemesi atlanıyor.');
      return;
    }
    
    console.log('Gold API verileri güncelleniyor...');
    
    // Tüm semboller için veri çek
    const symbols = Object.values(GOLD_API_SYMBOLS);
    const startTimestamp = dateToUnixTimestamp(new Date('1990-01-01'));
    const endTimestamp = dateToUnixTimestamp(new Date());
    
    for (const symbol of symbols) {
      try {
        const response = await axios.get(`${GOLD_API_PROXY_URL}/history`, {
          params: {
            symbol: symbol,
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            groupBy: 'day',
            aggregation: 'avg',
            orderBy: 'asc'
          },
          timeout: 30000
        });
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Veriyi formatla ve JSON dosyasına kaydet
          const formattedData = response.data.map(item => ({
            avg_price: item.price || item.value,
            day: new Date((item.timestamp || item.time) * 1000).toISOString().split('T')[0] + ' 00:00:00'
          }));
          
          // Not: Frontend'den dosya yazma yapılamaz, bu işlem backend'de yapılmalı
          // Şimdilik sadece localStorage'a kaydediyoruz
          console.log(`[${symbol}] ${formattedData.length} kayıt alındı (backend'e kaydedilmeli)`);
        }
      } catch (error) {
        console.error(`[${symbol}] Gold API güncelleme hatası:`, error);
      }
    }
    
    // Son güncelleme tarihini kaydet
    localStorage.setItem(LAST_UPDATE_KEY, today);
    console.log('Gold API verileri güncellendi.');
    
  } catch (error) {
    console.error('Gold API güncelleme hatası:', error);
  }
};

/**
 * Gold API'den varlık fiyatını getirir (backend proxy üzerinden)
 * @param {string} symbol - Varlık sembolü (XAU, XAG, BTC, ETH, XPD, HG)
 * @returns {object|null} { name, price, symbol, updatedAt, updatedAtReadable } veya null
 */
export const getGoldApiPrice = async (symbol) => {
  try {
    // Backend proxy üzerinden istek at
    const response = await axios.get(`${GOLD_API_PROXY_URL}/price/${symbol}`, {
      timeout: 10000
    });
    
    if (response.data && response.data.price) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Gold API fiyat alınırken hata (${symbol}):`, error);
    return null;
  }
};

/**
 * Gold API'den tarih aralığı için veri çeker ve ilk-son değerleri döndürür
 * @param {string} symbol - Varlık sembolü (XAU, XAG, BTC, ETH, XPD, HG)
 * @param {Date} startDate - Başlangıç tarihi
 * @returns {object|null} { firstPrice: number, lastPrice: number } veya null
 */
export const getGoldApiHistoryRange = async (symbol, startDate) => {
  try {
    // 1990-01-01'den bugüne kadar veri çek
    const startTimestamp = dateToUnixTimestamp(new Date('1990-01-01'));
    const endTimestamp = dateToUnixTimestamp(new Date());
    const targetStartTimestamp = dateToUnixTimestamp(startDate);
    
    const response = await axios.get(`${GOLD_API_PROXY_URL}/history`, {
      params: {
        symbol: symbol,
        startTimestamp: startTimestamp,
        endTimestamp: endTimestamp,
        groupBy: 'day',
        aggregation: 'avg',
        orderBy: 'asc'
      },
      timeout: 30000
    });
    
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.warn(`Gold API history verisi boş veya geçersiz (${symbol})`);
      return null;
    }
    
    const items = response.data;
    
    // Geçerli değerlere sahip item'ları filtrele
    const validItems = items.filter(item => {
      const price = item.price || item.value;
      const priceNum = parseFloat(price);
      const timestamp = item.timestamp || item.time;
      return timestamp && price !== null && price !== undefined && !isNaN(priceNum) && priceNum > 0;
    });
    
    if (validItems.length === 0) {
      console.warn(`Gold API geçerli veri bulunamadı (${symbol})`);
      return null;
    }
    
    // Başlangıç tarihine en yakın değeri bul
    let firstItem = null;
    let minTimestampDiff = Infinity;
    
    for (const item of validItems) {
      const itemTimestamp = item.timestamp || item.time;
      const timestampDiff = Math.abs(itemTimestamp - targetStartTimestamp);
      
      if (timestampDiff < minTimestampDiff) {
        minTimestampDiff = timestampDiff;
        firstItem = item;
      }
    }
    
    if (!firstItem) {
      firstItem = validItems[0];
    }
    
    // Son değeri bul (en son tarih)
    const lastItem = validItems[validItems.length - 1];
    
    if (firstItem && lastItem) {
      const firstPrice = parseFloat(firstItem.price || firstItem.value);
      const lastPrice = parseFloat(lastItem.price || lastItem.value);
      
      if (!isNaN(firstPrice) && firstPrice > 0 && !isNaN(lastPrice) && lastPrice > 0) {
        return {
          firstPrice: firstPrice,
          lastPrice: lastPrice
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Gold API history alınırken hata (${symbol}):`, error);
    return null;
  }
};
