'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Send, Loader2, Trash2 } from 'lucide-react';
import { useLocket } from '@/contexts/LocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface Comment {
  id: string;
  content: string;
  comment_type: 'comment' | 'activity';
  activity_action?: string;
  author_firebase_uid?: string;
  author_name?: string;
  author_avatar_url?: string;
  created_at: string;
}

interface CommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  memoryId: string;
  memoryTitle: string;
}

export function CommentsPanel({
  isOpen,
  onClose,
  memoryId,
  memoryTitle
}: CommentsPanelProps) {
  const { currentLocket } = useLocket();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentLocket) {
      fetchComments();
    }
  }, [isOpen, memoryId, currentLocket]);

  useEffect(() => {
    // Scroll to bottom when new comments arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    // Focus input when panel opens
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const fetchComments = async () => {
    if (!currentLocket) return;
    setIsLoading(true);

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(
        `/api/memory-groups/${memoryId}/comments?locketId=${currentLocket.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newComment.trim() || !currentLocket || isSending) return;
    setIsSending(true);

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/memory-groups/${memoryId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          locket_id: currentLocket.id,
          content: newComment.trim()
        })
      });

      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to send comment:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentLocket) return;

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(
        `/api/memory-groups/${memoryId}/comments?commentId=${commentId}&locketId=${currentLocket.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white dark:bg-[#1a1216] rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md h-[70vh] sm:h-[500px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-100 dark:border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg text-[#181113] dark:text-white truncate">Comments</h2>
            <p className="text-xs text-muted-foreground truncate">{memoryTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isActivity = comment.comment_type === 'activity';
              const isOwnComment = comment.author_firebase_uid === user?.uid;

              if (isActivity) {
                // Activity log - subtle, centered
                return (
                  <div key={comment.id} className="flex justify-center py-1">
                    <span className="text-xs text-muted-foreground/70 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
                      {comment.author_name || 'Someone'} {comment.content}
                    </span>
                  </div>
                );
              }

              // Regular comment
              return (
                <div
                  key={comment.id}
                  className={`flex items-end gap-2 group ${isOwnComment ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  {!isOwnComment && (
                    comment.author_avatar_url ? (
                      <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={comment.author_avatar_url}
                          alt={comment.author_name || 'User'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-xs font-medium text-rose-700 flex-shrink-0">
                        {comment.author_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )
                  )}

                  {/* Own avatar for own comments */}
                  {isOwnComment && user?.photoURL && (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={user.photoURL}
                        alt="You"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      isOwnComment
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-white/10 rounded-bl-sm'
                    }`}
                  >
                    {!isOwnComment && comment.author_name && (
                      <p className="text-xs font-medium text-primary mb-0.5">{comment.author_name}</p>
                    )}
                    <p className="text-sm break-words">{comment.content}</p>
                    <p className={`text-[10px] mt-1 ${isOwnComment ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {formatTime(comment.created_at)}
                    </p>
                  </div>

                  {/* Delete button for own comments */}
                  {isOwnComment && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-rose-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Write a comment..."
              className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleSend}
              disabled={!newComment.trim() || isSending}
              className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
