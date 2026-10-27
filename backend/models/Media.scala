import upickle.default.*

case class Coordinates(
  lat: Double,
  lon: Double,
)

object Coordinates:
  given ReadWriter[Coordinates] = macroRW

case class Media(
  id: String = "",
  name: String = "",
  filename: String = "",
  created: String = "",
  coordinates: Option[Coordinates] = None,
  description: String = "",
  // created and updated are set by the database layer; values sent by clients are ignored
  updated: String = "",
  // when the file itself was made: the EXIF capture time (local time, no zone) when the file has one,
  // otherwise the file's last-modified time as reported by the uploader
  fileCreated: String = "",
  // EXIF tags read from the file at upload, by tag name
  exif: Map[String, String] = Map.empty,
  // the subfolder of the media folder the file is in: the id of the album it was uploaded into, or empty
  folder: String = "",
)

object Media:
  given ReadWriter[Media] = macroRW

/** Body of POST and PUT /media; body is the base64-encoded file. */
case class MediaUpload(
  name: String = "",
  filename: String = "",
  body: String = "",
  coordinates: Option[Coordinates] = None,
  description: Option[String] = None,
  // the file's last-modified time (ISO instant), used as its creation date when it has no EXIF capture time
  fileDate: String = "",
  // on POST: the id of the album the file is uploaded into, so it is kept in that album's folder
  album: String = "",
)

object MediaUpload:
  given ReadWriter[MediaUpload] = macroRW
