import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { TradingViewChart } from './TradingViewChart';
import { Badge } from './ui/badge';
import { Building2, Landmark, Tag } from 'lucide-react';

interface StockChartModalProps {
    open: boolean;
    onClose: () => void;
    symbol: string;
    companyName: string;
    industry?: string;
    isin?: string;
    exchange?: string;
}

export function StockChartModal({
    open,
    onClose,
    symbol,
    companyName,
    industry,
    isin,
    exchange = 'NSE'
}: StockChartModalProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden flex flex-col border-slate-200">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-2 py-0.5">
                                    {exchange}:{symbol}
                                </Badge>
                                {isin && (
                                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                                        ISIN: {isin}
                                    </span>
                                )}
                            </div>
                            <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                                {companyName}
                            </DialogTitle>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {industry && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200">
                                    <Landmark className="w-3.5 h-3.5 text-slate-400" />
                                    {industry}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200">
                                <Tag className="w-3.5 h-3.5 text-slate-400" />
                                Equity
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 min-h-0 w-full bg-slate-900 border-t border-slate-100">
                    <TradingViewChart
                        symbol={symbol}
                        exchange={exchange}
                        theme="dark"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
