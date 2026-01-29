'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocket } from '../contexts/LocketContext'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, User, Pencil, Heart, Link, ArrowRight, Copy, Check, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function LocketCreator() {
  const { user, updateProfile } = useAuth()
  const { createLocket, inviteUser } = useLocket()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [nickname, setNickname] = useState(user?.displayName || '')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return user?.photoURL || null

    try {
      // Get presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: avatarFile.name,
          fileType: avatarFile.type,
          fileSize: avatarFile.size
        })
      })

      if (!res.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl } = await res.json()

      // Upload file to GCS
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': avatarFile.type },
        body: avatarFile
      })

      if (!uploadRes.ok) throw new Error('Failed to upload image')

      return publicUrl
    } catch (error) {
      console.error('Avatar upload failed:', error)
      return null
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCloseModal = () => {
    setShowInviteModal(false)
    router.push('/')
  }

  const handleSetup = async (action: 'create' | 'skip' | 'link') => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Upload Avatar & Update Profile
      const photoURL = await uploadAvatar()
      if (nickname !== user?.displayName || photoURL !== user?.photoURL) {
        await updateProfile({
          displayName: nickname || user?.displayName || 'User',
          photoURL: photoURL || undefined
        })
      }

      // 2. Create Locket
      const newLocket = await createLocket({
        name: "Our Locket",
        admin_firebase_uid: user!.uid,
      })

      // 3. Handle actions differently
      // Note: createLocket already sets currentLocket and userRole in context,
      // so we don't need to call switchLocket (which would fail due to React state timing)

      if (action === 'create' && partnerEmail) {
        // Send email invite, then redirect
        await inviteUser({
          locket_id: newLocket.id,
          email: partnerEmail,
          invited_by_firebase_uid: user!.uid,
          role: 'admin'
        })
        router.push('/')

      } else if (action === 'link') {
        // Show invite link modal (DON'T redirect yet)
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const inviteUrl = `${origin}/invite/${newLocket.invite_code}`
        setInviteLink(inviteUrl)
        setShowInviteModal(true)

      } else {
        // Skip - just redirect
        router.push('/')
      }

    } catch (err) {
      console.error('Setup failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to create your locket. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="w-full max-w-[580px] bg-white dark:bg-[#2a1d21] rounded-xl shadow-xl shadow-primary/5 dark:shadow-black/20 overflow-hidden relative border border-white/50 dark:border-white/5">
        <div className="pt-12"></div>
        <div className="px-8 sm:px-12 pb-12 flex flex-col items-center">

          {/* Header */}
          <div className="text-center mt-2 mb-10">
            <h1 className="text-[#181113] dark:text-white text-4xl sm:text-[42px] font-medium leading-[1.15] mb-3 tracking-tight font-display italic">
              Every story needs <br /> a beginning
            </h1>
            <p className="text-[#875e69] dark:text-[#dcb8c3] text-lg font-normal font-sans">
              Let's set up your side of the locket.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="w-full mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3 text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Avatar Upload */}
          <div className="mb-10 relative group">
            <label htmlFor="avatar-upload" className="cursor-pointer block relative">
              <div className="w-36 h-36 rounded-full border-[3px] border-white dark:border-[#3d2b30] shadow-xl shadow-primary/10 flex items-center justify-center transition-all duration-300 relative overflow-hidden ring-4 ring-primary/10 dark:ring-primary/20 bg-background-light dark:bg-white/5">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-full h-full object-cover opacity-95 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <User className="w-12 h-12 text-primary/40" />
                )}
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  ref={fileInputRef}
                />
              </div>
              <div className="absolute bottom-1 right-1 bg-white dark:bg-[#3d2b30] text-primary p-2 rounded-full shadow-md border border-gray-100 dark:border-gray-700 flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                <Pencil className="w-[18px] h-[18px]" />
              </div>
            </label>
          </div>

          {/* Form */}
          <form className="w-full flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>

            {/* Nickname Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="nickname" className="text-[#181113] dark:text-gray-200 text-lg font-medium pl-4 font-display">
                What should we call you?
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="nickname"
                  placeholder="Your Nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full h-16 bg-background-light dark:bg-white/5 border border-transparent dark:border-white/10 rounded-lg px-6 text-lg text-[#181113] dark:text-white placeholder:text-[#875e69]/50 dark:placeholder:text-white/30 focus:border-primary focus:ring-0 focus:bg-white dark:focus:bg-white/10 transition-all font-sans"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none">
                  <User className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Partner Email Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="partner-email" className="text-[#181113] dark:text-gray-200 text-lg font-medium pl-4 font-display">
                Who is this locket for?
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="partner-email"
                  placeholder="Partner's Email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  className="w-full h-16 bg-background-light dark:bg-white/5 border border-transparent dark:border-white/10 rounded-lg px-6 text-lg text-[#181113] dark:text-white placeholder:text-[#875e69]/50 dark:placeholder:text-white/30 focus:border-primary focus:ring-0 focus:bg-white dark:focus:bg-white/10 transition-all font-sans"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none">
                  <Heart className="w-6 h-6" />
                </div>
              </div>

              {/* Action Links */}
              <div className="px-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm font-sans">
                <button
                  type="button"
                  onClick={() => handleSetup('link')}
                  disabled={isLoading}
                  className="text-primary hover:text-[#a03d58] font-medium flex items-center gap-1.5 transition-colors group/link text-left disabled:opacity-50"
                >
                  <Link className="w-[18px] h-[18px]" />
                  <span className="underline decoration-transparent group-hover/link:decoration-current underline-offset-2 transition-all">
                    Generate an invite link instead
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetup('skip')}
                  disabled={isLoading}
                  className="text-[#875e69] dark:text-[#dcb8c3] hover:text-primary dark:hover:text-white opacity-70 hover:opacity-100 transition-all font-medium text-left disabled:opacity-50"
                >
                  Skip for now
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-4">
              <button
                type="submit"
                onClick={() => handleSetup('create')}
                disabled={isLoading}
                className="w-full bg-primary hover:bg-[#a03d58] text-white h-16 rounded-lg font-medium text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group/btn disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>Create Locket</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Decorative Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"></div>
      </div>

      {/* Footer Links */}
      <div className="mt-8 flex gap-6 text-[#875e69] dark:text-[#dcb8c3] text-sm font-sans opacity-60">
        <a href="#" className="hover:text-primary transition-colors">Help</a>
        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
        <a href="#" className="hover:text-primary transition-colors">Terms</a>
      </div>

      {/* Invite Link Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Share Your Locket</DialogTitle>
            <DialogDescription>
              Send this link to your partner so they can join your locket.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <div className="flex-1 bg-background-light dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3">
              <p className="text-sm text-[#181113] dark:text-white truncate font-mono">
                {inviteLink}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0"
              variant="outline"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DialogFooter className="mt-6">
            <Button onClick={handleCloseModal} className="w-full sm:w-auto">
              Continue to Locket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
