import axios from 'axios';

// Backend API Base URL
const BACKEND_API_URL = import.meta.env.VITE_API_URL || '/api/tcmb';

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
  return new Date(year, month - 1, day);
};

/**
 * Tarihleri karşılaştırır (sadece tarih kısmı, saat yok)
 */
const compareDates = (date1, date2) => {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1.getTime() - d2.getTime();
};

/**
 * İki tarih aynı gün mü?
 */
const isSameDay = (date1, date2) => {
  return compareDates(date1, date2) === 0;
};

/**
 * localStorage'dan döviz verisini okur
 */
const getCurrencyDataFromStorage = (seriesCode) => {
  try {
    const data = localStorage.getItem(`currency_${seriesCode}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${seriesCode} from storage:`, error);
  }
  return null;
};

/**
 * localStorage'a döviz verisini yazar
 */
const saveCurrencyDataToStorage = (seriesCode, data) => {
  try {
    localStorage.setItem(`currency_${seriesCode}`, JSON.stringify(data));
    // JSON dosyasına da kaydet (download olarak)
    saveCurrencyDataToFile(seriesCode, data);
  } catch (error) {
    console.error(`Error saving ${seriesCode} to storage:`, error);
  }
};

/**
 * JSON dosyasına kaydet (IndexedDB veya localStorage'dan export için hazırla)
 * Not: Browser'da dosya sistemi yazma yapamayız, bu yüzden sadece veriyi hazırlıyoruz
 * Gerçek JSON dosyaları export fonksiyonları ile oluşturulabilir
 */
const saveCurrencyDataToFile = (seriesCode, data) => {
  try {
    // JSON verisini hazırla (src/jsons klasörü formatında)
    const jsonString = JSON.stringify(data, null, 2);
    
    // IndexedDB'ye kaydet (daha büyük veri için, opsiyonel)
    if ('indexedDB' in window) {
      try {
        saveToIndexedDB(seriesCode, data).catch(err => {
          // IndexedDB hatası kritik değil, sadece log
          console.warn(`[${seriesCode}] IndexedDB kayıt hatası (opsiyonel):`, err);
        });
      } catch (e) {
        // IndexedDB desteklenmiyorsa devam et
      }
    }
    
    // localStorage'da da JSON string olarak tut (zaten yapıyoruz)
    // Bu veri daha sonra export edilebilir
    console.log(`[${seriesCode}] JSON verisi hazırlandı (${jsonString.length} bytes)`);
  } catch (error) {
    console.error(`Error preparing ${seriesCode} for file export:`, error);
  }
};

/**
 * IndexedDB'ye kaydet (büyük veriler için, opsiyonel)
 */
const saveToIndexedDB = async (seriesCode, data) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CurrencyCacheDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['currencies'], 'readwrite');
      const store = transaction.objectStore('currencies');
      const putRequest = store.put({ code: seriesCode, data: data, timestamp: new Date().toISOString() });
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('currencies')) {
        db.createObjectStore('currencies', { keyPath: 'code' });
      }
    };
  });
};

/**
 * Son güncelleme tarihini kontrol eder
 */
const getLastUpdateDate = (seriesCode) => {
  try {
    const lastUpdate = localStorage.getItem(`currency_${seriesCode}_lastUpdate`);
    if (lastUpdate) {
      return new Date(lastUpdate);
    }
  } catch (error) {
    console.error(`Error reading last update date for ${seriesCode}:`, error);
  }
  return null;
};

/**
 * Son güncelleme tarihini kaydeder
 */
const setLastUpdateDate = (seriesCode, date) => {
  try {
    localStorage.setItem(`currency_${seriesCode}_lastUpdate`, date.toISOString());
  } catch (error) {
    console.error(`Error saving last update date for ${seriesCode}:`, error);
  }
};

/**
 * Bugün güncelleme yapılmış mı?
 */
const shouldUpdateToday = (seriesCode) => {
  const lastUpdate = getLastUpdateDate(seriesCode);
  if (!lastUpdate) {
    return true; // Hiç güncelleme yapılmamış
  }
  const today = new Date();
  return !isSameDay(lastUpdate, today);
};

/**
 * API'den döviz verisini çeker
 */
const fetchCurrencyDataFromAPI = async (seriesCode, startDate, endDate) => {
  try {
    const response = await axios.get(BACKEND_API_URL, {
      params: {
        series: seriesCode,
        startDate: formatDateForTCMB(startDate),
        endDate: formatDateForTCMB(endDate)
      },
      timeout: 30000
    });

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

    let items = null;
    if (responseData) {
      if (Array.isArray(responseData)) {
        items = responseData;
      } else if (responseData.items && Array.isArray(responseData.items)) {
        items = responseData.items;
      }
    }

    if (items && items.length > 0) {
      // Geçerli değerlere sahip item'ları filtrele ve formatla
      const validItems = items
        .filter(item => {
          const tarih = item.Tarih || item.TARIH || item.tarih;
          const price = item[seriesCode] || item[seriesCode.replace(/\./g, '_')];
          const priceNum = parseFloat(price);
          return tarih && price !== null && price !== undefined && !isNaN(priceNum) && priceNum > 0;
        })
        .map(item => {
          const tarih = item.Tarih || item.TARIH || item.tarih;
          const price = parseFloat(item[seriesCode] || item[seriesCode.replace(/\./g, '_')]);
          return {
            date: tarih,
            price: price
          };
        })
        .sort((a, b) => {
          // Tarihe göre sırala
          const dateA = parseTCMBDate(a.date);
          const dateB = parseTCMBDate(b.date);
          return dateA - dateB;
        });

      return validItems;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching ${seriesCode} from API:`, error);
    return null;
  }
};

/**
 * İlk yükleme: 1990'dan itibaren tüm verileri çeker
 */
export const initializeCurrencyData = async (seriesCode) => {
  console.log(`[${seriesCode}] İlk yükleme başlatılıyor...`);
  
  const startDate = new Date('1990-01-01');
  const endDate = new Date();
  
  const data = await fetchCurrencyDataFromAPI(seriesCode, startDate, endDate);
  
  if (data && data.length > 0) {
    const cacheData = {
      seriesCode: seriesCode,
      lastUpdate: new Date().toISOString(),
      data: data,
      firstDate: data[0].date,
      lastDate: data[data.length - 1].date
    };
    
    saveCurrencyDataToStorage(seriesCode, cacheData);
    setLastUpdateDate(seriesCode, new Date());
    
    console.log(`[${seriesCode}] İlk yükleme tamamlandı. ${data.length} kayıt.`);
    return cacheData;
  }
  
  console.error(`[${seriesCode}] İlk yükleme başarısız.`);
  return null;
};

/**
 * Günlük güncelleme: Sadece son tarihten bugüne kadar yeni verileri çeker
 */
export const updateCurrencyDataDaily = async (seriesCode) => {
  // Bugün güncelleme yapılmış mı kontrol et
  if (!shouldUpdateToday(seriesCode)) {
    console.log(`[${seriesCode}] Bugün zaten güncellenmiş.`);
    return null;
  }

  console.log(`[${seriesCode}] Günlük güncelleme başlatılıyor...`);
  
  const cachedData = getCurrencyDataFromStorage(seriesCode);
  
  if (!cachedData || !cachedData.data || cachedData.data.length === 0) {
    // Cache yoksa, ilk yükleme yap
    return await initializeCurrencyData(seriesCode);
  }

  // Son tarihten bugüne kadar yeni verileri çek
  const lastDate = parseTCMBDate(cachedData.lastDate);
  const today = new Date();
  
  // Eğer son tarih bugün ise, güncelleme gerekmez
  if (isSameDay(lastDate, today)) {
    setLastUpdateDate(seriesCode, new Date());
    console.log(`[${seriesCode}] Veri zaten güncel.`);
    return cachedData;
  }

  // Son tarihten 1 gün sonrasından başla (duplicate önlemek için)
  const nextDay = new Date(lastDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const newData = await fetchCurrencyDataFromAPI(seriesCode, nextDay, today);
  
  if (newData && newData.length > 0) {
    // Yeni verileri mevcut verilere ekle
    const mergedData = [...cachedData.data, ...newData]
      .sort((a, b) => {
        const dateA = parseTCMBDate(a.date);
        const dateB = parseTCMBDate(b.date);
        return dateA - dateB;
      })
      // Duplicate'leri temizle
      .filter((item, index, self) => 
        index === self.findIndex(t => t.date === item.date)
      );

    const updatedCacheData = {
      ...cachedData,
      lastUpdate: new Date().toISOString(),
      data: mergedData,
      lastDate: mergedData[mergedData.length - 1].date
    };
    
    saveCurrencyDataToStorage(seriesCode, updatedCacheData);
    setLastUpdateDate(seriesCode, new Date());
    
    console.log(`[${seriesCode}] Günlük güncelleme tamamlandı. ${newData.length} yeni kayıt eklendi. Toplam: ${mergedData.length}`);
    return updatedCacheData;
  }
  
  // Yeni veri yoksa bile, güncelleme tarihini güncelle
  setLastUpdateDate(seriesCode, new Date());
  console.log(`[${seriesCode}] Yeni veri yok, ancak güncelleme tarihi güncellendi.`);
  return cachedData;
};

/**
 * Belirli bir tarih aralığı için döviz verisini getirir (cache'den)
 */
export const getCurrencyRangeFromCache = (seriesCode, startDate) => {
  const cachedData = getCurrencyDataFromStorage(seriesCode);
  
  if (!cachedData || !cachedData.data || cachedData.data.length === 0) {
    return null;
  }

  const startDateFormatted = formatDateForTCMB(startDate);
  
  // İlk değeri bul (startDate'e en yakın)
  let firstItem = null;
  let minDateDiff = Infinity;
  
  for (const item of cachedData.data) {
    if (item.date === startDateFormatted) {
      firstItem = item;
      break;
    }
    
    try {
      const itemDate = parseTCMBDate(item.date);
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
  
  // Son değeri bul (en son tarih)
  const lastItem = cachedData.data[cachedData.data.length - 1];
  
  if (firstItem && lastItem) {
    return {
      firstPrice: firstItem.price,
      lastPrice: lastItem.price
    };
  }
  
  return null;
};

/**
 * Cache'de veri var mı kontrol eder
 */
export const hasCurrencyData = (seriesCode) => {
  const cachedData = getCurrencyDataFromStorage(seriesCode);
  return cachedData !== null && cachedData.data && cachedData.data.length > 0;
};

/**
 * Tüm dövizler için günlük güncellemeyi başlatır (timer ile)
 */
export const startDailyUpdateTimer = (currencies, onUpdateComplete) => {
  // İlk güncellemeyi hemen yap
  const updateAll = async () => {
    console.log('Günlük güncelleme başlatılıyor...');
    for (const currency of currencies) {
      try {
        await updateCurrencyDataDaily(currency.code);
        // Rate limit için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`[${currency.code}] Güncelleme hatası:`, error);
      }
    }
    console.log('Günlük güncelleme tamamlandı.');
    if (onUpdateComplete) {
      onUpdateComplete();
    }
  };

  // İlk güncellemeyi yap
  updateAll();

  // Her gün saat 00:00'da güncelleme yap
  const scheduleNextUpdate = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      updateAll();
      // Her gün tekrar et
      setInterval(updateAll, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  };

  scheduleNextUpdate();
};

/**
 * Tüm döviz verilerini JSON dosyaları olarak export eder (download)
 * Bu fonksiyon src/jsons klasörü formatında JSON dosyaları oluşturur
 */
export const exportAllCurrencyDataToJSON = () => {
  const exportedFiles = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('currency_') && !key.includes('_lastUpdate')) {
      const seriesCode = key.replace('currency_', '');
      const data = getCurrencyDataFromStorage(seriesCode);
      
      if (data) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jsons/${seriesCode.replace(/\./g, '_')}.json`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        exportedFiles.push(seriesCode);
      }
    }
  }
  
  console.log(`✅ ${exportedFiles.length} JSON dosyası export edildi:`, exportedFiles);
  return exportedFiles;
};

/**
 * Belirli bir döviz için JSON dosyasını export eder
 */
export const exportCurrencyDataToJSON = (seriesCode) => {
  const data = getCurrencyDataFromStorage(seriesCode);
  
  if (!data) {
    console.warn(`[${seriesCode}] Export edilecek veri bulunamadı.`);
    return false;
  }
  
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jsons/${seriesCode.replace(/\./g, '_')}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`✅ [${seriesCode}] JSON dosyası export edildi.`);
    return true;
  } catch (error) {
    console.error(`[${seriesCode}] Export hatası:`, error);
    return false;
  }
};

