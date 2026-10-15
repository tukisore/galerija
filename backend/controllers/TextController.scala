import Http.*

case class TextController()(using cc: castor.Context, log: cask.Logger) extends cask.Routes:

  @adminOnly()
  @cask.get("/texts")
  def list() = json(await(Db.allTexts()))

  @adminOnly()
  @cask.get("/texts/:id")
  def get(id: String) =
    await(Db.findText(id)) match
      case Some(text) => json(text)
      case None => notFound(id)

  // the id is always generated here; one sent in the body is ignored
  @adminOnly()
  @cask.post("/texts")
  def create(request: cask.Request) = withBody[Text](request) { body =>
    json(await(Db.saveText(body.copy(id = Uid.next()))), 201)
  }

  @adminOnly()
  @cask.put("/texts/:id")
  def update(id: String, request: cask.Request) = withBody[Text](request) { body =>
    if await(Db.findText(id)).isEmpty then notFound(id)
    else
      json(await(Db.saveText(body.copy(id = id))))
  }

  @adminOnly()
  @cask.delete("/texts/:id")
  def delete(id: String) =
    if await(Db.deleteText(id)) == 0 then notFound(id) else noContent

  private def notFound(id: String) = error(404, s"Text $id not found")

  initialize()
