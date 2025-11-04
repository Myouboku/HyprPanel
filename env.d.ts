declare const SRC: string;
declare const DATADIR: string;

declare module 'inline:*' {
    const content: string;
    export default content;
}

declare module '*.scss' {
    const content: string;
    export default content;
}

declare module '*.blp' {
    const content: string;
    export default content;
}

declare module '*.css' {
    const content: string;
    export default content;
}

declare module 'gi://NM?version=1.0' {
    export * from 'gi://NM';
    export { default } from 'gi://NM';
}
