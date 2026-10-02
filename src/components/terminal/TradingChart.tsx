"use client";

import React, { useEffect, useRef } from "react";
import * as LightweightCharts from "lightweight-charts";
import { GeneratedRung } from "@/domain/scale/generator";

interface TradingChartProps {
  rungs: GeneratedRung[];
}

export default function TradingChart({ rungs }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const priceLinesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const { createChart, ColorType, CandlestickSeries } = LightweightCharts as any;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0c" },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { color: "#18181b" },
        horzLines: { color: "#18181b" },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "#3f3f46", width: 1, style: 2 },
        horzLine: { color: "#3f3f46", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#27272a",
        autoScale: true,
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    const seriesOptions = {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    };

    let candleSeries: any;
    if (typeof chart.addSeries === "function" && CandlestickSeries) {
      candleSeries = chart.addSeries(CandlestickSeries, seriesOptions);
    } else if (typeof chart.addCandlestickSeries === "function") {
      candleSeries = chart.addCandlestickSeries(seriesOptions);
    }

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // 2. Fetch Real Historical SOL 15m Candles (Public REST - $0 Cost)
    async function loadRealCandles() {
      try {
        const res = await fetch("https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=15m&limit=100");
        const raw = await res.json();
        const formatted = raw.map((k: any) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
        }));
        candleSeries.setData(formatted);
      } catch (err) {
        console.warn("Falling back to internal price stream:", err);
      }
    }

    loadRealCandles();

    // 3. Connect Live Real-Time WebSocket for Live Price Ticks ($0 Cost)
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/solusdt@kline_15m");
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.k) {
          const k = message.k;
          candleSeries.update({
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
          });
        }
      } catch (e) {}
    };

    // Auto resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      ws.close();
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // 4. Render Live Scale Rungs as Price Lines over Real Candles
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    priceLinesRef.current.forEach((line) => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    rungs.forEach((rung, index) => {
      if (!candleSeriesRef.current) return;

      const priceLine = candleSeriesRef.current.createPriceLine({
        price: rung.price,
        color: "#10b981",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `Rung #${index + 1} (${rung.size} SOL)`,
      });

      priceLinesRef.current.push(priceLine);
    });
  }, [rungs]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
