'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLocket } from '@/contexts/LocketContext'
import { ArrowLeft, Loader2, Camera, User, CalendarDays, MapPin, Edit3, Save, ZoomOut, ZoomIn, Move, LogOut, ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, getYear, setYear, addMonths, subMonths } from 'date-fns'

interface PlaceSuggestion {
    placeId: string
    name: string
    description: string
    fullText: string
}

export default function SettingsPage() {
    const router = useRouter()
    const { user, updateProfile, signOut } = useAuth()
    const { currentLocket, updateLocket } = useLocket()

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Profile State
    const [displayName, setDisplayName] = useState(user?.displayName || '')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    // Locket State
    const [locketName, setLocketName] = useState(currentLocket?.name || '')

    // Date State
    const [selectedDate, setSelectedDate] = useState<Date | null>(currentLocket?.anniversary_date ? new Date(currentLocket.anniversary_date) : null)
    const [exactDayUnknown, setExactDayUnknown] = useState(false)
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [calendarViewDate, setCalendarViewDate] = useState(selectedDate || new Date())
    const [showYearPicker, setShowYearPicker] = useState(false)
    const calendarRef = useRef<HTMLDivElement>(null)

    // Location State
    const [locationOrigin, setLocationOrigin] = useState(currentLocket?.location_origin || '')
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const locationInputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // Cover Photo State
    const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
    const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(currentLocket?.cover_photo_url || null)
    const [coverPhotoPosition, setCoverPhotoPosition] = useState({ x: 50, y: 50 })
    const [coverPhotoZoom, setCoverPhotoZoom] = useState(100)
    const [coverPhotoDimensions, setCoverPhotoDimensions] = useState<{ width: number; height: number; isPortrait: boolean } | null>(null)
    const [isDraggingCover, setIsDraggingCover] = useState(false)
    const coverPhotoInputRef = useRef<HTMLInputElement>(null)
    const coverContainerRef = useRef<HTMLDivElement>(null)
    const dragStartRef = useRef({ x: 0, y: 0, posX: 50, posY: 50 })

    useEffect(() => {
        if (currentLocket) {
            setLocketName(currentLocket.name)
            if (currentLocket.anniversary_date) {
                setSelectedDate(new Date(currentLocket.anniversary_date))
            }
            setLocationOrigin(currentLocket.location_origin || '')
            setCoverPhotoPreview(currentLocket.cover_photo_url || null)
        }
    }, [currentLocket])

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '')
            setAvatarPreview(user.photoURL || null)
        }
    }, [user])

    // Calendar Logic
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

    const calendarYears = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)
    const calendarDays = (() => {
        const monthStart = startOfMonth(calendarViewDate)
        const monthEnd = endOfMonth(calendarViewDate)
        const start = startOfWeek(monthStart)
        const end = endOfWeek(monthEnd)
        return eachDayOfInterval({ start, end })
    })()

    // Places Autocomplete
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
        const locationText = suggestion.description ? `${suggestion.name}, ${suggestion.description}` : suggestion.name
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

    // Cover Photo Drag Logic
    const handleCoverMouseDown = (e: React.MouseEvent) => {
        if (!coverPhotoPreview) return
        e.preventDefault()
        setIsDraggingCover(true)
        dragStartRef.current = { x: e.clientX, y: e.clientY, posX: coverPhotoPosition.x, posY: coverPhotoPosition.y }
    }

    const handleCoverTouchStart = (e: React.TouchEvent) => {
        if (!coverPhotoPreview) return
        const touch = e.touches[0]
        setIsDraggingCover(true)
        dragStartRef.current = { x: touch.clientX, y: touch.clientY, posX: coverPhotoPosition.x, posY: coverPhotoPosition.y }
    }

    const getPanBounds = useCallback(() => {
        const zoomFactor = coverPhotoZoom / 100
        const basePan = 25
        const zoomPan = Math.max(0, (zoomFactor - 1) * 50)
        const maxPan = basePan + zoomPan
        return { min: 50 - maxPan, max: 50 + maxPan }
    }, [coverPhotoZoom])

    useEffect(() => {
        if (!isDraggingCover || (!coverPhotoDimensions && !currentLocket?.cover_photo_url)) return

        const bounds = getPanBounds()

        const handleMouseMove = (e: MouseEvent) => {
            const container = coverContainerRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()
            const zoomFactor = coverPhotoZoom / 100

            const isPortrait = coverPhotoDimensions?.isPortrait ?? false;

            if (isPortrait || zoomFactor > 1) {
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
            const isPortrait = coverPhotoDimensions?.isPortrait ?? false;

            if (isPortrait || zoomFactor > 1) {
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

    // File Upload Logic
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
                body: JSON.stringify({ filename: file.name, fileType: file.type, fileSize: file.size })
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

    // Save Settings
    const handleSave = async () => {
        setIsLoading(true)
        setError(null)
        setSuccessMsg(null)

        try {
            // 1. Profile Update
            let avatarUrl = user?.photoURL || null
            if (avatarFile) {
                avatarUrl = await uploadFile(avatarFile)
            }
            if (displayName !== user?.displayName || avatarUrl !== user?.photoURL) {
                await updateProfile({
                    displayName: displayName || user?.displayName || 'User',
                    photoURL: avatarUrl || undefined
                })
            }

            // 2. Locket Update
            if (currentLocket) {
                let coverPhotoUrl = currentLocket.cover_photo_url
                if (coverPhotoFile) {
                    const newUrl = await uploadFile(coverPhotoFile)
                    if (newUrl) coverPhotoUrl = newUrl
                }

                let formattedDate: any = currentLocket.anniversary_date
                if (selectedDate) {
                    if (exactDayUnknown) {
                        formattedDate = format(selectedDate, 'yyyy-MM') + '-01'
                    } else {
                        formattedDate = format(selectedDate, 'yyyy-MM-dd')
                    }
                }

                await updateLocket(currentLocket.id, {
                    name: locketName,
                    anniversary_date: formattedDate,
                    cover_photo_url: coverPhotoUrl,
                    location_origin: locationOrigin
                })
            }

            setSuccessMsg('Settings updated successfully!')
            setTimeout(() => setSuccessMsg(null), 3000)
        } catch (err) {
            console.error('Save settings failed:', err)
            setError(err instanceof Error ? err.message : 'Failed to save settings.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await signOut()
            router.push('/login')
        } catch (err) {
            console.error('Failed to log out', err)
        }
    }

    return (
        <div className="min-h-screen bg-[#221016] font-display text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#221016]/80 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white/70" />
                </button>
                <h1 className="font-heading text-xl font-bold">Settings</h1>
                <div className="w-9" /> {/* Spacer */}
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">

                {/* Error / Success Messages */}
                {error && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 flex items-center gap-3 text-red-300">
                        <span className="material-symbols-outlined text-xl flex-shrink-0">error</span>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                {successMsg && (
                    <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 flex items-center gap-3 text-green-300">
                        <span className="material-symbols-outlined text-xl flex-shrink-0">check_circle</span>
                        <p className="text-sm">{successMsg}</p>
                    </div>
                )}

                {/* Section: Profile */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                        <User className="w-5 h-5 text-[#C8A659]" />
                        <h2 className="text-lg font-bold text-white/90">Your Profile</h2>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="relative group cursor-pointer flex-shrink-0">
                            <label htmlFor="settings-avatar-upload" className="cursor-pointer">
                                <div className="relative h-24 w-24 rounded-full border border-white/20 hover:border-[#C8A659]/50 transition-colors duration-300 flex items-center justify-center bg-[#331922] overflow-hidden">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : displayName ? (
                                        <span className="text-3xl font-bold text-white/40">{displayName.charAt(0).toUpperCase()}</span>
                                    ) : (
                                        <User className="w-8 h-8 text-white/20" />
                                    )}
                                </div>
                            </label>
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#331922] border border-white/20 text-white flex items-center justify-center hover:bg-[#4a2431] transition-colors shadow-lg"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input type="file" id="settings-avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} ref={avatarInputRef} />
                        </div>

                        <div className="flex-1 w-full space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-white/60 pl-1">Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full bg-[#331922] border border-white/10 rounded-lg py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:border-[#C8A659] transition-colors"
                                    placeholder="Your Name"
                                />
                            </div>
                            <div className="space-y-1 opacity-60">
                                <label className="text-sm text-white/60 pl-1">Email</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full bg-[#2a161e] border border-transparent rounded-lg py-3 px-4 text-white cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Locket Details */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                        <Heart className="w-5 h-5 text-[#C8A659]" />
                        <h2 className="text-lg font-bold text-white/90">Locket Details</h2>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm text-white/60 pl-1">Locket Name</label>
                            <input
                                type="text"
                                value={locketName}
                                onChange={(e) => setLocketName(e.target.value)}
                                className="w-full bg-[#331922] border border-white/10 rounded-lg py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:border-[#C8A659] transition-colors"
                                placeholder="e.g. Our Story"
                            />
                        </div>

                        {/* Anniversary Date */}
                        <div className="relative" ref={calendarRef}>
                            <label className="text-sm text-white/60 pl-1 mb-1 block">Anniversary / Start Date</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setCalendarOpen(!calendarOpen)
                                    setShowYearPicker(false)
                                    if (selectedDate) setCalendarViewDate(selectedDate)
                                }}
                                className="w-full flex items-center justify-between bg-[#331922] border border-white/10 rounded-lg py-3 px-4 text-left hover:border-white/20 focus:border-[#C8A659] focus:outline-none transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="w-4 h-4 text-white/40" />
                                    <span className={selectedDate ? 'text-white' : 'text-white/30'}>
                                        {selectedDate
                                            ? exactDayUnknown
                                                ? format(selectedDate, 'MMMM yyyy')
                                                : format(selectedDate, 'MMMM d, yyyy')
                                            : 'Select a date'}
                                    </span>
                                </div>
                                <Edit3 className="w-4 h-4 text-white/20" />
                            </button>

                            {/* Calendar Dropdown */}
                            {calendarOpen && (
                                <div className="absolute z-50 mt-2 w-full sm:w-80 right-0 bg-[#2a161e] border border-[#673244] rounded-xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-2">
                                    {showYearPicker ? (
                                        <div>
                                            <button type="button" onClick={() => setShowYearPicker(false)} className="flex items-center gap-1 text-xs text-white/60 hover:text-white mb-2 pb-2 border-b border-white/5 w-full">
                                                <ChevronLeft className="w-3 h-3" /> Back to calendar
                                            </button>
                                            <div className="grid grid-cols-4 gap-1 max-h-[240px] overflow-y-auto pr-1">
                                                {calendarYears.map(y => (
                                                    <button
                                                        key={y}
                                                        type="button"
                                                        onClick={() => {
                                                            setCalendarViewDate(setYear(calendarViewDate, y))
                                                            setShowYearPicker(false)
                                                        }}
                                                        className={`py-2 rounded-lg text-sm transition-colors ${getYear(calendarViewDate) === y ? 'bg-primary text-white font-bold' : 'text-white/70 hover:bg-white/10'}`}
                                                    >
                                                        {y}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                                <button type="button" onClick={() => setCalendarViewDate(subMonths(calendarViewDate, 1))} className="p-1 rounded-lg hover:bg-white/10 text-white/60">
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => setShowYearPicker(true)} className="text-sm font-bold text-white hover:text-[#C8A659]">
                                                    {format(calendarViewDate, 'MMMM yyyy')}
                                                </button>
                                                <button type="button" onClick={() => setCalendarViewDate(addMonths(calendarViewDate, 1))} className="p-1 rounded-lg hover:bg-white/10 text-white/60">
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-7 pt-2">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                                    <div key={d} className="text-center text-[10px] font-medium text-white/30 py-1">{d}</div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-7 pb-2 gap-1">
                                                {calendarDays.map((day, i) => {
                                                    const inMonth = isSameMonth(day, calendarViewDate)
                                                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            disabled={!inMonth}
                                                            onClick={() => { setSelectedDate(day); if (!exactDayUnknown) setCalendarOpen(false) }}
                                                            className={`h-8 w-full rounded-md text-sm transition-colors ${!inMonth ? 'text-white/10' : isSelected ? 'bg-primary text-white font-bold' : 'text-white/70 hover:bg-white/10'}`}
                                                        >
                                                            {format(day, 'd')}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Location */}
                        <div className="relative">
                            <label className="text-sm text-white/60 pl-1 mb-1 block">Where did you meet?</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <input
                                    ref={locationInputRef}
                                    type="text"
                                    value={locationOrigin}
                                    onChange={(e) => handleLocationChange(e.target.value)}
                                    onKeyDown={handleLocationKeyDown}
                                    onFocus={() => locationOrigin.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                                    className="w-full bg-[#331922] border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-[#C8A659] transition-colors"
                                    placeholder="Search for a place..."
                                />
                                {isLoadingSuggestions && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {showSuggestions && suggestions.length > 0 && (
                                <div ref={suggestionsRef} className="absolute z-50 w-full mt-1 bg-[#2a161e] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                                    {suggestions.map((suggestion, index) => (
                                        <button
                                            key={suggestion.placeId}
                                            type="button"
                                            onClick={() => selectSuggestion(suggestion)}
                                            className={`w-full px-4 py-3 text-left hover:bg-[#331922] transition-colors flex items-start gap-3 ${index === selectedIndex ? 'bg-[#331922]' : ''}`}
                                        >
                                            <MapPin className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium truncate">{suggestion.name}</p>
                                                {suggestion.description && <p className="text-xs text-white/40 truncate">{suggestion.description}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cover Photo */}
                        <div className="space-y-2">
                            <label className="text-sm text-white/60 pl-1">Dashboard Cover Photo</label>
                            <div
                                ref={coverContainerRef}
                                onClick={() => !coverPhotoPreview && coverPhotoInputRef.current?.click()}
                                onMouseDown={coverPhotoPreview ? handleCoverMouseDown : undefined}
                                onTouchStart={coverPhotoPreview ? handleCoverTouchStart : undefined}
                                className={`relative w-full aspect-video rounded-xl border border-white/10 overflow-hidden bg-[#2a161e] flex items-center justify-center select-none ${coverPhotoPreview ? 'cursor-move' : 'cursor-pointer hover:border-white/20'}`}
                            >
                                {coverPhotoPreview ? (
                                    <>
                                        <img
                                            src={coverPhotoPreview}
                                            alt="Cover"
                                            className="absolute max-w-none pointer-events-none transition-transform duration-75"
                                            style={coverPhotoDimensions?.isPortrait ? {
                                                width: `${coverPhotoZoom}%`, height: 'auto', left: '50%', top: `${coverPhotoPosition.y}%`, transform: `translate(-50%, -${coverPhotoPosition.y}%)`
                                            } : {
                                                width: 'auto', height: `${coverPhotoZoom}%`, top: '50%', left: `${coverPhotoPosition.x}%`, transform: `translate(-${coverPhotoPosition.x}%, -50%)`
                                            }}
                                            draggable={false}
                                            onError={(e) => {
                                                console.error("Image failed to load:", e);
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center transition-opacity ${isDraggingCover ? 'opacity-0' : 'opacity-0 hover:opacity-100'}`}>
                                            <Move className="w-8 h-8 text-white mb-2" />
                                            <span className="text-white text-sm font-medium">Drag to reposition</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); coverPhotoInputRef.current?.click() }}
                                            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-sm transition-colors text-white z-10"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-white/40">
                                        <Camera className="w-8 h-8 mb-2" />
                                        <span className="text-sm">Click to add cover photo</span>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleCoverPhotoChange} ref={coverPhotoInputRef} />
                            </div>

                            {coverPhotoPreview && (
                                <div className="flex items-center gap-3 pt-2">
                                    <button type="button" onClick={() => setCoverPhotoZoom(prev => Math.max(100, prev - 10))} className="p-1.5 rounded-lg bg-[#331922] text-white/60">
                                        <ZoomOut className="w-4 h-4" />
                                    </button>
                                    <div className="flex-1 relative">
                                        <input
                                            type="range" min="100" max="200" value={coverPhotoZoom} onChange={(e) => setCoverPhotoZoom(Number(e.target.value))}
                                            className="w-full h-1.5 bg-[#331922] rounded-lg appearance-none cursor-pointer accent-[#C8A659] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C8A659]"
                                        />
                                    </div>
                                    <button type="button" onClick={() => setCoverPhotoZoom(prev => Math.min(200, prev + 10))} className="p-1.5 rounded-lg bg-[#331922] text-white/60">
                                        <ZoomIn className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Action Buttons */}
                <div className="pt-6 flex items-center justify-end gap-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors mr-auto"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>

                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-[#C8A659] hover:bg-[#dabb70] text-[#221016] px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    )
}
