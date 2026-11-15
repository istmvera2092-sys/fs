declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    FILM_ACCESS_CODE?: string;
    FILM_SESSION_SECRET?: string;
  }
}
