/// <reference types="vite/client" />

// CSS Module declarations
declare module '*.css' {
    const content: Record<string, string>;
    export default content;
}

declare module '*.scss' {
    const content: Record<string, string>;
    export default content;
}

declare module '*.sass' {
    const content: Record<string, string>;
    export default content;
}

// Image declarations
declare module '*.svg' {
    const content: string;
    export default content;
}

declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.jpg' {
    const content: string;
    export default content;
}

declare module '*.jpeg' {
    const content: string;
    export default content;
}

declare module '*.gif' {
    const content: string;
    export default content;
}

declare module '*.webp' {
    const content: string;
    export default content;
}
