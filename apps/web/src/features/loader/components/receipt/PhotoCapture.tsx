import React, { ChangeEvent, useRef } from 'react';
import { CameraIcon, UploadIcon, XIcon } from 'lucide-react';
import type { PhotoAttachment } from '../../types/receipt';
import { buttonStyles } from '../ui/Button';
interface PhotoCaptureProps {
  photos: PhotoAttachment[];
  onChange: (photos: PhotoAttachment[]) => void;
  itemName: string;
}
export function PhotoCapture({
  photos,
  onChange,
  itemName
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const added = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: URL.createObjectURL(f),
      name: f.name
    }));
    onChange([...photos, ...added]);
    e.target.value = '';
  };
  const remove = (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    onChange(photos.filter((p) => p.id !== id));
  };
  return <div>
      <p className="text-sm font-semibold text-ink">
        Photos <span className="font-normal text-subtle">(optional — add as many as needed)</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {photos.map((p, i) => <div key={p.id} className="relative h-16 w-16">
            <img src={p.url} alt={`Issue photo ${i + 1} for ${itemName}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-line" />
            <button type="button" onClick={() => remove(p.id)} aria-label={`Remove photo ${i + 1}`} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-white ring-2 ring-surface transition-colors duration-150 hover:bg-danger focus-visible:outline-none focus-visible:ring-brand">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>)}
        <button type="button" onClick={() => inputRef.current?.click()} className={`${buttonStyles('secondary', 'md')} w-full sm:w-auto`}>
          <CameraIcon aria-hidden="true" className="h-4 w-4 md:hidden" />
          <UploadIcon aria-hidden="true" className="hidden h-4 w-4 md:block" />
          <span className="md:hidden">{photos.length ? 'Take Another Photo' : 'Take Photo'}</span>
          <span className="hidden md:inline">{photos.length ? 'Upload More' : 'Upload Photo'}</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFiles} className="sr-only" tabIndex={-1} aria-hidden="true" />
    </div>;
}