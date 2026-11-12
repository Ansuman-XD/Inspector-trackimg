/**
 * Compresses an image element or file to max 1024px on the longest edge,
 * and JPEG quality ~0.7. Returns a binary Blob ready for multipart upload.
 */
export async function compressImage(
  source: File | HTMLImageElement | HTMLVideoElement
): Promise<Blob> {
  let img: HTMLImageElement;

  if (source instanceof File) {
    img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(source);
    });
  } else if (source instanceof HTMLImageElement) {
    img = source;
  } else {
    // Video capture frame
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas blob conversion failed"))),
        "image/jpeg",
        0.7
      );
    });
  }

  const maxDimension = 1024;
  let { naturalWidth: width, naturalHeight: height } = img;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to compress image"))),
      "image/jpeg",
      0.7
    );
  });
}
