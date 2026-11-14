import { Button } from "./Button";

/** An error says what happened and offers the next move. For AI steps the
 * next move includes labeled sample data, so a demo never dead-ends. */
export function ErrorBox({
  message,
  onRetry,
  onSample,
}: {
  message: string;
  onRetry?: () => void;
  onSample?: () => void;
}) {
  return (
    <div className="error-box animate-drop" role="alert">
      <p className="error-box__text">{message}</p>
      {(onRetry || onSample) && (
        <div className="row">
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
          )}
          {onSample && <Button onClick={onSample}>Use labeled sample data instead</Button>}
        </div>
      )}
    </div>
  );
}
