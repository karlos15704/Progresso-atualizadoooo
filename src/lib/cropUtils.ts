export const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues
    image.src = url
  })

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return Promise.reject('No 2d context')
  }

  // set canvas size to match the bounding box
  canvas.width = image.width
  canvas.height = image.height

  ctx.translate(image.width / 2, image.height / 2)
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180)
  }
  ctx.translate(-image.width / 2, -image.height / 2)

  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')

  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    return Promise.reject('No 2d context')
  }

  // Max size for avatar
  const MAX_SIZE = 400;
  let dstWidth = pixelCrop.width;
  let dstHeight = pixelCrop.height;

  if (dstWidth > MAX_SIZE || dstHeight > MAX_SIZE) {
    if (dstWidth > dstHeight) {
      dstHeight = Math.round((dstHeight * MAX_SIZE) / dstWidth);
      dstWidth = MAX_SIZE;
    } else {
      dstWidth = Math.round((dstWidth * MAX_SIZE) / dstHeight);
      dstHeight = MAX_SIZE;
    }
  }

  // Set the size of the cropped canvas
  croppedCanvas.width = dstWidth;
  croppedCanvas.height = dstHeight;

  // Draw the cropped image onto the new canvas
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    dstWidth,
    dstHeight
  )

  return new Promise((resolve) => {
    resolve(croppedCanvas.toDataURL('image/jpeg', 0.8)) // use jpeg for compression with max 0.8 quality
  })
}
