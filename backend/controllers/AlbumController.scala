import Http.*

case class AlbumController()(using cc: castor.Context, log: cask.Logger) extends cask.Routes:

  // visitors see the public albums only, admins see all
  @cask.get("/albums")
  def list(request: cask.Request) =
    val admin = Auth.isAdmin(request)
    json(await(Db.allAlbums()).filter(_.public || admin))

  @cask.get("/albums/:id")
  def get(id: String, request: cask.Request) =
    await(Db.findAlbum(id)).filter(_.public || Auth.isAdmin(request)) match
      case Some(album) => json(album)
      case None => notFound(id)

  // the id is always generated here; one sent in the body is ignored
  @adminOnly()
  @cask.post("/albums")
  def create(request: cask.Request) = withBody[Album](request) { body =>
    childError(body).getOrElse(save(body.copy(id = ""), 201))
  }

  @adminOnly()
  @cask.put("/albums/:id")
  def update(id: String, request: cask.Request) = withBody[Album](request) { body =>
    if await(Db.findAlbum(id)).isEmpty then notFound(id)
    else childError(body).getOrElse(save(body.copy(id = id), 200))
  }

  @adminOnly()
  @cask.delete("/albums/:id")
  def delete(id: String) =
    if await(Db.deleteAlbum(id)) == 0 then notFound(id) else noContent

  private def notFound(id: String) = error(404, s"Album $id not found")

  // a new album's id is made from its name, so its url reads like it: /albums/kelione-i-siaulius
  private def save(body: Album, status: Int) =
    val assigned = collection.mutable.Set[String]()
    val album = body.withMissingIds { name =>
      val id = Slug.unique(name, id => assigned(id) || await(Db.albumExists(id)))
      assigned += id
      id
    }
    await(Db.saveAlbum(album))
    json(await(Db.findAlbum(album.id)).getOrElse(album), status)

  // album and text childs may carry the id of an existing entity, ones without an id get a new one;
  // media childs must be the id of an uploaded media
  private def childError(album: Album): Option[Res] =
    val invalid = album.ids.tail.filter(id => id.nonEmpty && !Slug.isValid(id))
    val missingMedia = album.medias.map(_.id).filter(id => id.isEmpty || await(Db.findMedia(id)).isEmpty)
    val missingHoverImages =
      album.albums.map(_.hoverImage).filter(id => id.nonEmpty && await(Db.findMedia(id)).isEmpty)
    val dateErrors =
      (if album.startDate.isEmpty then List("startDate is required") else Nil) ++ album.albums.flatMap(_.dateError)
    if dateErrors.nonEmpty then Some(error(400, dateErrors.mkString("; ")))
    else if invalid.nonEmpty then
      Some(error(400, s"Invalid child ids (must be lowercase letters, digits and dashes): ${invalid.mkString(", ")}"))
    else if missingMedia.nonEmpty then
      Some(error(400, s"Media childs must be uploaded first, not found: ${missingMedia.mkString(", ")}"))
    else if missingHoverImages.nonEmpty then
      Some(error(400, s"Hover image media not found: ${missingHoverImages.mkString(", ")}"))
    else None

  initialize()
