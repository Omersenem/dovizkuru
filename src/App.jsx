import { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';
import { getCurrencyRangeFromJSON } from './services/jsonReader';
import { calculateCurrencyReturn } from './services/calculator';
import InvestmentCard from './components/InvestmentCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getGoldApiRangeFromJSON } from './services/goldApiReader';
import { GOLD_API_SYMBOLS, updateGoldApiDataIfNeeded } from './services/api';

// Tüm dövizlerin tanımları
const CURRENCIES = [
  { code: 'TP.DK.USD.A', name: 'ABD DOLARI', icon: '💵', color: 'border-green-500' },
  { code: 'TP.DK.AUD.A', name: 'AVUSTRALYA DOLARI', icon: '🇦🇺', color: 'border-yellow-500' },
  { code: 'TP.DK.DKK.A', name: 'DANİMARKA KRONU', icon: '🇩🇰', color: 'border-red-500' },
  { code: 'TP.DK.EUR.A', name: 'EURO', icon: '💶', color: 'border-blue-500' },
  { code: 'TP.DK.GBP.A', name: 'İNGİLİZ STERLİNİ', icon: '💷', color: 'border-purple-500' },
  { code: 'TP.DK.CHF.A', name: 'İSVİÇRE FRANGI', icon: '🇨🇭', color: 'border-indigo-500' },
  { code: 'TP.DK.SEK.A', name: 'İSVEÇ KRONU', icon: '🇸🇪', color: 'border-yellow-400' },
  { code: 'TP.DK.CAD.A', name: 'KANADA DOLARI', icon: '🇨🇦', color: 'border-red-400' },
  { code: 'TP.DK.KWD.A', name: 'KUVEYT DİNARI', icon: '🇰🇼', color: 'border-green-400' },
  { code: 'TP.DK.NOK.A', name: 'NORVEÇ KRONU', icon: '🇳🇴', color: 'border-blue-400' },
  { code: 'TP.DK.SAR.A', name: 'SUUDİ ARABİSTAN RİYALİ', icon: '🇸🇦', color: 'border-green-300' },
  { code: 'TP.DK.JPY.A', name: 'JAPON YENİ', icon: '💴', color: 'border-red-300' },
  { code: 'TP.DK.BGN.A', name: 'BULGAR LEVASI', icon: '🇧🇬', color: 'border-green-600' },
  { code: 'TP.DK.RON.A', name: 'RUMEN LEYİ', icon: '🇷🇴', color: 'border-yellow-600' },
  { code: 'TP.DK.RUB.A', name: 'RUS RUBLESİ', icon: '🇷🇺', color: 'border-blue-600' },
  { code: 'TP.DK.IRR.A', name: 'İRAN RİYALİ', icon: '🇮🇷', color: 'border-green-700' },
  { code: 'TP.DK.CNY.A', name: 'ÇİN YUANI', icon: '💴', color: 'border-red-600' },
  { code: 'TP.DK.PKR.A', name: 'PAKİSTAN RUPİSİ', icon: '🇵🇰', color: 'border-green-500' },
  { code: 'TP.DK.QAR.A', name: 'KATAR RİYALİ', icon: '🇶🇦', color: 'border-purple-400' },
];

// Gold API varlıkları
const GOLD_API_ASSETS = [
  { code: 'XAU', name: 'Altın', icon: '🥇', color: 'border-yellow-500', symbol: GOLD_API_SYMBOLS.XAU },
  { code: 'XAG', name: 'Gümüş', icon: '🥈', color: 'border-gray-400', symbol: GOLD_API_SYMBOLS.XAG },
  { code: 'BTC', name: 'Bitcoin', icon: '₿', color: 'border-orange-500', symbol: GOLD_API_SYMBOLS.BTC },
  { code: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'border-blue-400', symbol: GOLD_API_SYMBOLS.ETH },
  { code: 'XPD', name: 'Paladyum', icon: '⚪', color: 'border-gray-500', symbol: GOLD_API_SYMBOLS.XPD },
  { code: 'HG', name: 'Bakır', icon: '🔶', color: 'border-orange-600', symbol: GOLD_API_SYMBOLS.HG },
];

function App() {
  const [startDate, setStartDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 1)));
  const [amount, setAmount] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState(new Set(['TP.DK.USD.A', 'TP.DK.EUR.A'])); // Varsayılan seçili
  const [selectedGoldAssets, setSelectedGoldAssets] = useState(new Set(['XAU', 'BTC'])); // Varsayılan seçili

  const calculateReturns = async () => {
    setLoading(true);
    try {
      console.log('Hesaplama başladı. StartDate:', startDate);
      
      // Gold API verilerini günde 1 defa güncelle (eğer gerekiyorsa)
      await updateGoldApiDataIfNeeded();
      
      // JSON dosyalarından veri oku (artık API'ye istek atmıyoruz)
      const currencyResults = [];
      
      for (let i = 0; i < CURRENCIES.length; i++) {
        const currency = CURRENCIES[i];
        console.log(`[${i + 1}/${CURRENCIES.length}] JSON'dan okunuyor: ${currency.code} (${currency.name})`);
        
        try {
          const range = await getCurrencyRangeFromJSON(currency.code, startDate);
          currencyResults.push({ currency, range });
          console.log(`[${i + 1}/${CURRENCIES.length}] JSON okuma tamamlandı: ${currency.code}`, range);
        } catch (error) {
          console.error(`[${i + 1}/${CURRENCIES.length}] JSON okuma hatası: ${currency.code}`, error);
          currencyResults.push({ currency, range: null });
        }
      }

      // Sadece başarılı sonuçları hesapla
      const calculatedResults = {};
      const chartDataArray = [];

      currencyResults.forEach(({ currency, range }) => {
        if (range && range.firstPrice !== null && range.firstPrice !== undefined && 
            range.lastPrice !== null && range.lastPrice !== undefined) {
          const firstPrice = parseFloat(range.firstPrice);
          const lastPrice = parseFloat(range.lastPrice);
          
          // NaN kontrolü
          if (!isNaN(firstPrice) && !isNaN(lastPrice) && firstPrice > 0 && lastPrice > 0) {
            const result = calculateCurrencyReturn(amount, firstPrice, lastPrice);
            
            // Sonuç kontrolü
            if (!isNaN(result.profit) && !isNaN(result.profitPercentage) && 
                !isNaN(result.endValue) && !isNaN(result.startValue)) {
              calculatedResults[currency.code] = result;
              chartDataArray.push({ 
                name: currency.name, 
                value: result.profitPercentage, 
                profit: result.profit,
                code: currency.code
              });
            }
          }
        }
      });

      console.log('Hesaplanan sonuçlar:', calculatedResults);

      // Gold API varlıkları için JSON'dan veri oku
      console.log('Gold API varlıkları için JSON\'dan veri okunuyor...');
      const goldApiResults = {};
      
      // USD kuru aralığını bir kez çek (tüm varlıklar için kullanılacak)
      const usdRange = await getCurrencyRangeFromJSON('TP.DK.USD.A', startDate);
      
      for (const asset of GOLD_API_ASSETS) {
        try {
          console.log(`Gold API JSON'dan okunuyor: ${asset.symbol} (${asset.name})`);
          const range = await getGoldApiRangeFromJSON(asset.symbol, startDate, usdRange);
          
          if (range && range.firstPrice !== null && range.firstPrice !== undefined && 
              range.lastPrice !== null && range.lastPrice !== undefined) {
            // Fiyatlar zaten TL cinsinden (getGoldApiRangeFromJSON içinde USD kuru ile çarpıldı)
            const startPriceInTRY = parseFloat(range.firstPrice);
            const endPriceInTRY = parseFloat(range.lastPrice);
            
            if (!isNaN(startPriceInTRY) && startPriceInTRY > 0 && 
                !isNaN(endPriceInTRY) && endPriceInTRY > 0) {
              const result = calculateCurrencyReturn(amount, startPriceInTRY, endPriceInTRY);
              
              if (!isNaN(result.profit) && !isNaN(result.profitPercentage) && 
                  !isNaN(result.endValue) && !isNaN(result.startValue)) {
                goldApiResults[asset.code] = result;
                chartDataArray.push({ 
                  name: asset.name, 
                  value: result.profitPercentage, 
                  profit: result.profit,
                  code: asset.code
                });
              }
            }
          }
        } catch (error) {
          console.error(`Gold API JSON okuma hatası (${asset.symbol}):`, error);
        }
      }

      // Tüm sonuçları birleştir
      const allResults = { ...calculatedResults, ...goldApiResults };

      // Eğer hiç sonuç yoksa uyarı göster
      if (Object.keys(allResults).length === 0) {
        alert('Veri alınamadı. Lütfen daha sonra tekrar deneyin.');
        setResults(null);
        setChartData([]);
        return;
      }

      setResults(allResults);
      setChartData(chartDataArray);
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      alert(`Hesaplama yapılırken bir hata oluştu: ${error.message}`);
      setResults(null);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    calculateReturns();
  };

  const toggleCurrency = (code) => {
    const newSelected = new Set(selectedCurrencies);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedCurrencies(newSelected);
  };

  const toggleGoldAsset = (code) => {
    const newSelected = new Set(selectedGoldAssets);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedGoldAssets(newSelected);
  };

  // En çok kazandıran dövizi bul
  const bestCurrency = useMemo(() => {
    if (!results || !chartData.length) return null;
    
    const currencyResults = chartData
      .filter(item => selectedCurrencies.has(item.code))
      .map(item => {
        const currency = CURRENCIES.find(c => c.code === item.code);
        return currency ? {
          ...item,
          ...results[item.code],
          currency
        } : null;
      })
      .filter(item => item !== null);
    
    const goldResults = chartData
      .filter(item => selectedGoldAssets.has(item.code))
      .map(item => {
        const asset = GOLD_API_ASSETS.find(a => a.code === item.code);
        return asset ? {
          ...item,
          ...results[item.code],
          currency: asset
        } : null;
      })
      .filter(item => item !== null);
    
    const allResults = [...currencyResults, ...goldResults];
    
    if (allResults.length === 0) return null;
    
    return allResults.reduce((prev, current) => 
      (prev.profitPercentage > current.profitPercentage) ? prev : current
    );
  }, [results, chartData, selectedCurrencies, selectedGoldAssets]);

  // Filtrelenmiş sonuçlar
  const filteredResults = useMemo(() => {
    if (!results) return {};
    
    const filtered = {};
    Array.from(selectedCurrencies).forEach(code => {
      if (results[code]) {
        filtered[code] = results[code];
      }
    });
    Array.from(selectedGoldAssets).forEach(code => {
      if (results[code]) {
        filtered[code] = results[code];
      }
    });
    return filtered;
  }, [results, selectedCurrencies, selectedGoldAssets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-3">
            💰 Yatırım Karşılaştırıcı
          </h1>
          <p className="text-xl text-gray-600">
            Paranızı farklı yatırım araçlarına yatırmış olsaydınız ne kadar kar ederdiniz?
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                dateFormat="dd/MM/yyyy"
                maxDate={new Date()}
                minDate={new Date('1990-01-01')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                wrapperClassName="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yatırım Miktarı (₺)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                placeholder="Örn: 10000"
              />
            </div>

            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Hesaplanıyor...
                </span>
              ) : (
                'Hesapla'
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-8">
            {/* Multi-Select Filter */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Döviz Filtreleme</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {CURRENCIES.map(currency => {
                  const isSelected = selectedCurrencies.has(currency.code);
                  const hasData = results[currency.code] !== undefined;
                  
                  return (
                    <label
                      key={currency.code}
                      className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!hasData ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCurrency(currency.code)}
                        disabled={!hasData}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {currency.icon} {currency.name.split(' ')[0]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Gold API Assets Filter */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">💎 Değerli Madenler & Kripto Filtreleme</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {GOLD_API_ASSETS.map(asset => {
                  const isSelected = selectedGoldAssets.has(asset.code);
                  const hasData = results[asset.code] !== undefined;
                  
                  return (
                    <label
                      key={asset.code}
                      className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!hasData ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGoldAsset(asset.code)}
                        disabled={!hasData}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {asset.icon} {asset.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* En Çok Kazandıran (Best Investment) - Üstte */}
            {bestCurrency && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">🏆 En İyi Yatırım Seçeneği</h2>
                <div className="text-lg">
                  <p className="mb-2">
                    <span className="text-3xl mr-2">{bestCurrency.currency.icon}</span>
                    <span className="font-bold">{bestCurrency.currency.name}</span>
                  </p>
                  <p>
                    {bestCurrency.profit >= 0 ? 'Kar:' : 'Zarar:'} 
                    <span className="font-bold text-2xl ml-2">
                      {bestCurrency.profit.toLocaleString('tr-TR', { 
                        style: 'currency', 
                        currency: 'TRY',
                        minimumFractionDigits: 2 
                      })}
                    </span>
                    <span className="ml-2">
                      ({bestCurrency.profitPercentage >= 0 ? '+' : ''}{bestCurrency.profitPercentage.toFixed(2)}%)
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Investment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(filteredResults).map(([code, result]) => {
                const currency = CURRENCIES.find(c => c.code === code);
                const goldAsset = GOLD_API_ASSETS.find(a => a.code === code);
                const asset = currency || goldAsset;
                
                if (!asset) return null;
                
                return (
                  <InvestmentCard
                    key={code}
                    title={asset.name}
                    icon={asset.icon}
                    result={result}
                    color={asset.color}
                  />
                );
              })}
            </div>

            {/* Chart Section */}
            {chartData.filter(item => selectedCurrencies.has(item.code) || selectedGoldAssets.has(item.code)).length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  Kar/Zarar Karşılaştırması
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData.filter(item => selectedCurrencies.has(item.code) || selectedGoldAssets.has(item.code))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Kar/Zarar (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value.toFixed(2)}%`,
                        'Yüzde'
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      dot={{ r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-600">
        <p>⚠️ Bu hesaplamalar yaklaşık değerlerdir. Gerçek yatırım kararları için profesyonel danışmanlık alın.</p>
      </footer>
    </div>
  );
}

export default App;
