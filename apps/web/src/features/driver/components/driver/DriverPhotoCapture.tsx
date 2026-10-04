import React, { ChangeEvent, useRef } from 'react';
import { CameraIcon, CheckIcon, XIcon } from 'lucide-react';

export interface DriverPhoto {
  id: string;
  name: string;
  url: string;
}

interface DriverPhotoCaptureProps {
  photos: DriverPhoto[];
  onChange: (photos: DriverPhoto[]) => void;
  required?: boolean;
  label?: string;
}

export function DriverPhotoCapture({ photos, onChange, required = false, label = 'Photo' }: DriverPhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(event.target.files ?? []).map((file) => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    onChange([...photos, ...added]);
    event.target.value = '';
  };

  const removePhoto = (id: string) => {
    const selected = photos.find((photo) => photo.id === id);
    if (selected) URL.revokeObjectURL(selected.url);
    onChange(photos.filter((photo) => photo.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <span className={`text-xs font-semibold ${required ? 'text-danger-ink' : 'text-subtle'}`}>{required ? 'Required' : 'Optional'}</span>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 flex min-h-24 w-full items-center justify-center gap-3 rounded-card border border-dashed border-hatch bg-canvas px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        
        {photos.length ? <CheckIcon aria-hidden className="h-6 w-6 text-forest" /> : <CameraIcon aria-hidden className="h-6 w-6 text-forest" />}
        {photos.length ? 'Photo added — take another' : 'Take a photo'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={handleFiles} />
      {photos.length > 0 &&
      <div className="mt-3 flex flex-wrap gap-3">
          {photos.map((photo, index) =>
        <div key={photo.id} className="relative h-16 w-16">
              <img src={photo.url} alt={`${label} ${index + 1}`} className="h-16 w-16 rounded-xl object-cover ring-1 ring-line" />
              <button
            type="button"
            onClick={() => removePhoto(photo.id)}
            aria-label={`Remove photo ${index + 1}`}
            className="absolute -right-4 -top-4 grid h-12 w-12 place-items-center rounded-full bg-ink text-white ring-2 ring-surface focus-visible:outline-none focus-visible:ring-brand">
            
                <XIcon aria-hidden className="h-4 w-4" />
              </button>
            </div>
        )}
        </div>
      }
    </div>);

}