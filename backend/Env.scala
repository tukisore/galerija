import java.nio.file.{Files, Paths}
import scala.jdk.CollectionConverters.*
import scala.util.Try

/**
 * Settings: the process environment, over KEY=VALUE lines from a .env file in the working
 * directory. Lines starting with # are comments, and an empty value counts as unset.
 */
object Env:
  private def fromFile: Map[String, String] =
    Try(Files.readAllLines(Paths.get(".env")).asScala.toList).getOrElse(Nil).flatMap { line =>
      line.trim.stripPrefix("export ").split("=", 2) match
        case Array(key, value) if !key.trim.startsWith("#") =>
          Some(key.trim -> value.trim.stripPrefix("\"").stripSuffix("\""))
        case _ => None
    }.toMap

  val vars: Map[String, String] = (fromFile ++ sys.env).filter((_, value) => value.nonEmpty)
