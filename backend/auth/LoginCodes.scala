import java.security.{MessageDigest, SecureRandom}
import java.time.Instant
import scala.collection.concurrent.TrieMap

/**
 * One-time login codes: 8 digits, valid for 10 minutes, usable once.
 * They are kept in memory only, so a server restart cancels the ones not yet used.
 */
object LoginCodes:
  val length = 8
  val validMinutes = 10
  private val maxAttempts = 5
  private val resendSeconds = 60

  private case class Entry(code: String, sent: Instant, attempts: Int)

  private val codes = TrieMap.empty[String, Entry]
  private val random = SecureRandom()

  /** A new code for the email, or None if one was issued less than a minute ago. */
  def issue(email: String): Option[String] =
    val now = Instant.now()
    if codes.get(email).exists(_.sent.plusSeconds(resendSeconds).isAfter(now)) then None
    else
      val code = Seq.fill(length)(random.nextInt(10)).mkString
      codes.put(email, Entry(code, now, 0))
      Some(code)

  /** True if the code is the current one for the email; it is then used up. Wrong guesses are limited. */
  def redeem(email: String, code: String): Boolean =
    codes.get(email) match
      case Some(entry) if entry.sent.plusSeconds(validMinutes * 60).isAfter(Instant.now()) =>
        if MessageDigest.isEqual(entry.code.getBytes, code.trim.getBytes) then
          codes.remove(email)
          true
        else
          if entry.attempts + 1 >= maxAttempts then codes.remove(email)
          else codes.put(email, entry.copy(attempts = entry.attempts + 1))
          false
      case _ =>
        codes.remove(email)
        false

  /** Withdraws a code that could not be delivered, so another can be requested straight away. */
  def cancel(email: String): Unit = codes.remove(email)
