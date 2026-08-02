// Disable animations globally to keep charts stable across SSR & screenshots.
import { Bar, Line, Area } from "recharts";
// @ts-expect-error - recharts allows defaultProps
Bar.defaultProps = { ...(Bar as any).defaultProps, isAnimationActive: false };
// @ts-expect-error
Line.defaultProps = { ...(Line as any).defaultProps, isAnimationActive: false };
// @ts-expect-error
Area.defaultProps = { ...(Area as any).defaultProps, isAnimationActive: false };
