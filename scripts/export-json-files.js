/**
 * Bu script, localStorage'dan JSON dosyalarını src/jsons klasörüne export eder
 * 
 * Kullanım:
 * 1. Browser console'da: localStorage'dan verileri JSON olarak kopyala
 * 2. Veya bu script'i çalıştır (Node.js ile)
 * 
 * Not: Browser'da localStorage'a direkt erişemeyiz, bu yüzden
 * bu script manuel olarak çalıştırılmalı veya browser console'dan
 * veriler export edilmeli.
 */

const fs = require('fs');
const path = require('path');

const JSONS_DIR = path.join(__dirname, '../src/jsons');

// src/jsons klasörünü oluştur
if (!fs.existsSync(JSONS_DIR)) {
  fs.mkdirSync(JSONS_DIR, { recursive: true });
  console.log(`✅ ${JSONS_DIR} klasörü oluşturuldu.`);
}

/**
 * Browser console'dan kopyalanan localStorage verilerini JSON dosyalarına yazar
 * 
 * Browser console'da şunu çalıştır:
 * 
 * const data = {};
 * for (let i = 0; i < localStorage.length; i++) {
 *   const key = localStorage.key(i);
 *   if (key && key.startsWith('currency_') && !key.includes('_lastUpdate')) {
 *     const seriesCode = key.replace('currency_', '');
 *     data[seriesCode] = JSON.parse(localStorage.getItem(key));
 *   }
 * }
 * console.log(JSON.stringify(data, null, 2));
 * 
 * Sonra çıktıyı buraya yapıştır ve script'i çalıştır.
 */
function exportFromLocalStorageData(localStorageData) {
  const data = typeof localStorageData === 'string' 
    ? JSON.parse(localStorageData) 
    : localStorageData;
  
  let exportedCount = 0;
  
  for (const [seriesCode, currencyData] of Object.entries(data)) {
    if (currencyData && currencyData.seriesCode) {
      const fileName = `${seriesCode.replace(/\./g, '_')}.json`;
      const filePath = path.join(JSONS_DIR, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify(currencyData, null, 2), 'utf8');
      console.log(`✅ ${fileName} oluşturuldu (${currencyData.data?.length || 0} kayıt)`);
      exportedCount++;
    }
  }
  
  console.log(`\n🎉 Toplam ${exportedCount} JSON dosyası oluşturuldu: ${JSONS_DIR}`);
  return exportedCount;
}

// Eğer command line'dan çalıştırılıyorsa
if (require.main === module) {
  console.log('📝 JSON Export Script');
  console.log('====================\n');
  console.log('Bu script localStorage verilerini src/jsons klasörüne export eder.');
  console.log('\nKullanım:');
  console.log('1. Browser console\'da localStorage verilerini JSON olarak kopyala');
  console.log('2. Bu script\'i düzenle ve localStorage verilerini ekle');
  console.log('3. Script\'i çalıştır: node scripts/export-json-files.js\n');
  
  // Örnek kullanım (localStorage verileri buraya yapıştırılmalı)
  const exampleData = {
    // Browser console'dan kopyalanan veriler buraya yapıştırılacak
  };
  
  if (Object.keys(exampleData).length > 0) {
    exportFromLocalStorageData(exampleData);
  } else {
    console.log('⚠️  Önce browser console\'dan localStorage verilerini kopyalayın ve script\'e ekleyin.');
  }
}

module.exports = { exportFromLocalStorageData, JSONS_DIR };

