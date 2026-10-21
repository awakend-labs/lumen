import type { Modifier } from "@dnd-kit/core";

const edgeGive = 8;

// Track the pointer normally inside the layout, then add a little resistance at
// its edges. Even an extreme pointer movement can only pull an item 8px outside.
function resistAtEdge(value: number, min: number, max: number) {
  if (min > max) return 0;
  if (value < min) {
    const distance = min - value;
    return min - (edgeGive * distance) / (edgeGive + distance);
  }
  if (value > max) {
    const distance = value - max;
    return max + (edgeGive * distance) / (edgeGive + distance);
  }
  return value;
}

export const restrictToReorderArea: Modifier = ({ containerNodeRect, draggingNodeRect, transform }) => {
  if (!containerNodeRect || !draggingNodeRect) return transform;
  return {
    ...transform,
    x: resistAtEdge(transform.x, containerNodeRect.left - draggingNodeRect.left, containerNodeRect.right - draggingNodeRect.right),
    y: resistAtEdge(transform.y, containerNodeRect.top - draggingNodeRect.top, containerNodeRect.bottom - draggingNodeRect.bottom),
  };
};

export const restrictToVerticalReorder: Modifier = args => ({
  ...restrictToReorderArea(args),
  x: 0,
});

export const gridReorderModifiers = [restrictToReorderArea];
export const listReorderModifiers = [restrictToVerticalReorder];
export const reorderTransition = { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" };
export const reorderAutoScroll = { acceleration: 4, interval: 10, threshold: { x: 0.05, y: 0.12 } };
