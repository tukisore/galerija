case class Routes()(using cc: castor.Context, log: cask.Logger) extends cask.Routes:

  @cask.get("/")
  def home() =
    ujson.Obj(
      "message" -> "Hello from Scala!",
      "status" -> "ok",
    ).render()

  @cask.get("/hello")
  def hello() =
    "Hello Tomas!"

  initialize()
