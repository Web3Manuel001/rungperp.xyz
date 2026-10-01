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

    // 1. Initialize TradingView Chart with Dark Obsidian styling
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

    // 2. Add Candlestick Series (Supports both v5 and v4 API)
    let candleSeries;
    if (typeof chart.addSeries === "function" && CandlestickSeries) {
      candleSeries = chart.addSeries(CandlestickSeries, seriesOptions);
    } else if (typeof chart.addCandlestickSeries === "function") {
      candleSeries = chart.addCandlestickSeries(seriesOptions);
    }

    // 3. Generate initial mock SOL-PERP candlestick history
    const initialData: any[] = [];
    let baseTime = Math.floor(Date.now() / 1000) - (100 * 300);
    let currentPrice = 118.50;

    for (let i = 0; i < 100; i++) {
      const open = currentPrice;
      const variation = (Math.sin(i / 5) * 1.5) + ((Math.random() - 0.48) * 1.2);
      const close = Math.max(130, open + variation);
      const high = Math.max(open, close) + Math.random() * 0.8;
      const low = Math.min(open, close) - Math.random() * 0.8;

      initialData.push({
        time: baseTime + i * 300,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
      });
      currentPrice = close;
    }

    candleSeries.setData(initialData);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Handle auto-resizing
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
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // 4. Render Live Scale Rungs as Price Lines directly over the chart
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Clear existing price lines
    priceLinesRef.current.forEach((line) => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    // Draw a horizontal line for each active ladder rung
    rungs.forEach((rung, index) => {
      if (!candleSeriesRef.current) return;

      const priceLine = candleSeriesRef.current.createPriceLine({
        price: rung.price,
        color: "#10b981", // Emerald green for bids
        lineWidth: 1,
        lineStyle: 2, // Dashed
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
