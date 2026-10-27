import Http.*

case class MediaController()(using cc: castor.Context, log: cask.Logger) extends cask.Routes:

  @adminOnly()
  @cask.get("/media")
  def list() = json(await(Db.allMedia()))

  /** The media in no album; open to everyone, as the front page shows it. */
  @cask.get("/media/loose")
  def loose() = json(await(Db.looseMedia()))

  @adminOnly()
  @cask.get("/media/:id")
  def get(id: String) =
    await(Db.findMedia(id)) match
      case Some(media) => json(media)
      case None => notFound(id)

  /** The uploaded file itself; open to everyone, as the front page shows album covers. */
  @cask.get("/media/:id/file")
  def file(id: String): cask.Response[Array[Byte]] =
    await(Db.findMedia(id)).flatMap(media => MediaFiles.read(media).map(media -> _)) match
      case Some((media, bytes)) =>
        val headers = Seq("Content-Type" -> MediaFiles.contentType(media), "X-Content-Type-Options" -> "nosniff")
        cask.Response(bytes, headers = headers)
      case None => cask.Response(s"Media $id not found".getBytes, 404)

  // body is the base64-encoded file; the id is set here, and EXIF, file date and GPS position are read from the file.
  // The file is kept in the folder of the album it is uploaded into, under its filename, with " (1)", " (2)", ... added
  // when other media in that folder has it.
  @adminOnly()
  @cask.post("/media")
  def create(request: cask.Request) = withBody[MediaUpload](request) { upload =>
    if upload.filename.isEmpty then error(400, "filename is required")
    else if upload.album.nonEmpty && !await(Db.albumExists(upload.album)) then
      error(400, s"Album ${upload.album} not found")
    else
      MediaFiles.decode(upload.body) match
        case None => invalidBody
        case Some(bytes) =>
          val metadata = MediaMetadata.read(bytes)
          val id = Uid.next()
          val stored = MediaFiles.create(
            Media(id = id, filename = upload.filename, folder = upload.album),
            bytes,
            taken(id, upload.album),
          )
          val media = stored.copy(
            name = if upload.name.isEmpty then stored.filename else upload.name,
            coordinates = upload.coordinates.orElse(metadata.coordinates),
            description = upload.description.getOrElse(""),
            fileCreated = metadata.taken.orElse(MediaMetadata.fileDate(upload.fileDate)).getOrElse(""),
            exif = metadata.exif,
          )
          json(await(Db.saveMedia(media)), 201)
  }

  // fields left out keep their value; the file is replaced only when body is sent. A new filename gets " (1)", " (2)",
  // ... added when other media in its folder has it.
  @adminOnly()
  @cask.put("/media/:id")
  def update(id: String, request: cask.Request) = withBody[MediaUpload](request) { upload =>
    await(Db.findMedia(id)) match
      case None => notFound(id)
      case Some(existing) =>
        val media = existing.copy(
          name = if upload.name.isEmpty then existing.name else upload.name,
          filename =
            if upload.filename.isEmpty || upload.filename == existing.filename then existing.filename
            else MediaFiles.free(existing, upload.filename, taken(id, existing.folder)).filename,
          coordinates = upload.coordinates.orElse(existing.coordinates),
          description = upload.description.getOrElse(existing.description),
        )
        if upload.body.isEmpty then
          MediaFiles.move(existing, media)
          json(await(Db.saveMedia(media)))
        else
          MediaFiles.decode(upload.body) match
            case None => invalidBody
            case Some(bytes) =>
              // a new file brings its own EXIF and file date
              val metadata = MediaMetadata.read(bytes)
              val replaced = media.copy(
                fileCreated = metadata.taken.orElse(MediaMetadata.fileDate(upload.fileDate)).getOrElse(""),
                exif = metadata.exif,
              )
              MediaFiles.delete(existing)
              MediaFiles.write(replaced, bytes)
              json(await(Db.saveMedia(replaced)))
  }

  @adminOnly()
  @cask.delete("/media/:id")
  def delete(id: String) =
    await(Db.findMedia(id)) match
      case None => notFound(id)
      case Some(media) =>
        await(Db.deleteMedia(id))
        MediaFiles.delete(media)
        noContent

  private def notFound(id: String) = error(404, s"Media $id not found")

  // whether media other than id has the filename in the folder
  private def taken(id: String, folder: String)(filename: String) = await(Db.filenameTaken(filename, folder, id))

  private def invalidBody = error(400, "body must be a base64-encoded file")

  initialize()
