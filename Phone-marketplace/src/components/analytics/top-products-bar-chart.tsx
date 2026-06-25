"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

type TopProductsBarChartProps = {
  data: Array<{ label: string; views: number }>
  loading?: boolean
  height?: number
}

export function TopProductsBarChart({
  data,
  loading,
  height = 280,
}: TopProductsBarChartProps) {
  if (loading) {
    return (
      <div
        className="bg-muted animate-pulse rounded"
        style={{ height: `${height}px` }}
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12 }}
          width={140}
        />
        <Tooltip
          formatter={(value) => {
            const v = typeof value === "number" ? value : Number(value) || 0
            return [v.toLocaleString("vi-VN"), "Lượt xem"] as [string, string]
          }}
        />
        <Bar dataKey="views" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}