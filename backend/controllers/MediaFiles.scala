import java.nio.file.{FileAlreadyExistsException, Files, Path, Paths, StandardCopyOption, StandardOpenOption}
import java.util.Base64
import scala.util.Try

/**
 * Uploaded files live in the media folder, in the subfolder of the album they were uploaded into, under their filename,
 * kept unique in the subfolder by adding " (1)", " (2)", ... before the extension. Files uploaded before that are
 * named <id>.<extension of filename>, directly in the media folder.
 */
object MediaFiles:
  private val dir = Paths.get(Env.vars.getOrElse("MEDIA_DIR", "media")).normalize

  def path(media: Media): Path =
    val folder = if Slug.isValid(media.folder) then dir.resolve(media.folder) else dir
    val named = folder.resolve(media.filename).normalize
    // a filename that would lead out of the folder is never used as the file's name
    if Files.exists(legacyPath(media)) || media.filename.isEmpty || named.getParent != folder then legacyPath(media)
    else named

  private def legacyPath(media: Media): Path =
    val extension = media.filename.reverse.takeWhile(_ != '.').reverse
    val safe = extension.nonEmpty && extension.length <= 10 && extension.forall(_.isLetterOrDigit)
    val hasExtension = media.filename.contains('.') && safe
    dir.resolve(if hasExtension then s"${media.id}.${extension.toLowerCase}" else media.id)

  /** The filename made usable as a file name in the folder: no slashes or control characters. */
  def clean(filename: String): String =
    val cleaned = filename.map(c => if c == '/' || c == '\\' || c.isControl then '_' else c).trim
    if cleaned.isEmpty || cleaned == "." || cleaned == ".." then "file" else cleaned

  /** "name.jpg", then "name (1).jpg", "name (2).jpg", ... */
  private def candidates(filename: String): LazyList[String] =
    val dot = filename.lastIndexOf('.')
    val (base, extension) = if dot > 0 then filename.splitAt(dot) else (filename, "")
    filename #:: LazyList.from(1).map(n => s"$base ($n)$extension")

  /**
   * from with the first candidate of filename that is not taken by other media and has no other file in the folder
   * (from's own file does not count).
   */
  def free(from: Media, filename: String, taken: String => Boolean): Media =
    candidates(clean(filename)).map(name => from.copy(filename = name)).find { media =>
      !taken(media.filename) && (path(media) == path(from) || !Files.exists(path(media)))
    }.get

  /** Decodes a base64 string, with or without a "data:...;base64," prefix. */
  def decode(body: String): Option[Array[Byte]] =
    val encoded = if body.startsWith("data:") then body.dropWhile(_ != ',').drop(1) else body
    Try(Base64.getMimeDecoder.decode(encoded)).toOption.filter(_.nonEmpty)

  /**
   * Writes a new file under the first candidate of the media's filename that is free, without ever replacing a file
   * written meanwhile; returns the media with that filename.
   */
  def create(media: Media, bytes: Array[Byte], taken: String => Boolean): Media =
    candidates(clean(media.filename)).filterNot(taken).map(name => media.copy(filename = name)).flatMap { named =>
      Files.createDirectories(path(named).getParent)
      try
        Files.write(path(named), bytes, StandardOpenOption.CREATE_NEW)
        Some(named)
      catch case _: FileAlreadyExistsException => None
    }.head

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
