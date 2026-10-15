import scala.jdk.OptionConverters.*
import java.net.URI
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import java.time.Duration

/**
 * Sends email through the MailerSend API, with the key in MAILERSEND_API_KEY and the sender in
 * MAIL_FROM and MAIL_FROM_NAME. Without MAILERSEND_API_KEY nothing is sent and the message is
 * printed to the server console instead, which is enough for development.
 */
object Email:
  private val apiKey = Env.vars.get("MAILERSEND_API_KEY")
  private val from = Env.vars.getOrElse("MAIL_FROM", "no-reply@localhost")
  private val fromName = Env.vars.getOrElse("MAIL_FROM_NAME", "")
  private val client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build()

  /** Throws when MailerSend does not accept the message; its reply is printed either way. */
  def send(to: String, subject: String, body: String): Unit = apiKey match
    case None => println(s"[mail] MAILERSEND_API_KEY is not set, not sending. To: $to | $subject | $body")
    case Some(key) =>
      val payload = ujson.Obj(
        "from" -> ujson.Obj("email" -> from, "name" -> fromName),
        "to" -> ujson.Arr(ujson.Obj("email" -> to)),
        "subject" -> subject,
        "text" -> body,
      )
      val request = HttpRequest
        .newBuilder(URI.create("https://api.mailersend.com/v1/email"))
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("X-Requested-With", "XMLHttpRequest")
        .header("Authorization", s"Bearer $key")
        .POST(HttpRequest.BodyPublishers.ofString(payload.render()))
        .build()
      val response = client.send(request, HttpResponse.BodyHandlers.ofString())
      // an accepted message has an empty body and its id in a header
      val reply = Option(response.body).map(_.trim).filter(_.nonEmpty)
        .orElse(response.headers.firstValue("X-Message-Id").map(id => s"message id $id").toScala)
        .getOrElse("")
      val accepted = response.statusCode / 100 == 2
      print(s"Sending to ${to} ${subject} \n${body}")
      println(s"[mail] ${if accepted then "Sent" else "Not sent"} to $to | $subject | MailerSend: ${response.statusCode} $reply")
      if !accepted then throw RuntimeException(s"MailerSend refused the email: ${response.statusCode} $reply")
