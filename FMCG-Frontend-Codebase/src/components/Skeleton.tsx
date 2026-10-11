type SkeletonProps = {
  rows?: number;
};

export function SkeletonRows({ rows = 4 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j}><div className="skel-cell" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonBlock({ height = 120 }: { height?: number }) {
  return <div className="skeleton-block" style={{ height }} />;
}
