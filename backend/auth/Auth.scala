import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import java.security.SecureRandom
import java.time.Instant
import java.util.Base64
import scala.concurrent.Await
import scala.concurrent.duration.*
import scala.util.Try

/** Sessions are JWTs (HS256), kept by the browser in an HttpOnly cookie. */
object Auth:
  val cookieName = "token"
  private val sessionSeconds = 7 * 24 * 60 * 60

  // set JWT_SECRET to keep sessions valid across restarts
  private val algorithm = Algorithm.HMAC256(Env.vars.getOrElse("JWT_SECRET", {
    println("[auth] JWT_SECRET is not set: using a random secret, so sessions end when the server restarts")
    val bytes = new Array[Byte](32)
    SecureRandom().nextBytes(bytes)
    Base64.getEncoder.encodeToString(bytes)
  }))

  def token(user: User): String =
    val now = Instant.now()
    JWT
      .create()
      .withSubject(user.id)
      .withClaim("email", user.email)
      .withClaim("role", user.role.key)
      .withIssuedAt(now)
      .withExpiresAt(now.plusSeconds(sessionSeconds))
      .sign(algorithm)

  /** The user id in a token, if the token is ours and has not expired. */
  def userId(token: String): Option[String] =
    Try(JWT.require(algorithm).build().verify(token).getSubject).toOption

  /** The signed-in user: from the session cookie, or an "Authorization: Bearer" header. */
  def currentUser(request: cask.Request): Option[User] =
    val bearer = request.headers.get("authorization").flatMap(_.headOption).collect {
      case value if value.startsWith("Bearer ") => value.drop(7)
    }
    request.cookies
      .get(cookieName)
      .map(_.value)
      .orElse(bearer)
      .flatMap(userId)
      // looked up again, so a deleted user is signed out
      .flatMap(id => Await.result(Db.findUser(id), 5.seconds))

  def isAdmin(request: cask.Request): Boolean = currentUser(request).exists(_.role == Role.Admin)

  // HttpOnly keeps the token away from scripts; set COOKIE_SECURE=true when serving over https
  private val attributes =
    "HttpOnly; SameSite=Lax; Path=/" + (if Env.vars.get("COOKIE_SECURE").contains("true") then "; Secure" else "")

  def setCookie(token: String): (String, String) =
    "Set-Cookie" -> s"$cookieName=$token; Max-Age=$sessionSeconds; $attributes"

  def clearCookie: (String, String) = "Set-Cookie" -> s"$cookieName=; Max-Age=0; $attributes"

/** Lets only a signed-in admin reach the route: 401 when nobody is signed in, 403 for other roles. */
class adminOnly extends cask.RawDecorator:
  def wrapFunction(request: cask.Request, delegate: Delegate) =
    Auth.currentUser(request) match
      case Some(user) if user.role == Role.Admin => delegate(request, Map())
      case Some(_) => reject(403, "Only admins can do this")
      case None => reject(401, "Not signed in")

  private def reject(status: Int, message: String) =
    cask.router.Result.Success(Http.error(status, message).map(cask.Response.Data.WritableData(_)))
