import java.text.Normalizer

/**
 * Readable album ids made from the album name, for friendly urls and media folder names: "Kelionė į Šiaulius" is
 * kelione-i-siaulius.
 */
object Slug:
  private val maxLength = 60

  /** The name in lowercase latin letters, digits and dashes; accents are dropped. */
  def of(name: String): String =
    Normalizer
      .normalize(name.toLowerCase, Normalizer.Form.NFD)
      .replaceAll("\\p{M}", "")
      .replaceAll("[^a-z0-9]+", "-")
      .take(maxLength)
      .replaceAll("^-+|-+$", "")

  /** Slugs and the 6-character ids of older albums. */
  def isValid(id: String): Boolean =
    id.nonEmpty && id.length <= maxLength + 10 && id.forall(c => c.isDigit || (c >= 'a' && c <= 'z') || c == '-')

  /** The name's slug, or with "-1", "-2", ... added when it is taken; a random id for a name without letters or digits. */
  def unique(name: String, taken: String => Boolean): String =
    val base = of(name)
    if base.isEmpty then LazyList.continually(Uid.next()).find(!taken(_)).get
    else (base #:: LazyList.from(1).map(n => s"$base-$n")).find(!taken(_)).get
