/**
 * The evidence API stores only PNG, JPEG or WebP bytes, so the signature pad's SVG is
 * rasterised to a PNG (white background) before it is queued as proof of delivery.
 */
export async function signatureToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The signature could not be prepared. Clear it and sign again.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || 600;
    canvas.height = image.naturalHeight || 200;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This device cannot prepare the signature image.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('The signature image could not be created.'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
