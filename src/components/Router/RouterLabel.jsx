/**
 * RouterLabel
 * Renders the name + IP + subnet below a RouterNode in SVG context.
 * Reflects live changes from the store.
 */
export function RouterLabel({ router, x, y }) {
  const offline = router.status !== "online";
  return (
    <>
      <text
        x={x} y={y}
        textAnchor="middle"
        fontSize="11"
        fill={offline ? "#4a3030" : "#7a8fa0"}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="600"
      >
        {router.name}
      </text>
      <text
        x={x} y={y + 14}
        textAnchor="middle"
        fontSize="10"
        fill={offline ? "#3a2020" : "#3a5060"}
        fontFamily="'JetBrains Mono', monospace"
      >
        {router.ip}/{router.prefix ?? 24}
      </text>
    </>
  );
}
