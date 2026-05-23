import { NextResponse } from "next/server"

const PROVINCES_API_BASE = "https://provinces.open-api.vn/api/v2"

const CACHE_DURATION = 60 * 60 * 24

interface CacheEntry {
  data: unknown
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry>()

function getCached(key: string): unknown | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_DURATION * 1000) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: unknown) {
  memoryCache.set(key, { data, timestamp: Date.now() })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "provinces"
  const provinceCode = searchParams.get("provinceCode")
  const districtCode = searchParams.get("districtCode")
  const q = searchParams.get("q") || ""
  const page = searchParams.get("page") || "1"
  const limit = searchParams.get("limit") || "100"

  console.log(`[VietnamAddress] type=${type}, provinceCode=${provinceCode}, districtCode=${districtCode}`)

  try {
    // === PROVINCES ===
    if (type === "provinces") {
      const cacheKey = `provinces_${limit}_${page}`
      const cached = getCached(cacheKey)
      if (cached) {
        console.log(`[VietnamAddress] PROVINCES - cache hit, count=${(cached as unknown[]).length}`)
        return NextResponse.json(cached)
      }

      const url = `${PROVINCES_API_BASE}/?page=${page}&limit=${limit}`
      console.log(`[VietnamAddress] PROVINCES - fetching: ${url}`)
      const res = await fetch(url, { next: { revalidate: CACHE_DURATION } })

      console.log(`[VietnamAddress] PROVINCES - status=${res.status}, ok=${res.ok}`)
      if (!res.ok) {
        const text = await res.text()
        console.error(`[VietnamAddress] PROVINCES - error response: ${text}`)
        return NextResponse.json({ error: "Khong lay duoc danh sach tinh thanh", status: res.status, body: text }, { status: 502 })
      }

      const data = await res.json()
      console.log(`[VietnamAddress] PROVINCES - raw response type: ${typeof data}, isArray=${Array.isArray(data)}, keys=${Object.keys(data || {})}`)
      if (Array.isArray(data)) {
        console.log(`[VietnamAddress] PROVINCES - array length=${data.length}, sample=${JSON.stringify(data[0])}`)
      } else {
        console.log(`[VietnamAddress] PROVINCES - object keys: ${Object.keys(data)}, values sample: ${JSON.stringify(data)}`)
      }

      const results = Array.isArray(data) ? data : data.results || data
      setCache(cacheKey, results)
      console.log(`[VietnamAddress] PROVINCES - returning ${Array.isArray(results) ? results.length : "?"} items`)
      return NextResponse.json(results)
    }

    // === DISTRICTS ===
    if (type === "districts") {
      if (!provinceCode) return NextResponse.json({ error: "Thieu provinceCode" }, { status: 400 })
      const cacheKey = `districts_${provinceCode}`
      const cached = getCached(cacheKey)
      if (cached) {
        console.log(`[VietnamAddress] DISTRICTS - cache hit for province ${provinceCode}, count=${(cached as unknown[]).length}`)
        return NextResponse.json(cached)
      }

      const url = `${PROVINCES_API_BASE}/p/${provinceCode}?depth=2`
      console.log(`[VietnamAddress] DISTRICTS - fetching: ${url}`)
      const res = await fetch(url, { next: { revalidate: CACHE_DURATION } })

      console.log(`[VietnamAddress] DISTRICTS - status=${res.status}, ok=${res.ok}`)
      if (!res.ok) {
        const text = await res.text()
        console.error(`[VietnamAddress] DISTRICTS - error response: ${text}`)
        return NextResponse.json({ error: "Khong lay duoc danh sach quan huyen", status: res.status, body: text }, { status: 502 })
      }

      const data = await res.json()
      console.log(`[VietnamAddress] DISTRICTS - raw response type: ${typeof data}, keys=${Object.keys(data || {})}`)
      if (!Array.isArray(data)) {
        console.log(`[VietnamAddress] DISTRICTS - full data: ${JSON.stringify(data)}`)
      }
      const districts = Array.isArray(data) ? data : (data.districts || [])
      console.log(`[VietnamAddress] DISTRICTS - returning ${districts.length} districts, sample=${JSON.stringify(districts[0])}`)
      setCache(cacheKey, districts)
      return NextResponse.json(districts)
    }

    // === WARDS ===
    if (type === "wards") {
      if (!districtCode) {
        // Lay tat ca wards cua 1 tinh (flatten tu nested districts)
        if (!provinceCode) return NextResponse.json({ error: "Thieu provinceCode" }, { status: 400 })
        const cacheKey = `wards_flat_${provinceCode}`
        const cached = getCached(cacheKey)
        if (cached) {
          console.log(`[VietnamAddress] WARDS - cache hit, count=${(cached as unknown[]).length}`)
          return NextResponse.json(cached)
        }

        const url = `${PROVINCES_API_BASE}/p/${provinceCode}?depth=2`
        console.log(`[VietnamAddress] WARDS - fetching: ${url}`)
        const res = await fetch(url, { next: { revalidate: CACHE_DURATION } })

        console.log(`[VietnamAddress] WARDS - status=${res.status}, ok=${res.ok}`)
        if (!res.ok) {
          const text = await res.text()
          console.error(`[VietnamAddress] WARDS - error response: ${text}`)
          return NextResponse.json({ error: "Khong lay duoc danh sach phuong xa", status: res.status, body: text }, { status: 502 })
        }

        const data = await res.json()
        console.log(`[VietnamAddress] WARDS - raw data keys: ${Object.keys(data || {})}, type=${typeof data}`)
        if (!Array.isArray(data)) {
          console.log(`[VietnamAddress] WARDS - full response (truncated): ${JSON.stringify(data).slice(0, 500)}`)
        }

        let allWards: unknown[] = []
        if (Array.isArray(data)) {
          allWards = data
        } else if (Array.isArray(data.wards)) {
          // API v2 tra ve wards truc tiep trong province object (khong qua districts)
          allWards = data.wards
          console.log(`[VietnamAddress] WARDS - extracted from data.wards, count=${allWards.length}`)
        } else if (Array.isArray(data.districts)) {
          // Phong xa cu, wards nam trong districts
          const districts: Array<{ wards?: unknown[] }> = data.districts
          allWards = districts.flatMap(d => d.wards || [])
          console.log(`[VietnamAddress] WARDS - flattened from districts, total wards=${allWards.length}`)
        } else {
          console.log(`[VietnamAddress] WARDS - no wards found, data.wards=${JSON.stringify(data.wards)}, data.districts=${JSON.stringify(data.districts)}`)
        }

        setCache(cacheKey, allWards)
        // Sort: Phường first, then Xã/Thị trấn, alphabetically within each group (Vietnamese locale)
        const sortedWards = [...allWards].sort((a, b) => {
          const wardA = a as { name?: string; division_type?: string }
          const wardB = b as { name?: string; division_type?: string }
          const typeA = wardA.division_type || ""
          const typeB = wardB.division_type || ""
          const nameA = wardA.name || ""
          const nameB = wardB.name || ""

          const isPhuongA = typeA === "phường"
          const isPhuongB = typeB === "phường"

          if (isPhuongA && !isPhuongB) return -1
          if (!isPhuongA && isPhuongB) return 1
          return nameA.localeCompare(nameB, "vi")
        })
        console.log(`[VietnamAddress] WARDS - returning ${sortedWards.length} wards (Phường first), sample=${JSON.stringify(sortedWards[0])}`)
        return NextResponse.json(sortedWards)
      }

      // Lay wards theo districtCode (filter tu province's districts list)
      if (!provinceCode) return NextResponse.json({ error: "Thieu provinceCode khi truyen districtCode" }, { status: 400 })

      const cacheKey = `wards_d_${provinceCode}_${districtCode}`
      const cached = getCached(cacheKey)
      if (cached) return NextResponse.json(cached)

      const url = `${PROVINCES_API_BASE}/p/${provinceCode}?depth=2`
      console.log(`[VietnamAddress] WARDS_BY_D - fetching: ${url}`)
      const res = await fetch(url, { next: { revalidate: CACHE_DURATION } })

      if (!res.ok) {
        const text = await res.text()
        console.error(`[VietnamAddress] WARDS_BY_D - error: ${text}`)
        return NextResponse.json({ error: "Khong lay duoc danh sach phuong xa", status: res.status, body: text }, { status: 502 })
      }

      const data = await res.json()
      const districts: Array<{ code: string; wards?: unknown[] }> = data.districts || []
      const district = districts.find(d => d.code.toString() === districtCode.toString())
      console.log(`[VietnamAddress] WARDS_BY_D - found district ${districtCode}: ${!!district}, wards in district=${district?.wards?.length || 0}`)
      const wards = district?.wards || []
      setCache(cacheKey, wards)
      return NextResponse.json(wards)
    }

    // === SEARCH ===
    if (type === "search") {
      if (q.length < 2) return NextResponse.json({ error: "Tu khoa phai it nhat 2 ky tu" }, { status: 400 })
      const cacheKey = `search_${q}`
      const cached = getCached(cacheKey)
      if (cached) return NextResponse.json(cached)

      const url = `${PROVINCES_API_BASE}/w/search/?q=${encodeURIComponent(q)}`
      console.log(`[VietnamAddress] SEARCH - fetching: ${url}`)
      const res = await fetch(url, { next: { revalidate: CACHE_DURATION } })

      console.log(`[VietnamAddress] SEARCH - status=${res.status}`)
      if (!res.ok) {
        const text = await res.text()
        console.error(`[VietnamAddress] SEARCH - error: ${text}`)
        return NextResponse.json({ error: "Loi tim kiem", body: text }, { status: 502 })
      }
      const data = await res.json()
      const results = Array.isArray(data) ? data : data.results || []
      setCache(cacheKey, results)
      return NextResponse.json(results)
    }

    // === FULL (province + districts + wards) ===
    if (type === "full") {
      if (!provinceCode) return NextResponse.json({ error: "Thieu provinceCode" }, { status: 400 })
      const cacheKey = `full_${provinceCode}_${districtCode || "all"}`
      const cached = getCached(cacheKey)
      if (cached) return NextResponse.json(cached)

      const url = `${PROVINCES_API_BASE}/p/${provinceCode}?depth=2`
      console.log(`[VietnamAddress] FULL - fetching: ${url}`)
      const res = await fetch(url, { next: { revalidate: CACHE_DURATION } })

      if (!res.ok) {
        const text = await res.text()
        console.error(`[VietnamAddress] FULL - error: ${text}`)
        return NextResponse.json({ error: "Khong lay duoc du lieu", body: text }, { status: 502 })
      }
      const data = await res.json()
      console.log(`[VietnamAddress] FULL - keys: ${Object.keys(data || {})}`)
      setCache(cacheKey, data)
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: "Loai type khong hop le" }, { status: 400 })
  } catch (error) {
    console.error("[VietnamAddress] CATCH - error:", error)
    return NextResponse.json({ error: "Loi server", message: String(error) }, { status: 500 })
  }
}
