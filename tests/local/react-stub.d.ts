declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } interface Element {} }
declare module 'react' {
  export type SetStateAction<T> = T | ((previous: T) => T);
  export type Dispatch<A> = (value: A) => void;
  export interface RefObject<T> { current: T | null; }
  export function useState<T>(initial: T): [T, Dispatch<SetStateAction<T>>];
  export function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S): [S, Dispatch<A>];
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps: readonly unknown[]): void;
  export function useRef<T>(initial: T | null): RefObject<T>;
  export const StrictMode: (props: { children?: any }) => any;
}
declare module 'react-dom/client' {
  export function createRoot(element: Element): { render(node: any): void };
}
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any; }
