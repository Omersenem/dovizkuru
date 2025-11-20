import React from 'react';

const InvestmentCard = ({ title, icon, result, color }) => {
  // NaN ve geçersiz değer kontrolü
  if (!result || 
      isNaN(result.profit) || 
      isNaN(result.profitPercentage) || 
      isNaN(result.startValue) || 
      isNaN(result.endValue)) {
    console.error('InvestmentCard: Geçersiz result data:', result);
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color} transition-all`}>
        <div className="text-red-600 font-semibold">
          {title} için geçersiz veri
        </div>
      </div>
    );
  }
  
  const isProfit = result.profit >= 0;
  
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color} transition-all hover:shadow-xl hover:scale-105`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`text-3xl ${color.replace('border-', 'text-')}`}>
            {icon}
          </div>
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Başlangıç Değeri:</span>
          <span className="font-semibold text-gray-800">
            {result.startValue.toLocaleString('tr-TR', { 
              style: 'currency', 
              currency: 'TRY',
              minimumFractionDigits: 2 
            })}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Güncel Değer:</span>
          <span className="font-semibold text-gray-800">
            {result.endValue.toLocaleString('tr-TR', { 
              style: 'currency', 
              currency: 'TRY',
              minimumFractionDigits: 2 
            })}
          </span>
        </div>
        
        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Kar/Zarar:</span>
            <span className={`text-lg font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              {isProfit ? '+' : ''}
              {result.profit.toLocaleString('tr-TR', { 
                style: 'currency', 
                currency: 'TRY',
                minimumFractionDigits: 2 
              })}
            </span>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-600">Yüzde:</span>
            <span className={`text-lg font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              {isProfit ? '+' : ''}
              {result.profitPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentCard;

