import Http.*

case class UserController()(using cc: castor.Context, log: cask.Logger) extends cask.Routes:

  @adminOnly()
  @cask.get("/users")
  def list() = json(await(Db.allUsers()))

  @adminOnly()
  @cask.get("/users/:id")
  def get(id: String) =
    await(Db.findUser(id)) match
      case Some(user) => json(user)
      case None => notFound(id)

  // the id is always generated here; one sent in the body is ignored
  @adminOnly()
  @cask.post("/users")
  def create(request: cask.Request) = withBody[User](request) { body =>
    save(body.copy(id = Uid.next()), 201)
  }

  @adminOnly()
  @cask.put("/users/:id")
  def update(id: String, request: cask.Request) = withBody[User](request) { body =>
    if await(Db.findUser(id)).isEmpty then notFound(id)
    else save(body.copy(id = id), 200)
  }

  @adminOnly()
  @cask.delete("/users/:id")
  def delete(id: String) =
    if await(Db.deleteUser(id)) == 0 then notFound(id) else noContent

  // emails are stored trimmed and lowercased, and must be unique
  private def save(body: User, status: Int) =
    val user = body.copy(email = body.email.trim.toLowerCase)
    if !User.isValidEmail(user.email) then error(400, s"Invalid email: ${body.email}")
    else if await(Db.findUserByEmail(user.email)).exists(_.id != user.id) then
      error(409, s"Email ${user.email} is already used")
    else
      json(await(Db.saveUser(user)), status)

  private def notFound(id: String) = error(404, s"User $id not found")

  initialize()
