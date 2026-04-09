import React from 'react';
import { Shield, Home, Building2, Info } from 'lucide-react';

const RiskMethodology: React.FC = () => {
  return (
    <div className="absolute bottom-48 left-6 z-[1000] flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Risk Logic Header */}
      <div className="bg-emerald-950/40 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 w-64 shadow-2xl overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-emerald-50 text-sm font-semibold tracking-wide">RISK ENGINE LOGIC</h3>
            <p className="text-emerald-400/60 text-[10px] uppercase font-bold tracking-[0.1em]">Bifurcated Model v3.1</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Residential Logic */}
          <div className="relative pl-4 border-l border-emerald-500/10 hover:border-emerald-500/30 transition-colors py-1 group/item">
            <div className="flex items-center gap-2 mb-1">
              <Home className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-emerald-100">Residential & Apartments</span>
            </div>
            <p className="text-[11px] text-emerald-100/60 leading-relaxed font-light">
              Weighted by <span className="text-emerald-300 font-medium">Price-to-Income (P/I)</span>. 
              Risk escalates when hub affordability exceeds <span className="text-blue-400">12.0x</span> yearly earnings.
            </p>
          </div>

          {/* Commercial Logic */}
          <div className="relative pl-4 border-l border-emerald-500/10 hover:border-emerald-500/30 transition-colors py-1 group/item">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-emerald-100">Commercial & Office</span>
            </div>
            <p className="text-[11px] text-emerald-100/60 leading-relaxed font-light">
              Weighted by <span className="text-emerald-300 font-medium">Cap Rate Spreads</span> over 10Y G-Sec. 
              Spreads below <span className="text-purple-400">150 BPS</span> signal yield compression.
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-3 border-t border-emerald-500/10 flex items-center gap-2 opacity-60">
          <Info className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] text-emerald-300 uppercase tracking-widest font-bold">Dynamic Feedback Active</span>
        </div>
      </div>
    </div>
  );
};

export default RiskMethodology;
