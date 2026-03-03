import React, { useEffect, useRef } from 'react';

// Declare the TradingView global object for TypeScript
declare global {
    interface Window {
        TradingView: any;
    }
}

interface TradingViewChartProps {
    symbol: string;
    exchange?: string;
    theme?: 'light' | 'dark';
    autosize?: boolean;
}

export function TradingViewChart({
    symbol,
    exchange = 'NSE',
    theme = 'dark',
    autosize = true
}: TradingViewChartProps) {
    const containerId = `tradingview_${Math.random().toString(36).substring(7)}`;
    const initialized = useRef(false);

    useEffect(() => {
        // Only initialize once
        if (initialized.current) return;

        // Check if TradingView script is loaded
        const initWidget = () => {
            if (window.TradingView) {
                new window.TradingView.widget({
                    "autosize": autosize,
                    "symbol": `${exchange}:${symbol}`,
                    "interval": "D",
                    "timezone": "Asia/Kolkata",
                    "theme": theme,
                    "style": "1",
                    "locale": "in",
                    "toolbar_bg": "#f1f3f6",
                    "enable_publishing": false,
                    "allow_symbol_change": true,
                    "container_id": containerId
                });
                initialized.current = true;
            } else {
                // Try again in 100ms if script not ready
                setTimeout(initWidget, 100);
            }
        };

        initWidget();

        return () => {
            // Cleanup? TradingView widget doesn't strictly have a destroy but we could empty container
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
            initialized.current = false;
        };
    }, [symbol, exchange, theme, autosize, containerId]);

    return (
        <div className="tradingview-widget-container h-full w-full">
            <div id={containerId} className="h-full w-full" />
        </div>
    );
}
