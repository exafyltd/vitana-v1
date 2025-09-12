import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface DiaryQuickEntryProps {
  open: boolean
  onClose: () => void
  initialContent?: string
}

export const DiaryQuickEntry: React.FC<DiaryQuickEntryProps> = ({
  open,
  onClose,
  initialContent = ''
}) => {
  const [content, setContent] = useState('')

  useEffect(() => {
    if (open && initialContent) {
      setContent(initialContent)
    }
  }, [open, initialContent])

  const handleSave = () => {
    // TODO: Implement actual save functionality
    console.log('Saving diary entry:', content)
    onClose()
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
              <SheetTitle>Quick Diary Entry</SheetTitle>
              <SheetDescription>
                {initialContent ? 'Voice transcript captured. Edit and save your entry.' : 'Write your thoughts...'}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              aria-label="Close diary"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 mt-6">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind today?"
            className="flex-1 resize-none text-base leading-relaxed"
            autoFocus
          />

          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={handleSave}
              disabled={!content.trim()}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Entry
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