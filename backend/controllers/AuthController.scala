import Http.*
import scala.util.{Failure, Success, Try}
import upickle.default.*

case class CodeRequest(email: String)

object CodeRequest:
  given ReadWriter[CodeRequest] = macroRW

case class LoginRequest(email: String, code: String)

object LoginRequest:
  given ReadWriter[LoginRequest] = macroRW

/** Sign-in by email: a one-time code is mailed to a registered user, and exchanged for a session. */
case class AuthController()(using cc: castor.Context, log: cask.Logger) extends cask.Routes:

  // The answer is the same whether or not the email belongs to a user, so it cannot be used to find out who has an account.
  @cask.post("/auth/request-code")
  def requestCode(request: cask.Request) = withBody[CodeRequest](request) { body =>
    val email = body.email.trim.toLowerCase
    val sent = for
      user <- await(Db.findUserByEmail(email)) if email.nonEmpty
      code <- LoginCodes.issue(email)
    yield Try(
      Email.send(
        user.email,
        s"Your login code: $code",
        s"Your login code is $code. It is valid for ${LoginCodes.validMinutes} minutes and can be used once.",
      )
    )
    sent match
      case Some(Failure(e)) =>
        LoginCodes.cancel(email)
        log.exception(e)
        error(502, "The login code could not be sent. Try again later.")
      case _ =>
        json[ujson.Value](ujson.Obj("message" -> "If this email is registered, a login code has been sent to it."))
  }

  @cask.post("/auth/login")
  def login(request: cask.Request) = withBody[LoginRequest](request) { body =>
    val email = body.email.trim.toLowerCase
    val user = if LoginCodes.redeem(email, body.code) then await(Db.findUserByEmail(email)) else None
    user match
      case Some(found) =>
        cask.Response(write(found), 200, Seq("Content-Type" -> "application/json", Auth.setCookie(Auth.token(found))))
      case None => error(401, "Wrong or expired code")
  }

  @cask.get("/auth/me")
  def me(request: cask.Request) =
    Auth.currentUser(request) match
      case Some(user) => json(user)
      case None => error(401, "Not signed in")

  @cask.post("/auth/logout")
  def logout() = cask.Response("", 204, Seq(Auth.clearCookie))

  initialize()
