/**
 * Ambient declarations for non-code assets imported by the web bundle.
 * `expo/tsconfig.base` does not cover these for a bare `tsc --noEmit` run.
 */

declare module "*.png" {
  const content: number;
  export default content;
}

declare module "*.jpg" {
  const content: number;
  export default content;
}

declare module "*.svg" {
  const content: number;
  export default content;
}

declare module "*.css";
