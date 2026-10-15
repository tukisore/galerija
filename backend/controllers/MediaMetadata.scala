import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.{ExifDirectoryBase, ExifIFD0Directory, ExifSubIFDDirectory, GpsDirectory}
import java.io.ByteArrayInputStream
import java.time.{Instant, LocalDateTime}
import java.time.format.DateTimeFormatter
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** What can be read from an uploaded file itself. */
case class MediaMetadata(
  exif: Map[String, String] = Map.empty,
  // EXIF capture time as an ISO local date-time
  taken: Option[String] = None,
  coordinates: Option[Coordinates] = None,
)

object MediaMetadata:
  private val exifTime = DateTimeFormatter.ofPattern("yyyy:MM:dd HH:mm:ss")
  private val maxValueLength = 500

  /** Reads EXIF tags, capture time and GPS position; empty for files without any (or that are not images). */
  def read(bytes: Array[Byte]): MediaMetadata =
    Try(ImageMetadataReader.readMetadata(ByteArrayInputStream(bytes))).toOption.fold(MediaMetadata()) { metadata =>
      val directories = metadata.getDirectories.asScala.toList
      val tags = for
        directory <- directories
        if directory.getName.startsWith("Exif") || directory.getName.startsWith("GPS")
        tag <- directory.getTags.asScala
        value <- Option(tag.getDescription).map(_.trim).filter(_.nonEmpty)
      yield tag.getTagName -> value.take(maxValueLength)

      def time(directory: Class[? <: ExifDirectoryBase], tag: Int) =
        Option(metadata.getFirstDirectoryOfType(directory))
          .flatMap(d => Option(d.getString(tag)))
          .flatMap(text => Try(LocalDateTime.parse(text.trim, exifTime).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)).toOption)

      val taken = time(classOf[ExifSubIFDDirectory], ExifDirectoryBase.TAG_DATETIME_ORIGINAL)
        .orElse(time(classOf[ExifSubIFDDirectory], ExifDirectoryBase.TAG_DATETIME_DIGITIZED))
        .orElse(time(classOf[ExifIFD0Directory], ExifDirectoryBase.TAG_DATETIME))

      val coordinates = Option(metadata.getFirstDirectoryOfType(classOf[GpsDirectory]))
        .flatMap(d => Option(d.getGeoLocation))
        .filterNot(_.isZero)
        .map(location => Coordinates(location.getLatitude, location.getLongitude))

      // the first directory wins when a tag name appears in several
      MediaMetadata(tags.reverse.toMap, taken, coordinates)
    }

  /** The uploader's file date, if it is a valid ISO instant. */
  def fileDate(text: String): Option[String] = Try(Instant.parse(text).toString).toOption
