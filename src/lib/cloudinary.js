const CLOUD_NAME = 'Bangmaster'
const UPLOAD_PRESET = 'wfchnkep'

/**
 * Uploaduje zdjęcie do Cloudinary i zwraca publiczny URL
 * @param {File} file - plik do uploadu
 * @param {string} publicId - unikalna nazwa pliku (np. "player-abc123")
 * @returns {Promise<string>} - publiczny URL zdjęcia
 */
export async function uploadToCloudinary(file, publicId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('public_id', publicId)
  formData.append('overwrite', 'true')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Błąd uploadu Cloudinary')
  }

  const data = await res.json()
  return data.secure_url
}

/**
 * Usuwa zdjęcie z Cloudinary (przez Supabase Edge Function lub bezpośrednio)
 * Uwaga: usuwanie przez frontend wymaga signed request — pomijamy, 
 * Cloudinary sam nadpisze przy następnym uploadzie (overwrite: true)
 */
export function getCloudinaryUrl(publicId, options = {}) {
  const { width = 400, quality = 'auto', format = 'auto' } = options
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_${width},q_${quality},f_${format}/${publicId}`
}
