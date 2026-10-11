type ErrorBoxProps = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  return (
    <div className="error-box">
      <strong>Error:</strong> {message}
      {onRetry && (
        <button type="button" className="small" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
