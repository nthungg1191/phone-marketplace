"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

type ViewsChartProps = {
  data: Array<{ date: string; views: number; uniqueViewers: number }>
  loading?: boolean
  height?: number
}

function formatDateLabel(iso: string): string {
  // "2026-06-25" -> "25/06"
  const parts = iso.split("-")
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}`
}

export function ViewsChart({ data, loading, height = 280 }: ViewsChartProps) {
  if (loading) {
    return (
      <div
        className="bg-muted animate-pulse rounded"
        style={{ height: `${height}px` }}
      />
    )
  }

  const formatted = data.map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={formatted}
        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={(_label, payload) => {
            const point = payload?.[0]?.payload
            return point ? `Ngày ${point.date}` : ""
          }}
          formatter={(value, name) => {
            const v = typeof value === "number" ? value : Number(value) || 0
            return [
              v.toLocaleString("vi-VN"),
              name === "views" ? "Lượt xem" : "Unique viewer",
            ] as [string, string]
          }}
        />
        <Legend
          formatter={(value) =>
            value === "views" ? "Lượt xem" : "Unique viewer"
          }
        />
        <Line
          type="monotone"
          dataKey="views"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="uniqueViewers"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}