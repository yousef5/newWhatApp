import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, extname } from 'path'
import baileys from '@whiskeysockets/baileys'
const { downloadMediaMessage } = baileys
import sharp from 'sharp'
import { getAccountDir } from '../storage/config'
import type { WAMessage } from '@whiskeysockets/baileys'
import type { MessageType } from '@shared/types'

const MIME_TO_EXT: { [mime: string]: string } = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/3gpp': '.3gp',
  'video/quicktime': '.mov',
  'audio/ogg; codecs=opus': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
}

const THUMBNAIL_SIZE = 200

export class MediaHandler {
  private mediaDir: string

  constructor(accountId: string) {
    this.mediaDir = join(getAccountDir(accountId), 'media')
    if (!existsSync(this.mediaDir)) {
      mkdirSync(this.mediaDir, { recursive: true })
    }
  }

  async downloadMessage(msg: WAMessage): Promise<{
    mediaPath: string
    thumbnailPath: string | null
  } | null> {
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {})
      if (!buffer) return null

      const ext = this.getExtension(msg)
      const messageId = msg.key?.id ?? `unknown-${Date.now()}`
      const mediaPath = this.getMediaPath(messageId, ext)

      writeFileSync(mediaPath, buffer as Buffer)

      // Generate thumbnail for images and videos
      let thumbnailPath: string | null = null
      const mediaType = this.getMediaType(msg)

      if (mediaType === 'image' || mediaType === 'video') {
        try {
          thumbnailPath = this.getMediaPath(`${messageId}_thumb`, '.jpg')
          if (mediaType === 'image') {
            await sharp(buffer as Buffer)
              .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
              .jpeg({ quality: 70 })
              .toFile(thumbnailPath)
          } else {
            // For video, try to extract thumbnail from the embedded thumbnail in the message
            const videoMsg = msg.message?.videoMessage
            if (videoMsg?.jpegThumbnail) {
              const thumbBuffer = Buffer.from(videoMsg.jpegThumbnail)
              await sharp(thumbBuffer)
                .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
                .jpeg({ quality: 70 })
                .toFile(thumbnailPath)
            } else {
              thumbnailPath = null
            }
          }
        } catch {
          thumbnailPath = null
        }
      }

      return { mediaPath, thumbnailPath }
    } catch {
      return null
    }
  }

  getMediaPath(messageId: string, ext: string): string {
    return join(this.mediaDir, `${messageId}${ext}`)
  }

  getMediaType(msg: WAMessage): MessageType | null {
    const content = msg.message
    if (!content) return null

    if (content.imageMessage) return 'image'
    if (content.videoMessage) return 'video'
    if (content.audioMessage) return 'audio'
    if (content.documentMessage) return 'document'
    if (content.stickerMessage) return 'sticker'

    return null
  }

  getExtension(msg: WAMessage): string {
    const content = msg.message
    if (!content) return '.bin'

    const mime =
      content.imageMessage?.mimetype ??
      content.videoMessage?.mimetype ??
      content.audioMessage?.mimetype ??
      content.documentMessage?.mimetype ??
      content.stickerMessage?.mimetype ??
      null

    if (mime && MIME_TO_EXT[mime]) {
      return MIME_TO_EXT[mime]
    }

    // Try to extract from document filename
    if (content.documentMessage?.fileName) {
      const ext = extname(content.documentMessage.fileName)
      if (ext) return ext
    }

    // Fallback based on type
    if (content.imageMessage) return '.jpg'
    if (content.videoMessage) return '.mp4'
    if (content.audioMessage) return '.ogg'
    if (content.documentMessage) return '.bin'
    if (content.stickerMessage) return '.webp'

    return '.bin'
  }
}
