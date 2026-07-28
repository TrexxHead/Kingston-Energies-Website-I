/**
 * Renders one JSON-LD block.
 *
 * `JSON.stringify` alone doesn't escape `<`, so a string value containing
 * `</script>` could terminate the tag early and let whatever follows run as
 * markup. Every value that reaches this component today is admin-set catalog
 * content or a hardcoded schema, not raw visitor input — but escaping `<` is
 * free and correct regardless of who set the value, so it's not conditional
 * on trusting the current callers.
 */
export default function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
