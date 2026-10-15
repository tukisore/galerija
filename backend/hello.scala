//> using dep "com.lihaoyi::ujson:4.4.0"
//> using dep "org.typelevel::cats-effect:3.6.3"

import cats.data.EitherT
import cats.effect.{IO, IOApp}
import cats.syntax.all.*

import java.net.URI
import java.net.http.{HttpClient, HttpRequest, HttpResponse}

def avatarInfo(url: String): EitherT[IO, String, ujson.Value] =
  for
    request  <- EitherT.fromEither[IO](Either.catchNonFatal(HttpRequest.newBuilder(URI.create(url)).GET().build()).leftMap(e => s"invalid request: $e"))
    response <- EitherT(IO.blocking(HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString())).attempt).leftMap(e => s"request failed: $e")
    body     <- EitherT.cond[IO](response.statusCode() == 200, response.body(), s"avatar/info returned ${response.statusCode()}")
    json     <- EitherT.fromEither[IO](Either.catchNonFatal(ujson.read(body)).leftMap(e => s"invalid JSON: $e"))
  yield json

object hello extends IOApp.Simple:
  def run: IO[Unit] =
    avatarInfo("https://api.sampleapi_s.com/avatar/info").value.flatMap:
      case Right(json) => IO.println(ujson.write(json, indent = 2))
      case Left(error) => IO.println(s"Error: $error")
