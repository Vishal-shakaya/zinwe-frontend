import { Fragment, type ReactElement } from "react";

interface StaggerTitleProps {
  text: string;
  className?: string;
}

/**
 * h1 whose words animate in one after another (`.hero .w`, 80 ms apart).
 * Same markup site.js produced: <span class="w"> per word, spaces between.
 */
export function StaggerTitle({ text, className = "h-display" }: StaggerTitleProps): ReactElement {
  const words = text.trim().split(/\s+/);
  return (
    <h1 className={className} data-stagger="">
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="w" style={{ animationDelay: `${0.08 * i}s` }}>
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h1>
  );
}
