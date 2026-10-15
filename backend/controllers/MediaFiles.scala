import java.nio.file.{Files, Path, Paths, StandardCopyOption}
import java.util.Base64
import scala.util.Try

/** Uploaded files live in the media folder as <id>.<extension of filename>. */
object MediaFiles:
  private val dir = Paths.get(Env.vars.getOrElse("MEDIA_DIR", "media"))

  def path(media: Media): Path =
    val extension = media.filename.reverse.takeWhile(_ != '.').reverse
    val safe = extension.nonEmpty && extension.length <= 10 && extension.forall(_.isLetterOrDigit)
    val hasExtension = media.filename.contains('.') && safe
    dir.resolve(if hasExtension then s"${media.id}.${extension.toLowerCase}" else media.id)

  /** Decodes a base64 string, with or without a "data:...;base64," prefix. */
  def decode(body: String): Option[Array[Byte]] =
    val encoded = if body.startsWith("data:") then body.dropWhile(_ != ',').drop(1) else body
    Try(Base64.getMimeDecoder.decode(encoded)).toOption.filter(_.nonEmpty)

  def write(media: Media, bytes: Array[Byte]): Unit =
    Files.createDirectories(dir)
    Files.write(path(media), bytes)

  def read(media: Media): Option[Array[Byte]] =
    Option(path(media)).filter(Files.isRegularFile(_)).map(Files.readAllBytes)

  def contentType(media: Media): String =
    Option(java.net.URLConnection.guessContentTypeFromName(media.filename)).getOrElse("application/octet-stream")

  def move(from: Media, to: Media): Unit =
    if path(from) != path(to) && Files.exists(path(from)) then
      Files.move(path(from), path(to), StandardCopyOption.REPLACE_EXISTING)

  def delete(media: Media): Unit = Files.deleteIfExists(path(media))
