'use client'

import { useState } from 'react'
import { Link2, Copy, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface InviteLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inviteLink: string
  onClose: () => void
}

export default function InviteLinkModal({ open, onOpenChange, inviteLink, onClose }: InviteLinkModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-accent" />
            Share Your Locket
          </DialogTitle>
          <DialogDescription>
            Send this link to your partner so they can join your locket.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-background border border-border rounded-lg px-4 py-3">
              <p className="text-body-sm text-foreground truncate font-mono">{inviteLink}</p>
            </div>
            <Button type="button" onClick={handleCopy} variant="outline" size="icon">
              {copied ? <CheckCircle className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onClose} className="w-full">
            Continue to Locket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
