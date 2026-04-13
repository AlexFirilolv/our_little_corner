'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocket } from '../contexts/LocketContext'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, ArrowLeft, ArrowRight, Check, Move, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CalendarDays, Heart, User, MapPin, ImagePlus, Mail, AlertCircle } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  getYear,
  setYear,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import InviteLinkModal from './InviteLinkModal'
import type { PlaceSuggestion } from '@/lib/types'

const TOTAL_STEPS = 4


export default function LocketCreator() {
  const { user, updateProfile } = useAuth()
  const { createLocket, inviteUser } = useLocket()
  const router = useRouter()

  // Step state
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Profile
  const [nickname, setNickname] = useState(user?.displayName || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Locket Details
  const [locketName, setLocketName] = useState('Our Locket')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [exactDayUnknown, setExactDayUnknown] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarViewDate, setCalendarViewDate] = useState(new Date())
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [locationOrigin, setLocationOrigin] = useState('')
  const calendarRef = useRef<HTMLDivElement>(null)

  // Places autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Step 3: Cover Photo
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [coverPhotoPosition, setCoverPhotoPosition] = useState({ x: 50, y: 50 })
  const [coverPhotoZoom, setCoverPhotoZoom] = useState(100)
  const [coverPhotoDimensions, setCoverPhotoDimensions] = useState<{ width: number; height: number; isPortrait: boolean } | null>(null)
  const [isDraggingCover, setIsDraggingCover] = useState(false)
  const coverPhotoInputRef = useRef<HTMLInputElement>(null)
  const coverContainerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 50, posY: 50 })

  // Step 4: Invite
  const [partnerEmail, setPartnerEmail] = useState('')

  // Global state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  // Step navigation
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  // Format anniversary date for API
  const getFormattedAnniversaryDate = () => {
    if (!selectedDate) return undefined
    if (exactDayUnknown) {
      return format(selectedDate, 'yyyy-MM') + '-01'
    }
    return format(selectedDate, 'yyyy-MM-dd')
  }

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutsideCal = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
        setShowYearPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutsideCal)
    return () => document.removeEventListener('mousedown', handleClickOutsideCal)
  }, [])

  // Calendar year list
  const calendarYears = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)

  // Calendar grid
  const calendarDays = (() => {
    const monthStart = startOfMonth(calendarViewDate)
    const monthEnd = endOfMonth(calendarViewDate)
    const start = startOfWeek(monthStart)
    const end = endOfWeek(monthEnd)
    return eachDayOfInterval({ start, end })
  })()

  // Places autocomplete
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth')
      const token = await getCurrentUserToken()

      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ input })
      })

      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
        setShowSuggestions(data.suggestions?.length > 0)
        setSelectedIndex(-1)
      }
    } catch (error) {
      console.error('Autocomplete error:', error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [])

  const handleLocationChange = (value: string) => {
    setLocationOrigin(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  const selectSuggestion = (suggestion: PlaceSuggestion) => {
    const locationText = suggestion.description
      ? `${suggestion.name}, ${suggestion.description}`
      : suggestion.name
    setLocationOrigin(locationText)
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cover photo drag handlers
  const handleCoverMouseDown = (e: React.MouseEvent) => {
    if (!coverPhotoPreview) return
    e.preventDefault()
    setIsDraggingCover(true)
    dragStartRef.current = {
      x: e.clientX, y: e.clientY,
      posX: coverPhotoPosition.x, posY: coverPhotoPosition.y
    }
  }

  const handleCoverTouchStart = (e: React.TouchEvent) => {
    if (!coverPhotoPreview) return
    const touch = e.touches[0]
    setIsDraggingCover(true)
    dragStartRef.current = {
      x: touch.clientX, y: touch.clientY,
      posX: coverPhotoPosition.x, posY: coverPhotoPosition.y
    }
  }

  const getPanBounds = useCallback(() => {
    const zoomFactor = coverPhotoZoom / 100
    const basePan = 25
    const zoomPan = Math.max(0, (zoomFactor - 1) * 50)
    const maxPan = basePan + zoomPan
    return { min: 50 - maxPan, max: 50 + maxPan }
  }, [coverPhotoZoom])

  useEffect(() => {
    if (!isDraggingCover || !coverPhotoDimensions) return

    const bounds = getPanBounds()

    const handleMouseMove = (e: MouseEvent) => {
      const container = coverContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const zoomFactor = coverPhotoZoom / 100

      if (coverPhotoDimensions.isPortrait || zoomFactor > 1) {
        const deltaY = (e.clientY - dragStartRef.current.y) / rect.height * 100 / zoomFactor
        const newY = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posY - deltaY))

        if (zoomFactor > 1) {
          const deltaX = (e.clientX - dragStartRef.current.x) / rect.width * 100 / zoomFactor
          const newX = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posX - deltaX))
          setCoverPhotoPosition({ x: newX, y: newY })
        } else {
          setCoverPhotoPosition(prev => ({ x: 50, y: newY }))
        }
      } else {
        const deltaX = (e.clientX - dragStartRef.current.x) / rect.width * 100 / zoomFactor
        const newX = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posX - deltaX))
        setCoverPhotoPosition(prev => ({ x: newX, y: 50 }))
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const container = coverContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const zoomFactor = coverPhotoZoom / 100

      if (coverPhotoDimensions.isPortrait || zoomFactor > 1) {
        const deltaY = (touch.clientY - dragStartRef.current.y) / rect.height * 100 / zoomFactor
        const newY = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posY - deltaY))

        if (zoomFactor > 1) {
          const deltaX = (touch.clientX - dragStartRef.current.x) / rect.width * 100 / zoomFactor
          const newX = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posX - deltaX))
          setCoverPhotoPosition({ x: newX, y: newY })
        } else {
          setCoverPhotoPosition(prev => ({ x: 50, y: newY }))
        }
      } else {
        const deltaX = (touch.clientX - dragStartRef.current.x) / rect.width * 100 / zoomFactor
        const newX = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posX - deltaX))
        setCoverPhotoPosition(prev => ({ x: newX, y: 50 }))
      }
    }

    const handleEnd = () => setIsDraggingCover(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleEnd)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDraggingCover, coverPhotoDimensions, coverPhotoZoom, getPanBounds])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverPhotoFile(file)
      setCoverPhotoPosition({ x: 50, y: 50 })
      setCoverPhotoZoom(100)
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setCoverPhotoPreview(result)
        const img = new Image()
        img.onload = () => {
          const containerAspect = 16 / 9
          const imageAspect = img.width / img.height
          setCoverPhotoDimensions({
            width: img.width,
            height: img.height,
            isPortrait: imageAspect < containerAspect
          })
        }
        img.src = result
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileSize: file.size
        })
      })
      if (!res.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl } = await res.json()

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })
      if (!uploadRes.ok) throw new Error('Failed to upload file')
      return publicUrl
    } catch (error) {
      console.error('File upload failed:', error)
      return null
    }
  }

  const handleCloseModal = () => {
    setShowInviteModal(false)
    router.push('/')
  }

  const handleComplete = async (action: 'create' | 'skip' | 'link') => {
    setIsLoading(true)
    setError(null)

    try {
      let avatarUrl = user?.photoURL || null
      if (avatarFile) {
        avatarUrl = await uploadFile(avatarFile)
      }

      if (nickname !== user?.displayName || avatarUrl !== user?.photoURL) {
        await updateProfile({
          displayName: nickname || user?.displayName || 'User',
          photoURL: avatarUrl || undefined
        })
      }

      let coverPhotoUrl: string | undefined
      if (coverPhotoFile) {
        coverPhotoUrl = await uploadFile(coverPhotoFile) || undefined
      }

      const newLocket = await createLocket({
        name: locketName || 'Our Locket',
        admin_firebase_uid: user!.uid,
        anniversary_date: getFormattedAnniversaryDate(),
        cover_photo_url: coverPhotoUrl,
        location_origin: locationOrigin || undefined,
      })

      if (action === 'create' && partnerEmail) {
        await inviteUser({
          locket_id: newLocket.id,
          email: partnerEmail,
          invited_by_firebase_uid: user!.uid,
          role: 'admin'
        })
        router.push('/')
      } else if (action === 'link') {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const inviteUrl = `${origin}/invite/${newLocket.invite_code}`
        setInviteLink(inviteUrl)
        setShowInviteModal(true)
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Setup failed details:', err)
      const message = err instanceof Error ? err.message : 'Failed to create your locket. Please try again.'
      setError(`${message} (Please check console for details)`)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
              step < currentStep
                ? 'bg-secondary text-secondary-foreground'
                : step === currentStep
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-elevated'
                : 'bg-foreground/5 text-faint border border-border'
            }`}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < TOTAL_STEPS && (
            <div className={`w-8 h-0.5 mx-1 transition-all duration-200 ${step < currentStep ? 'bg-secondary' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-heading text-foreground mb-2">Let&apos;s start with you</h2>
        <p className="text-muted text-body-sm">How should we call you?</p>
      </div>

      <div className="mb-8 relative group cursor-pointer flex justify-center">
        <label htmlFor="avatar-upload" className="cursor-pointer">
          <div className="relative h-28 w-28 rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors duration-200 flex items-center justify-center bg-background overflow-hidden">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setAvatarPreview(null)}
              />
            ) : nickname ? (
              <span className="text-4xl font-display font-semibold text-faint group-hover:text-muted transition-colors select-none">
                {nickname.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-10 h-10 text-faint group-hover:text-muted transition-colors" />
            )}
            <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} ref={avatarInputRef} />
          </div>
        </label>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="absolute bottom-0 right-1/2 translate-x-[56px] translate-y-1 h-9 w-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-sm hover:brightness-110 transition-all border-2 border-elevated"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-faint">
          <User className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Your Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full bg-elevated border border-border rounded-md py-3 pl-12 pr-4 text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-body font-body"
        />
      </div>

      <Button onClick={nextStep} className="w-full mt-6 gap-2">
        Continue
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )

  const renderStep2 = () => (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-heading text-foreground mb-2">Tell us about your love</h2>
        <p className="text-muted text-body-sm">These details help personalize your experience</p>
      </div>

      <div className="space-y-4">
        {/* Locket Name */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-faint">
            <Heart className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Locket Name (e.g., Our Story)"
            value={locketName}
            onChange={(e) => setLocketName(e.target.value)}
            className="w-full bg-elevated border border-border rounded-md py-3 pl-12 pr-4 text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-body font-body"
          />
        </div>

        {/* Anniversary Date - Calendar Dropdown */}
        <div className="relative" ref={calendarRef}>
          <label className="text-muted text-body-sm flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4" />
            When did it start?
          </label>
          <button
            type="button"
            onClick={() => {
              setCalendarOpen(!calendarOpen)
              setShowYearPicker(false)
              if (selectedDate) setCalendarViewDate(selectedDate)
            }}
            className="w-full flex items-center gap-3 bg-elevated border border-border rounded-md py-3 px-4 text-left hover:border-border-emphasis focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            <CalendarDays className="w-4 h-4 text-faint flex-shrink-0" />
            <span className={selectedDate ? 'text-foreground text-body' : 'text-faint text-body'}>
              {selectedDate
                ? exactDayUnknown
                  ? format(selectedDate, 'MMMM yyyy')
                  : format(selectedDate, 'MMMM d, yyyy')
                : 'Select a date'}
            </span>
          </button>

          {/* Calendar Dropdown */}
          {calendarOpen && (
            <div className="absolute z-50 mt-2 w-full bg-elevated border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in">
              {showYearPicker ? (
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => setShowYearPicker(false)}
                    className="flex items-center gap-1 text-caption text-muted hover:text-foreground mb-2 transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" /> Back to calendar
                  </button>
                  <div className="grid grid-cols-4 gap-1 max-h-[240px] overflow-y-auto">
                    {calendarYears.map(y => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setCalendarViewDate(setYear(calendarViewDate, y))
                          setShowYearPicker(false)
                        }}
                        className={`py-2 rounded-lg text-body-sm transition-colors ${
                          getYear(calendarViewDate) === y
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'text-foreground hover:bg-foreground/5'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Month/Year header */}
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <button
                      type="button"
                      onClick={() => setCalendarViewDate(subMonths(calendarViewDate, 1))}
                      className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowYearPicker(true)}
                      className="text-body-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {format(calendarViewDate, 'MMMM yyyy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewDate(addMonths(calendarViewDate, 1))}
                      className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 px-3 pt-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                      <div key={d} className="text-center text-overline font-medium text-faint py-1">{d}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 px-3 pb-2">
                    {calendarDays.map((day, i) => {
                      const inMonth = isSameMonth(day, calendarViewDate)
                      const isSelected = selectedDate && isSameDay(day, selectedDate)
                      const isToday = isSameDay(day, new Date())
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!inMonth}
                          onClick={() => {
                            setSelectedDate(day)
                            if (!exactDayUnknown) setCalendarOpen(false)
                          }}
                          className={`h-9 w-full rounded-lg text-body-sm transition-colors ${
                            !inMonth
                              ? 'text-faint/30 cursor-default'
                              : isSelected
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : isToday
                                  ? 'text-accent font-medium hover:bg-foreground/5'
                                  : 'text-foreground hover:bg-foreground/5'
                          }`}
                        >
                          {format(day, 'd')}
                        </button>
                      )
                    })}
                  </div>

                  {/* "Don't know exact date" toggle */}
                  <div className="px-3 pb-3 pt-1 border-t border-border">
                    <label className="flex items-center gap-2 cursor-pointer group py-1.5">
                      <input
                        type="checkbox"
                        checked={exactDayUnknown}
                        onChange={(e) => {
                          setExactDayUnknown(e.target.checked)
                          if (e.target.checked && !selectedDate) {
                            setSelectedDate(startOfMonth(calendarViewDate))
                          }
                          if (e.target.checked) setCalendarOpen(false)
                        }}
                        className="w-4 h-4 rounded border-border bg-elevated text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <span className="text-muted text-caption group-hover:text-foreground transition-colors">
                        I don&apos;t know the exact date
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Location Origin with Autocomplete */}
        <div className="relative">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-faint">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              ref={locationInputRef}
              type="text"
              placeholder="Where did you meet?"
              value={locationOrigin}
              onChange={(e) => handleLocationChange(e.target.value)}
              onKeyDown={handleLocationKeyDown}
              onFocus={() => locationOrigin.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full bg-elevated border border-border rounded-md py-3 pl-12 pr-4 text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-body font-body"
            />
            {isLoadingSuggestions && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-faint animate-spin" />
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-elevated border border-border rounded-xl shadow-lg overflow-hidden"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-foreground/5 transition-colors flex items-start gap-3 ${
                    index === selectedIndex ? 'bg-foreground/5' : ''
                  }`}
                >
                  <MapPin className="w-4 h-4 text-faint mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-body-sm font-medium truncate">{suggestion.name}</p>
                    {suggestion.description && (
                      <p className="text-faint text-caption truncate">{suggestion.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={prevStep} size="icon">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button onClick={nextStep} className="flex-1 gap-2">
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <button type="button" onClick={nextStep} className="mt-4 w-full text-caption text-faint hover:text-muted transition-colors font-medium">
        Skip for now
      </button>
    </div>
  )

  const renderStep3 = () => (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-heading text-foreground mb-2">Set the vibe</h2>
        <p className="text-muted text-body-sm">Add a cover photo for your locket&apos;s dashboard</p>
      </div>

      {/* Cover Photo Upload with Drag to Reposition */}
      <div className="mb-6">
        <div
          ref={coverContainerRef}
          onClick={() => !coverPhotoPreview && coverPhotoInputRef.current?.click()}
          onMouseDown={coverPhotoPreview ? handleCoverMouseDown : undefined}
          onTouchStart={coverPhotoPreview ? handleCoverTouchStart : undefined}
          className={`relative w-full aspect-video rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden ${
            coverPhotoPreview
              ? 'border-accent/50 cursor-move'
              : 'border-border hover:border-primary/50 cursor-pointer'
          } bg-background flex items-center justify-center select-none`}
        >
          {coverPhotoPreview ? (
            <>
              <img
                src={coverPhotoPreview}
                alt="Cover preview"
                className="absolute max-w-none pointer-events-none transition-transform duration-75"
                style={coverPhotoDimensions?.isPortrait ? {
                  width: `${coverPhotoZoom}%`,
                  height: 'auto',
                  left: '50%',
                  top: `${coverPhotoPosition.y}%`,
                  transform: `translate(-50%, -${coverPhotoPosition.y}%)`
                } : {
                  width: 'auto',
                  height: `${coverPhotoZoom}%`,
                  top: '50%',
                  left: `${coverPhotoPosition.x}%`,
                  transform: `translate(-${coverPhotoPosition.x}%, -50%)`
                }}
                draggable={false}
              />
              <div className={`absolute inset-0 bg-foreground/30 flex flex-col items-center justify-center transition-opacity ${isDraggingCover ? 'opacity-0' : 'opacity-0 hover:opacity-100'}`}>
                <Move className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-body-sm font-medium">Drag to reposition</span>
              </div>
            </>
          ) : (
            <div className="text-center p-6">
              <ImagePlus className="w-12 h-12 text-faint mx-auto mb-2" />
              <p className="text-muted text-body-sm">Click to upload a cover photo</p>
              <p className="text-faint text-caption mt-1">This will appear as a hero on your dashboard</p>
            </div>
          )}
          <input
            type="file"
            id="cover-photo-upload"
            className="hidden"
            accept="image/*"
            onChange={handleCoverPhotoChange}
            ref={coverPhotoInputRef}
          />
        </div>

        {/* Zoom slider and change photo button when photo exists */}
        {coverPhotoPreview && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCoverPhotoZoom(prev => Math.max(100, prev - 10))}
                className="p-1.5 rounded-lg bg-elevated border border-border text-muted hover:text-foreground hover:border-border-emphasis transition-all"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="100"
                  max="200"
                  value={coverPhotoZoom}
                  onChange={(e) => setCoverPhotoZoom(Number(e.target.value))}
                  className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setCoverPhotoZoom(prev => Math.min(200, prev + 10))}
                className="p-1.5 rounded-lg bg-elevated border border-border text-muted hover:text-foreground hover:border-border-emphasis transition-all"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-faint text-caption w-12 text-right">{coverPhotoZoom}%</span>
            </div>

            <button
              type="button"
              onClick={() => coverPhotoInputRef.current?.click()}
              className="w-full text-body-sm text-primary hover:brightness-110 transition-colors font-medium"
            >
              Choose a different photo
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={prevStep} size="icon">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button onClick={nextStep} className="flex-1 gap-2">
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <button type="button" onClick={nextStep} className="mt-4 w-full text-caption text-faint hover:text-muted transition-colors font-medium">
        Skip for now
      </button>
    </div>
  )

  const renderStep4 = () => (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-heading text-foreground mb-2">Invite your partner</h2>
        <p className="text-muted text-body-sm">Every locket needs two hearts</p>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-faint">
          <Mail className="w-5 h-5" />
        </div>
        <input
          type="email"
          placeholder="Partner's Email"
          value={partnerEmail}
          onChange={(e) => setPartnerEmail(e.target.value)}
          className="w-full bg-elevated border border-border rounded-md py-3 pl-12 pr-4 text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-body font-body"
        />
      </div>

      <Button
        onClick={() => handleComplete('create')}
        disabled={isLoading}
        className="w-full mt-6 gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Create Locket
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => handleComplete('link')}
          disabled={isLoading}
          className="text-body-sm font-medium text-accent hover:brightness-110 transition-colors disabled:opacity-50"
        >
          Generate invite link instead
        </button>
        <button
          type="button"
          onClick={() => handleComplete('skip')}
          disabled={isLoading}
          className="text-caption text-faint hover:text-muted transition-colors font-medium disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      <button
        type="button"
        onClick={prevStep}
        disabled={isLoading}
        className="mt-4 w-full flex items-center justify-center gap-1 text-caption text-faint hover:text-muted transition-colors font-medium disabled:opacity-50"
      >
        <ArrowLeft className="w-3 h-3" />
        Back
      </button>
    </div>
  )

  return (
    <div className="bg-background font-body text-foreground antialiased overflow-hidden min-h-screen w-full relative">
      <div
        className="absolute inset-0 z-0 w-full h-full bg-cover bg-center opacity-20"
        style={{
          backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC9SOxeh7o9RmjZeAAN2jojATEE6Wp_0bKcBrSlpPb0jPzhuWEfzhCv1KZ7PpCTcLv6ebQTDOg-hX2ex6Uq0EAPyN8WNwz-7ZwSF6Hshab2zypHym4HRjmFhpOjb9sPDuly_swIFuTuBFlcHiSqyBNgTpvWMcbWPcgeTaDE89WWJ_mYvkYF8Hg5jsB1hQt_9hwIkPzKxoIpTQTVGqH_OR8-AWAKxpZY99aIg45xbUUGo0QGRXwyld3z9AxZ4TgX8x_mKlf3LHFK3ibl')",
          filter: 'blur(8px) saturate(0.5)'
        }}
      />
      <div className="absolute inset-0 z-0 bg-background/80" />

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="card-base w-full max-w-[480px] rounded-2xl p-8 md:p-10 flex flex-col items-center shadow-lg">
          <div className="mb-4 flex items-center justify-center">
            <span className="font-display text-display-xl text-primary leading-none">T</span>
          </div>

          {renderStepIndicator()}

          {error && (
            <div className="w-full mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-body-sm">{error}</p>
            </div>
          )}

          <form className="w-full" onSubmit={(e) => e.preventDefault()}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </form>
        </div>

        <div className="absolute bottom-6 text-faint/40 text-caption font-medium tracking-widest uppercase pointer-events-none">
          Twofold
        </div>
      </div>

      <InviteLinkModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        inviteLink={inviteLink}
        onClose={handleCloseModal}
      />
    </div>
  )
}
