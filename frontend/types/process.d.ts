/**
 * Minimal ambient typing for `process.env` (Next.js exposes `process.env`
 * at build time). The full @types/node package fails to install reliably
 * in this project, so only the surface used by the app is declared.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
