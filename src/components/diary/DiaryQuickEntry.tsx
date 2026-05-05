import React, { useState, useEffect, useRef } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface DiaryQuickEntryProps {
  open: boolean
  onClose: () => void
  initialContent?: string
  text?: string
  autoFocusText?: boolean
}

export const DiaryQuickEntry: React.FC<DiaryQuickEntryProps> = ({
  open,
  onClose,
  initialContent = '',
  text = '',
  autoFocusText = false
}) => {
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      setContent(text || initialContent)
    }
  }, [open, initialContent, text])

  useEffect(() => {
    if (open && autoFocusText && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [open, autoFocusText])

  const handleSave = async () => {
    if (!content.trim() || isSaving) return

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        notifyError('toasts.diary.pleaseSignSaveDiaryEntries')
        return
      }

      const source = (text || initialContent) ? 'voice' : 'manual'

      const { data: entry, error } = await supabase
        .from('diary_entries')
        .insert({
          user_id: user.id,
          text: content.trim(),
          source,
          tags: ['diary'],
        })
        .select('id')
        .single()

      if (error) throw error

      notifySuccess('toasts.diary.diaryEntrySaved')

      // Invalidate diary queries so lists update
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] })
      queryClient.invalidateQueries({ queryKey: ['memory-timeline'] })

      // Non-blocking: extract insights + refresh metadata
      if (entry?.id) {
        supabase.functions.invoke('extract-diary-insights', {
          body: { diaryEntryId: entry.id, content: content.trim() }
        }).then(() => {
          supabase.functions.invoke('refresh-memory-metadata', {}).catch(() => {})
        }).catch((err) => {
          console.warn('[DiaryQuickEntry] extract-diary-insights failed:', err)
        })
      }

      onClose()
    } catch (error: any) {
      console.error('[DiaryQuickEntry] Save failed:', error)
      notifyError('toasts.diary.failedSaveDiaryEntry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setContent('')
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{t('screens.diary.quickDiaryEntry')}</SheetTitle>
              <SheetDescription>
                {(text || initialContent) ? 'Voice transcript captured. Edit and save your entry.' : 'Write your thoughts...'}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              aria-label={t('screens.diary.closeDiary')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 mt-6">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind today?"
            className="flex-1 resize-none text-base leading-relaxed"
            autoFocus={!autoFocusText}
          />

          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
