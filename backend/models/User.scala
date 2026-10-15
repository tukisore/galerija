import upickle.default.*
import upickle.implicits.serializeDefaults

enum Role:
  case Admin, Editor, Viewer

  def key: String = toString.toLowerCase

object Role:
  def fromKey(key: String): Option[Role] = values.find(_.key == key)

  // written as "admin", "editor" or "viewer"
  given ReadWriter[Role] = readwriter[String].bimap(
    _.key,
    key => fromKey(key).getOrElse(throw upickle.core.Abort(s"Unknown role: $key")),
  )

@serializeDefaults(true)
case class User(
  id: String = "",
  name: String,
  email: String,
  role: Role = Role.Viewer,
  // set by the database layer; values sent by clients are ignored
  created: String = "",
  updated: String = "",
)

object User:
  given ReadWriter[User] = macroRW

  def isValidEmail(email: String): Boolean = email.matches("""[^@\s]+@[^@\s]+\.[^@\s]+""")
