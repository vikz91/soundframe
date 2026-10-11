export type CoverDetails = {
  title: string
  artist: string
  album: string
  website: string
}

function fitLine(context: CanvasRenderingContext2D, text: string, width: number) {
  if (context.measureText(text).width <= width) return text
  const characters = Array.from(text)
  while (characters.length && context.measureText(`${characters.join('')}…`).width > width) characters.pop()
  return `${characters.join('').trimEnd()}…`
}

function titleLines(context: CanvasRenderingContext2D, text: string, width: number) {
  const characters = Array.from(text.trim().replace(/\s+/g, ' '))
  let first = ''
  while (characters.length && context.measureText(first + characters[0]).width <= width) {
    first += characters.shift()
  }
  if (!characters.length) return [first]
  const lastSpace = first.lastIndexOf(' ')
  if (lastSpace > 0) {
    characters.unshift(...Array.from(first.slice(lastSpace + 1)))
    first = first.slice(0, lastSpace)
  }
  return [first, fitLine(context, characters.join('').trim(), width)]
}

export function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  details: CoverDetails,
  fontFamily: string
) {
  const { width, height } = context.canvas
  context.clearRect(0, 0, width, height)
  if (image) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
    const imageWidth = image.naturalWidth * scale
    const imageHeight = image.naturalHeight * scale
    context.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight)
  } else {
    const background = context.createLinearGradient(0, 0, width, height)
    background.addColorStop(0, '#245963')
    background.addColorStop(0.5, '#15323c')
    background.addColorStop(1, '#071b24')
    context.fillStyle = background
    context.fillRect(0, 0, width, height)
    for (const radius of [210, 310, 410]) {
      context.beginPath()
      context.arc(890, 250, radius, 0, Math.PI * 2)
      context.fillStyle = '#77e4d408'
      context.fill()
      context.strokeStyle = '#baf4e926'
      context.lineWidth = 2
      context.stroke()
    }
  }

  if (!Object.values(details).some((text) => text.trim())) return
  const shade = context.createLinearGradient(0, 350, 0, height)
  shade.addColorStop(0, '#00000000')
  shade.addColorStop(1, '#000000d9')
  context.fillStyle = shade
  context.fillRect(0, 350, width, height - 350)
  context.textBaseline = 'top'
  context.fillStyle = '#ccfbf1'
  context.font = `500 28px ${fontFamily}`
  context.fillText(fitLine(context, details.artist.trim().toUpperCase(), 1064), 68, 575)
  context.fillStyle = '#ffffff'
  context.font = `600 64px ${fontFamily}`
  titleLines(context, details.title, 1064).forEach((line, index) => context.fillText(line, 68, 625 + index * 72))
  context.fillStyle = '#ffffffcc'
  context.font = `400 27px ${fontFamily}`
  context.fillText(fitLine(context, details.album.trim(), 1064), 68, 787)
  context.fillStyle = '#ffffffa6'
  context.font = `400 22px ${fontFamily}`
  context.fillText(fitLine(context, details.website.trim(), 1064), 68, 840)
}
