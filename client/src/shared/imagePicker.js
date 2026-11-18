import { useEffect, useRef, useState } from 'react';

const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

async function compressImage(file, maxWidth, maxHeight) {
  const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = data; });
  const canvas = document.createElement('canvas'), scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  // JPEG has no transparency: without a background, transparent areas turn black.
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function useImagePicker({ initial = '', maxFileMb, maxWidth, maxHeight, onError }) {
  const [photo, setPhoto] = useState(initial), [loadingPhoto, setLoadingPhoto] = useState(false);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  async function loadPhoto(e) {
    const file = e.target.files[0], id = ++sequence.current; onError(null); setLoadingPhoto(false); if (!file) return;
    if (!allowedTypes.includes(file.type) || file.size > maxFileMb * 1024 * 1024) { onError(`Elegí una imagen PNG, JPG o WebP de hasta ${maxFileMb} MB.`); e.target.value = ''; return; }
    setLoadingPhoto(true);
    try { const compressed = await compressImage(file, maxWidth, maxHeight); if (sequence.current === id) setPhoto(compressed); }
    catch { if (sequence.current === id) onError('No se pudo leer la foto. Elegí otra imagen.'); }
    finally { if (sequence.current === id) setLoadingPhoto(false); }
  }
  return { photo, loadingPhoto, loadPhoto };
}
