import React, { useState } from 'react';
import { Modal, Busy, ErrorMessage } from './components.jsx';
import { imageSource, request } from './api.js';
import { useImagePicker } from './imagePicker.js';

export default function ComplexImageForm({ complex, path, onClose, onSaved, onUnauthorized }) {
  const [error, setError] = useState(null), [saving, setSaving] = useState(false);
  const { photo, loadingPhoto, loadPhoto } = useImagePicker({ maxFileMb: 10, maxWidth: 1200, maxHeight: 800, onError: setError });
  async function submit(e) {
    e.preventDefault(); if (saving || loadingPhoto || !photo) return; setSaving(true); setError(null);
    try { const { image } = await request(path, { method: 'PUT', body: { image: photo } }); await onSaved(image); }
    catch (error) { if (error.status === 401) onUnauthorized(); else setError(error); }
    finally { setSaving(false); }
  }
  return <Modal title="Imagen del catálogo" onClose={onClose}><form onSubmit={submit}><p className="dialog-intro">Es la imagen que ven los clientes de {complex.name} al buscar canchas.</p><img className="court-photo-preview" src={imageSource(photo || complex.image)} alt={`Vista previa de la imagen de ${complex.name}`} width="640" height="290" /><label>Nueva imagen<input type="file" required accept="image/png,image/jpeg,image/webp" onChange={loadPhoto} /><small>PNG, JPG o WebP, hasta 10 MB. Se optimiza antes de subirla.</small></label><ErrorMessage error={error} /><div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving || loadingPhoto || !photo}>{saving ? <Busy>Guardando…</Busy> : loadingPhoto ? <Busy>Cargando imagen…</Busy> : 'Guardar imagen'}</button></div></form></Modal>;
}
