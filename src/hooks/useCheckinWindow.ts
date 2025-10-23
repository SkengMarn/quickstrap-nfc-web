import { useState, useEffect } from 'react'

export interface CheckinWindow {
  enabled: boolean
  start_time: string | null
  end_time: string | null
}

export interface UseCheckinWindowReturn {
  isWithinWindow: boolean
  windowStatus: 'before' | 'during' | 'after' | 'disabled'
  timeUntilStart: number | null
  timeUntilEnd: number | null
}

export const useCheckinWindow = (checkinWindow?: CheckinWindow): UseCheckinWindowReturn => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

  if (!checkinWindow || !checkinWindow.enabled) {
    return {
      isWithinWindow: true,
      windowStatus: 'disabled',
      timeUntilStart: null,
      timeUntilEnd: null
    }
  }

  const startTime = checkinWindow.start_time ? new Date(checkinWindow.start_time) : null
  const endTime = checkinWindow.end_time ? new Date(checkinWindow.end_time) : null

  let windowStatus: 'before' | 'during' | 'after' | 'disabled' = 'during'
  let isWithinWindow = true
  let timeUntilStart: number | null = null
  let timeUntilEnd: number | null = null

  if (startTime && currentTime < startTime) {
    windowStatus = 'before'
    isWithinWindow = false
    timeUntilStart = startTime.getTime() - currentTime.getTime()
  } else if (endTime && currentTime > endTime) {
    windowStatus = 'after'
    isWithinWindow = false
  } else {
    windowStatus = 'during'
    isWithinWindow = true
    if (endTime) {
      timeUntilEnd = endTime.getTime() - currentTime.getTime()
    }
  }

  return {
    isWithinWindow,
    windowStatus,
    timeUntilStart,
    timeUntilEnd
  }
}

export default useCheckinWindow
