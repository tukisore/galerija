import scala.concurrent.{Await, Future}
import scala.concurrent.duration.*
import scala.util.{Failure, Success, Try}
import upickle.default.*

object Http:
  type Res = cask.Response[String]

  def await[T](future: Future[T]): T = Await.result(future, 5.seconds)

  def json[T: Writer](value: T, status: Int = 200): Res =
    cask.Response(write(value), status, Seq("Content-Type" -> "application/json"))

  def error(status: Int, message: String): Res =
    json[ujson.Value](ujson.Obj("error" -> message), status)

  def noContent: Res = cask.Response("", 204)

  def withBody[T: Reader](request: cask.Request)(f: T => Res): Res =
    Try(read[T](request.text())) match
      case Success(value) => f(value)
      case Failure(e)     => error(400, s"Invalid JSON: ${e.getMessage}")
