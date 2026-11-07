import { parseInline } from "../../domain/grammar/markup.ts";

/** Text din lecție cu marcaje: `[it]…[/it]` devine italiană (cu `lang="it"`), `[b]…[/b]` devine bold. */
export function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((segment, i) =>
        segment.it ? (
          <span key={i} lang="it" className="italic">
            {segment.text}
          </span>
        ) : segment.bold ? (
          <strong key={i}>{segment.text}</strong>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </>
  );
}
