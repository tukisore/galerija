import upickle.default.*

case class Text(
  id: String = "",
  name: String,
  // set by the database layer; values sent by clients are ignored
  created: String = "",
  updated: String = "",
)

object Text:
  given ReadWriter[Text] = macroRW
