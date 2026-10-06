const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the file."));
    r.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This image type cannot be shown. Please upload PNG, JPG, WEBP, SVG or GIF."));
    img.src = src;
  });

export async function imageFileToDataURL(file, { maxSide = 1200, maxBytes = 8 * 1024 * 1024 } = {}) {
  if (!file) throw new Error("No file selected.");
  const isImage = (file.type || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|apng|jfif|pjpeg|pjp|tiff?|heic|heif)$/i.test(file.name || "");
  if (!isImage) throw new Error("Please choose an image file.");
  const src = await readAsDataURL(file);
  const img = await loadImage(src);
  const keep = /svg|gif|x-icon|vnd\.microsoft\.icon/i.test(file.type || "") || /\.(svg|gif|ico)$/i.test(file.name || "");
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  if (keep || (!w || !h) || (Math.max(w, h) <= maxSide && src.length <= maxBytes && !/bmp|tiff/i.test(file.type || ""))) {
    if (src.length > maxBytes) throw new Error("The image is too large. Please use a file under 6 MB.");
    return src;
  }
  const k = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  const opaque = /jpe?g/i.test(file.type || "");
  return c.toDataURL(opaque ? "image/jpeg" : "image/png", 0.92);
}
