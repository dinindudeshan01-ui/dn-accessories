// src/lib/uploadProductImage.js
// Drop this file in: my-shop/frontend/src/lib/uploadProductImage.js

/**
 * Uploads a product image to Cloudinary and returns the permanent public URL.
 * @param {File} file  - The file object from an <input type="file">
 * @returns {Promise<string>} - Permanent public URL
 */
export async function uploadProductImage(file) {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'dn-accessories/products')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) throw new Error('Cloudinary upload failed')

  const data = await res.json()
  return data.secure_url // permanent public URL — stored in your DB
}