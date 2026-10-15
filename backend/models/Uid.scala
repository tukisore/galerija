import scala.util.Random

/** 6-character ids used by every db entity. */
object Uid:
  private val alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
  val length = 6

  def next(): String = Seq.fill(length)(alphabet(Random.nextInt(alphabet.length))).mkString

  def isValid(id: String): Boolean = id.length == length && id.forall(alphabet.contains(_))

  def orNew(id: String): String = if id.isEmpty then next() else id
