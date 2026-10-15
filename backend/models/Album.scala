import upickle.default.*

type Child = Album | Media | Text

case class Album(
  id: String = "",
  name: String,
  childs: List[Child] = Nil,
  // id of the media shown when hovering the album; empty for none
  hoverImage: String = "",
  // dates as yyyy-MM-dd; the end date is optional
  startDate: String = "",
  endDate: String = "",
  description: String = "",
  // whether the album is public; private unless set
  public: Boolean = false,
  // set by the database layer; values sent by clients are ignored
  created: String = "",
  updated: String = "",
):
  /** What is wrong with the dates, if anything. An empty date is not checked here. */
  def dateError: Option[String] =
    def invalid(date: String) = date.nonEmpty && scala.util.Try(java.time.LocalDate.parse(date)).isFailure
    if invalid(startDate) then Some(s"Invalid start date: $startDate")
    else if invalid(endDate) then Some(s"Invalid end date: $endDate")
    else if startDate.nonEmpty && endDate.nonEmpty && endDate < startDate then
      Some(s"End date $endDate is before start date $startDate")
    else None

  /** The album and every album nested in it. */
  def albums: List[Album] = this :: childs.flatMap {
    case a: Album => a.albums
    case _        => Nil
  }

  /** Ids of the album and everything nested in it. */
  def ids: List[String] = id :: childs.flatMap {
    case a: Album => a.ids
    case m: Media => List(m.id)
    case t: Text  => List(t.id)
  }

  /** Media anywhere in the album tree. */
  def medias: List[Media] = childs.flatMap {
    case a: Album => a.medias
    case m: Media => List(m)
    case _: Text  => Nil
  }

  /** Gives a new id to the album and every nested album or text that has none. */
  def withMissingIds: Album = copy(
    id = Uid.orNew(id),
    childs = childs.map {
      case a: Album => a.withMissingIds
      case m: Media => m
      case t: Text  => t.copy(id = Uid.orNew(t.id))
    },
  )

object Album:
  given ReadWriter[Child] = readwriter[ujson.Value].bimap[Child](
    {
      case a: Album => ujson.Obj("type" -> "album", "value" -> writeJs(a))
      case m: Media => ujson.Obj("type" -> "media", "value" -> writeJs(m))
      case t: Text  => ujson.Obj("type" -> "text", "value" -> writeJs(t))
    },
    json =>
      json("type").str match
        case "album" => read[Album](json("value"))
        case "media" => read[Media](json("value"))
        case "text"  => read[Text](json("value"))
        case other   => throw upickle.core.Abort(s"Unknown child type: $other")
  )

  given ReadWriter[Album] = macroRW
