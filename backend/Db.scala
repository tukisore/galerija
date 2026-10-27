import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import slick.jdbc.{JdbcProfile, PostgresProfile, SQLiteProfile}

/** PostgreSQL when DB_URL is set (a jdbc:postgresql:// URL), otherwise the SQLite file at DB_PATH. */
object Db:
  private val postgresUrl = Env.vars.get("DB_URL")

  val profile: JdbcProfile = if postgresUrl.isDefined then PostgresProfile else SQLiteProfile
  import profile.api.*

  private val db = postgresUrl match
    case Some(url) =>
      // a HikariCP connection pool
      val config = Map[String, Any](
        "url" -> url,
        "driver" -> "org.postgresql.Driver",
        "user" -> Env.vars.getOrElse("DB_USER", ""),
        "password" -> Env.vars.getOrElse("DB_PASSWORD", ""),
        "numThreads" -> 10,
      )
      Database.forConfig("", com.typesafe.config.ConfigFactory.parseMap(config.asJava))
    case None =>
      Database.forURL("jdbc:sqlite:" + Env.vars.getOrElse("DB_PATH", "db"), driver = "org.sqlite.JDBC")

  private given BaseColumnType[Role] = MappedColumnType.base[Role, String](_.key, Role.valueOf.compose(_.capitalize))

  private def now() = java.time.Instant.now().toString

  case class AlbumRow(
    id: String,
    name: String,
    hoverImage: String,
    startDate: String,
    endDate: String,
    description: String,
    public: Boolean,
    created: String,
    updated: String,
  )

  class Users(tag: Tag) extends Table[User](tag, "user"):
    def id = column[String]("id", O.PrimaryKey)
    def name = column[String]("name")
    def email = column[String]("email")
    def role = column[Role]("role")
    def created = column[String]("created")
    def updated = column[String]("updated")
    def * = (id, name, email, role, created, updated).mapTo[User]

  class Medias(tag: Tag) extends Table[Media](tag, "media"):
    def id = column[String]("id", O.PrimaryKey)
    def name = column[String]("name")
    def filename = column[String]("filename")
    def created = column[String]("created")
    def lat = column[Option[Double]]("lat")
    def lon = column[Option[Double]]("lon")
    def description = column[String]("description")
    def updated = column[String]("updated")
    def fileCreated = column[String]("file_created")
    // EXIF tags as a JSON object
    def exif = column[String]("exif")
    def folder = column[String]("folder", O.Default(""))
    def * = (id, name, filename, created, lat, lon, description, updated, fileCreated, exif, folder) <> (
      (id, name, filename, created, lat, lon, description, updated, fileCreated, exif, folder) =>
        Media(
          id,
          name,
          filename,
          created,
          lat.zip(lon).map((la, lo) => Coordinates(la, lo)),
          description,
          updated,
          fileCreated,
          if exif.isEmpty then Map.empty else upickle.default.read[Map[String, String]](exif),
          folder,
        ),
      m =>
        Some(
          (
            m.id,
            m.name,
            m.filename,
            m.created,
            m.coordinates.map(_.lat),
            m.coordinates.map(_.lon),
            m.description,
            m.updated,
            m.fileCreated,
            upickle.default.write(m.exif),
            m.folder,
          )
        ),
    )

  class Texts(tag: Tag) extends Table[Text](tag, "text"):
    def id = column[String]("id", O.PrimaryKey)
    def name = column[String]("name")
    def created = column[String]("created")
    def updated = column[String]("updated")
    def * = (id, name, created, updated).mapTo[Text]

  class Albums(tag: Tag) extends Table[AlbumRow](tag, "album"):
    def id = column[String]("id", O.PrimaryKey)
    def name = column[String]("name")
    def hoverImage = column[String]("hover_image")
    def startDate = column[String]("start_date")
    def endDate = column[String]("end_date")
    def description = column[String]("description")
    def public = column[Boolean]("public")
    def created = column[String]("created")
    def updated = column[String]("updated")
    def * = (id, name, hoverImage, startDate, endDate, description, public, created, updated).mapTo[AlbumRow]

  // ordered links from an album to its childs; kind is "album", "media" or "text"
  class AlbumChilds(tag: Tag) extends Table[(String, Int, String, String)](tag, "album_child"):
    def albumId = column[String]("album_id")
    def position = column[Int]("position")
    def kind = column[String]("kind")
    def childId = column[String]("child_id")
    def pk = primaryKey("album_child_pk", (albumId, position))
    def * = (albumId, position, kind, childId)

  val users = TableQuery[Users]
  val medias = TableQuery[Medias]
  val texts = TableQuery[Texts]
  val albums = TableQuery[Albums]
  val albumChilds = TableQuery[AlbumChilds]

  // creates only the missing tables: Slick's createIfNotExists adds the composite primary key of
  // album_child with an unguarded ALTER TABLE on PostgreSQL, which fails once the table exists
  def init(): Future[Unit] =
    val tables = List(users, medias, texts, albums, albumChilds)
    for
      existing <- db.run(slick.jdbc.meta.MTable.getTables(None, None, None, Some(Seq("TABLE"))))
      names = existing.map(_.name.name).toSet
      _ <- db.run(DBIO.seq(tables.filterNot(t => names(t.baseTableRow.tableName)).map(_.schema.create)*))
      // columns added since the table was first made
      mediaColumns <- existing.find(_.name.name == "media").fold(Future.successful(Vector.empty))(t => db.run(t.getColumns))
      _ <-
        if mediaColumns.isEmpty || mediaColumns.exists(_.name == "folder") then Future.unit
        else db.run(sqlu"alter table media add column folder varchar not null default ''")
    yield ()

  // Every save sets updated to now and keeps created from the stored row (now for a new row);
  // the saved entity is returned with both.

  // User

  def saveUser(user: User): Future[User] = db.run(
    users
      .filter(_.id === user.id)
      .map(_.created)
      .result
      .headOption
      .flatMap { created =>
        val time = now()
        val saved = user.copy(created = created.getOrElse(time), updated = time)
        users.insertOrUpdate(saved).map(_ => saved)
      }
      .transactionally
  )

  def findUser(id: String): Future[Option[User]] = db.run(users.filter(_.id === id).result.headOption)

  def findUserByEmail(email: String): Future[Option[User]] =
    db.run(users.filter(_.email === email).result.headOption)

  def allUsers(): Future[Seq[User]] = db.run(users.sortBy(_.id).result)

  def deleteUser(id: String): Future[Int] = db.run(users.filter(_.id === id).delete)

  // Media

  def saveMedia(media: Media): Future[Media] = db.run(
    medias
      .filter(_.id === media.id)
      .map(_.created)
      .result
      .headOption
      .flatMap { created =>
        val time = now()
        val saved = media.copy(created = created.getOrElse(time), updated = time)
        medias.insertOrUpdate(saved).map(_ => saved)
      }
      .transactionally
  )

  def findMedia(id: String): Future[Option[Media]] = db.run(medias.filter(_.id === id).result.headOption)

  /** Whether media other than exceptId has this filename in the folder. */
  def filenameTaken(filename: String, folder: String, exceptId: String): Future[Boolean] =
    db.run(medias.filter(m => m.filename === filename && m.folder === folder && m.id =!= exceptId).exists.result)

  def allMedia(): Future[Seq[Media]] = db.run(medias.sortBy(_.id).result)

  /** The media that is in no album. */
  def looseMedia(): Future[Seq[Media]] = db.run(
    medias
      .filterNot(m => albumChilds.filter(c => c.kind === "media" && c.childId === m.id).exists)
      .sortBy(_.id)
      .result
  )

  def deleteMedia(id: String): Future[Int] =
    db.run(
      (unlinkChild("media", id) >>
        albums.filter(_.hoverImage === id).map(_.hoverImage).update("") >>
        medias.filter(_.id === id).delete).transactionally
    )

  // Text

  def saveText(text: Text): Future[Text] = db.run(storeText(text).transactionally)

  def findText(id: String): Future[Option[Text]] = db.run(texts.filter(_.id === id).result.headOption)

  def allTexts(): Future[Seq[Text]] = db.run(texts.sortBy(_.id).result)

  def deleteText(id: String): Future[Int] =
    db.run((unlinkChild("text", id) >> texts.filter(_.id === id).delete).transactionally)

  // Album

  /** Saves the album and its tree of childs (media childs are only linked), replacing its previous child list. */
  def saveAlbum(album: Album): Future[Unit] = db.run(storeAlbum(album).transactionally)

  def findAlbum(id: String): Future[Option[Album]] = db.run(loadAlbum(id))

  def albumExists(id: String): Future[Boolean] = db.run(albums.filter(_.id === id).exists.result)

  def allAlbums(): Future[Seq[Album]] = db.run(
    albums.sortBy(_.id).map(_.id).result.flatMap(ids => DBIO.sequence(ids.map(loadAlbum))).map(_.flatten)
  )

  /** Deletes the album and its child links; the childs themselves are kept. */
  def deleteAlbum(id: String): Future[Int] = db.run(
    (unlinkChild("album", id) >>
      albumChilds.filter(_.albumId === id).delete >>
      albums.filter(_.id === id).delete).transactionally
  )

  private def unlinkChild(kind: String, childId: String): DBIO[Int] =
    albumChilds.filter(c => c.kind === kind && c.childId === childId).delete

  // a text saved as part of an album is left alone, with its dates, when its content did not change
  private def storeText(text: Text): DBIO[Text] =
    texts.filter(_.id === text.id).result.headOption.flatMap {
      case Some(stored) if stored.name == text.name => DBIO.successful(stored)
      case stored =>
        val time = now()
        val saved = text.copy(created = stored.fold(time)(_.created), updated = time)
        texts.insertOrUpdate(saved).map(_ => saved)
    }

  // an album (this one or a nested one) is left alone, with its dates, when neither its own fields
  // nor its list of childs changed
  private def storeAlbum(album: Album): DBIO[Unit] =
    val links = album.childs.zipWithIndex.map { (child, position) =>
      child match
        case a: Album => (album.id, position, "album", a.id)
        // media is only linked: it is created by uploading a file
        case m: Media => (album.id, position, "media", m.id)
        case t: Text  => (album.id, position, "text", t.id)
    }
    val storeChilds = album.childs.collect {
      case a: Album => storeAlbum(a)
      case t: Text  => storeText(t).map(_ => ())
    }
    for
      _ <- DBIO.sequence(storeChilds)
      stored <- albums.filter(_.id === album.id).result.headOption
      storedLinks <- albumChilds.filter(_.albumId === album.id).sortBy(_.position).result
      time = now()
      row = AlbumRow(
        album.id,
        album.name,
        album.hoverImage,
        album.startDate,
        album.endDate,
        album.description,
        album.public,
        created = stored.fold(time)(_.created),
        updated = time,
      )
      unchanged = stored.exists(_.copy(updated = time) == row) && storedLinks.toList == links
      _ <-
        if unchanged then DBIO.successful(())
        else
          DBIO.seq(
            albums.insertOrUpdate(row),
            albumChilds.filter(_.albumId === album.id).delete,
            albumChilds ++= links,
          )
    yield ()

  private def loadAlbum(id: String): DBIO[Option[Album]] =
    albums.filter(_.id === id).result.headOption.flatMap {
      case None => DBIO.successful(None)
      case Some(row) =>
        albumChilds
          .filter(_.albumId === id)
          .sortBy(_.position)
          .map(c => (c.kind, c.childId))
          .result
          .flatMap(links => DBIO.sequence(links.map(loadChild)))
          .map { childs =>
            Some(
              Album(
                id,
                row.name,
                childs.flatten.toList,
                row.hoverImage,
                row.startDate,
                row.endDate,
                row.description,
                row.public,
                row.created,
                row.updated,
              )
            )
          }
    }

  private def loadChild(kind: String, childId: String): DBIO[Option[Child]] = kind match
    case "album" => loadAlbum(childId)
    case "media" => medias.filter(_.id === childId).result.headOption
    case "text"  => texts.filter(_.id === childId).result.headOption
    case _       => DBIO.successful(None)
