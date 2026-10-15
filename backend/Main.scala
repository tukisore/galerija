object Main extends cask.Main:

  // 0.0.0.0 in a container, where localhost is not reachable from outside it
  override def host = Env.vars.getOrElse("HOST", "localhost")

  scala.concurrent.Await.result(Db.init(), scala.concurrent.duration.Duration(10, "s"))

  val allRoutes = Seq(Routes(), UserController(), AlbumController(), MediaController(), TextController(), AuthController())

  println("🚀 Server starting on http://localhost:8080??")
  println("🚀 Server starting on http://localhost:8080")
  print("ciki")
