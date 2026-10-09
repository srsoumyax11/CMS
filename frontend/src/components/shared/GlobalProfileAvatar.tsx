import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { ProfilePhotoCropper } from './ProfilePhotoCropper';
import { cn } from '@/lib/utils';

interface GlobalProfileAvatarProps {
  src?: string | null;
  name: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  editable?: boolean;
  onImageChange?: (file: File | null) => Promise<void> | void;
  className?: string;
  avatarClassName?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
  '2xl': 'h-28 w-28 text-3xl',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
  '2xl': 'h-8 w-8',
};

export function GlobalProfileAvatar({
  src,
  name,
  email,
  size = 'md',
  editable = true,
  onImageChange,
  className,
  avatarClassName,
}: GlobalProfileAvatarProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = (name || email || 'U').trim().charAt(0).toUpperCase();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset file input value so selecting the same file again works
    e.target.value = '';
  };

  const handleCropComplete = async (croppedFile: File) => {
    if (!onImageChange) return;
    try {
      setIsUploading(true);
      await onImageChange(croppedFile);
      setIsPreviewOpen(false);
    } catch (err) {
      console.error('Failed to update profile picture', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!onImageChange) return;
    try {
      setIsUploading(true);
      await onImageChange(null);
      setIsPreviewOpen(false);
    } catch (err) {
      console.error('Failed to remove profile picture', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className={cn('relative inline-block group cursor-pointer select-none', className)}>
        <Avatar
          onClick={() => setIsPreviewOpen(true)}
          className={cn(
            sizeClasses[size],
            'border border-border/80 shadow-2xs transition-all duration-150 group-hover:border-primary/50',
            avatarClassName
          )}
        >
          <AvatarImage src={src || undefined} alt={name} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {initial}
          </AvatarFallback>
        </Avatar>

        {/* Hover Camera Overlay */}
        <div
          onClick={() => setIsPreviewOpen(true)}
          className={cn(
            'absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150 text-white shadow-xs',
            sizeClasses[size]
          )}
          title="View profile photo"
        >
          <Camera className={iconSizeClasses[size]} />
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {/* Expanded Profile Image View / Edit Lightbox Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-semibold">
              Profile Photo
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative group">
              <Avatar className="h-44 w-44 border-4 border-background shadow-md">
                <AvatarImage src={src || undefined} alt={name} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-5xl font-bold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="text-center space-y-0.5">
              <h3 className="text-base font-bold text-foreground">{name}</h3>
              {email && <p className="text-xs text-muted-foreground">{email}</p>}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between items-center pt-2 border-t">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {editable && onImageChange && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-1.5 text-xs font-medium flex-1 sm:flex-none"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload Photo
                  </Button>

                  {src && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePhoto}
                      disabled={isUploading}
                      className="gap-1.5 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPreviewOpen(false)}
              className="w-full sm:w-auto text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cropper Modal when uploading new image */}
      {isCropperOpen && selectedImageSrc && (
        <ProfilePhotoCropper
          open={isCropperOpen}
          onOpenChange={(open) => {
            setIsCropperOpen(open);
            if (!open) setSelectedImageSrc(null);
          }}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
